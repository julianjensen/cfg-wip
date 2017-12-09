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
    assert    = require( 'assert' ),
    log       = console.log;

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
 * @param {BasicBlockList|NodeList} graph
 * @param {number} nextBlockNum
 */
function DominatorTreeBuilder( graph, nextBlockNum )
{
    const /**
           * @param {BasicBlock|Node} from - Vertex 𝑣
           * @param {BasicBlock|Node} to   - Vertex 𝑤
           */
          link = ( from, to ) => to.ancestor = from,

          /**
           * @param {BasicBlock|Node} v
           */
          compress = v => {
              if ( !v.ancestor || !v.ancestor.ancestor ) return;

              compress( v.ancestor );

              if ( v.ancestor.label.semi.preNumber < v.label.semi.preNumber ) v.label = v.ancestor.label;

              v.ancestor = v.ancestor.ancestor;
          },
          /**
           * If 𝑣 is the root of a tree in the forest, return 𝑣. Otherwise, let 𝑟 be the root
           * of the tree in the forest which contains 𝑣. Return any vertex 𝑢 ≠ 𝑟 of minimum 𝑠𝑒𝑚𝑖❲𝑢❳
           * on the path 𝑟 ⥅ 𝑣.
           *
           * @param {BasicBlock|Node} v
           * @return {*}
           */
          _eval    = v => {
              if ( !v.ancestor ) return v;

              compress( v );
              return v.label;
          };

    // graph.forEach( n => n.resetLT() );

    // Step 1. Compute depth first pre-numbering.
    // Already done as part of the blockList initial_walk()

    // Steps 2 and 3. Compute semi dominators and implicit immediate dominators.
    let currentPreNumber = nextBlockNum;
    console.log( '---------------------------------------- START LT @' + currentPreNumber );
    graph.forEach( block => console.log( block.toString() ) );
    console.log( `by preN - 1: ${graph.getPreN( currentPreNumber - 1 )}` );

    console.log( '---------------------------------------- START 2 & 3, LT @' + currentPreNumber );
    while ( currentPreNumber-- > 1 )
    {
        let block = graph.getPreN( currentPreNumber );

        console.log( `current block => currentPreNumber: ${currentPreNumber + 1}, block: ${block}\n` );
        // Step 2:

        block.preds.forEach( p => {
            const er = _eval( p );
            console.log( `eval semi: ${er.semi.preNumber + 1}, block.semi: ${block.semi.preNumber + 1}, eval: ${er}` );
            block.semi = graph.getPreN( Math.min( er.semi.preNumber, block.semi.preNumber ) );
        } );

        let bucketPreNumber = block.semi.preNumber;

        console.log( `${currentPreNumber + 1}: block ${block.name}, semi: ${block.semi.preNumber + 1}, bucketPreNumber: ${bucketPreNumber}` );

        assert( bucketPreNumber <= currentPreNumber );

        graph.getPreN( bucketPreNumber ).bucket.push( block );
        link( block.parent, block );

        // Step 3:
        for ( const semiDominee of block.parent.bucket )
        {
            const possibleDominator = _eval( semiDominee );

            assert( graph.getPreN( semiDominee.semi.preNumber ) === block.parent );

            if ( possibleDominator.semi.preNumber < semiDominee.semi.preNumber ) semiDominee.dom = possibleDominator;
            else semiDominee.dom = block.parent;
        }

        block.parent.bucket.length = 0;
    }

    // Step 4. Compute explicit immediate dominators

    currentPreNumber = nextBlockNum;

    while ( currentPreNumber-- > 1 )
    {
        let block = graph.getPreN( currentPreNumber );

        // Step 2:
        block.preds.forEach( p => block.semi = graph.getPreN( Math.min( _eval( p ).semi.preNumber, block.semi.preNumber ) ) );

        let bucketPreNumber = block.semi.preNumber;

        assert( bucketPreNumber <= currentPreNumber );

        graph.getPreN( bucketPreNumber ).bucket.push( block );
        link( block.parent, block );

        // Step 3:
        for ( const semiDominee of block.parent.bucket )
        {
            const possibleDominator = _eval( semiDominee );

            assert( graph.getPreN( semiDominee.semi.preNumber ) === block.parent );

            if ( possibleDominator.semi.preNumber < semiDominee.semi.preNumber ) semiDominee.dom = possibleDominator;
            else semiDominee.dom = block.parent;
        }

        block.parent.bucket.length = 0;
    }

    // Compute explicit immediate dominators

    for ( let currentPreNumber = 1; currentPreNumber < nextBlockNum; ++currentPreNumber )
    {
        const w = graph.getPreN( currentPreNumber );

        if ( w.dom !== graph.getPreN( w.semi.preNumber ) ) w.dom = w.dom.dom;
    }
}

/**
 * @typedef {object} DomNode
 * @property {Node} node
 * @property {number} id
 * @property {?DomNode} idom
 * @property {Array<DomNode>} domSuccs
 */

/**
 * @typedef {Array<DomNode>} DomTree
 */

/**
 * @param {NodeList} nodes
 * @param {object} [cbs={}]
 * @return {DomTree}
 */
function FindDoms( nodes, cbs = {} )
{
    const
        invoke  = caller( cbs ),
        initial = invoke( 'initial' ),
        iter    = invoke( 'iter' ),
        idoms   = [];

    let changed = true;

    nodes.forEach( n => n.isStart && ( idoms[ n.pre ] = n.chkDom = n ) );

    initial( nodes );

    /**
     * @param {Node} b
     *
     */
    function fidoms( b )
    {
        if ( b.isStart ) return;

        let idom;

        b.preds.forEach( p => {
            if ( !idoms[ p.pre ] ) return;
            if ( !idom ) idom = p;
            else
            {
                let finger1 = p,
                    finger2 = idom;

                while ( finger1.post !== finger2.post )
                {
                    while ( finger1.post < finger2.post ) finger1 = idoms[ finger1.pre ];
                    while ( finger2.post < finger1.post ) finger2 = idoms[ finger2.pre ];
                }

                idom = finger1;
            }
        } );

        if ( idoms[ b.pre ] !== idom )
        {
            idoms[ b.pre ] = idom;
            changed        = true;
        }
    }

    while ( changed )
    {
        changed = false;
        DFS( nodes, { rpost: fidoms } );
        iter( nodes );
    }

    const frontiers = [];

    /**
     * Find dominance frontiers
     */
    nodes.forEach( b => frontiers[ b.pre ] = new Set() );

    nodes
        .forEach( b => {
            if ( b.preds.length < 2 ) return;

            b.preds.forEach( runner => {

                while ( runner !== idoms[ b.pre ] )
                {
                    frontiers[ runner.pre ].add( b );
                    runner = idoms[ runner.pre ];
                }
            } );
        } );

    const domTree = nodes
        .map( ( n, i ) => ( {
            node:     n,
            id:       i,
            pre: n.pre,
            idom:     n.isStart ? void 0 : idoms[ n.pre ],
            domSuccs: [],
            frontier: [ ...frontiers[ n.pre ] ]
        } ) )
        .sort( ( a, b ) => a.pre - b.pre );

    return domTree
        .map( d => {
            if ( !d.idom ) return d;
            d.idom = domTree[ d.idom.pre ];
            d.idom.domSuccs.push( d );
            return d;
        } );
}

module.exports = {
    DominatorTreeBuilder,
    FindDoms
};
