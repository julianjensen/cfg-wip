/** ****************************************************************************************************
 * File: dominator-block (dominators)
 * @author julian on 11/29/17
 * @version 1.0.0
 * @copyright Planet3, Inc.
 *******************************************************************************************************/
'use strict';

const
    { as_table } = require( '../dump' ),
    adder        = s => val => {
        if ( s.has( val ) ) return false;
        s.add( val );
        return true;
    };

/**
 * @template T
 */
class DominatorTree
{
    /**
     * @param {NodeList} nodeList
     * @param {Array<number>} idoms
     * @param {string} [title]
     * @param {boolean} [postDom]
     */
    constructor( nodeList, idoms, title = 'Dominator Tree', postDom = false )
    {
        /** @type {DominatorBlock} */
        this.domNodes = idoms.map( ( idom, nodeId ) => new DominatorBlock( this, nodeList.get( nodeId ), idom ) );
        /** @type {T} */
        this._root = null;
        /** @type {T} */
        this._exit = null;
        this.domNodes.forEach( db => {
            db.post_init();
            if ( db.node.isStart ) this._root = db;
            if ( db.node.isExit ) this._exit = db;
        } );

        if ( postDom )
            [ this._root, this._exit ] = [ this._exit, this._root ];

        this.calc_frontiers( this.domNodes, postDom );

        /** @type {string} */
        this.name      = title;
    }

    /**
     * Find dominance frontiers
     */
    calc_frontiers( domTree, postDom )
    {
        const outEdges = postDom ? 'succs' : 'preds';

        domTree.forEach( dn => dn.frontier = new Set() );

        domTree.forEach( dn => {
                const
                    b     = dn.node,
                    edges = b[ outEdges ];

                if ( edges.length < 2 ) return;

                edges.forEach( runner => {
                    while ( runner.id !== dn.idom.id )
                    {
                        const rdt = this.domNodes[ runner.id ];

                        rdt.frontier.add( dn );
                        runner = rdt.idom.node;
                    }
                } );
            } );

        domTree.forEach( dn => dn.frontier = [ ...dn.frontier ] );
    }

    /**
     * @return {T | *}
     */
    get root()
    {
        return this._root;
    }

    /**
     * @return {T | *}
     */
    get start()
    {
        return this._root;
    }

    /**
     * @return {T | *}
     */
    get exit()
    {
        return this._exit;
    }

    /**
     * @return {T | *}
     */
    get end()
    {
        return this._exit;
    }

    /**
     * @type {Iterable<DominatorBlock>}
     */
    * [ Symbol.iterator ]()
    {
        yield* this.byPre;
    }

    /**
     * @type {Iterable<DominatorBlock>}
     */
    * byId()
    {
        yield* this.domBlocks.sort( ( a, b ) => a.id - b.id );
    }

    /**
     * @return {string}
     */
    toString()
    {
        return this.domBlocks.map( b => `${b}` ).join( '\n' );
    }

    /**
     * Current columns: `id, pre, post, succs, dominates, frontier, dom. by`
     */
    toTable()
    {
        as_table( this.name, [ 'id', 'pre', 'post', 'succs', 'dominates', 'frontier', 'dominated by' ], this.domNodes.map( b => b.toRow() ) );
        return this;
    }
}

/** */
class DominatorBlock
{
    /**
     * @param {DominatorTree} tree
     * @param {Node} node
     * @param {number} idom
     */
    constructor( tree, node, idom )
    {
        this.tree = tree;
        this.node = node;
        this.id = node.id;
        this.idomId = idom;
        this.frontier = [];
        this.succs = [];
    }

    /**
     *
     */
    post_init()
    {
        if ( this.node.isStart ) return;

        this.idom     = this.tree.domNodes[ this.idomId ];
        this.idom.succs.push( this );
    }

    /** ****************************************************************************************************************************
     *
     * DOMINATORS UP
     *
     *******************************************************************************************************************************/

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
        let block = this.idom;
        const r   = [];

        while ( block )
        {
            r.push( block );
            block = block.idom;
        }

        return r;
    }

    /**
     * @return {Array<DominatorBlock>}
     */
    dominators()
    {
        let block = this;

        const r = [];

        while ( block )
        {
            r.push( block );
            block = block.idom;
        }

        return r;
    }

    /** ****************************************************************************************************************************
     *
     * DOMINATES DOWN
     *
     *******************************************************************************************************************************/

    /**
     * @param {BasicBlock|Node|DomNode} [to]
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
        return this.pre === to.pre || this.strictlyDominates( to );
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

    /** ****************************************************************************************************************************
     *
     * DOMINANCE FRONTIER DOWN
     *
     *******************************************************************************************************************************/

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
    dominanceFrontier()
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
     * This is a close relative of forIteratedDominanceFrontier(), which allows the
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

    /**
     * @return {string}
     */
    toString()
    {
        const
            doms    = [],
            idComma = arr => arr.map( d => d.id + 1 ).join( ', ' );

        this.forStrictlyDominates( b => doms.push( b ) );

        return `${this.id + 1} -> ${idComma( this.succs )}, doms: ${idComma( doms )}, frontier: ${idComma( this.frontier || [] )}`;
    }

    /**
     * return {Array<string|number>}
     */
    toRow()
    {
        const
            doms    = [],
            idoms   = this.dominators(),
            idComma = arr => arr.map( d => d.id + 1 ).join( ' ' );

        this.forStrictlyDominates( b => doms.push( b ) );
        // this.forDominators( b => idoms.push( b ) );

        return [ this.id + 1, this.node.pre + 1, this.node.post + 1, idComma( this.succs ), idComma( doms ), idComma( this.frontier ), idComma( idoms ) ];
    }
}

module.exports = { DominatorTree, DominatorBlock };
