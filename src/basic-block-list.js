/** ******************************************************************************************************************
 * @file Describe what basic-block-list does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 26-Nov-2017
 *********************************************************************************************************************/
"use strict";

const assert            = require( 'assert' ),
      ExtArray          = require( './ext-array' ),
      BlockArray        = require( './pred-succ' ),
      { EdgeList }      = require( './edge' ),
      BasicBlock        = require( './basic-block' ),
      { DominatorTreeBuilder, FindDoms } = require( './dominators/iterative-doms' ),
      defaultDotOptions = {
          defaults:      {
              default:   '#0D3B66',
              bgcolor:   'white',
              color:     '#0D3B66',
              fontcolor: '#0D3B66',
              fontname:  'arial',
              shape:     'ellipse',
              nodesep:   1.5,
              margin:    [ 0.5, 0.2 ]
          },
          node:          {
              style:     'rounded',
              color:     '#0D3B66',
              fontcolor: '#0D3B66'
          },
          test:          {
              style:     'rounded',
              color:     '#F95738',
              fontcolor: '#F95738',
              shape:     'diamond'
          },
          entry:         {
              style: 'rounded',
              shape: 'box',
              color: '#C6AC4D'
          },
          exit:          {
              style: 'rounded',
              shape: 'box',
              color: '#C6AC4D'
          },
          unconditional: {
              color: '#0D3B65'
          },
          conditional:   {
              color:     '#F95738',
              fontname:  'arial italic',
              style:     'dashed',
              fontcolor: '#F95738',
              label:     'true'
          }
      };

/**
 * @typedef {object} BlockEdge
 * @property {number} from
 * @property {number} to
 */

/** */
class BasicBlockList
{
    /**
     */
    constructor()
    {
        BasicBlock.pre = 0;
        this._asArray = [];
        this._asPostOrder = [];
        this._edges = [];
        this._conditional = [];
        this._unconditional = [];
        this.isDirty = true;
        this.base = defaultDotOptions.defaults;
        this.edgeList = new EdgeList();
        this.blocks = new Set();
        this.name = 'Unnamed';
    }

    /**
     * @return {[ BasicBlock, BasicBlock ]}
     */
    entry_and_exit()
    {
        return [ this.entry = this.block().right().entry(), this.exit = this.block().exit() ];
    }

    /**
     * @param {BasicBlock[]} preds
     * @return {BasicBlock}
     */
    block( ...preds )
    {
        const b = new BasicBlock( ...preds );
        b.blockList = this;
        this.blocks.add( b );
        return b;
    }

    /**
     * @return {string}
     */
    toString()
    {
        return this.asArray.map( b => `${b}` ).join( '\n' );
    }

    /**
     * @param {number|BasicBlock} index
     * @return {BasicBlock}
     */
    get( index )
    {
        return typeof index === 'number' ? this.asArray[ index ] : index; // this.asArray.find( b => b.pre === index );
    }

    /** */
    force_refresh()
    {
        this.__refresh( true );
    }

    /**
     * @param {boolean} [force=false]
     * @private
     */
    __refresh( force )
    {
        if ( !force && ( !this.entry || !this.isDirty ) ) return;
        this.isDirty = false;
        this._asArray = this.map_to_array();
        this._asPostOrder = this._asArray.sort( ( a, b ) => a.postNumber - b.postNumber );
        this._edges = this._map_to_edges();
        this._partition();
    }

    /**
     * @return {Array<BasicBlock>}
     */
    get asArray()
    {
        this.__refresh();
        return this._asArray;
    }

    /**
     * @return {Array<BasicBlock>}
     */
    get asPostOrder()
    {
        this.__refresh();
        return this._asPostOrder;
    }

    /**
     * @return {Array<BlockEdge>}
     */
    get edges()
    {
        this.__refresh();
        return this._edges;
    }

    /**
     * @return {Array<BlockEdge>}
     */
    get conditional()
    {
        this.__refresh();
        return this._conditional;
    }

    /**
     * @return {Array<BlockEdge>}
     */
    get unconditional()
    {
        this.__refresh();
        return this._unconditional;
    }

    /**
     * @private
     */
    _partition()
    {
        [ this._conditional, this._unconditional ] = this.edges.partition( ( { from, to } ) => from.isTrue === to );
        // [ this._conditional, this._unconditional ] = partition( this.edges.map( e => e.asIndex() ), ( { from, to } ) => this.get( from ).isTrue === this.get( to ) );
    }

    /**
     * @private
     */
    _renumber()
    {
        const blocks = this.map_to_array( true );

        // This is a `for` loop because the built-ins skip holes in sparse arrays
        for ( let offset = 0,
                  n      = 0; n < blocks.length; n++ )
        {
            if ( !blocks[ n ] ) offset--;
            else if ( offset )
            {
                blocks[ n ].pre += offset;
                blocks[ n ].rpost += offset;
                blocks[ n ].semi = blocks[ n ].pre;
            }
        }

        this.edgeList.renumber();
        this.force_refresh();
        BasicBlock.pre = this.asArray.length;
        return this;
    }

    /**
     * Drop empty blocks under certain conditions
     */
    drop()
    {
        this.asArray.forEach( b => b.unhook() );
        return this._renumber();
    }

    /**
     * Pre-order walk
     *
     * @param {function} fn
     */
    walk( fn )
    {
        const _ = new Set();

        /**
         * @param {BasicBlock} _bb
         * @private
         */
        function _walk( _bb )
        {
            _.add( _bb );
            fn( _bb );
            _bb.succs.forEach( b => !_.has( b ) && _walk( b ) );
        }

        _walk( this.entry );

        return this;
    }

    /**
     * @param {BasicBlock} block
     */
    delete_edges( block )
    {
        this.edgeList.delete( block );
    }

    /**
     * @return {Array<BasicBlock>}
     */
    _map_to_edges()
    {
        return this._asArray.reduce( ( edges, b ) => edges.concat( b.succ_edges() ), new ExtArray() );
    }

    /**
     * @param {boolean} sparse
     * @return {Array<BasicBlock>}
     */
    map_to_array( sparse = false )
    {
        const _blocks = new BlockArray();

        this.walk( sparse ? b => _blocks[ b.pre ] = b : b => _blocks.push( b ) );
        // this.walk( b => _blocks[ b.pre - 1 ] = b );

        return _blocks;
        // return sparse ? _blocks : _blocks.order(); // sort( ( a, b ) => a.pre - b.pre );
    }

    /**
     * @return {[ BasicBlock, BasicBlock ]}
     */
    entryExit()
    {
        let en,
            ex;

        this.walk( b => {
            if ( b.isEntry ) en = b;
            else if ( b.isExit ) ex = b;
        } );

        assert( !!en && !!ex && en === this.entry && ex === this.exit );
        return [ en.pre, ex.pre ];
    }

    /**
     * @return {string}
     */
    lines()
    {
        const loc = this.entry.loc; // this.asArray[ 0 ].loc;

        return loc ? `${loc.start.line}-${loc.end.line}` : '';
    }

    /**
     * @param {function} fn
     */
    forEach( fn )
    {
        this.asArray.forEach( fn );
    }

    /**
     * @type {Iterable<BasicBlock>}
     */
    * [ Symbol.iterator ]()
    {
        yield* this.asArray;
    }

    /**
     * @return {BasicBlockList}
     */
    initial_walk()
    {
        const _ = new Set();

        // console.log( 'early:', [ ...this.blocks ].map( b => b.debug_str() ).join( '\n' ) );

        let preorder  = 1,
            postorder = 0,
            count     = 0,
            _this     = this;

        /**
         * @param {BasicBlock} n
         */
        ( function pre_walk( n ) {

            if ( _.has( n ) ) return;

            _.add( n );

            if ( !_this.blocks.has( n ) ) throw new Error( `Initializing an unknown node ${n}` );

            n.preds.order();
            n.succs.order();

            count++;
            n.rpost = n.pre = 0;
            n.succs.order().forEach( pre_walk );
        } )( this.entry );

        postorder = count;

        /**
         * @param {BasicBlock} n
         */
        ( function dfs( n ) {
            n.initialize( preorder );
            n.pre = preorder++;
            n.succs.forEach( S => {
                if ( S.pre === 0 )
                {
                    S.parent = n;
                    // S.pre = preorder;
                    S.initialize( preorder );
                    _this.edgeList.classify_edge( n, S, 'tree edge' );
                    dfs( S );
                }
                else if ( S.rpost === 0 ) _this.edgeList.classify_edge( n, S, 'back edge' );
                else if ( n.pre < S.pre ) _this.edgeList.classify_edge( n, S, 'forward edge' );
                else _this.edgeList.classify_edge( n, S, 'cross edge' );
            } );
            n.rpost = postorder--;
        } )( this.entry );

        // this.asArray.forEach( b => console.log( b.debug_str() ) );

        // console.log( `before drop:\n\n${this}\n` );
        this.drop();
        // console.log( `after drop:\n\n${this}\n` );
        process.stdout.write( `Start dominator calculations for "${this.name}"... ` );
        // console.log( `Start dominator calculations for "${this.name}"... ` );
        this.lentar_dominators();
        // this.dominators = new Dominators( this );
        console.log( 'done' );
        return this;
    }

    /**
     *
     */
    lentar_dominators()
    {
        DominatorTreeBuilder( this, BasicBlock.pre );

        // From here we want to build a spanning tree with both upward and downward links and we want
        // to do a search over this tree to compute pre and post numbers that can be used for dominance
        // tests.

        this.asArray.reverse().filter( x => !!x ).forEach( block => {

            const idomBlock = block.idomParent = block.dom;

            if ( idomBlock )
                idomBlock.idomKids.push( block );

            let nextPreNumber  = 0,
                nextPostNumber = 0;

            // Plain stack-based worklist because we are guaranteed to see each block exactly once anyway.

            const worklist = [ { node: this.entry, order: 1 } ];

            while ( worklist.length )
            {
                const { node, order } = worklist.pop();

                switch ( order )
                {
                    case 1:
                        node.preNumber = nextPreNumber++;

                        worklist.push( { node, order: -1 } );

                        for ( const kid of node.idomKids )
                            worklist.push( { node: kid, order: 1 } );
                        break;

                    case -1:
                        node.postNumber = nextPostNumber++;
                        break;
                }
            }
        } );
        // for ( let blockIndex = BasicBlock.pre; blockIndex--; )
        // {
        //     const block = this.get( blockIndex );
        //
        //     if ( !block ) continue;
        //
        //     const idomBlock = block.idomParent = block.dom;
        //
        //     if ( idomBlock )
        //         idomBlock.kids.push( block );
        //
        //     let nextPreNumber  = 0,
        //         nextPostNumber = 0;
        //
        //     // Plain stack-based worklist because we are guaranteed to see each block exactly once anyway.
        //
        //     const worklist = [ { node: this.entry, order: 1 } ];
        //
        //     while ( worklist.length )
        //     {
        //         const { node, order } = worklist.pop();
        //
        //         switch ( order )
        //         {
        //             case 1:
        //                 node.preNumber = nextPreNumber++;
        //
        //                 worklist.push( { node, order: -1 } );
        //
        //                 for ( const kid of node.kids )
        //                     worklist.push( { node: kid, order: 1 } );
        //                 break;
        //
        //             case -1:
        //                 node.postNumber = nextPostNumber++;
        //                 break;
        //         }
        //     }
        // }
    }

    /**
     * @param {string} title
     * @param {object} [dotOptions={}]
     * @return {string}
     */
    dot( title, dotOptions = {} )
    {
        const /**
               * @param {Edge} edge
               * @return {string}
               */
              formatEdge           = edge => {
                  const from         = this.get( edge.from ),
                        to           = this.get( edge.to ),
                        label        = from.node_label() || '',
                        escapedLabel = label.replace( /"/g, '\\"' ),
                        attributes   = label ? ` [label = " ${escapedLabel}"]` : "";

                  return `${from.pre} -> ${to.pre}${attributes}`;
              },

              neat                 = a => Array.isArray( a ) ? `"${a.join( ', ' )}"` : `"${a}"`,
              toStr                = ( o, eol = '' ) => {
                  if ( !o ) return [];
                  const strs = Object.entries( o ).map( ( [ name, value ] ) => `${name} = ${neat( value )}${eol}` );

                  if ( !eol ) return strs.join( ', ' );

                  return strs;
              },

              diffs                = o => {
                  if ( !o ) return null;

                  const d = {
                      color:     defaultDotOptions.defaults.color,
                      fontcolor: defaultDotOptions.defaults.fontcolor,
                      fontname:  defaultDotOptions.defaults.fontname
                  };

                  Object.entries( o ).forEach( ( [ key, value ] ) => this.base[ key ] !== value && ( d[ key ] = value ) );

                  return Object.keys( d ).length ? d : null;
              },
              merge                = key => Object.assign( {}, defaultDotOptions[ key ], dotOptions[ key ] || {} ),

              defaults             = toStr( this.base, ';' ),
              node                 = toStr( diffs( merge( 'node' ) ) ),
              test                 = toStr( diffs( merge( 'test' ) ) ),
              entry                = toStr( diffs( merge( 'entry' ) ) ),
              exit                 = toStr( diffs( merge( 'exit' ) ) ),
              unconditional        = toStr( diffs( merge( 'unconditional' ) ) ),
              conditional          = toStr( diffs( merge( 'conditional' ) ) ),

              entryAndExitNodeList = this.entryExit(),

              innerLines           = [ ...defaults ].concat( `labelloc="t";`, `label="${title}";`, `fontsize=30` );

        if ( node ) innerLines.push( `node [${node}];` );
        innerLines.push( `${entryAndExitNodeList[ 0 ]} [label = "entry:${entryAndExitNodeList[ 0 ]}"${entry ? ', ' + entry : ''}];` );
        innerLines.push( `${entryAndExitNodeList[ 1 ]} [label = "exit:${entryAndExitNodeList[ 1 ]}"${exit ? ', ' + exit : ''}];` );
        innerLines.push( ...this.asArray.filter( b => !b.isEntry && !b.isExit && !!b.graph_label() ).map( b => `${b.pre} [label = "${b.graph_label()}"${b.isTest && test ? ', ' + test : ''}];` ) );
        if ( this.unconditional.length )
        {
            innerLines.push( "", "// Unconditional edges" );
            if ( unconditional ) innerLines.push( `edge [${unconditional}];` );
            innerLines.push( ...this.unconditional.map( formatEdge ) );
        }
        if ( this.conditional.length )
        {
            innerLines.push( "", "// Conditional edges" );
            if ( conditional ) innerLines.push( `edge [${conditional}];` );
            innerLines.push( ...this.conditional.map( formatEdge ) );
        }

        let graphLines = [ `digraph "${title}" {`, ...innerLines.map( l => '    ' + l ), "}" ];

        if ( title ) graphLines.unshift( `// ${title}` );

        return graphLines.join( '\n' );
    }
}

module.exports = BasicBlockList;
