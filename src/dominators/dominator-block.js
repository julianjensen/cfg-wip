/** ****************************************************************************************************
 * File: dominator-block (dominators)
 * @author julian on 11/29/17
 * @version 1.0.0
 * @copyright Planet3, Inc.
 *******************************************************************************************************/
'use strict';

const
    { as_table } = require( '../dump' ),
    adder = s => val => {
        if ( s.has( val ) ) return false;
        s.add( val );
        return true;
    };

/**
 * @typedef {object} DomNode
 * @template T
 * @property {T} node
 * @property {number} id
 * @property {number} pre
 * @property {?DomNode} idom
 * @property {Array<DomNode>} domSuccs
 * @property {Array<DomNode>} doms
 * @property {Set<DomNode>|Array<DomNode>} frontier
 * @property {DominatorBlock} [db]
 */

/**
 * @typedef {Array<DomNode>} DomTree
 */


/**
 * @template T
 */
class DominatorTree
{
    /**
     * @param {DomTree|Array<Node>} domTree
     * @param {string} [title]
     */
    constructor( domTree, title = 'Dominator Tree' )
    {
        this.name = title;
        this.domTree = domTree;
        this.domBlocks = domTree.map( dn => dn.db = new DominatorBlock( this, dn ) );
        this.byPre = [];
        this.domBlocks.forEach( db => {
            this.byPre[ db.pre ] = db;
            if ( db.node.isStart ) this._root = db;
            if ( db.node.isExit ) this._exit = db;
        } );
        this.domBlocks.forEach( db => db.post_init() );
        // this.domBlocks.forEach( db => db.succs = db.succs.map( s => this.byPre[ s.pre ] ) );

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
    * [Symbol.iterator]()
    {
        yield *this.byPre;
    }

    /**
     * @type {Iterable<DominatorBlock>}
     */
    * byId()
    {
        yield *this.domBlocks.sort( ( a, b ) => a.id - b.id );
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
        as_table( this.name, [ 'id', 'pre', 'post', 'succs', 'dominates', 'frontier', 'dominated by' ], this.domBlocks.map( b => b.toRow() ) );
    }
}

/** */
class DominatorBlock
{
    /**
     * @param {DominatorTree} domTree
     * @param {DomNode|Node} domNode
     */
    constructor( domTree, domNode )
    {
        if ( domNode && domNode.constructor && domNode.constructor.name === 'Node' )
        {
            domNode = {
                node: domNode,
                id: domNode.id,
                pre: domNode.pre,
                frontier: [],
                idom: null,
                domSuccs: null
            };

            this.parent = domNode.parent;
            this.best = this.semi = domNode;
            this.ancestor = null;
            this.bucket = [];
        }

        this.domTree = domTree;
        this.domNode = domNode;

        this.node = domNode.node;
        this.id = domNode.id;
        this.pre = domNode.pre;
        this.post = domNode.node.post;

        // Object.getOwnPropertyDescriptors( DominatorBlock.prototype )
        //     .forEach( desc => {
        //         if ( typeof desc.name !== 'string' || typeof desc.value !== 'function' || desc.name.startsWith( 'for' ) || desc.name.startsWith( '_' ) || [ 'strictlyDominates', 'toString' ].includes( desc.name ) ) return;
        //         this[ desc.name ] = ( ...args ) => {
        //             if ( this.cache[ desc.name ] ) return this.cache[ desc.name ];
        //             return this.cache[ desc.name ] = desc.value( ...args );
        //         };
        //     } );
    }

    /**
     *
     */
    post_init()
    {
        const
            dtPre = this.domTree.byPre,
            domNode = this.domNode;

        this.idom = domNode.idom && dtPre[ domNode.idom.pre ];
        this.succs = domNode.domSuccs ? domNode.domSuccs.map( dn => dtPre[ dn.pre ] ) : [];
        this.frontier = domNode.frontier.map( dn => dtPre[ dn.pre ] );

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
        const r = [];

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
        if ( this.id === 2 )
        {
            block = this;
        }
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
            idoms = this.dominators(),
            idComma = arr => arr.map( d => d.id + 1 ).join( ' ' );

        this.forStrictlyDominates( b => doms.push( b ) );
        // this.forDominators( b => idoms.push( b ) );

        return [ this.id + 1, this.pre + 1, this.post + 1, idComma( this.succs ), idComma( doms ), idComma( this.frontier ), idComma( idoms ) ];
    }
}

module.exports = { DominatorTree, DominatorBlock };
