/** ******************************************************************************************************************
 * @file Describe what corman does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 02-Dec-2017
 *
 *           ┌─────┐
 *           │     │
 *    ┌──────┤  1  ├──────┐
 *    │      │     │      │
 *    │      └─────┘      │
 *    │                   │
 *    │                   │
 * ┌──v──┐             ┌──v──┐
 * │     │             │     │
 * │  3  │         ┌───┤  2  ├───┐
 * │     │         │   │     │   │
 * └──┬──┘         │   └─────┘   │
 *    │            │             │
 *    │            │             │
 *    │            │             │
 * ┌──v──┐      ┌──v──┐       ┌──v──┐
 * │     ├──────>     ├───────>     │
 * │  4  │      │  5  │       │  6  │
 * │     <──────┤     <───────┤     │
 * └─────┘      └─────┘       └─────┘
 *
 *********************************************************************************************************************/
"use strict";

const
    fs = require( 'fs' ),
    LTDominators = require( './lt' ),
    { DominatorTree, DominatorBlock }                          = require( './dominator-chk-block' ),
    traversal                                = require( '../traversal' ),
    { DFS, BFS, PrePost, generic }                = traversal,
    { DominatorTreeBuilder, FindDoms } = require( './dominator-tree-builder' ),
    { start_table, str_table, log }          = require( '../dump' ),

    r                                        = 1,
    x1                                       = 2,
    x2                                       = 3,
    x3                                       = 4,
    y1                                       = 9,
    y2                                       = 7,
    y3                                       = 5,
    z1                                       = 10,
    z2                                       = 8,
    z3                                       = 6,

    labels                                   = [
        'r', 'x1', 'x2', 'x3', 'y3', 'z3', 'y2', 'z2', 'y1', 'z1'
    ],
    paper                                    = [
        [ r, x1, z1 ],
        [ x1, x2, y1 ],
        [ x2, x3, y2 ],
        [ x3, y3 ],
        [ y3, z3 ],
        [ y2, z2, z3 ],
        [ y1, z1, z2 ],
        [ z1, y1 ],
        [ z2, y2 ],
        [ z3, y3 ]
    ],
    plookup = [ 'start', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'end' ],
    slide                                    = [
        [ 1, 2, 9 ],    // start
        [ 2, 3, 4 ],    // a
        [ 3, 4 ],       // b
        [ 4, 5, 6 ],    // c
        [ 5, 7 ],       // d
        [ 6, 7 ],       // e
        [ 7, 8, 3 ],    // f
        [ 8, 9 ],       // g
        [ 9 ]           // end
    ],
    front                                    = [
        [ 1, 2, 3 ],
        [ 2, 5, 6 ],
        [ 3, 4 ],
        [ 4, 5 ],
        [ 5 ],
        [ 6 ]
    ],
    altx                                     = [
        [ 1, 2, 3 ],
        [ 2, 5, 6 ],
        [ 3, 4 ],
        [ 4, 5 ],
        [ 5, 4, 6 ],
        [ 6, 5 ]
    ],
    large                                    = [
        [ 1, 2 ],
        [ 2, 3, 4 ],
        [ 3, 6 ],
        [ 4, 5 ],
        [ 5, 6, 9 ],
        [ 6, 7, 9 ],
        [ 7, 8 ],
        [ 8, 6 ],
        [ 9, 10 ],
        [ 10 ]
    ],
    wiki                                     = [
        [ 1, 2 ],
        [ 2, 3, 4, 6 ],
        [ 3, 4 ],
        [ 4, 5 ],
        [ 5, 2 ],
        [ 6 ]
    ],
    simple                                   = [
        [ 1, 2 ],
        [ 2, 3 ],
        [ 3, 4, 5 ],
        [ 4, 5 ],
        [ 5, 6 ],
        [ 6 ]
    ],
    active                                   = slide,
    n2a                                      = ' abcdefg',
    toAsc                                    = i => !i ? 'START' : i === 8 ? 'END' : n2a[ i ];

/** */
class Node // extends DominatorBlock
{
    /**
     * @param {number} n
     */
    constructor( n )
    {
        // super();
        this.name = 'NODE ' + n;
        this.id = n - 1;
        this.reset();
    }

    reset()
    {
        // this.resetLT();
        this.pre      = -1;
        this.post     = -1;
        this.rpost    = -1;
        this.bpre     = -1;
        this._isStart = false;
        // this.color = 'white';
        /** @type {Node[]} */
        this.preds = [];
        /** @type {Node[]} */
        this.succs = [];
        /** @type {?Node} */
        this.chkDom = null;
        /** @type {Set<Node>} */
        this.frontier = new Set();
        /** @type {number} */
        this.generation = -1;
        /** @type {Node[]} */
        this.domSuccs = [];
    }

    /**
     * @return {boolean}
     */
    get isStart()
    {
        return this._isStart;
    }

    /**
     * @param {boolean} v
     */
    set isStart( v )
    {
        this._isStart = v;
    }

    /**
     * @param {number} gen
     * @returns {?Node}
     */
    get( gen )
    {
        if ( this.generation >= gen ) return null;

        this.generation = gen;
        return this;
    }

    /**
     * @return {Node}
     */
    init_traversal()
    {
        this.generation = -1;
        return this;
    }

    __add_edges( xe, ne, fn )
    {
        const fe = ne.filter( en => !!en && !xe.includes( en ) );

        fe.forEach( fn );

        return xe.concat( fe );
    }

    /**
     * @param {...Node} succs
     * @return {Node}
     */
    add_succs( ...succs )
    {
        succs.forEach( s => {
            this.add_succ( s );
            s.add_pred( this );
        } );
        // this.succs = this.__add_edges( this.succs, succs, n => n.add_pred( n ) );
        return this;
    }

    add_succ( s )
    {
        if ( s && !this.succs.includes( s ) ) this.succs.push( s );
    }

    add_pred( p )
    {
        if ( !p ) return;

        if ( !this.parent ) this.parent = p;

        if ( !this.preds.includes( p ) ) this.preds.push( p );
    }

    /**
     * @param {...Node} _preds
     * @return {Node}
     */
    add_preds( ..._preds )
    {
        _preds.forEach( p => {
            this.add_pred( p );
            p.add_succ( this );
        } );
        // if ( !this.preds.length && _preds.length )
        //     this.parent = _preds[ 0 ];
        //
        // this.preds = this.__add_edges( this.preds, _preds, n => n.add_succ( n ) );
        return this;
    }

    /**
     * @type {Iterable<Node>}
     */
    * [ Symbol.iterator ]()
    {
        // yield* this.succs.sort( ( a, b, ) => a.id - b.id ).reverse();
        // yield* this.succs.sort( ( a, b, ) => a.id - b.id ).reverse();
        yield* this.succs;
    }

    // idomN()
    // {
    //     return this.idomParent ? this.idomParent.pre : void 0;
    // }
    //
    // domTreeNodes()
    // {
    //     // if ( !this.dom ) return '';
    //     //
    //     // if ( !this.idomKids || !this.idomKids.length ) return `${this.dom.pre + 1} -> ∅`;
    //
    //     if ( !this.idomKids || !this.idomKids.length ) return `${this.pre +1} -> ∅`;
    //
    //     return `${this.pre + 1} -> ${this.idomKids.map( c => c.pre + 1 ).join( ' ' )}`;
    // }

    chkDomTreeNodes()
    {
        if ( !this.domSuccs.length ) return `    ${this.pre + 1} -> ∅`;

        return `${this.chkDom && this.chkDom !== this ? ( this.chkDom.pre + 1 ) + ' ^ ' : '    '}${this.pre + 1} -> ${this.domSuccs.map( c => c.pre + 1 ).join( ' ' )}`;
    }

    /**
     * @return {string}
     */
    toString()
    {
        const
            wkNums   = `${this.chkDomTreeNodes()}`,
            fronts   = [ ...this.frontier ].map( n => n.pre + 1 ).join( ', ' ),
            ltFronts = '', // ( this.ltFrontier || [] ).map( n => n.pre + 1 ).join( ', ' ),
            preds    = this.preds.length ? this.preds.map( n => n.pre + 1 ).join( ' ' ) : ' ',
            succs    = this.succs.length ? this.succs.map( n => n.pre + 1 ).join( ' ' ) : ' ',
            pre      = this.pre + 1,
            post     = this.post + 1,
            rpost    = this.rpost + 1,
            domBy = this.domTreeNodes(); // idomN() + 1;

        return `${this.name} (${preds} < > ${succs}) => pre: ${pre}, post: ${post}, rpost: ${rpost}, domTree => ${wkNums}, frontier: ${fronts}, lt fronts: ${ltFronts}, dom. by: ${domBy}`;
    }

    /**
     * @return {string[]}
     */
    toTable()
    {
        const
            wkNums = `${this.chkDomTreeNodes()}`,
            fronts   = [ ...this.frontier ].map( n => n.id + 1 ).join( ' ' ),
            ltFronts = '', // ( this.ltFrontier || [] ).map( n => n.id + 1 ).join( ' ' ),
            preds    = this.preds.length ? this.preds.map( n => n.id + 1 ).join( ' ' ) : ' ',
            succs    = this.succs.length ? this.succs.map( n => n.id + 1 ).join( ' ' ) : ' ',
            pre      = this.pre + 1,
            post     = this.post + 1,
            rpost    = this.rpost + 1,
            domBy = ''; // this.domTreeNodes(); // idomN() + 1;

        return [ this.name, succs, preds, pre, post, rpost, this.preNumber + 1, this.postNumber + 1, wkNums, fronts, ltFronts, domBy ];
        //  [ ...this.strictDominatorsOf() ].map( b => b.pre + 1 ) ];
    }

    get_doms()
    {

    }
}

/**
 * @template T
 */
class NodeList
{
    /**
     * @param {Array<Array<number>>} nodeList
     */
    constructor( nodeList )
    {
        /** @type {Node[]} */
        this.nodes = nodeList.map( ( n, i ) => new Node( i + 1 ) ).sort( ( a, b ) => a.id - b.id );

        nodeList
            .forEach( lst => this.nodes[ lst[ 0 ] - 1 ].add_succs( ...lst.slice( 1 ).map( si => this.nodes[ si - 1 ] ) ) );

        // nodeList
        //     .forEach( lst => lst.forEach( n => this.nodes[ n - 1 ] || ( this.nodes[ n - 1 ] = new Node( n ) ) ) );
        //
        // nodeList
        //     // .map( n => this.nodes[ this.nodes.length ] = new Node( n[ 0 ] ) )
        //     .forEach( ( n, i ) => this.nodes[ n[ 0 ] - 1 ].add_succs( ...nodeList[ i ].slice( 1 ).map( sn => this.nodes[ sn - 1 ] ) ) );

        const
            { ms, mp } = this.nodes.reduce( ( { ms, mp }, n ) => ( { ms: Math.max( ms, n.succs.length ), mp: Math.max( mp, n.preds.length ) } ), { ms: 0, mp: 0 } );

        console.log(
        this.nodes.map( n => {
            let preds = n.preds.map( p => p.id + 1 ).sort(),
                succs = n.succs.map( s => s.id + 1 ).sort(),
                start = !preds.length ? ' <- START' : '',
                end = !succs.length ? ' <- END' : '';

            preds = preds.join( ' ' ).padEnd( mp * 2 - 1 ) + ( preds.length ? ' < ' : '   ' );
            succs = ( succs.length ? ' > ' : '   ' ) + succs.join( ' ' ).padStart( ms * 2 - 1 );

            return `${preds} ${n.id + 1} ${succs}${start}${end}`;
        } ) );

        this.preOrder = [];
        this.postOrder = [];
        this.rPostOrder = [];
        this.results = [];

        this.startNode = this.nodes[ 0 ];
        this.startNode.isStart = true;
        this.exitNode = null;

        const end = this.nodes.find( n => !n.succs.length );
        if ( end ) this.endNode = end;

        this.startNode.name = 'start';
        if ( end ) end.name = 'end';

        this.maxPreNum = DFS( this.nodes, {
            pre:   node => this.preOrder.push( node ),
            post:  node => this.postOrder.push( node ),
            rpost: node => this.rPostOrder.push( node )
        } );

        BFS( this.startNode );

        // this.nodes.forEach( n => n.post_init() );
        /**
         * @param {Node[]} nodes
         */
        // const stash_doms = nodes => {
        //     this.results.push( nodes.reduce( ( rdom, n ) => {
        //         rdom[ n.post ] = n.chkDom ? n.chkDom.post : 'u';
        //         return rdom;
        //     }, [] ) );
        // };

        function dom2txt( allDoms, dn )
        {
            const
                doms = [],
                idComma = arr => arr.map( d => d.id + 1 ).join( ', ' );
                // preComma = arr => arr.map( d => d.id + 1 ).join( ', ' );

            let r = dn;
            while ( r )
            {
                doms.push( r.id + 1 );
                r = allDoms[ r.pre ].idom;
            }

            // if ( !dn.domSuccs )
            // {
            //     console.error( `no succs:`, dn );
            //     process.exit( 1 );
            // }
            //
            // if ( !dn.frontier )
            // {
            //     console.error( `no frontier:`, dn );
            //     process.exit( 1 );
            // }

            return `${dn.id + 1} -> ${idComma( dn.domSuccs )}, doms: ${doms.join( ', ' )}, frontier: ${idComma( dn.frontier || [] )}`;
        }

        this.lt = new LTDominators( this, false );
        this.ltDoms = this.lt.generate();
        console.log( 'ltDoms:', this.ltDoms );

        const _pdoms = ad => dn => dom2txt( ad, dn );
        let pdoms;
        console.log( 'lt doms:\n    ', this.lt.generate().map( n => `${n.id + 1} -> ${n.domSuccs.map( d => d.id + 1 ).join( ', ' )}` ).join( '\n    ' ) );
        this.chk = FindDoms( this, {} ); //, { initial: stash_doms, iter: stash_doms } );
        pdoms = _pdoms( this.chk );
        this.nodes.forEach( n => n.domSuccs.includes( n ) && n.domSuccs.splice( n.domSuccs.indexOf( n ), 1 ) );
        console.log( 'chk doms:\n    ', this.chk.map( pdoms ).join( '\n    ' ) );
        // console.log( 'chk doms:\n    ', this.chk.map( n => `${n.id + 1} -> ${n.domSuccs.map( d => d.id + 1 ).join( ', ' )}` ).join( '\n    ' ) );

        // this.llvm = llvm( this );
        // pdoms = _pdoms( this.llvm );
        // console.log( 'llvm doms:\n    ', this.llvm.map( pdoms ).join( '\n    ' ) );

        // this.maxPreNumLt = PrePost( this.startNode );
        this.byPreNumber = [];
        // this.nodes.forEach( n => this.byPreNumber[ n.preNumber = n.pre ] = n );
        // this.lentar_dominators();
        // this.nodes.forEach( n => n.ltFrontier = [ ...n.dominatorsOf() ].sort( ( a, b ) => a.preNumber - b.preNumber ) );
        // this.nodes.forEach( n => n.ltFrontier = [ ...n.dominanceFrontierOf() ].sort( ( a, b ) => a.preNumber - b.preNumber ) );

        // const
        //     tree  = [];
        //
        // this.nodes.forEach( n => {
        //     if ( n.chkDom.pre === n.pre ) return;
        //     if ( !tree[ n.chkDom.pre ] ) tree[ n.chkDom.pre ] = [];
        //     tree[ n.chkDom.pre ].push( n.pre );
        // } );
        //
        // tree.forEach( ( s, i ) => console.log( `${toAsc( i )} -> ${s.map( toAsc ).join( ' ' )}` ) );
        // console.log( '' );
        // tree.forEach( ( s, i ) => console.log( `${i + 1} -> ${s.map( n => n + 1 ).join( ' ' )}` ) );

        // llvm( this.nodes );
    }

    * [Symbol.iterator]()
    {
        yield *this.nodes;
    }

    /**
     * @param {function( T, ?number, ?T[]):*} fn
     */
    forEach( fn )
    {
        this.nodes.forEach( fn );
    }

    /**
     * @param {function( T, number, T[]):*} fn
     * @return {*[]}
     */
    map( fn )
    {
        return this.nodes.map( fn );
    }

    /**
     * @param {function( T, number, T[] ):boolean} fn
     * @return {T[]}
     */
    filter( fn )
    {
        return this.nodes.filter( fn );
    }

    /**
     * @param {function( T, number, T[] ):boolean} fn
     * @return {T[]}
     */
    find( fn )
    {
        return this.nodes.filter( fn );
    }

    /**
     * @param index
     * @return {Node}
     */
    get( index )
    {
        return this.nodes[ index ];
    }

    getPre( index )
    {
        return this.preOrder[ index ];
    }

    getPreN( index )
    {
        return this.preOrder[ index ];
        // return this.byPreNumber[ index ];
    }

    /**
     * @return {string}
     */
    toString()
    {
        const headers = [ 'Name', 'Succs', 'Preds', 'pre', 'post', 'rpost', 'preN', 'postN', 'Dom', 'Frontier', 'LT Frontier', 'Dom. by' ];
        let r = `
           ┌─────┐
           │     │
    ┌──────┤  1  ├──────┐
    │      │     │      │
    │      └─────┘      │
    │                   │
    │                   │
 ┌──v──┐             ┌──v──┐
 │     │             │     │
 │  3  │         ┌───┤  2  ├───┐
 │     │         │   │     │   │
 └──┬──┘         │   └─────┘   │
    │            │             │
    │            │             │
    │            │             │
 ┌──v──┐      ┌──v──┐       ┌──v──┐
 │     ├──────>     ├───────>     │
 │  4  │      │  5  │       │  6  │
 │     <──────┤     <───────┤     │
 └─────┘      └─────┘       └─────┘

`;

        // r += str_table( 'Nodes added order', headers, this.nodes.map( n => n.toTable() ) ) + '\n';
        r += str_table( 'Nodes pre order', headers, this.preOrder.map( n => n.toTable() ) ) + '\n';
        // r += str_table( 'Nodes post order', headers, this.postOrder.map( n => n.toTable() ) ) + '\n';
        // r += str_table( 'Nodes reverse post order', headers, this.rPostOrder.map( n => n.toTable() ) ) + '\n';

        // const
        //     nodesPost = this.nodes.slice().sort( ( a, b ) => b.post - a.post ),
        //     chk       = start_table( [ '', ...this.results.map( ( r, i ) => !i ? 'Inital' : 'Iter #' + i ) ] );
        //
        // chk.push( ...nodesPost.map( node => [ 'Node #' + ( node.post + 1 ), ...this.results.map( ra => typeof ra[ node.post ] === 'number' ? ra[ node.post ] + 1 : 'u' ) ] ) );
        // r += chk.toString();

        return r;
    }

    /**
     *
     */
    lentar_dominators()
    {
        DominatorTreeBuilder( this, Math.max( ...this.nodes.map( n => n.pre ) ) );

        // From here we want to build a spanning tree with both upward and downward links and we want
        // to do a search over this tree to compute pre and post numbers that can be used for dominance
        // tests.

        traversal.generation += 2;

        this.nodes
            .sort( ( a, b ) => b.preNumber - a.preNumber )
            .filter( x => !!x )
            .forEach( block => {

                const idomBlock = block.idomParent = block.dom;

                if ( idomBlock )
                    idomBlock.idomKids.push( block );

                let nextPreNumber  = 0,
                    nextPostNumber = 0;

                // Plain stack-based worklist because we are guaranteed to see each block exactly once anyway.

                const worklist = [ { node: this.startNode, order: 1 } ];

                while ( worklist.length )
                {
                    const { node, order } = worklist.pop();

                    switch ( order )
                    {
                        case 1:
                            node.preDom = nextPreNumber++;
                            node.generation = traversal.generation;

                            worklist.push( { node, order: -1 } );

                            for ( const kid of node.idomKids )
                            {
                                if ( kid.generation < traversal.generation )
                                    worklist.push( { node: kid, order: 1 } );
                            }
                            break;

                        case -1:
                            node.postDom = nextPostNumber++;
                            break;
                    }
                }
            } );
    }

    toDot( title, type = 'ren', lookup )
    {
        const
            num = n => {
                n = type === 'name' ? n : n.id;
                switch ( type )
                {
                    case 'ren': return n + 1;
                    case 'asc': return String.fromCharCode( 0x61 + n );
                    case 'off': return !n ? ' ' : String.fromCharCode( 0x61 + n );
                    case 'lup': return lookup[ n ];
                    case 'name': return n.name;
                    default: return n;
                }

            },
            dotNodes = this.nodes.map( node => {
            return !node.pre
                ? `0 [label="${num( node )}[${node.pre + 1},${node.post + 1}]", color = "#C6AC4D", fontcolor = "#0D3B66", fontname = "arial", style = "rounded", shape = "box"];`
                : `${node.pre} [label="${num( node )}[${node.pre + 1},${node.post + 1}]"];`;
        } ).join( '\n    ' ),
            edges = this.nodes.map( node => node.succs.map( s => node.pre + ' -> ' + s.pre ).join( '\n    ' ) ).join( '\n    ' );

    return `
digraph "${title}" {
    default = "#0D3B66";
    bgcolor = "white";
    color = "#0D3B66";
    fontcolor = "#0D3B66";
    fontname = "arial";
    shape = "ellipse";
    nodesep = "1.5";
    margin = "0.5, 0.2";
    labelloc="t";
    label="${title}";
    fontsize=30
    node [color = "#0D3B66", fontcolor = "#0D3B66", fontname = "arial", style = "rounded"];
    ${dotNodes}

    // Unconditional edges
    edge [color = "#0D3B65", fontcolor = "#0D3B66", fontname = "arial"];
    ${edges}
}
`;
    }
}

const one = new NodeList( active );


log( `${one}` );
// const xlat = n => n.isStart ? 'START' : !n.succs.length ? 'END' : toAsc( n.pre );

// console.log( one.toDot( 'slide', 'lup', plookup ) );

if ( process.argv[ 2 ] ) fs.writeFileSync( process.argv[ 2 ], one.toDot( 'slide', 'name', plookup ) );

// generic( { head: one.startNode, succs: n => n.domSuccs, type: 'pre', callback: n => log( `${xlat( n )} => ${n.domSuccs.map( xlat ).join( ' ' )}` ) } );
// fs.writeFileSync( 'dots/dfs.dot',
//         qdot( one.map( node => {
//             return !node.pre
//                 ? `0 [label = "r[${node.pre + 1},${node.post + 1}]", color = "#C6AC4D", fontcolor = "#0D3B66", fontname = "arial", style = "rounded", shape = "box"];`
//                 : `${node.pre} [label="${labels[ node.pre ]}[${node.pre + 1},${node.post + 1}]"];`;
//         } ).join( '\n    ' ),
//     one.map( node => node.succs.map( s => node.pre + ' -> ' + s.pre ).join( '\n    ' ) ).join( '\n    ' ), 'DFS' ) );
//
// fs.writeFileSync( 'dots/bfs.dot', qdot(
//         one.map( node => {
//             return !node.bpre
//                 ? `0 [label = "r[${node.bpre + 1}]", color = "#C6AC4D", fontcolor = "#0D3B66", fontname = "arial", style = "rounded", shape = "box"];`
//                 : `${node.pre} [label="${labels[ node.pre ]}[${node.bpre + 1}]"];`;
//         } ).join( '\n    ' ),
//     one.map( node => node.succs.map( s => node.pre + ' -> ' + s.pre ).join( '\n    ' ) ).join( '\n    ' ), 'BFS' ) );
//
// function qdot( dotNodes, edges, title )
// {
//     return `
// digraph "${title}" {
//     default = "#0D3B66";
//     bgcolor = "white";
//     color = "#0D3B66";
//     fontcolor = "#0D3B66";
//     fontname = "arial";
//     shape = "ellipse";
//     nodesep = "1.5";
//     margin = "0.5, 0.2";
//     labelloc="t";
//     label="${title}";
//     fontsize=30
//     node [color = "#0D3B66", fontcolor = "#0D3B66", fontname = "arial", style = "rounded"];
//     ${dotNodes}
//
//     // Unconditional edges
//     edge [color = "#0D3B65", fontcolor = "#0D3B66", fontname = "arial"];
//     ${edges}
// }
// `;
// }
