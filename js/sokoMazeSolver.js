import * as S from './consts.js';
import SokoMaze from './SokoMaze.js';
import {TypedTranspositionTable as TranspositionTable} from './TranspositionTable.js';
import * as bv from './bitVector.js';

export default function solveSokoMaze(sok) {
    // First make sure this puzzle is not already solved/unsolvable
    if (sok.completed()) {
        return '';
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
                        if (nx === s.goalX && ny === s.goalY) { // is goal
                            solved = s; // player can reach goal: solved!
                            break graphLoop;
                        }
                        else if (bv.test(s.boxBV, nidx)) { // is box
                            const nnx = nx+dx;
                            const nny = ny+dy;
                            if (!sok._inBounds(nnx, nny)) { continue; }
                            const nnidx = nny*s.w + nnx;
                            const nncode = sok.map[nnidx];
                            if (!nncode || nncode & (S.MWALL|S.MFINISH)) { continue; }
                            if (bv.test(s.boxBV, nnidx)) { continue; } // Cannot push 2 boxes
                            // Push Box
                            const cs = SokoMaze.copy(s);
                            cs.playerX = x;
                            cs.playerY = y;  // move player to this position
                            cs._move(dx, dy); // push box
                            if (tt.entry(cs.hashH, cs.hashL)) { continue; } // already encountered
                            const push = nidx | S.PUSH_DIRS[d]; // log the box pushed and direction
                            cs.pushes = [...s.pushes, push];
                            nps.push(cs);
                        }
                        else if (ncode && ncode !== S.MWALL && (ncode !== S.MWATER || bv.test(s.waterBV, nidx))) { // player can move here
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

    let cs = SokoMaze.copy(sok);
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
    let mvs = cs.movesTo(cs.goalX, cs.goalY);
    for (let j = 0, mlen = mvs.length; j < mlen; ++j) {
        cs.move(mvs[j]);
    }
    return cs.moves;
}

export function runTests() {
    let s;
    // TODO: update
    s = new SokoMaze(
`####
# .#
#  ###
#*@  #
#  $ #
#  ###
####  `
    );
    let sol = solveSokoMaze(s, 10000);
    //console.assert(sol === 'dlUrrrdLullddrUluRuulDrddrruLdlUU');

    s = new SokoMaze(
`#######
#@$~$.#
#######`
    );


    s = new SokoMaze(
`####
#@!#
####`
    );
    s.move('r');
    sol = solveSokoMaze(s, 60000);
    console.assert(sol === '');

    s = new SokoMaze(
`######
#@ #.#
######`
    );
    sol = solveSokoMaze(s, 60000);
    console.assert(sol === null);

    s = new SokoMaze(
`#######
#@$ #.#
#######`
    );
    sol = solveSokoMaze(s, 60000);
    console.assert(sol === null);
}
