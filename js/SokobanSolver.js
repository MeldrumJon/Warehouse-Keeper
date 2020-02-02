import * as S from './consts.js';
import Sokoban from './Sokoban.js';
import {TypedTranspositionTable as TranspositionTable} from './TranspositionTable.js';
import BitVector from './BitVector.js';

function _generateLiveSquares(sok) {
    const lSquares = new Uint8Array(sok.w*sok.h);
    const totalSqs = sok.map.length;
    for (let g = 0; g < totalSqs; ++g) {
        if (!bv.test(sok.goalBV, g)) { continue; }
        let xs = [g % sok.w];
        let ys = [~~(g / sok.w)];
        while (xs.length) {
            let nxs = [];
            let nys = [];
            for (let k = 0, len = xs.length; k < len; ++k) {
                let x = xs[k];
                let y = ys[k];
                let idx = y*sok.w + x;

                if (lSquares[idx]) { continue; }
                lSquares[idx] = 1;

                for (let d = 0; d < 4; ++d) {
                    let dx = S.DXS[d];
                    let dy = S.DYS[d];
                    let nx = x+dx;
                    let ny = y+dy;
                    let ncode = sok._map(nx, ny);
                    let nnx = nx+dx;
                    let nny = ny+dy;
                    let nncode = sok._map(nnx, nny);
                    // is pullable onto nx, ny
                    if (ncode && (ncode & (S.MFLOOR | S.MGOAL))
                            && nncode && (nncode & (S.MFLOOR | S.MGOAL))) {
                        nxs.push(nx);
                        nys.push(ny);
                    }
                }
            }
            xs = nxs;
            ys = nys;
        }
    }
    return lSquares;
}

export default function solveSokoban(sok) {
    const liveSquares = _generateLiveSquares(sok);

    // First make sure this puzzle is not already solved/unsolvable
    if (sok.completed()) {
        return '';
    }
    for (let i = 0, len = sok.map.length; i < len; ++i) {
        if (bv.test(sok.boxBV, i) && !liveSquares[i]) { // Box is on simple deadzone
            return null;
        }
    }

    // Set up for BFS
    const tt = new TranspositionTable();
    tt.entry(sok.hashH, sok.hashL); // Don't repeat starting state
    const visited = new Uint8Array(sok.map.length); // visited points (cleared each split)
    sok.pushes = []; // Only keep track of pushes
    let solved = null;

    let nps; // array of states to process next
    let ps = [sok]; // array of states being processed
    graphLoop: while (ps.length) {
        nps = [];
        for (let i = 0, len = ps.length; i < len; ++i) {
            const s = ps[i];
// Function split(s) BEGIN
            visited.fill(0);

            let xs = [s.playerX];
            let ys = [s.playerY];
            let idxs = [s.playerY*s.w + s.playerX];
            while (xs.length) { // until we process every reachable space
                const nxs = [];
                const nys = [];
                const nidxs = [];
                for (let k = 0, len = xs.length; k < len; ++k) {
                    const x = xs[k];
                    const y = ys[k];
                    const idx = idxs[k];

                    if (visited[idx]) { continue; }
                    visited[idx] = true;

                    for (let d = 0; d < 4; ++d) {
                        const dx = S.DXS[d];
                        const dy = S.DYS[d];
                        const nx = x+dx;
                        const ny = y+dy;
                        const nidx = ny*s.w + nx;
                        const ncode = s.map[nidx];

                        if (bv.test(s.boxBV, nidx)) { // is box
                            const nnx = nx+dx;
                            const nny = ny+dy;
                            const nnidx = nny*s.w + nnx;
                            // liveSquares also ensures we do not push box into wall
                            if (!liveSquares[nnidx]) { continue; } // Box should/can-not be moved here
                            if (bv.test(s.boxBV, nnidx)) { continue; } // Box cannot be moved onto box
                            // Push Box
                            const cs = Sokoban.copy(s);
                            cs.playerX = x;
                            cs.playerY = y;  // move player to this position
                            cs._move(dx, dy); // push box
                            if (tt.entry(cs.hashH, cs.hashL)) { continue; } // already encountered
                            const push = nidx | S.PUSH_DIRS[d]; // log the box pushed and direction
                            cs.pushes = [...s.pushes, push];
                            if (cs.completed()) { // we're done!
                                solved = cs;
                                break graphLoop;
                            }
                            nps.push(cs);
                        }
                        else if (ncode && ncode !== S.MWALL) { // player can move here
                            nxs.push(nx);
                            nys.push(ny);
                            nidxs.push(nidx);
                        }
                    }
                }
                xs = nxs;
                ys = nys;
                idxs = nidxs;
            }
// Function split(s) END
        }
        ps = nps;
    }
    if (!solved) { return null; } // no solution

    // Now that we know what pushes we need to make, figure out the moves
    // as well.
    let pushes = solved.pushes;

    let cs = Sokoban.copy(sok);
    for (let i = 0, len = pushes.length; i < len; ++i) {
        let push = pushes[i];
        let bidx = push & S.PUSH_IDX_MASK;
        let bx = bidx % cs.w;
        let by = ~~(bidx / cs.w);
        let px = bx;
        let py = by;
        let dir_idx = push >>> S.PUSH_SHIFT;
        let push_dir = S.DMS[dir_idx];
        py -= S.DYS[dir_idx];
        px -= S.DXS[dir_idx];
        let mvs = cs.movesTo(px, py);
        for (let j = 0, mlen = mvs.length; j < mlen; ++j) {
            cs.move(mvs[j]);
        }
        cs.move(push_dir);
    }
    return cs.moves;
}

export function runTests() {
    let s;
    s = new Sokoban(
`####
# .#
#  ###
#*@  #
#  $ #
#  ###
####  `
    );
    let sol = solveSokoban(s, 10000);
    console.assert(sol === 'dlUrrrdLullddrUluRuulDrddrruLdlUU');


    s = new Sokoban(
`####
#@ #
####`
    );
    sol = solveSokoban(s, 60000);
    console.assert(sol === '');

    s = new Sokoban(
`######
#@ #.#
######`
    );
    sol = solveSokoban(s, 60000);
    console.assert(sol === null);

    s = new Sokoban(
`#######
#@$ #.#
#######`
    );
    sol = solveSokoban(s, 60000);
    console.assert(sol === null);

    s = new Sokoban(
`######
#    #
#@$ .#
#    #
######`
    );
    let liveSquares = _generateLiveSquares(s);
    for (let j = 0; j < s.h; ++j) {
        for (let i = 0; i < s.w; ++i) {
            let idx = j*s.w + i;
            let val = liveSquares[j*s.w+i];
            if (j === 2 && (i >= 2 && i <= 4)) {
                console.assert(val === 1);
            }
            else {
                console.assert(val === 0);
            }
        }
    }

    s = new Sokoban(
`#######
#   ..#
#@$$  #
#     #
#######`
    );
    liveSquares = _generateLiveSquares(s);
    for (let j = 0; j < s.h; ++j) {
        for (let i = 0; i < s.w; ++i) {
            let idx = j*s.w + i;
            let val = liveSquares[j*s.w+i];
            if ((j === 1 || j === 2) && (i >= 2 && i <= 5)) {
                console.assert(val === 1);
            }
            else {
                console.assert(val === 0);
            }
        }
    }
    
}
