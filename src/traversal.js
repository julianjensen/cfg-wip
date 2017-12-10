/** ******************************************************************************************************************
 * @file Describe what traversal does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 03-Dec-2017
 *********************************************************************************************************************/
"use strict";

const
    isFn = a => typeof a === 'function';

let generation = 0;

/**
 * @param {NodeList} list
 * @param {object} cbs
 * @return {number}
 */
function DFS( list, cbs = {} )
{
    const
        callback = ( fn, ...args ) => isFn( fn ) && fn( ...args ),

        add_edge = ( from, to, type ) => {
            callback( cbs.edge, from, to, type );
            callback( cbs.edge && cbs.edge[ type ], from, to, type );
        },
        pre = n => callback( cbs.pre, n ),
        post = n => callback( cbs.post, n ),
        rpost = list => isFn( cbs.rpost ) && list.forEach( n => cbs.rpost( n ) ),
        rpre = list => isFn( cbs.rpre ) && list.forEach( n => cbs.rpre( n ) ),
        process = ( u, v ) => { add_edge( u, v, 'tree' ); v.parent = u; dfs( v ); },

        postOrder = [],
        preOrder = [],
        running = new Set(),
        _v = new Set(),
        visit = n => _v.has( n ) ? false : !!_v.add( n ),

        outEdges = cbs.POSTDOM ? 'preds' : 'succs';

    let preOrderN  = 0,
        postOrderN = 0,
        rpostCnt  = list.length - 1;

    /**
     * @param {Node} u
     */
    function dfs( u )
    {
        u.pre = preOrderN++;
        preOrder.push( u );
        running.add( u );

        // pre( u );

        for ( const v of u[ outEdges ] )
        {
            if ( visit( v ) ) process( u, v );
            else if ( running.has( v ) ) add_edge( u, v, 'back' );
            else if ( u.pre < v.pre ) add_edge( u, v, 'forward' );
            else add_edge( u, v, 'cross' );
        }

        running.delete( u );
        u.post = postOrderN++;

        postOrder.push( u );
        u.rpost = rpostCnt--;
        // post( u );
    }

    // const all = CBS.POSTDOM ? list.reverse()
    // list.forEach( node => visit( node ) && dfs( node ) );

    dfs( cbs.POSTDOM ? list.exitNode : list.startNode );

    cbs.preOrder = preOrder;
    cbs.postOrder = postOrder;
    if ( cbs.pre ) preOrder.forEach( pre );
    if ( cbs.post ) postOrder.forEach( post );
    rpost( cbs.revPostOrder = postOrder.reverse() );
    rpre( cbs.revPreOrder = preOrder.reverse() );

    return preOrderN;
}

/**
 * @param {Node} root
 * @return {Array<Node>}
 */
function BFS( root )
{
    const
        _v    = new Set(),
        visit = n => _v.has( n ) ? false : !!_v.add( n ),

        /** @type {Array<Node>} */
        queue = [ root ];

    let n,
        bfOrder = [],
        preOrder = 0;

    visit( root );

    while ( ( n = queue.shift() ) )
    {
        n.bpre = preOrder++;
        bfOrder.push( n );

        queue.push( ...n.succs.filter( visit ) );
    }

    return bfOrder;
}

module.exports = { DFS, BFS };
