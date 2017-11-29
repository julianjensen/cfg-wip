/** ******************************************************************************************************************
 * @file Describe what ast does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 26-Nov-2017
 *********************************************************************************************************************/
"use strict";

const
    // _inspect                                     = require( 'util' ).inspect,
    // inspect                                      = ( o, d ) => _inspect( o, { depth: typeof d === 'number' ? d : 2, colors: true } ),
    { VisitorKeys }    = require( './defines' ),
    { traverse }       = require( 'estraverse' ),
    { parseModule }    = require( 'esprima' ),
    { isArray: array } = Array,
    nodeString         = function() {
        let keys = VisitorKeys[ this.type ].map( key => `${key}${array( this[ key ] ) ? '(' + this[ key ].length + ')' : ''}` ).join( ', ' );

        if ( keys ) keys = ': [' + keys + ']';

        return `${this.type}, line ${this.loc && this.loc.start && this.loc.start.line}${keys}`;
    };

/** */
class AST
{
    /**
     * @param {string} source
     */
    constructor( source )
    {
        let index = 0;

        this.ast = parseModule( source, { loc: true, range: true } );
        this.traverse( ( node, parent ) => {
            node.index = index++;
            node.parent = parent;
            node.toString = nodeString;
        } );
    }

    /**
     * @param {Program|Node} [ast]
     * @return {*}
     */
    top( ast = this.ast )
    {
        return ast;
        // return { top: ast, start: ast.type === Syntax.Program ? ast : ( ast.body || ast.value ) };
    }

    /**
     * @param {Node|function} ast
     * @param {?function} [enter]
     * @param {?function} [leave]
     */
    traverse( ast, enter, leave )
    {
        if ( typeof ast === 'function' )
        {
            leave = enter;
            enter = ast;
            ast = this.ast;
        }

        const funcs = {
            enter
        };

        if ( typeof leave === 'function' )
            funcs.leave = leave;

        traverse( ast, funcs );
    }

    // /**
    //  * @param {number} boundaryIndex
    //  * @param {function} fn
    //  * @param {Node} top
    //  * @return {number}
    //  */
    // largest_smaller( boundaryIndex, fn, top )
    // {
    //     let bestSoFar = -1;
    //
    //     const
    //         bounds = node => {
    //             if ( node.index >= boundaryIndex ) return VisitorOption.Break;
    //             if ( !fn( node ) ) return;
    //             if ( node.index > bestSoFar ) bestSoFar = node.index;
    //         };
    //
    //     this.traverse( top, bounds );
    //
    //     return bestSoFar;
    // }
}

module.exports = AST;
