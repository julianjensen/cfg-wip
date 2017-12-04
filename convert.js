/** ******************************************************************************************************************
 * @file Describe what convert does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 25-Nov-2017
 *********************************************************************************************************************/
"use strict";

/**
 *        │
 *        │
 *        V
 *  ┌────────────┐     ┌─────────────┐
 *  │    test    │ ──> │ (alternate) │
 *  └────────────┘     └─────────────┘
 *        │                   │
 *        │                   │
 *        V                   │
 *  ┌────────────┐            │
 *  │ consequent │            │
 *  └────────────┘            │
 *        │                   │
 *        │                   │
 *        V                   │
 *  ┌────────────┐            │
 *  │   block    │<───────────┘
 *  └────────────┘
 */

const
    light    = {
        lh: '─',
        lv: '│',
        ll: '└',
        ul: '┌',
        ur: '┐',
        lr: '┘',
        lx: '┤',
        rx: '├',
        tx: '┴',
        bx: '┬',
        x:  '┼'
    },

    heavy    = {
        lh: '━',
        lv: '┃',
        ll: '┗',
        ul: '┏',
        ur: '┓',
        lr: '┛',
        lx: '┫',
        rx: '┣',
        tx: '┻',
        bx: '┳',
        x:  '╋'
    },
    uni2char = ch => ch === '─' || ch === '━' ? '-' : ch === '|' || ch === '┃' ? '|' : ~'└┌┐┘┤├┴┬┼┗┏┓┛┫┣┻┳╋'.indexOf( ch ) ? '+' : ch;

// ─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼

// Heavies
// ━ ┃ ┏ ┓ ┗ ┛ ┣ ┫ ┳ ┻ ╋
// ═ ║ ╔ ╗ ╚ ╝ ╠ ╣ ╦ ╩ ╬

// Light and heavy
// ┍ ┑ ┕ ┙ ┎ ┒ ┝ ┞ ┟ ┠ ┡ ┢ ┥ ┦ ┧ ┨ ┩ ┪ ┭ ┮ ┯ ┰ ┱ ┲
// ┵ ┶ ┷ ┸ ┹ ┺ ┽ ┾ ┿ ╀ ╁ ╂ ╃ ╄ ╅ ╆ ╇ ╈ ╉ ╊

// Combinations
// ╒ ╓ ╕ ╖ ╘ ╙ ╛ ╜ ╞ ╟ ╡ ╢ ╤ ╥ ╧ ╨ ╪ ╫

// Lines &c.
// ╌ ╍ ╎ ╏
// ┄ ┅ ┆ ┇
// ┈ ┉ ┊ ┋
// ╭ ╮ ╯ ╰ ╱ ╲ ╳ ╴ ╵ ╶ ╷ ╸ ╹ ╺ ╻ ╼ ╽ ╾

// Arrows
// ← → ↑ ↓ ↔ ↕ ↖ ↗ ↘ ↙ ↚ ↛ ↮ ⟵ ⟶ ⟷
// ⬅ ( ⮕ ➡ ) ⬆ ⬇ ⬈ ⬉ ⬊ ⬋ ⬌ ⬍
// 🡐 🡒 🡑 🡓 🡔 🡕 🡖 🡗 🡘 🡙
// 🡠 🡢 🡡 🡣 🡤 🡥 🡦 🡧  🡨 🡪 🡩 🡫 🡬 🡭 🡮 🡯  🡰 🡲 🡱 🡳 🡴 🡵 🡶 🡷  🡸 🡺 🡹 🡻 🡼 🡽 🡾 🡿  🢀 🢂 🢁 🢃 🢄 🢅 🢆 🢇  ↢ ↣
// ⇠ ⇢ ⇡ ⇣  ⤌ ⤍ ⤎ ⤏  ⬸ ⤑
// 🠐 🠒 🠑 🠓  🠔 🠖 🠕 🠗  🠘 🠚 🠙 🠛  🠜 🠞 🠝 🠟  🠠 🠢 🠱 🠳 🠤 🠦 🠨 🠪 🠬 🠮 🠰 🠲

/**
 * @param {string} str
 * @param {string} [target="unicode"]
 * @param {object} [set]
 * @return {string}
 */
function convert( str, target = 'unicode', set = light )
{
    let lines   = str.split( /[\r\n]+/ ),
        lengths = lines.map( l => l.length ),
        width   = Math.max( ...lengths ),
        height  = lines.length,
        fn = target === 'unicode' ? one : ( x, y ) => uni2char( char( x, y, true ) );

    /**
     * @param {number} x
     * @param {number} y
     * @param {boolean} asChar
     * @return {string|boolean}
     */
    function char( x, y, asChar = false )
    {
        if ( x < 0 || x >= width || y < 0 || y >= height ) return asChar ? ' ' : false;

        const ch = lines[ y ][ x ];

        if ( ch !== ' ' ) return ch;

        return asChar ? ch : false;
    }

    /**
     * @param {number} x
     * @param {number} y
     * @return {string}
     */
    function one( x, y )
    {
        const
            ch    = char( x, y, true ),
            _left  = () => char( x - 1, y ),
            _right = () => char( x + 1, y ),
            _up    = () => char( x, y - 1 ),
            _down  = () => char( x, y + 1 ),
            left  = z => z === char( x - 1, y ),
            right = z => z === char( x + 1, y ),
            up    = z => z === char( x, y - 1 ),
            down  = z => z === char( x, y + 1 ),
            // ul    = z => z === char( x - 1, y - 1 ),
            // ll    = z => z === char( x - 1, y + 1 ),
            // ur    = z => z === char( x + 1, y - 1 ),
            // lr    = z => z === char( x + 1, y + 1 ),
            boxv  = ( ch, lr ) => ch === '+' || ch === '|' || ch === lr,
            boxh  = ( ch, vV ) => ch === '+' || ch === '-' || ch === vV,
            ud    = () => boxv( _up() ) && boxv( _down() ),
            tb    = () => boxh( _left() ) && boxh( _right() );

        switch ( ch )
        {
            case '|':
                return left( '-' ) ? set.lx : right( '-' ) ? set.rx : set.lv;
            case '-':
                return up( '|' ) ? set.tx : down( '|' ) ? set.bx : set.lh;
            case '+':
                if ( right( '-' ) && boxv( _down(), '>' ) && !_left() && !_up() ) return set.ul;
                if ( right( '-' ) && boxv( _up(), '>' ) && !_left() && !_down() ) return set.ll;
                if ( left( '-' ) && boxv( _down(), '<' ) && !_right() && !_up() ) return set.ur;
                if ( left( '-' ) && boxv( _up(), '<' ) && !_right() && !_down() ) return set.lr;
                if ( tb() )
                {
                    if ( down( '|' ) && !_up() ) return set.bx;
                    if ( up( '|' ) && !_down() ) return set.tx;
                    if ( up( '|' ) && down( '|' ) ) return set.x;
                }
                else if ( ud() )
                {
                    if ( left( '-' ) && !_right() ) return set.lx;
                    if ( right( '-' ) && !_left() ) return set.rx;
                    if ( left( '-' ) && right( '-' ) ) return set.x;
                }
                if ( ( left( '>' ) && !_right() ) || ( right( '<' ) && !_left() ) && ud() ) return set.lv;
                if ( ( up( 'v' ) || up( 'V' ) && !_down() ) || ( down( '^' ) && !_up() ) && tb() ) return set.lh;
                return ch;

            default:
                return ch;
        }
    }

    let outp = '';

    for ( let y = 0; y < height; y++ )
    {
        lines[ y ] = lines[ y ].padEnd( width, ' ' );
        for ( let x = 0; x < width; x++ )
            outp += fn( x, y );

        outp += '\n';
    }

    return outp;
}

const
    testDiagram = `

              +--------------+
              |              |
              |    switch    |
              |              |
              +--+-+-+-+-+-+-+
                 | | | | | |
                 | | | | | |         +-------------+
                 | | | | | |         |             |
                 | | | | | +-------->+    case1    |
                 | | | | |           |             |
                 | | | | |           +-------------+
                 | | | | |
                 | | | | |           +-------------+
                 | | | | |           |             |
                 | | | | +---------->+    case2    |
                 | | | |             |             |
                 | | | |             +-------------+
                 | | | |
                 | | | |             +-------------+
                 | | | |             |             |
                 | | | +------------>+    case3    |
                 | | |               |             |
                 | | |               +-------------+
                 | | |                      |
                 | | |                      | Falls through
                 | | |                      |
                 | | |                      |
                 | | |               +-------------+
                 | | |               |             |
                 | | +-------------->+    case4    |
                 | |                 |             |
                 | |                 +-------------+
                 | |
                 | |                 +-------------+
                 | |                 |             |
                 | +---------------->+   default   |
                 |                   |             |
   Pred if no default                +-------------+
                 |                          |
                 v                    Pred if default
               +-------------+              |
               |             |              |
               |    next     +<-------------+
               |             |
               +-------------+

`;

const result = convert( testDiagram );
console.log( result );
const ascii = convert( result, 'ascii' );
console.log( ascii );

console.log( `          +-----+
          |     |
   +------+  1  +------+
   |      |     |      |
   |      +-----+      |
   |                   |
   |                   |
+--v--+             +--v--+
|     |             |     |
|  2  |         +---+  3  +---+
|     |         |   |     |   |
+--+--+         |   +-----+   |
   |            |             |
   |            |             |
   |            |             |
+--v--+      +--v--+       +--v--+
|     +------>     +------->     |
|  4  |      |  5  |       |  6  |
|     <------+     <-------+     |
+-----+      +-----+       +-----+
` );

console.log( convert( `          +-----+
          |     |
   +------+  1  +------+
   |      |     |      |
   |      +-----+      |
   |                   |
   |                   |
+--v--+             +--v--+
|     |             |     |
|  2  |         +---+  3  +---+
|     |         |   |     |   |
+--+--+         |   +-----+   |
   |            |             |
   |            |             |
   |            |             |
+--v--+      +--v--+       +--v--+
|     +------>     +------->     |
|  4  |      |  5  |       |  6  |
|     <------+     <-------+     |
+-----+      +-----+       +-----+
` ) );

convert.light = light;
convert.heavy = heavy;

module.exports = convert;
