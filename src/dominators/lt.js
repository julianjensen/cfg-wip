/** ****************************************************************************************************
 * File: lt (dominators)
 * @author julian on 12/6/17
 * @version 1.0.0
 * @copyright Planet3, Inc.
 *******************************************************************************************************/
'use strict';

class LTDominators
{
    /**
     * @param {NodeList} nodes
     * @param {boolean} postDom
     */
    constructor( nodes, postDom )
    {
        this.postDom = postDom;
        this.nodes   = nodes;
        this.run();
    }

    getSuccs( block )
    {
        return this.postDom ? block.preds : block.succs;
    }

    getPreds( block )
    {
        return this.postDom ? block.succs : block.preds;
    }

    /**
     * Performs path compress on the DFS info.
     *
     * @param {Node} inBlock Basic block whose DFS info we are path compressing.
     */
    compress( inBlock )
    {
        let ancestor = inBlock.ancestor;

        if ( ancestor.ancestor )
        {
            const worklist = [],
                  visited  = new Set(),
                  vadd     = b => visited.has( b ) ? false : !!visited.add( b );

            worklist.push( inBlock );

            while ( worklist.length )
            {
                let v         = worklist[ worklist.length - 1 ],
                    vAncestor = v.ancestor;

                // Make sure we process our ancestor before ourselves.
                if ( vadd( vAncestor ) && vAncestor.ancestor )
                {
                    worklist.push( vAncestor );
                    continue;
                }

                worklist.pop();

                // Update based on ancestor info.
                if ( !vAncestor.ancestor ) continue;

                let vAncestorRep = vAncestor.label,
                    vRep         = v.label;

                if ( vAncestorRep.semidom < vRep.semidom ) v.label = vAncestorRep;

                v.ancestor = vAncestor.ancestor;
            }
        }
    }

    _eval( v )
    {
        if ( !v.ancestor ) return v;

        this.compress( v );
        return v.label;
    }

    /**
     * Performs dominator/post-dominator calculation for the control
     * flow graph.
     */
    run()
    {
        let root = this.postDom ? this.nodes.exitNode : this.nodes.startNode;

        this.idoms  = [];
        this.idoms[ root.pre ] = root.pre;
        this.nodes.forEach( n => {
            n.semidom = n.pre;
            n.bucket = [];
        } );

        /*
         * First we perform a DFS numbering of the blocks, by
         * numbering the dfs tree roots.
         */

        // the largest semidom number assigned
        let dfsMax = this.nodes.maxPreNum - 1;

        // Now calculate semidominators.
        for ( let i = dfsMax; i >= 2; --i )
        {
            let w     = this.nodes.getPre( i ),
                preds = this.getPreds( w );

            for ( const predBlock of preds )
            {
                /*
                 * PredInfo may not exist in case the predecessor is
                 * not reachable.
                 */
                if ( predBlock )
                {
                    let predSemidom = this._eval( predBlock ).semidom;

                    if ( predSemidom < w.semidom ) w.semidom = predSemidom;
                }
            }

            this.nodes.getPre( w.semidom ).bucket.push( w );

            /*
             * Normally we would call link here, but in our O(m log n)
             * implementation this is equivalent to the following
             * single line.
             */
            w.ancestor = w.parent;

            // Implicity define idom for each vertex.
            const wParentBucket = w.parent.bucket;

            while ( wParentBucket.length )
            {
                let last     = wParentBucket.pop(),
                    U        = this._eval( last );

                if ( U.semidom < last.semidom ) this.idoms[ last.pre ] = U.pre;
                else this.idoms[ last.pre ] = w.parent.pre;
            }
        }

        // Now explicitly define the immediate dominator of each vertex
        for ( let i = 2; i <= dfsMax; ++i )
        {
            let w = this.nodes.getPre( i );

            // getPre of semidom to pre is the same as semidom
            if ( this.idoms[ w.pre ] !== this.nodes.getPre( w.semidom ).pre ) this.idoms[ w.pre ] = this.idoms[ this.idoms[ w.pre ] ];
        }
    }
}

module.exports = LTDominators;
