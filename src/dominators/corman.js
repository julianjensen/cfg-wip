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
    DominatorBlock                           = require( './dominator-block' ),
    traversal                                = require( '../traversal' ),
    { DFS, BFS, PrePost, generic }                = traversal,
    { DominatorTreeBuilder, FindDoms, llvm } = require( './dominator-tree-builder' ),
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
class Node extends DominatorBlock
{
    /**
     * @param {number} n
     */
    constructor( n )
    {
        super();
        this.name = 'NODE ' + n;
        this.id = n - 1;
        this.pre = -1;
        this.post = -1;
        this.rpost = -1;
        this.bpre = -1;
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
        this.generation = -1;
        /** @type {Node[]} */
        this.domSuccs = [];

        // LT Dominators
        this.resetLT();
        this.preNumber = -1;
        this.postNumber = -1;
        /** @type {?Node} */
        this.parent = null;
    }

    /** */
    resetLT()
    {
        /** @type {?Node} */
        this.dom = null;
        /** @type {?Node} */
        this.ancestor = null;
        /** @type {?Node[]} */
        this.bucket = [];
        /** @type {?Node} */
        this.label = this;
        this.semi = this.preNumber;
        /** @type {?Node} */
        this.idomParent = null;
        /** @type {Node[]} */
        this.idomKids = [];
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
     * @return {Node}
     */
    init_traversal()
    {
        this.generation = -1;
        return this;
    }

    /**
     * @param {Node[]} succs
     * @return {Node}
     */
    add_succs( ...succs )
    {
        console.log( `${this.name}(${this.id}) => ${succs.map( n => `${n.name}(${n.id})` ).join( ' ' )}` );
        this.succs = succs; // .sort( ( a, b ) => a.id - b.id );
        return this;
    }

    /**
     * @param {Node[]} _preds
     * @return {Node}
     */
    add_preds( ..._preds )
    {
        const preds = _preds.filter( x => !!x );

        if ( !this.preds.length && preds.length )
            this.parent = preds[ 0 ];

        this.preds = [ ...new Set( this.preds.concat( preds ) ) ];
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

    /**
     * @return {string}
     */
    toString()
    {
        const
            wkNums   = `preNumber: ${this.preNumber + 1}, postNumber: ${this.postNumber + 1}`,
            fronts   = [ ...this.frontier ].map( n => n.pre + 1 ).join( ', ' ),
            ltFronts = ( this.ltFrontier || [] ).map( n => n.pre + 1 ).join( ', ' ),
            preds    = this.preds.length ? this.preds.map( n => n.pre + 1 ).join( ' ' ) : ' ',
            succs    = this.succs.length ? this.succs.map( n => n.pre + 1 ).join( ' ' ) : ' ',
            pre      = this.pre + 1,
            post     = this.post + 1,
            rpost    = this.rpost + 1;

        return `${this.name} (${preds} < > ${succs}) => pre: ${pre}, post: ${post}, rpost: ${rpost}, webkit => ${wkNums}, frontier: ${fronts}, lt fronts: ${ltFronts}, dom. by: ${this.idomParent
            ? this.idomParent.name
            : ' '}`;
    }

    /**
     * @return {string[]}
     */
    toTable()
    {
        const
            fronts   = [ ...this.frontier ].map( n => n.id + 1 ).join( ' ' ),
            ltFronts = ( this.ltFrontier || [] ).map( n => n.id + 1 ).join( ' ' ),
            preds    = this.preds.length ? this.preds.map( n => n.id + 1 ).join( ' ' ) : ' ',
            succs    = this.succs.length ? this.succs.map( n => n.id + 1 ).join( ' ' ) : ' ',
            pre      = this.pre + 1,
            post     = this.post + 1,
            rpost    = this.rpost + 1;

        return [ this.name, succs, preds, pre, post, rpost, this.preNumber + 1, this.postNumber + 1, this.chkDom ? this.chkDom.name : ' ', fronts, ltFronts, this.idomParent ? this.idomParent.name : ' ' ];
        //  [ ...this.strictDominatorsOf() ].map( b => b.pre + 1 ) ];
    }

    get_doms()
    {

    }
}

/** */
class NodeList
{
    /**
     * @param {Node[]} nodeList
     */
    constructor( nodeList )
    {
        /** @type {Node[]} */
        this.nodes = [];

        nodeList
            .forEach( lst => lst.forEach( n => this.nodes[ n - 1 ] || ( this.nodes[ n - 1 ] = new Node( n ) ) ) );

        nodeList
            // .map( n => this.nodes[ this.nodes.length ] = new Node( n[ 0 ] ) )
            .forEach( ( n, i ) => this.nodes[ n[ 0 ] - 1 ].add_succs( ...nodeList[ i ].slice( 1 ).map( sn => this.nodes[ sn - 1 ] ) ) );

        this.preOrder = [];
        this.postOrder = [];
        this.rPostOrder = [];
        this.results = [];

        this.startNode = this.nodes[ 0 ];
        this.startNode.isStart = true;

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

        /**
         * @param {Node[]} nodes
         */
        const stash_doms = nodes => {
            this.results.push( nodes.reduce( ( rdom, n ) => {
                rdom[ n.post ] = n.chkDom ? n.chkDom.post : 'u';
                return rdom;
            }, [] ) );
        };

        FindDoms( this.nodes, { initial: stash_doms, iter: stash_doms } );
        this.maxPreNumLt = PrePost( this.startNode );
        // this.lentar_dominators();
        this.nodes.forEach( n => n.ltFrontier = [ ...n.dominatorsOf() ].sort( ( a, b ) => a.preNumber - b.preNumber ) );
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

    /**
     * @param {function} fn
     */
    forEach( fn )
    {
        this.nodes.forEach( fn );
    }

    /**
     * @param {function} fn
     * @return {*[]}
     */
    map( fn )
    {
        return this.nodes.map( fn );
    }

    /**
     * @param index
     * @return {Node}
     */
    get( index )
    {
        return this.nodes[ index ];
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
        r += str_table( 'Nodes post order', headers, this.postOrder.map( n => n.toTable() ) ) + '\n';
        r += str_table( 'Nodes reverse post order', headers, this.rPostOrder.map( n => n.toTable() ) ) + '\n';

        const
            nodesPost = this.nodes.slice().sort( ( a, b ) => b.post - a.post ),
            chk       = start_table( [ '', ...this.results.map( ( r, i ) => !i ? 'Inital' : 'Iter #' + i ) ] );

        chk.push( ...nodesPost.map( node => [ 'Node #' + ( node.post + 1 ), ...this.results.map( ra => typeof ra[ node.post ] === 'number' ? ra[ node.post ] + 1 : 'u' ) ] ) );
        r += chk.toString();

        return r;
    }

    /**
     *
     */
    lentar_dominators()
    {
        DominatorTreeBuilder( this, this.maxPreNumLt );

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

                const worklist = [ { node: this.nodes[ 0 ], order: 1 } ];

                while ( worklist.length )
                {
                    const { node, order } = worklist.pop();

                    switch ( order )
                    {
                        case 1:
                            node.preNumber = nextPreNumber++;
                            node.generation = traversal.generation;

                            worklist.push( { node, order: -1 } );

                            for ( const kid of node.idomKids )
                            {
                                if ( kid.generation < traversal.generation )
                                    worklist.push( { node: kid, order: 1 } );
                            }
                            break;

                        case -1:
                            node.postNumber = nextPostNumber++;
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
