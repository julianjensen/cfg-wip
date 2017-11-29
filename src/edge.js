/** ******************************************************************************************************************
 * @file Describe what edge does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 26-Nov-2017
 *********************************************************************************************************************/
"use strict";

const
    toPre = a => typeof a === 'number' ? a : a.pre,
    forw = ( a, b ) => toPre( a ) + '->' + toPre( b ),
    back = ( a, b ) => toPre( b ) + '<-' + toPre( a );

/** */
class Edge
{
    /**
     * @param {BasicBlock} from
     * @param {BasicBlock} to
     * @param {string} [type]
     */
    constructor( from, to, type )
    {
        this.from = from;
        this.to = to;
        this.type = type;
    }

    /**
     * @return {{from: number, to: number}}
     */
    asIndex()
    {
        return { from: this.from.pre, to: this.to.pre };
    }

    /**
     * @return {string}
     */
    toString()
    {
        return `${this.from.pre} -> ${this.to.pre} [${this.type}]`;
    }
}

/** */
class EdgeList
{
    /** */
    constructor()
    {
        this.forward = new Map();
        this.backward = new Map();
    }

    renumber()
    {
        this.nf = new Map();
        this.nb = new Map();

        for ( const edge of this.forward.values() )
        {
            this.nf.set( forw( edge.from, edge.to ), edge );
            this.nb.set( back( edge.from, edge.to ), edge );
        }

        this.forward = this.nf;
        this.backward = this.nb;
    }

    /**
     * @param {BasicBlock} from
     * @param {BasicBlock} to
     * @param {string} [type]
     * @return {Edge}
     */
    add( from, to, type )
    {
        const
            fcode = from.pre + '->' + to.pre,
            bcode = to.pre + '<-' + from.pre,
            e = new Edge( from, to, type );

        this.forward.set( fcode, e );
        this.backward.set( bcode, e );

        if ( type ) e.type = type;

        return e;
    }

    /**
     * @param {BasicBlock} from
     * @param {BasicBlock} to
     * @param {string} type
     */
    classify_edge( from, to, type )
    {
        const e = this.forward.get( from.pre + '->' + to.pre );

        if ( !e )
            this.add( from, to, type );
        else
            e.type = type;
    }

    /**
     * @param {BasicBlock} from
     * @param {BasicBlock} to
     * @return {Edge}
     */
    get( from, to )
    {
        return this.forward.get( from.pre + '->' + to.pre );
    }

    delete_by_key( from, to )
    {
        this.forward.delete( forw( from, to ) );
        this.forward.delete( back( from, to ) );
    }

    delete( block )
    {
        block.succs.forEach( succ => this.forward.delete( forw( block, succ ) ) );
        block.preds.forEach( pred => this.backward.delete( back( block, pred ) ) );
    }
}

module.exports = {
    Edge,
    EdgeList
};
