/** ****************************************************************************************************
 * File: lt (dominators)
 * @author julian on 12/6/17
 * @version 1.0.0
 * @copyright Planet3, Inc.
 *******************************************************************************************************/
'use strict';

const
    { DFS }  = require( '../traversal' ),
    idoms    = [],
    semidom  = [],
    bucket   = [],
    ancestor = [],
    parent   = [],
    label    = [];

let index2pre = [];

/** */
class LTDominators
{
    /**
     * @param {NodeList} nodes
     * @param {boolean} [postDom=false]
     */
    constructor( nodes, postDom = false )
    {
        nodes.forEach( n => {
            index2pre[ n.id ] = n.pre;
            semidom[ n.pre ]  = n.pre;
            if ( n.parent )
                parent[ n.pre ] = n.parent.pre;
            // parent[ n.pre ] = ancestor[ n.pre ] = n.parent.pre;

            bucket[ n.pre ] = [];
            label[ n.pre ]  = n.pre;
        } );
        idoms.length                 = 0;
        idoms[ nodes.startNode.pre ] = nodes.startNode.pre;

        this.postDom = postDom;
        this.nodes   = nodes;
    }

    /**
     * @param {number} pre
     * @return {number[]}
     */
    getSuccs( pre )
    {
        const block = this.nodes.getPre( pre );
        return this.postDom ? block.preds.map( n => n.pre ) : block.succs.map( n => n.pre );
    }

    /**
     * @param {number} pre
     * @return {number[]}
     */
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

        if ( iAncestor === void 0 || ancestor[ iAncestor ] === void 0 ) return;

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
                if ( ancestor[ vAncestor ] === void 0 ) continue;

                let vAncestorRep = label[ vAncestor ],
                    vRep         = label[ v ];

                if ( semidom[ vAncestorRep ] < semidom[ vRep ] ) label[ v ] = vAncestorRep;

                ancestor[ v ] = ancestor[ vAncestor ];
            }
        }
    }

    /**
     * @param {number} v
     * @return {*}
     * @private
     */
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

        const
            domTree = this.nodes.map( n => ( {
                node:     n,
                id:       n.id,
                pre:      n.pre,
                idom:     n.isStart ? void 0 : idoms[ n.pre ],
                domSuccs: [],
                frontier: [],
                doms:     []
            } ) );

        return domTree
        // .sort( ( a, b ) => a.pre - b.pre )
            .map( d => {
                if ( d.node.isStart ) return d;
                d.idom = domTree.find( dn => dn.pre === d.idom );
                if ( !d.idom ) return d;
                d.idom.domSuccs.push( d );

                return d;
            } );
    }
}

/**
 * @param {Node} node
 */
function dominator_visitor( node )
{
    if ( node.isStart ) return;

    let p = node.parent,
        s = p,
        s2;

    if ( node.name === 'NODE 7' )
        s2 = 1;

    for ( let v of node.preds )
    {
        if ( v.pre <= node.pre )
            s2 = v;
        else
            s2 = ancestor_with_lowest_semi( v );

        if ( s2.pre < s.pre )
            s = s2;
    }

    node.semi = s;
    s.bucket.push( node );
    node.ancestor = p;
    node.label    = node;

    // y < v => v.dom = y else v.dom = p
    for ( let v of p.bucket )
    {
        let y = ancestor_with_lowest_semi( v );

        if ( y.semi.pre < v.semi.pre )
            v.dom = y;
        else
            v.dom = p;
    }

    p.bucket.length = 0;
}

function ancestor_with_lowest_semi( v )
{
    let a = v.ancestor;

    if ( !a ) return v;

    if ( a && a.ancestor )
    {
        let b      = ancestor_with_lowest_semi( a );
        v.ancestor = a.ancestor;

        if ( b.semi.pre < v.label.semi.pre )
            v.label = b;
    }

    return v.label;
}

function boost( nodes )
{
    DFS( nodes, { rpost: dominator_visitor } );
    DFS( nodes, {
        rpost: w => {
            if ( w.isStart ) return;

            if ( !w.dom )
            {
                console.log( `no dom: ${w.name} ${w.id}` );
                w.dom = w.semi;
                return;
            }
            if ( w.dom.pre !== w.semi.pre ) w.dom = w.dom.dom;
        }
    } );

    console.log( nodes.map( n => `${n.name}(${n.pre + 1}) -> ${n.dom ? n.dom.pre + 1 : '-'}:${n.semi.pre + 1}` ) );

}

function yalt( nodes )
{
    let parent   = [],
        succs    = [],
        preds    = [],
        semi     = [],
        idom     = [],
        ancestor = [],
        best     = [],
        bucket   = [],
        child    = [],
        size     = [],

        _link    = ( v, w ) => ancestor[ w ] = v,

        _simple_eval     = ( v ) => {
            let a = ancestor[ v ];

            if ( a === -1 ) return v;

            while ( ancestor[ a ] !== -1 )
            {
                if ( semi[ v ] > semi[ a ] ) v = a;
                a = ancestor[ a ];
            }

            return v;
        },

        _compress = v => {
            const a = ancestor[ v ];

            if ( a === -1 ) return;

            _compress( a );

            if ( semi[ best[ v ] ] > semi[ best[ a ] ] )
                best[ v ] = best[ a ];

            ancestor[ v ] = ancestor[ a ];
        },

        _eval    = v => {
            if ( ancestor[ v ] === -1 ) return v;
            _compress( v );
            return best[ v ];
        },

        _slink    = ( v, w ) => {
            let s = w;

            do
            {
                let cs  = child[ s ],
                    bcs = cs !== -1 ? best[ cs ] : -1;

                if ( cs !== -1 && semi[ best[ w ] ] < semi[ bcs ] )
                {
                    let ccs  = child[ cs ],
                        ss   = size[ s ],
                        scs  = size[ cs ],
                        sccs = ccs !== -1 ? size[ ccs ] : 0;

                    if ( ss - scs >= scs - sccs )
                        child[ s ] = ccs;
                    else
                    {
                        size[ cs ]    = ss;
                        ancestor[ s ] = cs;
                        s             = cs;
                    }
                }
                else
                    break;
            }
            while ( true );

            best[ s ] = best[ w ];
            if ( size[ v ] < size[ w ] )
            {
                let t = s;
                s = child[ v ];
                child[ v ] = t;
            }
            size[ v ] = size[ v ] + size[ w ];
            while ( s !== -1 )
            {
                ancestor[ s ] = v;
                s = child[ s ];
            }
        };

    nodes.forEach( n => {
        const i = n.id;

        parent[ i ]   = n.parent ? n.parent.id : -1;
        // child[ i ] = n.child,
        child[ i ]    = -1;
        size[ i ]     = 0;
        succs[ i ]    = n.succs.map( s => s.id );
        preds[ i ]    = n.preds.map( p => p.id );
        semi[ i ]     = n.id;
        idom[ i ]     = -1;
        ancestor[ i ] = -1;
        best[ i ]     = n.id;
        bucket[ i ]   = [];
    } );

    DFS( nodes, {
        rpre: node => {

            if ( node.isStart ) return;

            const
                w = node.id,
                p = parent[ w ];

            for ( const v of preds[ w ] )
            {
                const u = _eval( v );

                if ( semi[ w ] > semi[ u ] )
                    semi[ w ] = semi[ u ];
            }

            bucket[ semi[ w ] ].push( w );
            _slink( p, w );

            for ( const v of bucket[ p ] )
            {
                const u   = _eval( v );
                idom[ v ] = semi[ u ] < semi[ v ] ? u : p;
            }

            bucket[ p ].length = 0;
        }
    } );

    nodes.forEach( node => {
        if ( node.isStart ) return;

        const w = node.id;

        if ( idom[ w ] !== semi[ w ] )
            idom[ w ] = idom[ idom[ w ] ];
    } );

    idom[ nodes.startNode.id ] = void 0;

    console.log( 'idoms:\n   ', idom.map( ( idm, id ) => `${id + 1} -> ${idm === void 0 ? ' ' : idm + 1}` ).join( '\n    ' ) );

    nodes.forEach( n => n.simpleDom = idom[ n.id ] );
}

module.exports = { LTDominators, boost, yalt };
