/** ******************************************************************************************************************
 * @file Describe what link-list does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 02-Dec-2017
 *********************************************************************************************************************/
"use strict";

module.exports = function() {
    let head, tail;

    return {
        add( node, val )
        {
            const n = { node, val, next: null, prev: null };

            if ( !head )
                head = tail = n;
            else if ( n.val < head.val )
            {
                head.prev = n;
                n.next = head;
                head = n;
            }
            else if ( n.val > tail )
            {
                tail.next = n;
                n.prev = tail;
                tail = n;
            }
            else
            {
                let p = head;

                while ( p.val <= n.val ) p = p.next;
                p.prev.next = n;
                n.prev = p.prev;
                p.prev = n;
                n.next = p;
            }

            return n;
        },
        forward( fn )
        {
            let p = head;

            while ( p )
            {
                p.node.color = 'white';
                p = p.next;
            }

            p = head;

            while ( p )
            {
                fn( p.node );
                p.node.procd.push( 'rpost' );
                p.node.color = 'black';
                p = p.next;
            }
        },
        backwards( fn )
        {
            let p = tail;

            while ( p )
            {
                p.node.color = 'white';
                p = p.next;
            }

            p = tail;

            while ( p )
            {
                fn( p.node );
                p.node.procd.push( 'rpost' );
                p.node.color = 'black';
                p = p.prev;
            }
        }
    };
};
