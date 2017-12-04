/** ****************************************************************************************************
 * File: walker (dominators)
 * @author julian on 12/1/17
 * @version 1.0.0
 * @copyright Planet3, Inc.
 *******************************************************************************************************/
'use strict';

const
    succs = [
        [ 1, 2, 4 ],
        [ 2, 3 ],
        [ 3 ],
        [ 4, 5, 6 ],
        [ 5 ],
        [ 6 ]
    ],
    alt = [
        [ 1, 4, 2 ],
        [ 2, 3 ],
        [ 3 ],
        [ 4, 5, 6 ],
        [ 5 ],
        [ 6 ]
    ];

class Walker
{
    // static visited( node )
    // {
    //     if ( !Walker._visited ) Walker._visited = new Set();
    //
    //     if ( Walker._visited.has( node ) ) return true;
    //
    //     Walker._visited.add( node );
    //
    //     return false;
    // }
    //
    // static BFS( top )
    // {
    //     const
    //         queue = [ top ];
    //
    //     Walker.visited( top );
    //
    //     while ( queue.length )
    //     {
    //         const v = queue.pop();
    //
    //         for ( const s of v.successors() )
    //         {
    //             if ( !Walker.visited( s ) )
    //                 queue.push( s );
    //         }
    //     }
    // }
    //
    static Edge( from, to, data )
    {
        if ( !Walker.src ) Walker.src = new Map();

        let dst = Walker.src.get( from );

        if ( !data && !dst ) return null;

        if ( !dst ) Walker.src.set( from, dst = new Map() );

        if ( !data && !dst.has( to ) ) return null;

        if ( !data ) return dst.get( to );

        dst.set( to, data );

        return data;
    }

    static DFS( node, count )
    {
        let preOrder = 0,
            postOrder = 0,
            rPostOrder = count - 1;

        function dfs( n )
        {
            n.state = 'enter';
            n.pre = preOrder++;

            for ( const s of n )
            {
                if ( !s.state )
                {
                    Walker.Edge( n, s, 'tree' );
                    dfs( s );
                }
                else if ( s.state === 'enter' )
                    Walker.Edge( n, s, 'back' );
                else if ( n.pre < s.pre )
                    Walker.Edge( n, s, 'forward' );
                else
                    Walker.Edge( n, s, 'cross' );
            }

            n.state = 'exit';
            n.post = postOrder++;
            n.rpost = rPostOrder--;
        }

        dfs( node );
    }

    static VisitPre( root, fn )
    {
        function vdfs( node )
        {
            fn( node );
            [ ...node ].forEach( vdfs );
        }

        vdfs( root );
    }

    static post_order( root, fn )
    {
        const
            q = [ root ];

        while ( q.length )
        {
            const node = q.pop();

        }
    }

    static asArray( root, order = 'pre' )
    {
        const res = [];

        Walker.VisitPre( root, n => res[ n[ order ] ] = n );

        return res;
    }
}


class Node
{
    constructor( n )
    {
        this.id = n - 1;
        this.state = null;
        this.pre = -1;
        this.post = -1;
        this.rpost = -1;
    }

    add_succs( ...succs )
    {
        this.succs = succs; // .sort( ( a, b ) => a.id - b.id );
        return this;
    }

    * [Symbol.iterator]()
    {
        yield *this.succs;
    }

    toString()
    {
        return `${this.id + 1} (${this.state || 'unproc'}) -> ${this.pre + 1}:${this.post + 1} < ${this.rpost + 1}`;
    }
}

const
    log = ( ...args ) => console.log( ...args ),
    nodes = [];

alt
    .map( n => nodes[ nodes.length ] = new Node( n[ 0 ] ) )
    .forEach( n => n.add_succs( ...alt[ n.id ].slice( 1 ).map( sn => nodes[ sn - 1 ] ) ) );

Walker.DFS( nodes[ 0 ], 6 );

log( 'Node seen order' );
log( nodes.map( n => `${n}` ).join( '\n' ) );
log( '' );
log( 'DFS walk order' );
Walker.VisitPre( nodes[ 0 ], n => log( `${n}` ) );
log( '' );
log( 'pre-walk' );
log( Walker.asArray( nodes[ 0 ], 'pre' ).map( n => `${n.pre + 1} -> ${n.id + 1}` ).join( '\n' ) );
log( 'post-walk' );
log( Walker.asArray( nodes[ 0 ], 'post' ).map( n => `${n.post + 1} -> ${n.id + 1}` ).join( '\n' ) );
log( 'rpost-walk' );
log( Walker.asArray( nodes[ 0 ], 'rpost' ).map( n => `${n.rpost + 1} -> ${n.id + 1}` ).join( '\n' ) );

