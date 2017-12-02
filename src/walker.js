/** ****************************************************************************************************
 * File: walker (dominators)
 * @author julian on 12/1/17
 * @version 1.0.0
 * @copyright Planet3, Inc.
 *******************************************************************************************************/
'use strict';

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
    // static Edge( from, to, data )
    // {
    //     if ( !Walker.src ) Walker.src = new Map();
    //
    //     let dst = Walker.src.get( from );
    //
    //     if ( !data && !dst ) return null;
    //
    //     if ( !dst ) Walker.src.set( from, dst = new Map() );
    //
    //     if ( !data && !dst.has( to ) ) return null;
    //
    //     if ( !data ) return dst.get( to );
    //
    //     dst.set( to, data );
    //
    //     return data;
    // }

    static DFS( node, count )
    {
        let preOrder = 0,
            postOrder = 0,
            rPostOrder = count - 1;

        function dfs( n )
        {
            n.state = 'enter'
            n.pre = preOrder++;

            for ( const s of node.successors() )
            {
                if ( !n.state )
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
}


class Node
{
    constructor( n, ...succs )
    {
        this.id = n;
        this.state = null;
    }
}
