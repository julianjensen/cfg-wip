/** ****************************************************************************************************
 * File: dominator-tree-builder (dominators)
 * @author julian on 12/1/17
 * @version 1.0.0
 * @copyright Planet3, Inc.
 *******************************************************************************************************/
'use strict';

const
    isFn      = a => typeof a === 'function',
    caller    = cbs => name => nodes => isFn( cbs[ name ] ) && cbs[ name ]( nodes ),
    traversal = require( '../traversal' ),
    { DFS }   = traversal,
    assert    = require( 'assert' );

/**
 * This implements Lengauer and Tarjan's "A Fast Algorithm for Finding Dominators in a Flowgraph"
 * (TOPLAS 1979). It uses the "simple" implementation of LINK and EVAL, which yields an O(n log n)
 * solution. The full paper is linked below; this code attempts to closely follow the algorithm as
 * it is presented in the paper; in particular sections 3 and 4 as well as appendix B.
 * https://www.cs.princeton.edu/courses/archive/fall03/cs528/handouts/a%20fast%20algorithm%20for%20finding.pdf
 *
 * This code is very subtle. The Lengauer-Tarjan algorithm is incredibly deep to begin with. The
 * goal of this code is to follow the code in the paper, however our implementation must deviate
 * from the paper when it comes to recursion. The authors had used recursion to implement DFS, and
 * also to implement the "simple" EVAL. We convert both of those into worklist-based solutions.
 * Finally, once the algorithm gives us immediate dominators, we implement dominance tests by
 * walking the dominator tree and computing pre and post numbers. We then use the range inclusion
 * check trick that was first discovered by Paul F. Dietz in 1982 in "Maintaining order in a linked
 * list" (see http://dl.acm.org/citation.cfm?id=802184).
 *
 * @param {BasicBlockList} graph
 * @param {number} nextBlockNum
 */
function DominatorTreeBuilder( graph, nextBlockNum )
{
    const
        /**
         * @param {BasicBlock} from - Vertex 𝑣
         * @param {BasicBlock} to   - Vertex 𝑤
         */
        link = ( from, to ) => to.ancestor = from,

        /**
         * @param {BasicBlock} v
         */
        compress = v => {
            if ( !v.ancestor || !v.ancestor.ancestor ) return;

            compress( v.ancestor );

            if ( v.ancestor.label.semi < v.label.semi )
                v.label = v.ancestor.label;

            v.ancestor = v.ancestor.ancestor;
        },
        /**
         * If 𝑣 is the root of a tree in the forest, return 𝑣. Otherwise, let 𝑟 be the root
         * of the tree in the forest which contains 𝑣. Return any vertex 𝑢 ≠ 𝑟 of minimum 𝑠𝑒𝑚𝑖❲𝑢❳
         * on the path 𝑟 ⥅ 𝑣.
         *
         * @param {BasicBlock} v
         * @return {*}
         */
        _eval    = v => {
            if ( !v.ancestor ) return v;

            compress( v );
            return v.label;
        };

    graph.forEach( n => n.resetLT() );

    // Step 1. Compute depth first pre-numbering.
    // Already done as part of the blockList initial_walk()

    // Steps 2 and 3. Compute semi dominators and implicit immediate dominators.
    let currentPreNumber = nextBlockNum;

    while ( currentPreNumber-- > 1 )
    {
        let block = graph.get( currentPreNumber );

        console.log( `currentPreNumber: ${currentPreNumber}, block: ${block}` );
        // Step 2:
        block.preds.forEach( p => block.semi = Math.min( _eval( p ).semi, block.semi ) );

        let bucketPreNumber = block.semi;

        console.log( `block ${block.name}, semi: ${block.semi + 1}` );

        assert( bucketPreNumber <= currentPreNumber );

        graph.get( bucketPreNumber ).bucket.push( block );
        link( block.parent, block );

        // Step 3:
        for ( const semiDominee of block.parent.bucket )
        {
            const
                possibleDominator = _eval( semiDominee );

            assert( graph.get( semiDominee.semi ) === block.parent );

            if ( possibleDominator.semi < semiDominee.semi )
                semiDominee.dom = possibleDominator;
            else
                semiDominee.dom = block.parent;
        }

        block.parent.bucket.length = 0;
    }

    // Step 4. Compute explicit immediate dominators

    currentPreNumber = nextBlockNum;

    while ( currentPreNumber-- > 1 )
    {
        let block = graph.get( currentPreNumber );

        // Step 2:
        block.preds.forEach( p => block.semi = Math.min( _eval( p ).semi, block.semi ) );

        let bucketPreNumber = block.semi;

        assert( bucketPreNumber <= currentPreNumber );

        graph.get( bucketPreNumber ).bucket.push( block );
        link( block.parent, block );

        // Step 3:
        for ( const semiDominee of block.parent.bucket )
        {
            const
                possibleDominator = _eval( semiDominee );

            assert( graph.get( semiDominee.semi ) === block.parent );

            if ( possibleDominator.semi < semiDominee.semi )
                semiDominee.dom = possibleDominator;
            else
                semiDominee.dom = block.parent;
        }

        block.parent.bucket.length = 0;
    }

    // Compute explicit immediate dominators

    for ( let currentPreNumber = 1; currentPreNumber < nextBlockNum; ++currentPreNumber )
    {
        const w = graph.get( currentPreNumber );

        if ( w.dom !== graph.get( w.semi ) )
            w.dom = w.dom.dom;
    }
}

/**
 * @param {Node[]} nodes
 */
function llvm( nodes )
{
    const
        root = nodes[ 0 ],
        idoms = [ root ];

    let gen;

    let changed = true;

    nodes.forEach( n => n.init_traversal() );

    while ( changed )
    {
        changed = false;
        DFS( nodes, { rpost: node => {

                if ( node === root ) return;

                let idom = null;

                node.preds.forEach( p => {
                    if ( !p ) return;
                    if ( !idom )
                        idom = p;
                    else
                    {
                        if ( p.generation === -1 ) return;

                        let b1 = idom,
                            b2 = p;

                        console.log( `node: ${node}` );
                        console.log( `    idom: ${b1}` );
                        console.log( `    pred: ${b2}` );
                        while ( b1.post !== b2.post )
                        {
                            console.log( `b1.post = ${b1.post} !== b2.post = ${b2.post}` );
                            while ( b1.post < b2.post )
                                b1 = idoms[ b1.pre ];
                            while ( b2.post < b1.post )
                                b2 = idoms[ b2.pre ];
                        }
                        idom = b1;
                    }
                } );

                console.log( `propcessed ${node.pre + 1}, post: ${node.post + 1}` );
                node.generation = 0;
                if ( idoms[ node.pre ] !== idom )
                {
                    idoms[ node.pre ] = idom;
                    changed = true;
                }
            }
        } );
    }

    nodes.forEach( n => {
        n.chkDom = idoms[ n.pre ];
        n.domSuccs = [];
    } );
    nodes.filter( n => n.chkDom ).forEach( n => n.chkDom.domSuccs.push( n ) );

    traversal.generation = gen;
}

/**
 * @param {Node[]} nodes
 * @param {object} [cbs={}]
 */
function FindDoms( nodes, cbs = {} )
{
    const
        invoke  = caller( cbs ),
        initial = invoke( 'initial' ),
        iter    = invoke( 'iter' );

    let changed = true,
        gen = traversal.generation + 2;

    nodes.forEach( n => {
        n.generation = gen - 1;
        n.chkDom = null;
        if ( n.isStart ) n.chkDom = n;
    } );
    // nodes[ 0 ].chkDom = nodes[ 0 ];

    initial( nodes );

    /**
     * @param {Node} finger1
     * @param {Node} finger2
     * @return {*}
     */
    function intersect( finger1, finger2 )
    {
        while ( finger1.post !== finger2.post )
        {
            while ( finger1.post < finger2.post )
                finger1 = finger1.chkDom;
            while ( finger2.post < finger1.post )
                finger2 = finger2.chkDom;
        }

        return finger1;
    }

    /**
     * @param {Node} b
     */
    function idoms( b )
    {
        b.generation = gen;

        if ( !b.pre ) return;

        let idom = b.preds.find( p => p.generation === traversal.generation );

        const fp = b.preds.filter( p => p !== idom );

        if ( !idom )
            console.log( `no idom: ${b}` );

        fp.forEach( p => p.chkDom && ( idom = intersect( p, idom ) ) );

        if ( b.chkDom !== idom )
        {
            b.chkDom = idom;
            changed = true;
        }
    }

    while ( changed )
    {
        traversal.generation += 2;
        changed = false;
        DFS( nodes, { rpost: idoms } );
        iter( nodes );
    }

    nodes
        .map( n => {
            n.domSuccs = [];
            return n;
        } )
        .filter( n => n.chkDom && n.chkDom !== n )
        .forEach( n => n.chkDom.domSuccs.push( n ) );

    /**
     * Find dominance frontiers
     *
     * @param {Node} b
     */
    function find_frontier( b )
    {
        // b.frontier.add( b );
        if ( !b.preds.length ) return;

        if ( b.preds.length === 1 )
        {
            b.preds[ 0 ].frontier.add( b );
            return;
        }

        b.preds.forEach( runner => {

            while ( runner !== b.chkDom )
            {
                runner.frontier.add( b );
                runner = runner.chkDom;
            }
        } );
    }

    nodes.forEach( find_frontier );

    traversal.generation = gen;
    // DFS( nodes, { rpost: find_frontier } );
}

module.exports = { DominatorTreeBuilder, FindDoms, llvm };