/** ******************************************************************************************************************
 * @file Describe what graph does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 19-Nov-2017
 *********************************************************************************************************************/
"use strict";

const
    assert = require( 'assert' );

const EMBEDDED_INDEX = Symbol( 'embedded-index' );

/**
 * @template T
 * @this {Array<T>}
 */
class SparseCollection extends Array
{
    /** */
    constructor()
    {
        super();

        this.ifNotObject = new Map();
        this.index = 0;
        /** @type {Array<number>} */
        this.unused = [];
    }

    /**
     * @param {T} value
     * @return {T}
     */
    add( value )
    {
        const index = this.unused.length ? this.unused.pop() : this.length;

        assert( !this[ index ] );

        assert( typeof value === 'object' && value !== null && !Array.isArray( value ) );

        Object.defineProperty( value, EMBEDDED_INDEX, { enumerable: false, value: index } );

        this[ index ] = value;

        return value;
    }

    /**
     * @param {T|function():T} value
     * @param {*[]} params
     * @return {T}
     */
    addNew( value, ...params )
    {
        return this.add( typeof value === 'function' ? value( ...params ) : value );
    }

    /**
     * @param {T} value
     */
    remove( value )
    {
        assert( Reflect.has( value, EMBEDDED_INDEX ) );
        this.unused.push( value[ EMBEDDED_INDEX ] );
        this[ value[ EMBEDDED_INDEX ] ] = void 0;
    }

    /** */
    packIndices()
    {
        if ( !this.unused.length ) return;

        let holeIndex = 0,
            endIndex = this.length;

        while ( true )
        {
            while ( holeIndex < endIndex && this[ holeIndex ] )
                ++holeIndex;

            if ( holeIndex === endIndex ) break;

            assert( holeIndex < this.length );
            assert( !this[ holeIndex ] );

            do --endIndex;
            while ( !this[ endIndex ] && endIndex > holeIndex );

            if ( holeIndex === endIndex ) break;

            assert( endIndex > holeIndex );
            assert( this[ endIndex ] );

            const value = this[ endIndex ];
            value[ EMBEDDED_INDEX ] = holeIndex;
            this[ holeIndex ] = value;
            ++holeIndex;
        }

        this.unused = [];
        this.length = endIndex;
    }

    /**
     * @return {number}
     */
    size()
    {
        return this.length;
    }

    /**
     * @return {boolean}
     */
    isEmpty()
    {
        return !this.length;
    }

    /**
     * @param {number} index
     * @return {T}
     */
    at( index )
    {
        return this[ index ];
    }
}

/** */
export class Graph
{
    /** */
    constructor()
    {
        this.slotVisitor = null;
        this.nodes = new SparseCollection();
        this.blocks = [];
        this.roots = [];
    }

    /**
     * @param params
     */
    addNode( ...params )
    {
        this.nodes.addNew( ...params );
    }

    /**
     * @return {number}
     */
    maxNodeCount()
    {
        return this.nodes.size();
    }

    /**
     * @param index
     * @return {T}
     */
    nodeAt( index )
    {
        return this.nodes[ index ];
    }
}

