/** ******************************************************************************************************************
 * @file Describe what graph-node-worklist does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 19-Nov-2017
 *********************************************************************************************************************/
"use strict";

import { BasicBlock } from './node';

/** */
export class GraphNodeWorklist
{
    /** */
    constructor()
    {
        /** @type {Set<BasicBlock>} */
        this.seen = new Set();
        /** @type {Array<BasicBlock>} */
        this.stack = [];
    }

    /**
     * @param node
     * @return {boolean}    - Returns true if we haven't seen the node before
     */
    push( node )
    {
        if ( this.seen.has( node ) ) return false;
        this.seen.add( node );
        this.stack.push( node );
        return true;
    }

    /**
     * @param {Iterable<Node>} iter
     */
    pushAll( iter )
    {
        for ( const node of iter ) this.push( node );
    }

    /**
     * @return {boolean}
     */
    isEmpty()
    {
        return !this.stack.length;
    }

    /**
     * @return {boolean}
     */
    isNotEmpty()
    {
        return !!this.stack.length;
    }

    /**
     * @return {BasicBlock}
     */
    pop()
    {
        if ( !this.stack.length ) return new BasicBlock();

        return this.stack.pop();
    }

    /**
     * @param {Node} node
     * @return {boolean}
     */
    saw( node )
    {
        return this.seen.has( node );
    }

    /**
     * @return {Set<Node>}
     */
    getSeen()
    {
        return this.seen;
    }
}

/**
 * @template T
 */
export class GraphNodeWith
{
    /**
     * @param {Node} [node=null]
     * @param {T} [data=null]
     */
    constructor( node = null, data = null )
    {
        this.node = node;
        /** @type {T} */
        this.data = data;
    }
}

/**
 * @template T
 */
export class ExtendedGraphNodeWorklist
{
    /** */
    constructor()
    {
        /** @type {Set<Node>} */
        this.seen = new Set();
        /** @type {Array<T>} */
        this.stack = [];
    }

    /**
     * @param {Node|GraphNodeWith} entry
     * @param {T} [data]
     */
    forcePush( entry, data )
    {
        if ( !data )
            this.stack.push( entry );
        else
            this.stack.push( new GraphNodeWith( entry, data ) );
    }

    /**
     * @param {Node|GraphNodeWith} entry
     * @param {T} [data]
     * @return {boolean}
     */
    push( entry, data )
    {
        if ( this.seen.has( entry ) ) return false;

        this.forcePush( !data ? entry : new GraphNodeWith( entry, data ) );
        return true;
    }

    /**
     * @return {boolean}
     */
    notEmpty()
    {
        return !!this.stack.length;
    }

    /**
     * @return {GraphNodeWith}
     */
    pop()
    {
        if ( !this.stack.length ) return new GraphNodeWith();
        return this.stack.pop();
    }
}

/**
 * @enum {string}
 */
export const GraphVisitOrder = {
    PRE: 'PRE',
    POST: 'POST'
};

/** */
export class GraphNodeWithOrder
{
    /**
     *
     * @param {Node} [node=]
     * @param {GraphVisitOrder} [order=GraphVisitOrder.PRE]
     */
    constructor( node = null, order = GraphVisitOrder.PRE )
    {
        /** @type {Node} */
        this.node = node;
        this.order = order;
    }
}

/** */
export class PostOrderGraphNodeWorklist
{
    /** */
    constructor()
    {
        /** @type {ExtendedGraphNodeWorklist<GraphVisitOrder>} */
        this.worklist = null;
    }

    /**
     * @param {Node} node
     * @return {boolean}
     */
    pushPre( node )
    {
        return this.worklist.push( node, GraphVisitOrder.PRE );
    }

    /**
     * @param {Node} node
     */
    pushPost( node )
    {
        this.worklist.forcePush( node, GraphVisitOrder.POST );
    }

    /**
     * @param {Node|GraphNodeWithOrder} node
     * @param {GraphVisitOrder} [order=GraphVisitOrder.PRE]
     * @return {boolean}
     */
    push( node, order )
    {
        if ( node instanceof GraphNodeWithOrder && order === void 0 )
            return this.push( node.node, node.order );
        else if ( !order || order === GraphVisitOrder.PRE )
            return this.pushPre( node );
        else if ( order === GraphVisitOrder.POST )
        {
            this.pushPost( node );
            return true;
        }
        else
            throw new Error( `Pushing bad order value` );
    }

    /**
     * @return {boolean}
     */
    notEmpty()
    {
        return this.worklist.notEmpty();
    }

    /**
     * @return {GraphNodeWithOrder}
     */
    pop()
    {
        const result = this.worklist.pop();

        return new GraphNodeWithOrder( result.node, result.data );
    }
}


