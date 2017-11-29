/** ******************************************************************************************************************
 * @file Describe what scopes does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 24-Nov-2017
 *********************************************************************************************************************/
"use strict";

/**
 * @typedef {object} CatchFinal
 * @property {BasicBlock} catchClause
 * @property {BasicBlock} finalizer
 */


/** */
const
    { Syntax, checks } = require( './defines' ),
    up = ( p, fn ) => {
        let r;

        while ( p && !( r = fn( p ) ) ) p = p.parent;

        return p ? r : null;
    };

/** */
class Scope
{
    /**
     * @param {?Scope} parent
     * @param {string} [type="normal"]
     */
    constructor( parent, type = 'normal' )
    {
        this.type = type;
        this.parent = parent;
        this.children = [];
        if ( parent )
        {
            this.parent.children.push( this );
            this.depth = parent.depth + 1;
        }
        else
            this.depth = 0;
        this.identifiers = Object.create( null );
        this.blocks = [];
        this.nodes = [];
        this.descNode = null;
    }

    toString()
    {
        const
            idKeys = Object.keys( this.identifiers ),
            ids = idKeys.length ? ` [ "${idKeys.join( '", "' )}" ]` : '',
            fname = this.descNode ? checks.functionName( this.descNode ) : null,
            desc = this.descNode ? ( fname === 'anonymous' ? '_' + this.descNode.type : fname ) : 'unknown';

        // if ( this.descNode && this.descNode.type === Syntax.MethodDefinition )
        // {
        //     console.log( 'y no name?', this.descNode );
        // }

        return [ ' '.repeat( this.depth * 4 ) + `${desc}[${this.type}]${ids}`, ...this.children.map( c => c.toString() ) ].join( '\n' );
    }

    /**
     * @param {string|BasicBlock} name
     * @param {?BasicBlock} [block]
     */
    add( name, block )
    {
        if ( name && block )
            this.identifiers[ name ] = block;
        else
        {
            this.blocks.push( name );
            name.scope = this;
        }
    }

    /**
     * @param {Node} node
     */
    ast( node )
    {
        node.scope = this;
        this.nodes.push( node );
    }

    /**
     * @param {string} label
     * @param {BasicBlock} block
     */
    want_resolution( label, block )
    {
        return this.identifiers[ label ] ? block.add_succs( this.identifiers[ label ] ) : null;
    }

    /**
     * @param {string} name
     * @return {?number}
     */
    has( name )
    {
        return this.identifiers[ name ];
    }

    /**
     * @return {string}
     */
    name()
    {
        return this.descNode ? checks.functionName( this.descNode ) : '';
    }
}

/** */
class Scopes
{
    /**
     * @param {Scope} scope
     */
    constructor( scope )
    {
        this.current = this.global = scope || new Scope( null, 'top' );
        this.deferrals = [];
        this.catches = [];
    }

    toString()
    {
        return this.global.toString();
    }

    /**
     * @param {string} type
     * @param {?Node} params
     * @param {?Node} [desc]
     */
    function_scope( type, params, desc )
    {
        this.current = this.push_scope( type, desc || params.parent );
        this.push_scope( 'params', desc || params.parent );
        this.current.ast( params );
        this.pop_scope();
    }

    /**
     * @param {string} type
     * @param {?Node} [node]
     * @return {Scope}
     */
    push_scope( type = 'normal', node )
    {
        if ( node.type === Syntax.FunctionExpression && node.parent && node.parent.type === Syntax.MethodDefinition )
            node = node.parent;

        if ( !type ) type = 'normal';
        this.current = new Scope( this.current, type );
        this.current.descNode = node;
        return this.current;
    }

    /**
     * @return {Scope}
     */
    pop_scope()
    {
        return this.current = this.current.parent;
    }

    /**
     * @param {string|BasicBlock} name
     * @param {?BasicBlock} [block]
     */
    add( name, block )
    {
        this.current.add( name, block );
    }

    /**
     * @param {string} label
     * @param {BasicBlock} block
     * @return {BasicBlock}
     */
    resolve( label, block )
    {
        return this.current.want_resolution( label, block );
    }

    /**
     * @param {string} label
     * @param {BasicBlock} block
     */
    goto( label, block )
    {
        if ( this.resolve( label, block ) ) return;

        this.deferrals.push( { label, block, scope: this.current } );
    }

    /**
     * @param {string} label
     * @param {Scope} scope
     * @return {?BasicBlock}
     */
    static find_in_scopes( label, scope )
    {
        return up( scope, s => s.has( label ) );
    }

    /** */
    finish()
    {
        this.deferrals.forEach( ( { label, block, scope } ) => {
            const def = Scopes.find_in_scopes( label, scope );

            if ( !def ) throw new Error( `Unable to find identifier ${label} in any scope` );
            block.add_succs( def );
        } );
    }

    /**
     * @param {string} type
     * @return {?Scope}
     */
    get_scope_by_type( type )
    {
        return up( this.current, s => s.type === type && s );
    }

    /** */
    pop_to_function()
    {
        this.current = up( this.current, s => s.type === 'function' && s );
    }

    /**
     * @param {BasicBlock} catchClause
     * @param {BasicBlock} [finalizer]
     */
    add_catch( catchClause, finalizer )
    {
        this.catches.unshift( { catchClause, finalizer } );
    }

    /**
     * @return {CatchFinal}
     */
    pop_catch()
    {
        return this.catches.shift();
    }

    /**
     * @return {number}
     */
    has_catch()
    {
        return this.catches.length;
    }

    /**
     * @return {CatchFinal}
     */
    peek_catch()
    {
        return this.catches[ 0 ];
    }

    // snapshot()
    // {
    //     return {
    //         current: this.current,
    //         catches: this.catches.slice()
    //     };
    // }
    //
    // from_snapshot( snap )
    // {
    //     this.current = snap.current;
    //     this.catches = snap.catches;
    // }
}

module.exports = Scopes;
