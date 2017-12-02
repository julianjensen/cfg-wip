/** ******************************************************************************************************************
 * @file Describe what dominators does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 19-Nov-2017
 *********************************************************************************************************************/

"use strict";


// import { ExtendedGraphNodeWorklist, GraphNodeWithOrder, GraphVisitOrder } from "./graph-node-worklist";

const
    BasicBlock = require( '../basic-block' ),
    adder = s => val => {
        if ( s.has( val ) ) return false;
        s.add( val );
        return true;
    },
    assert = require( 'assert' );


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
