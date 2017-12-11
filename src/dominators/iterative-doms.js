/** ****************************************************************************************************
 * File: dominator-tree-builder (dominators)
 * @author julian on 12/1/17
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
function IterativeDoms( nodes, postDom = false )
{
    const
        top = postDom ? nodes.exitNode : nodes.startNode,
        outEdges = postDom ? 'succs' : 'preds',
        idoms   = [];

    let changed = true;

    idoms[ top.id ] = top;

    /**
     * @param {Node} b
     *
     */
    function fidoms( b )
    {
        console.log( `fidoms order ${b.id + 1}, post: ${b.post + 1}` );
        if ( b === top ) return;

        let idom = null;

        b[ outEdges ].forEach( p => {
            if ( !idoms[ p.id ] ) return;
            if ( !idom ) idom = p;
            else
            {
                let finger1 = p,
                    finger2 = idom;

                while ( finger1.post !== finger2.post )
                {
                    while ( finger1.post < finger2.post ) finger1 = idoms[ finger1.id ];
                    while ( finger2.post < finger1.post ) finger2 = idoms[ finger2.id ];
                }

                idom = finger1;
            }
        } );

        if ( idoms[ b.id ] !== idom )
        {
            idoms[ b.id ] = idom;
            changed        = true;
        }
    }

    while ( changed )
    {
        console.log( 'CHK WALK' );
        changed = false;
        DFS( nodes, { rpost: fidoms, POSTDOM: postDom } );
    }

    return idoms.map( n => n.id );
}

module.exports = IterativeDoms;
