/** ****************************************************************************************************
 * File: lt (dominators)
 * @author julian on 12/6/17
 * @version 1.0.0
 * @copyright Planet3, Inc.
 *******************************************************************************************************/
'use strict';

const
    idoms    = [],
    semidom  = [],
    bucket   = [],
    ancestor = [],
    parent   = [],
    label    = [];

let index2pre = [];

class LTDominators
{
    /**
     * @param {NodeList} nodes
     * @param {boolean} postDom
     */
    constructor( nodes, postDom )
    {
        nodes.forEach( n => {
            index2pre.push( n.pre );
            semidom[ n.pre ] = n.pre;
            if ( n.parent )
            {
                parent[ n.pre ] = ancestor[ n.pre ] = n.parent.pre;
            }
            bucket[ n.pre ] = [];
            label[ n.pre ]  = n.pre;
        } );
        idoms.length                 = 0;
        idoms[ nodes.startNode.pre ] = nodes.startNode.pre;

        index2pre = index2pre.sort();

        this.postDom = postDom;
        this.nodes   = nodes;
    }

    getSuccs( pre )
    {
        const block = this.nodes.getPre( pre );
        return this.postDom ? block.preds.map( n => n.pre ) : block.succs.map( n => n.pre );
    }

    getPreds( pre )
    {
        const block = this.nodes.getPre( pre );
        return this.postDom ? block.succs.map( n => n.pre ) : block.preds.map( n => n.pre );
    }

    /**
     * Performs path compress on the DFS info.
     *
     * @param {number} inBlock Basic block whose DFS info we are path compressing.
     */
    compress( inBlock )
    {
        let iAncestor = ancestor[ inBlock ];

        if ( ancestor[ iAncestor ] )
        {
            const worklist = [],
                  visited  = [],
                  vadd     = b => visited[ b ] ? false : visited[ b ] = true;

            worklist.push( inBlock );

            while ( worklist.length )
            {
                let v         = worklist[ worklist.length - 1 ],
                    vAncestor = ancestor[ v ];

                // Make sure we process our ancestor before ourselves.
                if ( vadd( vAncestor ) && ancestor[ vAncestor ] )
                {
                    worklist.push( vAncestor );
                    continue;
                }

                worklist.pop();

                // Update based on ancestor info.
                if ( !ancestor[ vAncestor ] ) continue;

                let vAncestorRep = label[ vAncestor ],
                    vRep         = label[ v ];

                if ( semidom[ vAncestorRep ] < semidom[ vRep ] ) label[ v ] = vAncestorRep;

                ancestor[ v ] = ancestor[ vAncestor ];
            }
        }
    }

    _eval( v )
    {
        if ( !ancestor[ v ] ) return v;

        this.compress( v );
        return label[ v ];
    }

    /**
     * Performs dominator/post-dominator calculation for the control
     * flow graph.
     */
    generate()
    {
        /*
         * First we perform a DFS numbering of the blocks, by
         * numbering the dfs tree roots.
         */

        // Now calculate semidominators.
        for ( let i = index2pre.length - 1; i > 1; --i )
        {
            let w     = index2pre[ i ],
                preds = this.getPreds( w );

            for ( const predBlock of preds )
            {
                /*
                 * PredInfo may not exist in case the predecessor is
                 * not reachable.
                 */
                // if ( predBlock )
                // {
                let predSemidom = semidom[ this._eval( predBlock ) ];

                if ( predSemidom < semidom[ w ] ) semidom[ w ] = predSemidom;
                // }
            }

            bucket[ semidom[ w ] ].push( w );

            /*
             * Normally we would call link here, but in our O(m log n)
             * implementation this is equivalent to the following
             * single line.
             */
            ancestor[ w ] = parent[ w ];

            // Implicity define idom for each vertex.
            const wParentBucket = bucket[ parent[ w ] ];

            while ( wParentBucket.length )
            {
                let last = wParentBucket.pop(),
                    U    = this._eval( last );

                if ( semidom[ U ] < semidom[ last ] ) idoms[ last.pre ] = U.pre;
                else idoms[ last.pre ] = parent[ w ].pre;
            }
        }

        // Now explicitly define the immediate dominator of each vertex
        for ( let i = 2; i <= index2pre.length - 1; ++i )
        {
            let w = index2pre[ i ];

            // getPre of semidom to pre is the same as semidom
            if ( idoms[ w ] !== semidom[ w ] ) idoms[ w ] = idoms[ idoms[ w ] ];
        }

        const domTree = this.nodes.map( n => ( {
                              id:       n.id,
                              pre:      n.pre,
                              idom:     n.isStart ? void 0 : idoms[ n.pre ],
                              domSuccs: [],
                              domPreds: []
        } ) );

        return domTree
            .sort( ( a, b ) => a.pre - b.pre )
            .map( ( d, i, dt ) => {
                if ( d.idom === void 0 ) return d;
                const didom = d.idom;
                d.idom      = dt[ d.idom ];
                if ( d.idom )
                    d.idom.domSuccs.push( d );
                else
                    console.warn( `No idom for ${didom}` );

                return d;
            } );
    }
}

module.exports = LTDominators;
