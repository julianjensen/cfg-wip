/** ******************************************************************************************************************
 * @file Describe what dominators does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 19-Nov-2017
 *********************************************************************************************************************/

"use strict";


// import { ExtendedGraphNodeWorklist, GraphNodeWithOrder, GraphVisitOrder } from "./graph-node-worklist";

import { BasicBlock } from "./misc";

const
    adder = s => val => {
        if ( s.has( val ) ) return false;
        s.add( val );
        return true;
    },
    assert = require( 'assert' );


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
 */
class DominatorTreeBuilder
{
    /**
     * @param {BasicBlockList} blockList
     */
    constructor( blockList )
    {
        this.graph = blockList;
    }

    /** */
    compute()
    {
        // this.computeDepthFirstPreNumbering(); // Step 1. Already done as part of the blockList initial_walk()
        this.compute_semi_dominators_and_implicit_immediate_dominators(); // Steps 2 and 3.
        this.compute_explicit_immediate_dominators(); // Step 4.
    }

    /**
     *
     */
    compute_semi_dominators_and_implicit_immediate_dominators()
    {
        let currentPreNumber = BasicBlock.pre;

        while ( currentPreNumber-- > 1 )
        {
            let block = this.graph.get( currentPreNumber );

            // Step 2:
            block.preds.forEach( p => block.semi = Math.min( this.eval( p ).semi, block.semi ) );

            let bucketPreNumber = block.semi;

            assert( bucketPreNumber <= currentPreNumber );

            this.graph.get( bucketPreNumber ).bucket.push( block );
            this.link( block.parent, block );

            // Step 3:
            for ( const semiDominee of block.parent.bucket )
            {
                const
                    possibleDominator = this.eval( semiDominee );

                assert( this.graph.get( semiDominee.semi ) === block.parent );

                if ( possibleDominator.semi < semiDominee.semi )
                    semiDominee.dom = possibleDominator;
                else
                    semiDominee.dom = block.parent;
            }

            block.parent.bucket.length = 0;
        }
    }

    compute_explicit_immediate_dominators()
    {
        for ( let currentPreNumber = 1; currentPreNumber < BasicBlock.pre; ++currentPreNumber )
        {
            const w = this.graph.get( currentPreNumber );

            if ( w.dom !== this.graph.get( w.semi ) )
                w.dom = w.dom.dom;
        }
    }

    /**
     * @param {BasicBlock} from - Vertex 𝑣
     * @param {BasicBlock} to   - Vertex 𝑤
     */
    link( from, to )
    {
        to.ancestor = from;
    }

    // noinspection JSAnnotator
    /**
     * If 𝑣 is the root of a tree in the forest, return 𝑣. Otherwise, let 𝑟 be the root
     * of the tree in the forest which contains 𝑣. Return any vertex 𝑢 ≠ 𝑟 of minimum 𝑠𝑒𝑚𝑖❲𝑢❳
     * on the path 𝑟 ⥅ 𝑣.
     *
     * @param {BasicBlock} v
     * @return {*}
     */
    eval( v )
    {
        if ( !v.ancestor ) return v;

        this.compress( v );
        return v.label;
    }

    /**
     *
     * @param {BasicBlock} v
     */
    compress( v )
    {
        if ( !v.ancestor || !v.ancestor.ancestor ) return;

        this.compress( v.ancestor );

        if ( v.ancestor.label.semi < v.label.semi )
            v.label = v.ancestor.label;

        v.ancestor = v.ancestor.ancestor;
    }

}

/** */
class Dominators
{
    /**
     * @param {BasicBlockList} graph
     */
    constructor( graph )
    {
        this.graph = graph;

        const lengauerTarjan = new DominatorTreeBuilder( graph );
        lengauerTarjan.compute();

        // From here we want to build a spanning tree with both upward and downward links and we want
        // to do a search over this tree to compute pre and post numbers that can be used for dominance
        // tests.

        for ( let blockIndex = BasicBlock.pre; blockIndex--; )
        {
            const block = this.graph.get( blockIndex );

            if ( !block ) continue;

            const idomBlock = block.idomParent = block.dom;

            if ( idomBlock )
                idomBlock.kids.push( block );

            let nextPreNumber  = 0,
                nextPostNumber = 0;

            // Plain stack-based worklist because we are guaranteed to see each block exactly once anyway.

            const worklist = [ { node: graph.entry, order: 1 } ];

            while ( worklist.length )
            {
                const { node, order } = worklist.pop();

                switch ( order )
                {
                    case 1:
                        node.preNumber = nextPreNumber++;

                        worklist.push( { node, order: -1 } );

                        for ( const kid of node.kids )
                            worklist.push( { node: kid, order: 1 } );
                        break;

                    case -1:
                        node.postNumber = nextPostNumber++;
                        break;
                }
            }
        }
    }

    /**
     * @param {number|BasicBlock} from
     * @param {number|BasicBlock} to
     * @return {boolean}
     */
    strictlyDominates( from, to )
    {
        from = typeof from === 'number' ? this.graph.get( from ) : from;
        to = typeof to === 'number' ? this.graph.get( to ) : to;

        return to.preNumber > from.preNumber && to.postNumber < from.postNumber;
    }

    /**
     * @param {number|BasicBlock} from
     * @param {number|BasicBlock} to
     * @return {boolean}
     */
    dominates( from, to )
    {
        return from === to || this.strictlyDominates( from, to );
    }

    /**
     * Returns the immediate dominator of this block. Returns null for the root block.
     *
     * @param {number|BasicBlock} block
     */
    idom( block )
    {
        return this.graph.get( block ).idomParent;
    }

    /**
     * @param {BasicBlock|number} to
     * @param {function} functor
     */
    forAllStrictDominatorsOf( to, functor )
    {
        for ( let block = this.graph.get( to ).idomParent; block; block = this.graph.get( block ).idomParent )
            functor( block );
    }

    /**
     * Note: This will visit the dominators starting with the 'to' node and moving up the idom tree
     * until it gets to the root. Some clients of this function, like B3::moveConstants(), rely on this
     * order.
     *
     * @param {BasicBlock|number} to
     * @param {function} functor
     */
    forAllDominatorsOf( to, functor )
    {
        for ( let block = this.graph.get( to ); block; block = this.graph.get( block ).idomParent )
            functor( block );
    }

    /**
     * @param {BasicBlock|number} from
     * @param {function} functor
     */
    forAllBlocksStrictlyDominatedBy( from, functor )
    {
        let worklist = this.graph.get( from ).kids.slice();

        while ( worklist.length )
        {
            const block = worklist.pop();
            functor( block );
            worklist = worklist.concat( block.kids );
        }
    }

    /**
     * @param {BasicBlock|number} from
     * @param {function} functor
     */
    forAllBlocksDominatedBy( from, functor )
    {
        let worklist = [ this.graph.get( from ) ];

        while ( worklist.length )
        {
            const block = worklist.pop();
            functor( block );
            worklist = worklist.concat( block.kids );
        }
    }

    /**
     * @param {BasicBlock|number} to
     * @return {Set<BasicBlock>}
     */
    strictDominatorsOf( to )
    {
        const result = new Set();

        this.forAllStrictDominatorsOf( to, node => result.add( node ) );
        return result;
    }


    /**
     * @param {BasicBlock|number} to
     * @return {Set<BasicBlock>}
     */
    dominatorsOf( to )
    {
        const result = new Set();

        this.forAllDominatorsOf( to, node => result.add( node ) );
        return result;
    }

    /**
     * @param {BasicBlock|number} from
     * @return {Set<BasicBlock>}
     */
    blocksStrictlyDominatedBy( from )
    {
        const result = new Set();

        this.forAllBlocksStrictlyDominatedBy( from, node => result.add( node ) );
        return result;
    }

    /**
     * @param {BasicBlock|number} from
     * @return {Set<BasicBlock>}
     */
    blocksDominatedBy( from )
    {
        const result = new Set();

        this.forAllBlocksDominatedBy( from, node => result.add( node ) );
        return result;
    }

    /**
     * @param {BasicBlock|number} from
     * @param {function} functor
     * @return {Set<BasicBlock>}
     */
    forAllBlocksInDominanceFrontierOf( from, functor )
    {
        const
            add = adder( new Set() );

        this.forAllBlocksInDominanceFrontierOfImpl( from, block => add( block ) && functor( block ) );
    }

    /**
     * @param {BasicBlock|number} from
     * @return {Set<BasicBlock>}
     */
    dominanceFrontierOf( from )
    {
        const result = new Set();

        this.forAllBlocksInDominanceFrontierOf( from, node => result.add( node ) );
        return result;
    }

    /**
     * @param {BasicBlock|number} from
     * @param {function} functor
     * @return {Set<BasicBlock>}
     */
    forAllBlocksInIteratedDominanceFrontierOf( from, functor )
    {
        const caller = block => { functor( block ); return true; };

        this.forAllBlocksInPrunedIteratedDominanceFrontierOf( from, caller );
    }

    /**
     * This is a close relative of forAllBlocksInIteratedDominanceFrontierOf(), which allows the
     * given functor to return false to indicate that we don't wish to consider the given block.
     * Useful for computing pruned SSA form.
     *
     * @param {BasicBlock|number} from
     * @param {function} functor
     * @return {Set<BasicBlock>}
     */
    forAllBlocksInPrunedIteratedDominanceFrontierOf( from, functor )
    {
        const
            set = new Set(),
            add = adder( set );

        this.forAllBlocksInIteratedDominanceFrontierOfImpl( from, block => add( block ) && functor( block ) );
    }

    /**
     * @param {BasicBlock|number} from
     * @return {Set<BasicBlock>}
     */
    iteratedDominanceFrontierOf( from )
    {
        const
            _result = new Set(),
            result = adder( _result );

        this.forAllBlocksInIteratedDominanceFrontierOfImpl( from, result );

        return _result;
    }

    /**
     * Paraphrasing from http:*en.wikipedia.org/wiki/Dominator_(graph_theory):
     *
     * >    "The dominance frontier of a block 'from' is the set of all blocks 'to' such that
     * >    'from' dominates an immediate predecessor of 'to', but 'from' does not strictly
     * >    dominate 'to'."
     *
     * A useful corner case to remember: a block may be in its own dominance frontier if it has
     * a loop edge to itself, since it dominates itself and so it dominates its own immediate
     * predecessor, and a block never strictly dominates itself.
     *
     * @param {BasicBlock|number} from
     * @param {function} functor
     */
    forAllBlocksInDominanceFrontierOfImpl( from, functor )
    {
        this.forAllBlocksDominatedBy( from, block => block.succs.forEach( to => !this.strictlyDominates( from, to ) && functor( from, to ) ) );
    }

    forAllBlocksInIteratedDominanceFrontierOfImpl( from, functor )
    {
        const worklist = [ from ];

        while ( worklist.length )
        {
            const block = worklist.pop();

            this.forAllBlocksInDominanceFrontierOfImpl( block, otherBlock => functor( otherBlock ) && worklist.push( otherBlock ) );
        }
    }
}

module.exports = {
    DominatorTreeBuilder, Dominators
};
