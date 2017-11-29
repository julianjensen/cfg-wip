/** ******************************************************************************************************************
 * @file Describe what misc does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 19-Nov-2017
 *********************************************************************************************************************/
"use strict";

/** */
export class BasicBlock extends Array
{
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
     * @param {number} i
     * @return {?Node}
     */
    at( i )
    {
        return this[ i ];
    }

    /**
     * @param {number} i
     * @return {?Node}
     */
    tryAt( i )
    {
        return i < this.length ? this[ i ] : null;
    }

    /**
     * @param {Node} node
     */
    append( node )
    {
        this.push( node );
    }
}

/** */
export class CFG
{
    /**
     * @param {Graph} graph
     */
    constructor( graph )
    {
        this.graph = graph;
    }

    /**
     * @return {Node}
     */
    root()
    {
        return this.graph[ 0 ];
    }

    /**
     * @return {Array<Node>}
     */
    roots()
    {
        return this.graph.roots;
    }
}

