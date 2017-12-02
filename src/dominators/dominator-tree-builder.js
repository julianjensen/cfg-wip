/** ****************************************************************************************************
 * File: dominator-tree-builder (dominators)
 * @author julian on 12/1/17
 * @version 1.0.0
 * @copyright Planet3, Inc.
 *******************************************************************************************************/
'use strict';

const
    BasicBlock = require( '../basic-block' );

/**
 * This implements Lengauer and Tarjan's "A Fast Algorithm for Finding Dominators in a Flowgraph"
 * (TOPLAS 1979). It uses the "simple" implementation of LINK and EVAL, which yields an O(n log n)
 * solution. The full paper is linked below; this code attempts to closely follow the algorithm as
 * it is presented in the paper; in particular sections 3 and 4 as well as appendix B.
 * https://www.cs.princeton.edu/courses/archive/fall03/cs528/handouts/a%20fast%20algorithm%20for%20finding.pdf
 *
 * This code is very subtle. The Lengauer-Tarjan algorithm is incredibly deep to begin with. The
 * goal of this code is to follow the code in the paper, however our implementation must deviate
 * from the paper when it comes to recursion. The authors had used recursion to implement DFS, and
 * also to implement the "simple" EVAL. We convert both of those into worklist-based solutions.
 * Finally, once the algorithm gives us immediate dominators, we implement dominance tests by
 * walking the dominator tree and computing pre and post numbers. We then use the range inclusion
 * check trick that was first discovered by Paul F. Dietz in 1982 in "Maintaining order in a linked
 * list" (see http://dl.acm.org/citation.cfm?id=802184).
 */
class DominatorTreeBuilder
{
    /**
     * @param {BasicBlockList} blockList
     */
    constructor( blockList )
    {
        this.graph = blockList;
    }

    /** */
    compute()
    {
        // this.computeDepthFirstPreNumbering(); // Step 1. Already done as part of the blockList initial_walk()
        this.compute_semi_dominators_and_implicit_immediate_dominators(); // Steps 2 and 3.
        this.compute_explicit_immediate_dominators(); // Step 4.
    }

    /**
     *
     */
    compute_semi_dominators_and_implicit_immediate_dominators()
    {
        let currentPreNumber = BasicBlock.pre;

        while ( currentPreNumber-- > 1 )
        {
            let block = this.graph.get( currentPreNumber );

            // Step 2:
            block.preds.forEach( p => block.semi = Math.min( this.eval( p ).semi, block.semi ) );

            let bucketPreNumber = block.semi;

            assert( bucketPreNumber <= currentPreNumber );

            this.graph.get( bucketPreNumber ).bucket.push( block );
            this.link( block.parent, block );

            // Step 3:
            for ( const semiDominee of block.parent.bucket )
            {
                const
                    possibleDominator = this.eval( semiDominee );

                assert( this.graph.get( semiDominee.semi ) === block.parent );

                if ( possibleDominator.semi < semiDominee.semi )
                    semiDominee.dom = possibleDominator;
                else
                    semiDominee.dom = block.parent;
            }

            block.parent.bucket.length = 0;
        }
        ;
    }

    compute_explicit_immediate_dominators()
    {
        for ( let currentPreNumber = 1; currentPreNumber < BasicBlock.pre; ++currentPreNumber )
        {
            const w = this.graph.get( currentPreNumber );

            if ( w.dom !== this.graph.get( w.semi ) )
                w.dom = w.dom.dom;
        }
    }

    /**
     * @param {BasicBlock} from - Vertex 𝑣
     * @param {BasicBlock} to   - Vertex 𝑤
     */
    link( from, to )
    {
        to.ancestor = from;
    }

    // noinspection JSAnnotator
    /**
     * If 𝑣 is the root of a tree in the forest, return 𝑣. Otherwise, let 𝑟 be the root
     * of the tree in the forest which contains 𝑣. Return any vertex 𝑢 ≠ 𝑟 of minimum 𝑠𝑒𝑚𝑖❲𝑢❳
     * on the path 𝑟 ⥅ 𝑣.
     *
     * @param {BasicBlock} v
     * @return {*}
     */
    eval( v )
    {
        if ( !v.ancestor ) return v;

        this.compress( v );
        return v.label;
    }

    /**
     *
     * @param {BasicBlock} v
     */
    compress( v )
    {
        if ( !v.ancestor || !v.ancestor.ancestor ) return;

        this.compress( v.ancestor );

        if ( v.ancestor.label.semi < v.label.semi )
            v.label = v.ancestor.label;

        v.ancestor = v.ancestor.ancestor;
    }

}

module.exports = DominatorTreeBuilder;
