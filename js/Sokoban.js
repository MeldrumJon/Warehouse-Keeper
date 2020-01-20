import PCG32 from './PCG32.js';
import {TypedTranspositionTable as TranspositionTable} from './TranspositionTable.js';
import * as bv from './bitVector.js';

const MEMPTY = 0;
const MWALL = 1;
const MGOAL = 2;
const MFLOOR = 3;
const C2MAP = Object.freeze({
    '\\': 0, // Empty Space
    '#': 1, // Wall
    '@': 3, // Floor
    '+': 2, // Goal square
    '$': 3, // Floor
    '*': 2, // Goal square
    '.': 2, // Goal square
    ' ': 3, // Floor
});

const DMS = Object.freeze(['u', 'd', 'l', 'r']);
const DXS = Object.freeze([0,  0, -1, 1]);
const DYS = Object.freeze([-1, 1,  0, 0]);

const PUSH_SHIFT = 30;
const PUSH_UP = 0x0 << PUSH_SHIFT;
const PUSH_DOWN = 0x1 << PUSH_SHIFT;
const PUSH_LEFT = 0x2 << PUSH_SHIFT;
const PUSH_RIGHT = 0x3 << PUSH_SHIFT;
const PUSH_IDX_MASK = ~(PUSH_RIGHT);
const PUSH_DIRS = Object.freeze([PUSH_UP, PUSH_DOWN, PUSH_LEFT, PUSH_RIGHT]);

const DDIRS = ['u', 'l', '', 'r', 'd'];
function _DIR(dx, dy) {
    const i = dy*2 + dx + 2;
    return DDIRS[i];
}

export default class Sokoban {
    _map(x, y) {
        let idx = y*this.w + x;
        return this.map[idx];
    }

    _updateNormalization() {
        let normX = this.playerX;
        let normY = this.playerY;

        const visited = new Uint8Array(this.map.length);
        let xs = [normX];
        let ys = [normY];
        while (xs.length) {
            let nxs = [];
            let nys = [];
            for (let k = 0, len = xs.length; k < len; ++k) {
                let i = xs[k]
                let j = ys[k];
                let idx = j*this.w + i;
                // Already checked this point
                if (visited[idx]) { continue; }
                visited[idx] = 1;
                // Coordinate is unreachable
                let code = this.map[idx];
                if (!code || code === MWALL || bv.test(this.boxBV, idx)) {
                    continue;
                }
                // Update normalized position
                if (i < normX) {
                    normX = i;
                }
                if (j < normY) {
                    normY = j;
                }
                // Test surrounding points
                for (let d = 0; d < 4; ++d) {
                    nxs.push(i+DXS[d]);
                    nys.push(j+DYS[d]);
                }
            }
            xs = nxs;
            ys = nys;
        }
        this.normIdx = normY*this.w + normX;
    }

    static _generateLiveSquares(sok) {
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
                        let dx = DXS[d];
                        let dy = DYS[d];
                        let nx = x+dx;
                        let ny = y+dy;
                        let ncode = sok._map(nx, ny);
                        let nnx = nx+dx;
                        let nny = ny+dy;
                        let nncode = sok._map(nnx, nny);
                        // is pullable onto nx, ny
                        if (ncode && (ncode === MFLOOR || ncode === MGOAL)
                                && nncode && (nncode === MFLOOR || nncode === MGOAL)) {
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
    
    constructor(str) {
        str = str.split(/\r?\n/);
        // Dimensions of puzzle
        this.h = str.length;
        this.w = 0;
        for (let i = 0; i < this.h; ++i) {
            let len = str[i].length;
            if (len > this.w) {
                this.w = len;
            }
        }
        const totalSquares = this.w*this.h;
        // Convert puzzle to state representation
        this.playerX = -1;
        this.playerY = -1;
        this.boxBV = bv.create(totalSquares);
        this.goalBV = bv.create(totalSquares);

        this.map = new Uint8Array(totalSquares);
        let idx = 0;
        for (let j = 0; j < this.h; ++j) {
            for (let i = 0; i < this.w; ++i) {
                let ch = str[j].charAt(i);
                if (ch === '@' || ch === '+') {
                    this.playerX = i;
                    this.playerY = j;
                }
                if (ch === '$' || ch === '*') {
                    bv.set(this.boxBV, idx);
                }
                if (ch === '+' || ch === '*' || ch === '.') {
                    bv.set(this.goalBV, idx);
                }
                let code = C2MAP[ch];
                this.map[idx] = code ? code : 0;

                ++idx;
            }
        }
        // Hide unreachable squares
        const reachable = new Uint8Array(totalSquares);
        let xs = [this.playerX];
        let ys = [this.playerY];
        while (xs.length) {
            let nxs = [];
            let nys = [];
            for (let k = 0, len = xs.length; k < len; ++k) {
                let i = xs[k];
                let j = ys[k];
                let idx = this.w*j + i;
                // Coordinate has already been visited
                if (reachable[idx]) {
                    continue;
                }
                // Coordinate is obviously unreachable
                let code = this.map[idx];
                if (!code || code === MWALL) {
                    continue;
                }
                // Coordinate is reachable
                reachable[idx] = 1;
                for (let d = 0; d < 4; ++d) {
                    nxs.push(i+DXS[d]);
                    nys.push(j+DYS[d]);
                }
            }
            xs = nxs;
            ys = nys;
        }
        for (let i = 0; i < totalSquares; ++i) {
            if (!reachable[i] && this.map[i] === C2MAP[' ']) {
                this.map[i] = 0;
            }
        }
        // Map should not change
        this.map = this.map;

        // Zobrist hashing
        this.ZOBBOXH = new Int32Array(totalSquares);
        this.ZOBBOXL = new Int32Array(totalSquares);
        this.ZOBPLAYERH = new Int32Array(totalSquares);
        this.ZOBPLAYERL = new Int32Array(totalSquares);
        const SEED = 1575579901796n;
        const rng = new PCG32(SEED);
        for (let i = 0; i < totalSquares; ++i) {
            this.ZOBBOXH[i] = rng.rand();
            this.ZOBBOXL[i] = rng.rand();
            this.ZOBPLAYERH[i] = rng.rand();
            this.ZOBPLAYERL[i] = rng.rand();
        }
        this.rehash();

        this.moves = '';
    }

    static copy(s) {
        // Copies width, height, playerX, playerY, hashH, hashL
        let cs = Object.assign(Object.create(Sokoban.prototype), s);
        // Deep copy state
        cs.boxBV = bv.copy(s.boxBV);
        // Map should be referenced, since it is immutable
        // Goal list should be referenced, since it is immutable
        // Zobrist object should be referenced
        // moves string can be referenced, since String type is immutable
        return cs;
    }

    static solve(sok, timeout=10000) {
        const ENDTIME = new Date().getTime() + timeout;
        const liveSquares = Sokoban._generateLiveSquares(sok);

        const tt = new TranspositionTable();
        let ps; // array of states being processed
        let nps; // array of states to process next


        //function split(s) {
        //    const visited = new Uint8Array(s.map.length);

        //    let xs = [s.playerX];
        //    let ys = [s.playerY];
        //    let idxs = [s.playerY*s.w + s.playerX];
        //    while (xs.length) { // until we process every reachable space
        //        let nxs = [];
        //        let nys = [];
        //        let nidxs = [];
        //        for (let k = 0, len = xs.length; k < len; ++k) {
        //            let x = xs[k];
        //            let y = ys[k];
        //            let idx = idxs[k];

        //            if (visited[idx]) { continue; }
        //            visited[idx] = true;

        //            for (let i = 0; i < 4; ++i) {
        //                let dx = DXS[i];
        //                let dy = DYS[i];
        //                let nx = x+dx;
        //                let ny = y+dy;
        //                let nidx = ny*s.w + nx;
        //                let ncode = s.map[nidx];

        //                let b = s._getBox(nx, ny);
        //                if (b !== null) { // is box
        //                    let nnx = nx+dx;
        //                    let nny = ny+dy;
        //                    let nnidx = nny*s.w + nnx;
        //                    if (!liveSquares[nnidx]) { continue; } // Box should/can-not be moved here
        //                    // testing for walls/sides not necessary: happens in liveSquares
        //                    //let nncode = s.map[nnidx];
        //                    //if (nncode && nncode !== MWALL && s._getBox(nnx, nny) === null) { // and box able to move
        //                    if (s._getBox(nnx, nny) === null) { // and box able to move
        //                        let cs = Sokoban.copy(s);
        //                        cs.playerX = x;
        //                        cs.playerY = y;  // move player to this position
        //                        cs._move(dx, dy); // push box
        //                        let exists = tt.entry(cs.hashH, cs.hashL);
        //                        if (exists) { continue; }
        //                        let push = nidx | PUSH_DIRS[i]; // log the box pushed and direction
        //                        cs.pushes = [...s.pushes, push];
        //                        if (cs.completed()) { return cs; } // we're done!
        //                        nps.push(cs);
        //                    }
        //                }
        //                else if (ncode && ncode !== MWALL) { // player can move here
        //                    nxs.push(nx);
        //                    nys.push(ny);
        //                    nidxs.push(nidx);
        //                }
        //            }
        //        }
        //        xs = nxs;
        //        ys = nys;
        //        idxs = nidxs;
        //    }
        //    return null;
        //}
       
        // setup

        // Determine what pushes we need to make
        let solved = null;
        sok.pushes = [];

        ps = [sok];
        graphLoop: while (ps.length) {
            nps = [];
            for (let i = 0, len = ps.length; i < len; ++i) {
                //solved = split(ps[i]);
                //if (solved) { break graphLoop; }
                let s = ps[i];
// Function split(s) BEGIN
                const visited = new Uint8Array(s.map.length);

                let xs = [s.playerX];
                let ys = [s.playerY];
                let idxs = [s.playerY*s.w + s.playerX];
                while (xs.length) { // until we process every reachable space
                    let nxs = [];
                    let nys = [];
                    let nidxs = [];
                    for (let k = 0, len = xs.length; k < len; ++k) {
                        let x = xs[k];
                        let y = ys[k];
                        let idx = idxs[k];

                        if (visited[idx]) { continue; }
                        visited[idx] = true;

                        for (let i = 0; i < 4; ++i) {
                            let dx = DXS[i];
                            let dy = DYS[i];
                            let nx = x+dx;
                            let ny = y+dy;
                            let nidx = ny*s.w + nx;
                            let ncode = s.map[nidx];

                            if (bv.test(s.boxBV, nidx)) { // is box
                                let nnx = nx+dx;
                                let nny = ny+dy;
                                let nnidx = nny*s.w + nnx;
                                if (!liveSquares[nnidx]) { continue; } // Box should/can-not be moved here
                                // testing for walls/sides not necessary: happens in liveSquares
                                //let nncode = s.map[nnidx];
                                //if (nncode && nncode !== MWALL && s._getBox(nnx, nny) === null) { // and box able to move
                                if (!bv.test(s.boxBV, nnidx)) { // and box able to move
                                    let cs = Sokoban.copy(s);
                                    cs.playerX = x;
                                    cs.playerY = y;  // move player to this position
                                    cs._move(dx, dy); // push box
                                    let exists = tt.entry(cs.hashH, cs.hashL);
                                    if (exists) { continue; }
                                    let push = nidx | PUSH_DIRS[i]; // log the box pushed and direction
                                    cs.pushes = [...s.pushes, push];
                                    if (cs.completed()) { // we're done!
                                        solved = cs;
                                        break graphLoop;
                                    }
                                    nps.push(cs);
                                }
                            }
                            else if (ncode && ncode !== MWALL) { // player can move here
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
                if (new Date().getTime() > ENDTIME) { return null; } // timeout
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
            let bidx = push & PUSH_IDX_MASK;
            let bx = bidx % cs.w;
            let by = ~~(bidx / cs.w);
            let px = bx;
            let py = by;
            let dir_idx = push >>> PUSH_SHIFT;
            let push_dir = DMS[dir_idx];
            py -= DYS[dir_idx];
            px -= DXS[dir_idx];
            let mvs = cs.movesTo(px, py);
            for (let j = 0, mlen = mvs.length; j < mlen; ++j) {
                cs.move(mvs[j]);
            }
            cs.move(push_dir);
        }
        return cs.moves;
    }

    movesTo(x, y) {
        const visited = new Uint8Array(this.map.length);
        let xs = [this.playerX];
        let ys = [this.playerY];
        let mvs = [''];
        while (xs.length) {
            let nxs = [];
            let nys = [];
            let nmvs = [];
            for (let k = 0, len = xs.length; k < len; ++k) {
                let i = xs[k];
                let j = ys[k];
                if (i === x && j === y) { return mvs[k]; } // Done!
                let idx = j*this.w + i;
                // Already checked this point
                if (visited[idx]) { continue; }
                visited[idx] = 1;
                // Coordinate is unreachable
                let code = this.map[idx];
                if (!code || code === MWALL || bv.test(this.boxBV, idx)) {
                    continue;
                }
                // Test surrounding points
                for (let d = 0; d < 4; ++d) {
                    nxs.push(i+DXS[d]);
                    nys.push(j+DYS[d]);
                    nmvs.push(mvs[k]+DMS[d]);
                }
            }
            xs = nxs;
            ys = nys;
            mvs = nmvs;
        }
        return null;
    }

    rehash() {
        this.hashH = 0;
        this.hashL = 0;
        // player hash
        this._updateNormalization();
        this.hashH ^= this.ZOBPLAYERH[this.normIdx];
        this.hashL ^= this.ZOBPLAYERL[this.normIdx];
        for (let i = 0, len = this.map.length; i < len; ++i) {
            if (bv.test(this.boxBV, i)) {
                this.hashH ^= this.ZOBBOXH[i];
                this.hashL ^= this.ZOBBOXL[i];
            }
        }
    }

    completed() {
        for (let i = 0, len = this.goalBV.length; i < len; ++i) {
            if (this.goalBV[i] !== this.boxBV[i]) {
                return false;
            }
        }
        return true;
    }

    move(dir) {
        let dirIdx = DMS.indexOf(dir);
        let dx = DXS[dirIdx];
        let dy = DYS[dirIdx];

        let mv = this._move(dx, dy);
        if (mv) {
            this.moves += mv;
            return true;
        }
        return false;
    }

    _move(dx, dy) {
        let nx = this.playerX+dx;
        let ny = this.playerY+dy;
        let nidx = ny*this.w + nx;
        let ncode = this.map[nidx];
        if (!ncode || ncode === MWALL) {
            return null; // cannot walk into a wall
        }
        if (!bv.test(this.boxBV, nidx)) { // empty space
            this.playerX = nx;
            this.playerY = ny;
            return _DIR(dx, dy);
        }
        else { // has a box
            let nnx = nx+dx;
            let nny = ny+dy;
            let nnidx = nny*this.w + nnx;
            let nncode = this.map[nnidx];
            if (!nncode || nncode === MWALL || bv.test(this.boxBV, nnidx)) {
                return false; // Cannot push into a wall or another box
            }
            // Pushable box
            // Clear current box's hash
            this.hashH ^= this.ZOBBOXH[nidx];
            this.hashL ^= this.ZOBBOXL[nidx];
            // Update box's position
            bv.clear(this.boxBV, nidx);
            bv.set(this.boxBV, nnidx);
            // Set box's hash
            this.hashH ^= this.ZOBBOXH[nnidx];
            this.hashL ^= this.ZOBBOXL[nnidx];

            // clear current player hash
            this.hashH ^= this.ZOBPLAYERH[this.normIdx];
            this.hashL ^= this.ZOBPLAYERL[this.normIdx];
            // set new player position
            this.playerX = nx;
            this.playerY = ny;
            // set the new player hash
            this._updateNormalization();
            this.hashH ^= this.ZOBPLAYERH[this.normIdx];
            this.hashL ^= this.ZOBPLAYERL[this.normIdx];

            return _DIR(dx, dy).toUpperCase();
        }
        return false;
    }

    undo() {
        if (this.moves.length < 1) { return; }
        let m = this.moves.slice(-1);
        let mLower = m.toLowerCase();

        let lx = (mLower === 'l') ? this.playerX + 1
               : (mLower === 'r') ? this.playerX - 1
               : this.playerX;
        let ly = (mLower === 'u') ? this.playerY + 1
               : (mLower === 'd') ? this.playerY - 1
               : this.playerY;

        if (m === mLower) { // undo move
            this.playerX = lx;
            this.playerY = ly;
        }
        else { // undo push
            let pIdx = this.playerY*this.w + this.playerX;

            let bx = (m === 'L') ? this.playerX - 1
                   : (m === 'R') ? this.playerX + 1
                   : this.playerX;
            let by = (m === 'U') ? this.playerY - 1
                   : (m === 'D') ? this.playerY + 1
                   : this.playerY;
            let bidx = by*this.w + bx;

            // clear current box's hash
            this.hashH ^= this.ZOBBOXH[bidx];
            this.hashL ^= this.ZOBBOXL[bidx];
            // set box position
            bv.clear(this.boxBV, bidx);
            bv.set(this.boxBV, pIdx);
            // set box's hash
            this.hashH ^= this.ZOBBOXH[pIdx];
            this.hashL ^= this.ZOBBOXL[pIdx];

            // clear current player hash
            this.hashH ^= this.ZOBPLAYERH[this.normIdx];
            this.hashL ^= this.ZOBPLAYERL[this.normIdx];
            // set new player position
            this.playerX = lx;
            this.playerY = ly;
            // set the new player hash
            this._updateNormalization();
            this.hashH ^= this.ZOBPLAYERH[this.normIdx];
            this.hashL ^= this.ZOBPLAYERL[this.normIdx];
        }
        this.moves = this.moves.slice(0, -1);
    }

    toString() {
        let str = '';
        let idx = 0;
        for (let j = 0; j < this.h; ++j) {
            if (j) { str += '\r\n'; }
            for (let i = 0; i < this.w; ++i) {
                let code = this.map[idx];
                if (i === this.playerX && j === this.playerY) {
                    if (code === MFLOOR) {
                        str += '@';
                    }
                    else if (code === MGOAL) {
                        str += '+';
                    }
                    else {
                        str += '?';
                    }
                }
                else if (bv.test(this.boxBV, idx)) {
                    if (code === MFLOOR) {
                        str += '$';
                    }
                    else if (code === MGOAL) {
                        str += '*';
                    }
                    else {
                        str += '?';
                    }
                }
                else {
                    switch (code) {
                        case MEMPTY:
                            str += '\\';
                            break;
                        case MFLOOR:
                            str += ' ';
                            break;
                        case MWALL:
                            str += '#';
                            break;
                        case MGOAL:
                            str += '.';
                            break;
                    }
                }

                ++idx;
            }
        }
        return str;
    }
}

export function runTests() {
    let s = new Sokoban(
`#######
#   .+#
#####@#
#   . #
#     #
#######`
    );
    console.assert(s.normIdx === (1*s.w + 1));

    s = new Sokoban(
`######
#    #
# $ @#
######`
    );
    let hH = s.hashH;
    let hL = s.hashL;
    s.move('u');
    s.move('l');
    s.move('l');
    s.move('l');
    s.move('l');
    s.move('l');
    s.move('l');
    s.move('l');
    s.move('l');
    s.move('d');
    s.move('r');
    console.assert(hH !== s.hashH);
    console.assert(hL !== s.hashL);
    s.move('u');
    s.move('r');
    s.move('r');
    s.move('r');
    s.move('r');
    s.move('r');
    s.move('r');
    s.move('r');
    s.move('d');
    s.move('l');
    console.assert(hH === s.hashH);
    console.assert(hL === s.hashL);
    while(s.moves.length) {
        s.undo();
    }
    console.assert(hH === s.hashH);
    console.assert(hL === s.hashL);

    s = new Sokoban(
`#####
#.$@#
#####`
    );
    console.assert(!s.completed());
    s.move('l');
    console.assert(s.completed());

    s = new Sokoban(
`#####
#  @#
#####`
    );
    let cs = Sokoban.copy(s);
    cs.move('l');
    console.assert(s.playerX === 3);
    console.assert(cs.playerX === 2);
    
    s = new Sokoban(
`####
# .#
#  ###
#*@  #
#  $ #
#  ###
####  `
    );
    console.assert(s.movesTo(1, 2) === 'ul');

    let sol = Sokoban.solve(s, 10000);
    console.assert(sol === 'dlUrrrdLullddrUluRuulDrddrruLdlUU');


    s = new Sokoban(
`####
#@ #
####`
    );
    sol = Sokoban.solve(s, 60000);
    console.assert(sol === null);

    s = new Sokoban(
`######
#@ #.#
######`
    );
    sol = Sokoban.solve(s, 60000);
    console.assert(sol === null);

    s = new Sokoban(
`#######
#@$ #.#
#######`
    );
    sol = Sokoban.solve(s, 60000);
    console.assert(sol === null);

    s = new Sokoban(
`######
#    #
#@$ .#
#    #
######`
    );
    let liveSquares = Sokoban._generateLiveSquares(s);
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
    liveSquares = Sokoban._generateLiveSquares(s);
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
