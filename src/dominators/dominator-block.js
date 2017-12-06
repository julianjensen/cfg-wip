/** ****************************************************************************************************
 * File: dominator-block (dominators)
 * @author julian on 11/29/17
 * @version 1.0.0
 * @copyright Planet3, Inc.
 *******************************************************************************************************/
'use strict';

const
    adder = s => val => {
        if ( s.has( val ) ) return false;
        s.add( val );
        return true;
    };

/** */
class DominatorBlock
{
    constructor()
    {
        this.resetLT();
    }

    get preNumber()
    {
        return this.pre;
    }

    set preNumber( v )
    {
        this.pre = v;
    }

    post_init()
    {
        if ( this.parent ) this.ancestor = this.parent;
    }

    resetLT()
    {
        this.preDom  = -1;
        this.postDom = -1;
        /** @type {?Node} */
        this.parent = null;

        /** @type {?Node} */
        this.dom = null;
        /** @type {?Node} */
        this.ancestor = null;
        /** @type {?Node[]} */
        this.bucket = [];
        /** @type {?Node} */
        this.label = this;
        /** @type {?Node|DominatorBlock} */
        this.semi = this;
        /** @type {?Node} */
        this.idomParent = null;
        /** @type {Node[]} */
        this.idomKids = [];
        /** @type {Node} */
        this.ltFrontier = [];
        this.semidom = -1;
    }

    /**
     * @param {BasicBlock} to
     * @return {boolean}
     */
    strictlyDominates( to )
    {
        return to.preDom > this.preDom && to.postDom < this.postDom;
    }

    /**
     * @param {number|BasicBlock} to
     * @return {boolean}
     */
    dominates( to )
    {
        return this === to || this.strictlyDominates( to );
    }

    /**
     * Returns the immediate dominator of this block. Returns null for the root block.
     */
    idom()
    {
        return this.idomParent;
    }

    /**
     * @param {function} functor
     */
    forAllStrictDominatorsOf( functor )
    {
        let block = this.idomParent;

        while ( block )
        {
            functor( block );
            block = block.idomParent;
        }
    }

    /**
     * Note: This will visit the dominators starting with the 'to' node and moving up the idom tree
     * until it gets to the root. Some clients of this function, like B3::moveConstants(), rely on this
     * order.
     *
     * @param {function} functor
     */
    forAllDominatorsOf( functor )
    {
        let block = this;

        while ( block )
        {
            functor( block );
            block = block.idomParent;
        }
    }

    /**
     * @param {function} functor
     */
    forAllBlocksStrictlyDominatedBy( functor )
    {
        let worklist = this.idomKids.slice();

        while ( worklist.length )
        {
            const block = worklist.pop();
            functor( block );
            worklist = worklist.concat( block.idomKids );
        }
    }

    /**
     * @param {function} functor
     */
    forAllBlocksDominatedBy( functor )
    {
        let worklist = [ this ];

        while ( worklist.length )
        {
            const block = worklist.pop();
            functor( block );
            worklist = worklist.concat( block.idomKids );
        }
    }

    /**
     * @return {Set<BasicBlock|Node>}
     */
    strictDominatorsOf()
    {
        const result = new Set();

        this.forAllStrictDominatorsOf( node => result.add( node ) );
        return result;
    }

    /**
     * @return {Set<BasicBlock|Node>}
     */
    dominatorsOf()
    {
        const result = new Set();

        this.forAllDominatorsOf( node => result.add( node ) );
        return result;
    }

    /**
     * @return {Set<BasicBlock|Node>}
     */
    blocksStrictlyDominatedBy()
    {
        const result = new Set();

        this.forAllBlocksStrictlyDominatedBy( node => result.add( node ) );
        return result;
    }

    /**
     * @return {Set<BasicBlock|Node>}
     */
    blocksDominatedBy()
    {
        const result = new Set();

        this.forAllBlocksDominatedBy( node => result.add( node ) );
        return result;
    }

    /**
     * @param {function} functor
     * @return {Set<BasicBlock|Node>}
     */
    forAllBlocksInDominanceFrontierOf( functor )
    {
        const
            add = adder( new Set() );

        this.forAllBlocksInDominanceFrontierOfImpl( block => add( block ) && functor( block ) );
    }

    /**
     * @return {Set<BasicBlock|Node>}
     */
    dominanceFrontierOf()
    {
        const result = new Set();

        this.forAllBlocksInDominanceFrontierOf( node => result.add( node ) );
        return result;
    }

    /**
     * @param {function} functor
     * @return {Set<BasicBlock|Node>}
     */
    forAllBlocksInIteratedDominanceFrontierOf( functor )
    {
        const caller = block => {
            functor( block );
            return true;
        };

        this.forAllBlocksInPrunedIteratedDominanceFrontierOf( caller );
    }

    /**
     * This is a close relative of forAllBlocksInIteratedDominanceFrontierOf(), which allows the
     * given functor to return false to indicate that we don't wish to consider the given block.
     * Useful for computing pruned SSA form.
     *
     * @param {function} functor
     * @return {Set<BasicBlock|Node>}
     */
    forAllBlocksInPrunedIteratedDominanceFrontierOf( functor )
    {
        const
            set = new Set(),
            add = adder( set );

        this.forAllBlocksInIteratedDominanceFrontierOfImpl( block => add( block ) && functor( block ) );
    }

    /**
     * @return {Set<BasicBlock|Node>}
     */
    iteratedDominanceFrontierOf()
    {
        const
            _result = new Set(),
            result  = adder( _result );

        this.forAllBlocksInIteratedDominanceFrontierOfImpl( result );

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
     * @param {function} functor
     */
    forAllBlocksInDominanceFrontierOfImpl( functor )
    {
        this.forAllBlocksDominatedBy( block => block.succs.forEach( to => !this.strictlyDominates( to ) && functor( this, to ) ) );
    }

    forAllBlocksInIteratedDominanceFrontierOfImpl( functor )
    {
        const worklist = [ this ];

        while ( worklist.length )
            worklist.pop().forAllBlocksInDominanceFrontierOfImpl( otherBlock => functor( otherBlock ) && worklist.push( otherBlock ) );
    }
}

module.exports = DominatorBlock;
