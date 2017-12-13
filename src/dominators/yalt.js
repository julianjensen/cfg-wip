/** ****************************************************************************************************
 * File: yalt (dominators)
 * @author julian on 12/6/17
 * @version 1.0.0
 * @copyright Planet3, Inc.
 *******************************************************************************************************/
'use strict';

const
    { DFS } = require( '../traversal' );

/**
 * @param {NodeList} nodes
 * @param {boolean} [postDom=false]
 * @return {Array<number>}
 */
function YALT( nodes, postDom = false )
{
    let parent    = [],
        outEdges  = [],
        semi      = [],
        idom      = [],
        ancestor  = [],
        best      = [],
        bucket    = [],
        child     = [],
        // size      = [],

        _link    = ( v, w ) => ancestor[ w ] = v,

        // _simple_eval     = ( v ) => {
        //     let a = ancestor[ v ];
        //
        //     if ( a === -1 ) return v;
        //
        //     while ( ancestor[ a ] !== -1 )
        //     {
        //         if ( semi[ v ] > semi[ a ] ) v = a;
        //         a = ancestor[ a ];
        //     }
        //
        //     return v;
        // },

        _compress = v => {
            const a = ancestor[ v ];

            if ( a === -1 ) return;

            _compress( a );

            if ( semi[ best[ v ] ] > semi[ best[ a ] ] )
                best[ v ] = best[ a ];

            ancestor[ v ] = ancestor[ a ];
        },

        _eval     = v => {
            if ( ancestor[ v ] === -1 ) return v;
            _compress( v );
            return best[ v ];
        },

        // _slink    = ( w ) => {
        //     let s = w,
        //         v = parent[ w ];
        //
        //     do
        //     {
        //         let cs  = child[ s ],
        //             bcs = cs !== -1 ? best[ cs ] : -1;
        //
        //         if ( cs !== -1 && semi[ best[ w ] ] < semi[ bcs ] )
        //         {
        //             let ccs  = child[ cs ],
        //                 ss   = size[ s ],
        //                 scs  = size[ cs ],
        //                 sccs = ccs !== -1 ? size[ ccs ] : 0;
        //
        //             if ( ss - scs >= scs - sccs )
        //                 child[ s ] = ccs;
        //             else
        //             {
        //                 size[ cs ]    = ss;
        //                 ancestor[ s ] = cs;
        //                 s             = cs;
        //             }
        //         }
        //         else
        //             break;
        //     }
        //     while ( true );
        //
        //     best[ s ] = best[ w ];
        //     if ( size[ v ] < size[ w ] )
        //     {
        //         let t      = s;
        //         s          = child[ v ];
        //         child[ v ] = t;
        //     }
        //     size[ v ] = size[ v ] + size[ w ];
        //     while ( s !== -1 )
        //     {
        //         ancestor[ s ] = v;
        //         s             = child[ s ];
        //     }
        // };

    skip = postDom ? nodes.exitNode : nodes.startNode;

    nodes.forEach( n => {
        const i = n.id;

        parent[ i ]   = n.parent ? n.parent.id : -1;
        child[ i ]    = -1;
        outEdges[ i ] = ( postDom ? n.succs : n.preds ).map( s => s.id );
        semi[ i ]     = n.id;
        ancestor[ i ] = -1;
        best[ i ]     = n.id;
        bucket[ i ]   = [];
    } );

    DFS( nodes, {
        rpre: node => {
console.log( `rpre: ${node.id + 1}` );
            if ( node === skip ) return;

            const
                w = node.id,
                p = parent[ w ];

            for ( const v of outEdges[ w ] )
            {
console.log( `yalt proc ${w + 1} edges ${outEdges[ w ].map( n => n + 1 ).join( ' ' )}` );
                const u = _eval( v );

                if ( semi[ w ] > semi[ u ] )
                    semi[ w ] = semi[ u ];
            }

            bucket[ semi[ w ] ].push( w );
            _link( w ); // _slink( w ) for faster version (but slower under real conditions)

            for ( const v of bucket[ p ] )
            {
                const u   = _eval( v );
                idom[ v ] = semi[ u ] < p ? u : p;  // idom[ v ] = semi[ u ] < semi[ v ] ? u : p;
            }

            bucket[ p ].length = 0;
        },
        POSTDOM: postDom
    } );

    ( postDom ? nodes.reverse() : nodes ).forEach( node => {
        if ( node === skip ) return;

        const w = node.id;

        if ( idom[ w ] !== semi[ w ] )
            idom[ w ] = idom[ idom[ w ] ];
    } );

    idom[ skip.id ] = void 0;

    return idom;
}


module.exports = YALT;
