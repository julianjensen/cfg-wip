/** ******************************************************************************************************************
 * @file Describe what basic-block does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 26-Nov-2017
 *********************************************************************************************************************/
"use strict";

const
    assert                  = require( 'assert' ),
    { VisitorKeys, Syntax } = require( './defines' ),
    ExtArray                = require( './ext-array' ),
    BlockArray              = require( './pred-succ' ),
    DominatorBlock = require( './dominators/dominator-block' ),
    num                     = n => typeof n === 'number' ? n : n ? n.pre : '-';

/** */
class BasicBlock extends DominatorBlock
{
    /**
     * @param {BasicBlock[]} preds
     */
    constructor( ...preds )
    {
        super();

        // this.allocator = new Error().stack.split( /[\r\n]\s+at\s+/ ).slice( 3 ).join( ', ' );

        /** @type {ExtArray<Node>} */
        this.nodes = new ExtArray();

        /** @type {BlockArray} */
        this.preds = new BlockArray();
        this.preds.init( this, 'succs', p => this.indent = p.indent + 1 );
        /** @type {BlockArray} */
        this.succs = new BlockArray();
        this.succs.init( this, 'preds', s => s.indent = this.indent + 1 );

        /** @type {?BasicBlock} */
        this.label = this;
        /** @type {?BasicBlock} */
        this.parent = null;
        /** @type {?BasicBlock} */
        this.ancestor = null;
        /** @type {?BasicBlock} */
        this.dom = null;
        /** @type {BasicBlock} */
        this.idomParent = null;
        /** @type {BasicBlock[]} */
        this.idomKids = [];
        /** @type {?BasicBlock} */
        this.dom = null;
        /** @type {number} */
        this.preNumber = 0;
        /** @type {number} */
        this.postNumber = 0;
        /** @type {number} */
        this.semi = this.pre = BasicBlock.pre++;
        /** @type {BasicBlock[]} */
        this.bucket = [];
        this.rpost = 0;

        this.preds.add( ...preds );
        this.indent = ( this.preds.one() || { indent: 0 } ).indent;
        if ( this.preds.some( p => p.isEntry ) ) this.indent++;

        this.isTest = false;
        /** @type {BasicBlock} */
        this.isTrue = null;
        /** @type {BasicBlock} */
        this.isFalse = null;
        /** @type {BasicBlock} */
        this.isEntry = false;
        /** @type {BasicBlock} */
        this.isExit = false;
        this.scope  = BasicBlock.scopes ? BasicBlock.scopes.current : null;
        this.unique = 'ORG-???';

        /** @type {?BasicBlockList} */
        this.blockList = null;
    }

    // get dom()
    // {
    //     if ( !this._dom ) console.log( `Read access on null dom on ${this.pre}` );
    //     return this._dom;
    // }
    //
    // set dom( v )
    // {
    //     const s = !v ? 'null' : v.pre;
    //
    //     console.log( `Setting dominator of ${this.pre} to ${s}, semi: ${this.semi}` );
    //
    //     this._dom = v;
    // }

    // debug_str()
    // {
    //     let str = [];
    //
    //     if ( this.isEntry ) str.push( 'entry' );
    //     if ( this.isExit ) str.push( 'exit' );
    //     if ( this.isTest ) str.push( 'test' );
    //     // if ( this.isTrue ) str.push( 'true' );
    //     // if ( this.isTrue ) str.push( 'false' );
    //
    //     return `${this.pre} [${str.join( ', ' )}], nodes: ${this.nodes.length}, preds(${this.preds.size}): ${this.preds.map( p => p.pre )}, succs(${this.succs.size}):
    // ${this.succs.map( s => s.pre )}, pedges: ${this.pred_edges().join( ', ' )}, sedges: ${this.succ_edges().join( ', ' )}`;
    //     return `${this.pre} [${str.join( ', ' )}], nodes: ${this.nodes.length}, preds(${this.preds.size}): ${this.preds.map( p => p.pre )}, succs(${this.succs.size}): ${this.succs.map( s => s.pre )}`;
    // }

    /**
     * @param {number} pre
     */
    initialize( pre )
    {
        this.pre    = pre;
        this.unique = 'ORG-' + pre.toString().padStart( 3, '0' );
    }

    /**
     * @return {BasicBlock}
     */
    entry()
    {
        this.isEntry = true;
        return this;
    }

    /**
     * @return {BasicBlock}
     */
    exit()
    {
        this.isExit = true;
        return this;
    }

    /**
     * @return {BasicBlock}
     */
    test()
    {
        this.isTest = true;
        return this;
    }

    /**
     * @param {number} [n=1]
     * @return {BasicBlock}
     */
    right( n = 1 )
    {
        this.indent += n;
        return this;
    }

    /**
     * @param {number} [n=1]
     * @return {BasicBlock}
     */
    left( n = 1 )
    {
        this.indent -= n;
        return this;
    }

    /**
     * @return {boolean}
     */
    hasNodes()
    {
        return this.nodes.notEmpty();
    }

    /**
     * @return {?Node}
     */
    get lastNode()
    {
        return this.nodes.last;
    }

    /**
     * @return {string}
     */
    sids()
    {
        return '[' + this.succs.map( s => s === this.isTrue ? `>${s.pre}` : s === this.isFalse ? `<${s.pre}` : s.pre ).join( ' ' ) + ']';
    }

    /**
     * @return {string}
     */
    pids()
    {
        return '[' + this.preds.map( s => s.pre ).join( ' ' ) + ']';
    }

    /**
     * @return {string}
     */
    node_label()
    {
        return !this.description && this.isTest ? 'TEST' : !this.description ? 'no desc ' + ( this.nodes.length ? this.nodes[ 0 ].type : '-' ) : null;
    }

    /**
     * @return {string}
     */
    graph_label()
    {
        let
            txt = this.description && this.description.length < 16 ? this.description.replace( 'consequent', 'cons' ) : '',
            ln  = this.nodes.length && this.nodes[ 0 ].loc && this.nodes[ 0 ].loc.start.line;

        if ( this.isEntry || this.isExit ) txt += ':' + this.pre;
        return txt ? `${txt}:${this.pre}@${ln}` : `unk:${this.pre}@${ln || ''}`;
    }

    /**
     * @return {string}
     */
    get_class_name()
    {
        if ( !BasicBlock.scopes || !this.scope ) return '';

        const
            s = BasicBlock.scopes,
            c = s.current;

        s.current = this.scope;

        const classScope = BasicBlock.scopes.get_scope_by_type( 'class' );

        if ( !classScope )
        {
            s.current = c;
            return '';
        }

        let className = classScope.name();

        s.current = c;

        return className;
    }

    /**
     * @return {string}
     */
    toString()
    {
        let nodeStr   = this.nodes.map( n => `${n}` ).join( ', ' ),
            ps        = this.pred_succ(),
            rep       = ' '.repeat( Math.max( 0, this.indent * 4 ) ),
            className = this.get_class_name(),
            doms      = `${num( this.dom )}/${num( this.idomParent )}/${this.preNumber}/${this.postNumber}:${this.rpost}`;

        if ( className ) className = className + '.';

        if ( !this.description && this.isTest ) this.description = 'TEST';
        else if ( !this.description ) this.description = 'no desc ' + ( this.nodes.length ? this.nodes[ 0 ].type : '-' );

        const desc = typeof this.description === 'string' ? this.description : this.description();

        nodeStr = `${ps} ${this.isEntry ? '==>' : this.isExit ? '<==' : '='} ${className}${desc} // doms: ${doms}, nodes: ${nodeStr}`;

        return `${this.unique}: ${rep}${nodeStr}`;
    }

    /**
     * @return {string}
     */
    pred_succ()
    {
        let tmp = [];

        if ( this.preds.size ) tmp.push( this.pids(), ' <- ' );
        tmp.push( this.isEntry || this.isExit ? `{${this.pre}}` : this.pre );
        if ( this.succs.size ) tmp.push( ' -> ', this.sids() );
        tmp.push( ' (' + this.nodes.length + ')' );
        return tmp.join( '' );
    }

    /**
     * @param {string} str
     * @return {BasicBlock}
     */
    desc( str )
    {
        this.description = str || this.source_info.bind( this );
        return this;
    }

    /**
     * @return {boolean}
     */
    endsInBreak()
    {
        return this.nodes.last.type === Syntax.BreakStatement;
    }

    /**
     * @param {BasicBlock} [block]
     * @return {BasicBlock}
     */
    consequent( block )
    {
        block       = block || this.blockList.block( this );
        this.isTest = true;
        this.isTrue = block;
        this.add_succs( block );
        return block;
    }

    /**
     * @param {BasicBlock} [block]
     * @return {BasicBlock}
     */
    alternate( block )
    {
        block        = block || this.blockList.block( this );
        this.isTest  = true;
        this.isFalse = block;
        this.add_succs( block );
        return block;
    }

    /**
     * @param {Node} node
     */
    add( node )
    {
        assert( node.type );
        assert( VisitorKeys[ node.type ] );
        assert( VisitorKeys[ node.type ].every( k => node.hasOwnProperty( k ) ) );

        this.nodes.push( node );
        node.block = this;
    }

    /**
     * @param {BasicBlock[]} blocks
     * @return {*[]}
     */
    add_succs( ...blocks )
    {
        return this.succs.add( ...blocks );
        // const
        //     added = [],
        //     add = b => ( added[ added.length ] = b ).preds.add( this ).indent = this.indent + 1;
        //
        // this.succs.addr( ...blocks ).forEach( add );
        //
        // return added.length === 1 ? added[ 0 ] : added;
    }

    /**
     * @param {BasicBlock[]} blocks
     * @return {*[]}
     */
    add_preds( ...blocks )
    {
        return this.preds.add( ...blocks );
        // const
        //     added = [],
        //     add = b => this.indent = ( added[ added.length ] = b ).succs.add( this ).indent + 1;
        //
        // this.preds.addr( ...blocks ).forEach( add );
        //
        // return added.length === 1 ? added[ 0 ] : added;
    }

    /**
     * @param {string} name
     * @param {string} type
     * @param {?SourceLocation} [loc]
     * @param {?[number, number]} [range]
     */
    source( name, type, loc, range )
    {
        this.name  = name || 'anonymous';
        this.type  = type;
        this.loc   = loc;
        this.range = range;
    }

    pred_edges()
    {
        return this.preds.map( p => this.blockList.edgeList.get( p, this ) );
    }

    succ_edges()
    {
        return this.succs.map( s => this.blockList.edgeList.get( this, s ) );
    }

    /**
     * @return {string}
     */
    source_info()
    {
        let typed = this.type || (this.nodes.length && this.nodes[ 0 ].type) || '',
            loc   = (this.loc && this.loc.start && this.loc.start.line && `, line ${this.loc.start.line}`) || (this.range && this.range.offset && `, offset: ${this.range.offset}`) || '';

        if ( this.loc && this.loc.end )
            loc += `( ${this.loc.end.line - this.loc.start.line + 1} lines )`;

        return `[ ${typed} ] ${this.name}${loc}`;
    }

    /**
     * @param {BasicBlock} oldBlock
     * @param {BasicBlock[]} newBlocks
     */
    pred_replace( oldBlock, ...newBlocks )
    {
        // console.log( `In ${this.pre}, we're replacing ${oldBlock.pre} in predecessors with [ ${newBlocks.map( nb => nb.pre )} ]` );
        this.preds.delete( oldBlock );
        let added = this.preds.add( ...newBlocks );
        added     = Array.isArray( added ) ? added : added ? [ added ] : [];
        added.forEach( p => this.blockList.edgeList.add( p, this ) );
    }

    /**
     * @param {BasicBlock} oldBlock
     * @param {BasicBlock[]} newBlocks
     */
    succ_replace( oldBlock, ...newBlocks )
    {
        // console.log( `In ${this.pre}, we're replacing ${oldBlock.pre} in successors with [ ${newBlocks.map( nb => nb.pre )} ]` );
        if ( this.isTrue === oldBlock )
            this.isTrue = newBlocks[ 0 ];
        else if ( this.isFalse )
            this.isFalse = newBlocks[ 0 ];

        this.succs.delete( oldBlock );
        let added = this.succs.add( ...newBlocks );
        added     = Array.isArray( added ) ? added : added ? [ added ] : [];
        added.forEach( s => this.blockList.edgeList.add( this, s ) );
    }

    /**
     */
    unhook()
    {
        if ( !this.preds.size || this.hasNodes() || this.isEntry || this.succs.size !== 1 ) return;

        const
            succs = this.succs.one();

        // console.log( `Unhooking ${this.pre}` );
        //
        // this.preds.filter( p => p.isTest ).forEach( p => {
        //     if ( p.isTrue === this ) p.isTrue = succs;
        //     else if ( p.isFalse === this ) p.isFalse = succs;
        // } );

        this.preds.forEach( p => this.blockList.edgeList.delete_by_key( p, this ) );
        this.succs.forEach( s => this.blockList.edgeList.delete_by_key( this, s ) );
        this.preds.slice().forEach( p => p.succ_replace( this, succs ) );
        this.succs.slice().forEach( s => s.pred_replace( this, ...this.preds ) );

        this.blockList.blocks.delete( this );
        this.blockList.isDirty = true;
        this.blockList.force_refresh();
    }
}

BasicBlock.scopes = null;

module.exports = BasicBlock;
