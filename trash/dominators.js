/** ******************************************************************************************************************
 * @file Describe what dominators does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 19-Nov-2017
 *********************************************************************************************************************/

"use strict";

// import { ExtendedGraphNodeWorklist, GraphNodeWithOrder, GraphVisitOrder } from "./graph-node-worklist";

const
    DominatorTreeBuilder = require( '../src/dominators/iterative-doms' ),
    BasicBlock = require( '../src/basic-block' );


/** */
class Dominators
{
    lentar_dominators()
    {
        const lengauerTarjan = new DominatorTreeBuilder( this );
        lengauerTarjan.compute();

        // From here we want to build a spanning tree with both upward and downward links and we want
        // to do a search over this tree to compute pre and post numbers that can be used for dominance
        // tests.

        for ( let blockIndex = BasicBlock.pre; blockIndex--; )
        {
            const block = this.get( blockIndex );

            if ( !block ) continue;

            const idomBlock = block.idomParent = block.dom;

            if ( idomBlock )
                idomBlock.idomKids.push( block );

            let nextPreNumber  = 0,
                nextPostNumber = 0;

            // Plain stack-based worklist because we are guaranteed to see each block exactly once anyway.

            const worklist = [ { node: this.entry, order: 1 } ];

            while ( worklist.length )
            {
                const { node, order } = worklist.pop();

                switch ( order )
                {
                    case 1:
                        node.preNumber = nextPreNumber++;

                        worklist.push( { node, order: -1 } );

                        for ( const kid of node.idomKids )
                            worklist.push( { node: kid, order: 1 } );
                        break;

                    case -1:
                        node.postNumber = nextPostNumber++;
                        break;
                }
            }
        }
    }
}

module.exports = Dominators;
