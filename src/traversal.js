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
        process = ( u, v ) => { add_edge( u, v, 'tree' ); dfs( v ); },

        revPostOrder = [],
        revPreOrder = [],
        running = new Set(),
        _v = new Set(),
        visit = n => _v.has( n ) ? false : !!_v.add( n );

    let preOrder  = 0,
        postOrder = 0,
        rpostCnt  = list.length - 1;

    /**
     * @param {Node} u
     */
    function dfs( u )
    {
        u.pre = preOrder++;
        revPreOrder.push( u );
        running.add( u );

        pre( u );

        for ( const v of u.succs )
        {
            // v.add_preds( u );

            if ( visit( v ) ) process( u, v );
            else if ( running.has( v ) ) add_edge( u, v, 'back' );
            else if ( u.pre < v.pre ) add_edge( u, v, 'forward' );
            else add_edge( u, v, 'cross' );
        }

        running.delete( u );
        u.post = postOrder++;

        revPostOrder.push( u );
        u.rpost = rpostCnt--;
        post( u );
    }

    list.forEach( node => visit( node ) && dfs( node ) );

    rpost( cbs.revPostOrder = revPostOrder.reverse() );
    rpre( cbs.revPreOrder = revPreOrder.reverse() );

    return preOrder;
}
/**
 * Alternative numbering sequence used by WebKit.
 *
 * @param {Node} root
 * @return {number}
 */
function PrePost( root )
{
    generation += 2;

    const worklist = [ { node: root, order: 1 } ];

    let nextPreNumber  = 0,
        nextPostNumber = 0;

    while ( worklist.length )
    {
        const { node, order } = worklist.pop();

        switch ( order )
        {
            case 1:
                node.preNumber = nextPreNumber++;
                node.generation = generation;

                worklist.push( { node, order: -1 } );

                for ( const kid of node.succs )
                {
                    if ( kid.generation < generation )
                        worklist.push( { node: kid, order: 1 } );
                }
                break;

            case -1:
                node.postNumber = nextPostNumber++;
                break;
        }
    }

    return nextPreNumber;
}

/**
 * @param {Node} root
 */
function BFS( root )
{
    generation += 2;

    const
        /** @type {Array<Node>} */
        queue = [ root ];

    let n,
        preOrder = 0;

    root.generation = generation;

    while ( ( n = queue.shift() ) )
    {
        n.bpre = preOrder++;

        queue.push( ...n.succs.map( c => c.get( generation ) ).filter( c => !!c ) );
    }
}

/**
 * @param type
 * @param head
 * @param succs
 * @param callback
 */
function generic( { type, head, succs = n => n.succs, callback } )
{
    const rpost = [];

    function _walk( n )
    {
        if ( n.generation === generation ) return;

        n.generation += 2;

        if ( type === 'pre' )
            callback( n );
        succs( n ).forEach( _walk );
        if ( type === 'post' )
            callback( n );
        if ( type === 'rpost' )
            rpost.push( n );
    }

    generation += 2;

    if ( type === 'rpost' )
        rpost.reverse().forEach( callback );

    _walk( head );
}

module.exports = { DFS, BFS, PrePost, generic };
Object.defineProperty( module.exports, 'generation', {
    get() { return generation; },
    set() { return generation; }
} );
