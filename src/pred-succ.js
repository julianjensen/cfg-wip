/** ******************************************************************************************************************
 * @file Describe what pred-succ does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 27-Nov-2017
 *********************************************************************************************************************/
"use strict";

const
    ExtArray = require( './ext-array' );

/**
 * @class BlockArray<BasicBlock>
 * @extends ExtArray<BasicBlock>
 */
class BlockArray extends ExtArray
{
    /**
     * @param {*[]} args
     */
    constructor( ...args )
    {
        super( ...args );
        this.__sort = ( a, b ) => a.pre - b.pre;
        this.__complement = null;
    }

    /**
     * @param {BasicBlock} owner
     * @param {string} compl
     * @param {function} add_cb
     */
    init( owner, compl, add_cb )
    {
        this.owner = owner;
        this.__complement = compl;
        this.__add_cb = add_cb;
    }

    /**
     * @param {*[]} el
     * @return {ExtArray}
     */
    delete( ...el )
    {
        el.forEach( e => {
            if ( !e ) return;
            const i = this.indexOf( e );
            if ( i === -1 ) return;
            this.splice( i, 1 );
            e[ this.__complement ].delete( this.owner );
        } );

        return this;
    }

    /**
     * @param {*[]} el
     */
    add( ...el )
    {
        let added = super.add( ...el );

        added = Array.isArray( added ) ? added : added ? [ added ] : [];

        added.forEach( p => {
            p[ this.__complement ].add( this.owner );
            this.__add_cb && this.__add_cb( p );
        } );

        const seen = new Set( this );
        this.length = 0;
        seen.forEach( n => this[ this.length ] = n );

        return added.length === 1 ? added[ 0 ] : added;
    }

}

module.exports = BlockArray;
