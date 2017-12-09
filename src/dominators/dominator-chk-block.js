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

class DominatorTree
{
    /**
     * @param {DomTree} domTree
     */
    constructor( domTree )
    {
        this.domTree = domTree;
        this.domBlocks = domTree.map( dn => new DominatorBlock( this, dn ) );
        this.byPre = [];
        this.domBlocks.forEach( db => this.byPre[ db.pre ] = db );
        this.domBlocks.forEach( db => db.succs = db.succs.map( s => this.byPre[ s.pre ] ) );

    }
}

/** */
class DominatorBlock
{
    /**
     * @param {DominatorTree} domTree
     * @param {DomNode} domNode
     */
    constructor( domTree, domNode )
    {
        this.domTree = domTree;
        this.domNode = domNode;

        this.node = domNode.node;
        this.id = domNode.id;
        this.pre = domNode.pre;
        this.post = domNode.node.post;
        this.idom = domNode.idom;
        this.succs = domNode.domSuccs;
        this.frontier = domNode.frontier;
        this._doms = null;
        this.cache = {};

        Reflect.getOwnPropertyDescriptors( DominatorBlock.prototype )
            .forEach( desc => {
                if ( typeof desc.name !== 'string' || typeof desc.value !== 'function' || desc.name.startsWith( 'for' ) || desc.name === 'strictlyDominates' ) return;
                this[ desc.name ] = ( ...args ) => {
                    if ( this.cache[ desc.name ] ) return this.cache[ desc.name ];
                    return this.cache[ desc.name ] = desc.value( ...args );
                };
            } );
    }

    /**
     * @param {BasicBlock|Node|DomNode} [to\
     * @return {boolean|Array<DominatorBlock>}
     */
    strictlyDominates( to )
    {
        if ( to ) return to.pre > this.pre && to.post < this.post;

        const result = new Set();

        this.forStrictlyDominates( node => result.add( node ) );

        return [ ...result ];
    }

    /**
     * @param {number|BasicBlock} to
     * @return {boolean}
     */
    dominates( to )
    {
        return this.pre === to.pre || this.strictly( to );
    }

    /**
     * @param {function(DominatorBlock)} functor
     */
    forStrictDominators( functor )
    {
        let block = this.idom;

        while ( block )
        {
            functor( block );
            block = block.idom;
        }
    }

    /**
     * Note: This will visit the dominators starting with the 'to' node and moving up the idom tree
     * until it gets to the root.
     *
     * @param {function} functor
     */
    forDominators( functor )
    {
        let block = this;

        while ( block )
        {
            functor( block );
            block = block.idom;
        }
    }

    /**
     * @return {Array<DominatorBlock>}
     */
    strictDominators()
    {
        const result = new Set();

        this.forStrictDominators( node => result.add( node ) );
        return [ ...result ];
    }

    /**
     * @return {Array<DominatorBlock>}
     */
    dominators()
    {
        const result = new Set();

        this.forDominators( node => result.add( node ) );
        return [ ...result ];
    }

    /**
     * @param {function} functor
     */
    forStrictlyDominates( functor )
    {
        let worklist = this.succs.slice();

        while ( worklist.length )
        {
            const block = worklist.pop();
            functor( block );
            worklist = worklist.concat( block.succs );
        }
    }

    /**
     * @param {function} functor
     */
    forDominates( functor )
    {
        let worklist = [ this ];

        while ( worklist.length )
        {
            const block = worklist.pop();
            functor( block );
            worklist = worklist.concat( block.succs );
        }
    }

    /**
     * @param {function} functor
     */
    forDominanceFrontier( functor )
    {
        const
            add = adder( new Set() );

        this._forDominanceFrontier( block => add( block ) && functor( block ) );
    }

    /**
     * @return {Array<DominatorBlock>}
     */
    dominanceFrontierOf()
    {
        const result = new Set();

        this.forDominanceFrontier( node => result.add( node ) );
        return [ ...result ];
    }

    /**
     * @param {function} functor
     */
    forIteratedDominanceFrontier( functor )
    {
        const caller = block => {
            functor( block );
            return true;
        };

        this.forPrunedIteratedDominanceFrontier( caller );
    }

    /**
     * This is a close relative of forAllBlocksInIteratedDominanceFrontierOf(), which allows the
     * given functor to return false to indicate that we don't wish to consider the given block.
     * Useful for computing pruned SSA form.
     *
     * @param {function} functor
     */
    forPrunedIteratedDominanceFrontier( functor )
    {
        const
            set = new Set(),
            add = adder( set );

        this._forIteratedDominanceFrontier( block => add( block ) && functor( block ) );
    }

    /**
     * @return {Array<DominatorBlock>}
     */
    iteratedDominanceFrontier()
    {
        const
            _result = new Set(),
            result  = adder( _result );

        this._forIteratedDominanceFrontier( result );

        return [ ..._result ];
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
    _forDominanceFrontier( functor )
    {
        this.forDominates( block => block.succs.forEach( to => !this.strictlyDominates( to ) && functor( this, to ) ) );
    }

    /**
     * @param {function} functor
     * @private
     */
    _forIteratedDominanceFrontier( functor )
    {
        const worklist = [ this ];

        while ( worklist.length )
            worklist.pop()._forDominanceFrontier( otherBlock => functor( otherBlock ) && worklist.push( otherBlock ) );
    }

    toString()
    {
        const
            doms    = this.dominated(),
            idComma = arr => arr.map( d => d.id + 1 ).join( ', ' );

        return `${dn.id + 1} -> ${idComma( dn.domSuccs )}, doms: ${doms.join( ', ' )}, frontier: ${idComma( dn.frontier || [] )}`;
    }
}

module.exports = { DominatorTree, DominatorBlock };
