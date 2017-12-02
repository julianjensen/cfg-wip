/** ****************************************************************************************************
 * File: dominance-chk (dominators)
 * @author julian on 12/1/17
 * @version 1.0.0
 * @copyright Planet3, Inc.
 *******************************************************************************************************/
'use strict';

class Dominance
{
    /**
     * @param {BasicBlockList} blockList
     */
    constructor( blockList )
    {
        this.blockList = blockList;
        this.frontiers = new Map();
    }

    immediate_dominators()
    {

    }
/*
 if start not in G:
        raise nx.NetworkXError('start is not in G')

    idom = {start: start}

    order = list(nx.dfs_postorder_nodes(G, start))
    dfn = {u: i for i, u in enumerate(order)}
    order.pop()
    order.reverse()

    def intersect(u, v):
        while u != v:
            while dfn[u] < dfn[v]:
                u = idom[u]
            while dfn[u] > dfn[v]:
                v = idom[v]
        return u

    changed = True
    while changed:
        changed = False
        for u in order:
            new_idom = reduce(intersect, (v for v in G.pred[u] if v in idom))
            if u not in idom or idom[u] != new_idom:
                idom[u] = new_idom
                changed = True

    return idom
 */


/*
idom = nx.immediate_dominators(G, start)

    df = {u: [] for u in idom}

    for u in idom:
        if len(G.pred[u]) - int(u in G.pred[u]) >= 2:
            p = set()
            for v in G.pred[u]:
                while v != idom[u] and v not in p:
                    p.add(v)
                    v = idom[v]
            p.discard(u)
            for v in p:
                df[v].append(u)

    return df
 */
}

module.exports = Dominance;

const
    example = 1,
    doms = [],
    preds = [],
    nodes = [],
    results = [];

let startNode;

function add( n, ...succs )
{
    succs.forEach( s => {
        if ( !preds[ s ] ) preds[ s ] = [];
        preds[ s ].push( n );
    } );
    // nodes[ n - 1 ] = { n: n - 1, succs: succs.map( s => s - 1 ), preds: [] };
}

if ( example === 1 )
{
    add( 6, 5, 4 );
    add( 5, 1 );
    add( 1, 2 );
    add( 4, 2, 3 );
    add( 2, 1, 3 );
    add( 3, 2 );
    startNode = 6 - 1;
    doms[ startNode ] = startNode;
}
else if ( example === 2 )
{
    add( 5, 4, 3 );
    add( 4, 1 );
    add( 3, 2 );
    add( 2, 1 );
    add( 1, 2 );
    startNode = 5 - 1;
    doms[ startNode ] = startNode;
}

// succs.forEach( ( su, n ) => n !== startNode && su.forEach( succ => ( preds[ succ ] || ( preds[ succ ] = [] ) ).push( n ) ) );
// nodes.forEach( n => n.succs.forEach( s => nodes[ s ].preds.push( n.n ) ) )
// nodes.forEach( n => n.preds = [ ...n.preds ] );


function intersect( finger1, finger2 )
{
    while ( finger1 !== finger2 )
    {
        while ( finger1 < finger2 )
            finger1 = doms[ finger1 ];
        while ( finger2 < finger1 )
            finger2 = doms[ finger2 ];
    }

    return finger1;
}

function find_idoms()
{
    let changed = true;

    results.push( doms.slice() );

    // nodes.sort( ( a, b ) => !a.preds ? -1 : !b.preds ? -1 : b.n - a.n );
    console.log( preds );

    while ( changed )
    {
        changed = false;
        for ( let b = nodes.length; b--; )
        {
            if ( b === startNode ) continue;
            let idom = preds[ b ][ 0 ];
            preds[ b ].slice( 1 ).forEach( p => doms[ p ] && ( idom = intersect( p, idom ) ) );
            if ( doms[ b ] !== idom )
            {
                doms[ b ] = idom;
                changed = true;
            }
        }
        results.push( doms.slice() )
    }

    show_doms();
}

function show_doms()
{
    for ( let n = preds.length; n--; )
    {
        console.log( `Node ${n + 1}    ${results.map( ra => typeof ra[ n ] === 'number' ? ra[ n ] + 1 : 'u' ).join( '    ' )}` );
    }
}

find_idoms();
/*
function net_idoms()
{
    let idom = {start: 5},
    order = list(nx.dfs_postorder_nodes(G, start)),
    dfn = {u: i for i, u in enumerate(order)};

    order.pop();
    order.reverse();

    function intersect(u, v)
    {
        while u != v:
        while dfn[ u ] < dfn[ v ]:
        u = idom[ u ]
        while dfn[ u ] > dfn[ v ]:
        v = idom[ v ]
        return u
    }
    let changed = true
    while changed
    {
        changed = false
        for ( u in order )
        {
            let new_idom = reduce(intersect, (v => for v in G.pred[u] if v in idom))
            if ( u not in idom || idom[u] != new_idom )
            {
                idom[ u ] = new_idom
                changed   = true
            }


    return idom

*/
