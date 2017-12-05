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
 * @param {Array<Node>} list
 * @param {object} cbs
 * @return {number}
 */
function DFS( list, cbs = {} )
{
    const
        callback = ( fn, ...args ) => isFn( fn ) && fn( ...args ),

        add_edge = ( from, to, type ) => {
            // edgeList.classify_edge( from, to, type );
            callback( cbs.edge, from, to, type );
            callback( cbs.edge && cbs.edge[ type ], from, to, type );
        },
        pre = n => callback( cbs.pre, n ),
        post = n => callback( cbs.post, n ),
        rpost = list => isFn( cbs.rpost ) && list.forEach( n => cbs.rpost( n ) ),
        process = ( u, v ) => { add_edge( u, v, 'tree' ); dfs( v ); },

        revPostOrder = [];

    let preOrder  = 0,
        postOrder = 0,
        rpostCnt  = list.length - 1;

    /**
     * @param {Node} u
     */
    function dfs( u )
    {
        u.generation = generation;
        u.color = 'gray';
        u.pre = preOrder++;

        pre( u );

        for ( const v of u )
        {
            v.add_preds( u );

            if ( v.generation < generation ) process( u, v );
            else if ( v.generation === generation ) add_edge( u, v, 'back' );
            else if ( u.pre < v.pre ) add_edge( u, v, 'forward' );
            else add_edge( u, v, 'cross' );
        }

        u.generation++;
        u.post = postOrder++;

        revPostOrder.push( u );
        u.rpost = rpostCnt--;
        post( u );
    }

    generation += 2;
    list.forEach( node => node.generation < generation && dfs( node ) );

    rpost( cbs.revPostOrder = revPostOrder.reverse() );

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
        queue = [ root ];

    let n,
        preOrder = 0;

    root.generation = generation;

    while ( ( n = queue.shift() ) )
    {
        n.bpre = preOrder++;

        queue.push( ...n.succs.filter( c => c.generation < generation ).map( c => ( c.generation = generation, c ) ) );
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
