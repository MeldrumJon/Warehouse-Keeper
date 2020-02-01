import * as str from './strings.js';
import * as S from './sokoConsts.js';
import PCG32 from './PCG32.js';
import BitVector from './BitVector.js';

export default class Sokoban {
    _getIdx(x, y) { return y*this.K.w + x; }

    _floor(x, y) { return this.K.floor[this._getIdx(x, y)]; }

    constructor(s) {
        this.K = {}; // immutable data, not duplicated when copying

        /*
         * Parse String
         */
        s = str.rleDecode(s).split(/\r?\n|\|/);

        // Get dimensions of puzzle
        this.K.h = s.length;
        this.K.w = 0;
        for (let j = 0; j < this.K.h; ++j) {
            let width = s[j].length;
            if (width > this.K.w) { this.K.w = width; }
        }
        this.K.totalSqs = this.K.w*this.K.h;
        // Convert puzzle to state representation
        this.playerX = -1;
        this.playerY = -1;
        this.boxBV = new BitVector(this.K.totalSqs);
        this.K.goalBV = new BitVector(this.K.totalSqs);
        this.K.floor = new Array(this.K.totalSqs);
        for (let idx = 0, j = 0; j < this.K.h; ++j) { // idx init!
            for (let i = 0; i < this.K.w; ++i, ++idx) { // idx inc!
                let ch = s[j].charAt(i);
                if (ch === '@' || ch === '+') {
                    this.playerX = i;
                    this.playerY = j;
                }
                if (ch === '$' || ch === '*') {
                    this.boxBV.set(idx);
                }
                if (ch === '+' || ch === '*' || ch === '.') {
                    this.K.goalBV.set(idx);
                }
                this.K.floor[idx] = (ch === '') ? null
                              : (ch === '#') ? S.MWALL
                              : S.MFLOOR;
            }
        }

        let allReachable = this.getAllReachable();
        for (let idx = 0; idx < this.K.totalSqs; ++idx) {
            if (!allReachable.test(idx) && this.K.floor[idx]) {
                this.K.floor[idx] = null;
            }
        }

        /*
         * Zobrist hashing
         */
        this.K.ZOBBOXH = new Int32Array(this.K.totalSqs);
        this.K.ZOBBOXL = new Int32Array(this.K.totalSqs);
        this.K.ZOBPLAYERH = new Int32Array(this.K.totalSqs);
        this.K.ZOBPLAYERL = new Int32Array(this.K.totalSqs);
        const SEED = 1575579901796n;
        const rng = new PCG32(SEED);
        for (let idx = 0; idx < this.K.totalSqs; ++idx) {
            this.K.ZOBBOXH[idx] = rng.rand();
            this.K.ZOBBOXL[idx] = rng.rand();
            this.K.ZOBPLAYERH[idx] = rng.rand();
            this.K.ZOBPLAYERL[idx] = rng.rand();
        }
        this.rehash();

        Object.freeze(this.K);
    }

    static copy(s) {
        // Copies width, height, playerX, playerY, hashH, hashL
        let cs = Object.create(Sokoban.prototype);
        cs.K = s.K;
        cs.playerX = s.playerX;
        cs.playerY = s.playerY;
        cs.boxBV = BitVector.copy(s.boxBV);
        cs.normIdx = s.normIdx;
        cs.hashH = s.hashH;
        cs.hashL = s.hashL;
        return cs;
    }

    completed() { return this.K.goalBV.eq(this.boxBV); }

    _updateNormalization(visitedCache, normIdxCache) {
        const visited = (visitedCache) ? visitedCache 
                      : new BitVector(this.K.totalSqs);
        let nIdx = (normIdxCache) ? normIdxCache
                    : this._getIdx(this.playerX, this.playerY);

        let xs = [this.playerX], ys = [this.playerY];
        while (xs.length) {
            const nxs = [], nys = [];
            for (let k = 0, len = xs.length; k < len; ++k) {
                const x = xs[k], y = ys[k];
                const idx = this._getIdx(x, y);;
                // Already checked this point
                if (visited.test(idx)) { continue; }
                visited.set(idx);
                // Coordinate is unreachable
                if (!this.K.floor[idx] || this.boxBV.test(idx)) { // wall/box in way
                    continue;
                }
                // Update normalized position
                if (idx <= nIdx) {
                    nIdx = idx;
                }
                // Test surrounding points
                for (let d = 0; d < 4; ++d) {
                    nxs.push(x+S.DXS[d]); nys.push(y+S.DYS[d]);
                }
            }
            xs = nxs; ys = nys;
        }
        this.normIdx = nIdx;
    }

    rehash() {
        this.hashH = 0;
        this.hashL = 0;
        // player hash
        this._updateNormalization();
        this.hashH ^= this.K.ZOBPLAYERH[this.normIdx];
        this.hashL ^= this.K.ZOBPLAYERL[this.normIdx];
        for (let idx = 0; idx < this.K.totalSqs; ++idx) {
            if (this.boxBV.test(idx)) {
                this.hashH ^= this.K.ZOBBOXH[idx];
                this.hashL ^= this.K.ZOBBOXL[idx];
            }
        }
    }

    movesTo(destX, destY) {
        const visited = new BitVector(this.K.totalSqs);
        let xs = [this.playerX], ys = [this.playerY];
        let mvs = [''];
        while (xs.length) {
            const nxs = [], nys = [];
            const nmvs = [];
            for (let k = 0, len = xs.length; k < len; ++k) {
                const x = xs[k], y = ys[k];
                if (x === destX && y === destY) { return mvs[k]; } // Done!
                const idx = this._getIdx(x, y);
                // Already checked this point
                if (visited.test(idx)) { continue; }
                visited.set(idx);
                // Coordinate is unreachable
                if (!this.K.floor[idx] || this.boxBV.test(idx)) { // wall/box in the way
                    continue;
                }
                // Test surrounding points
                for (let d = 0; d < 4; ++d) {
                    nxs.push(x+S.DXS[d]); nys.push(y+S.DYS[d]);
                    nmvs.push(mvs[k]+S.DMS[d]);
                }
            }
            xs = nxs; ys = nys;
            mvs = nmvs;
        }
        return null;
    }

    push(x, y, dx, dy, visitedCache, normIdxCache) {
        const idx = this._getIdx(x, y);
        const nx = x+dx;
        const ny = y+dy;
        const nidx = this._getIdx(nx, ny);
        if (!this.K.floor[nidx] || this.boxBV.test(nidx)) { // cannot push into wall/box
            return false;
        }
        // Clear current hash
        this.hashH ^= this.K.ZOBBOXH[idx];
        this.hashL ^= this.K.ZOBBOXL[idx];
        // Update box's position
        this.boxBV.clear(idx);
        this.boxBV.set(nidx);
        // Set box's hash
        this.hashH ^= this.K.ZOBBOXH[nidx];
        this.hashL ^= this.K.ZOBBOXL[nidx];

        // clear current player hash
        this.hashH ^= this.K.ZOBPLAYERH[this.normIdx];
        this.hashL ^= this.K.ZOBPLAYERL[this.normIdx];
        // set player position
        this.playerX = x;
        this.playerY = y;
        this._updateNormalization(visitedCache, normIdxCache);
        // update player's hash
        this.hashH ^= this.K.ZOBPLAYERH[this.normIdx];
        this.hashL ^= this.K.ZOBPLAYERL[this.normIdx];
        return true;
    }

    pull(x, y, rdx, rdy) {
        const idx = this._getIdx(x, y);
        const bx = x-rdx;
        const by = y-rdy;
        const bidx = this._getIdx(bx, by);
        const px = bx-rdx;
        const py = by-rdy;
        const pidx = this._getIdx(px, py);
        if (!this.K.floor[pidx] || this.boxBV.test(pidx)) { // cannot move player on wall/box
            return false;
        }
        // Clear current box hash
        this.hashH ^= this.K.ZOBBOXH[idx];
        this.hashL ^= this.K.ZOBBOXL[idx];
        // Update box's position
        this.boxBV.clear(idx);
        this.boxBV.set(bidx);
        // Set box's hash
        this.hashH ^= this.K.ZOBBOXH[bidx];
        this.hashL ^= this.K.ZOBBOXL[bidx];

        // clear current player hash
        this.hashH ^= this.K.ZOBPLAYERH[this.normIdx];
        this.hashL ^= this.K.ZOBPLAYERL[this.normIdx];
        // set player position
        this.playerX = px;
        this.playerY = py;
        this._updateNormalization();
        // update player's hash
        this.hashH ^= this.K.ZOBPLAYERH[this.normIdx];
        this.hashL ^= this.K.ZOBPLAYERL[this.normIdx];
        return true;
    }

    move(dir) {
        if (this.completed()) {
            return null; // Don't allow moves once puzzle complete
        }
        if (!this.moves) {
            this.moves = ''; // Time to start keeping track of moves
        }
        const didx = S.DMS.indexOf(dir);
        const dx = S.DXS[didx];
        const dy = S.DYS[didx];

        const nx = this.playerX+dx;
        const ny = this.playerY+dy;
        const nidx = this._getIdx(nx, ny);
        if (!this.K.floor[nidx]) {
            return null;
        }
        else if (this.boxBV.test(nidx)) {
            if (this.push(nx, ny, dx, dy)) {
                let d = S.DMS[didx].toUpperCase();
                this.moves += d;
                return {
                    direction: d,
                    boxStartX: nx,
                    boxStartY: ny,
                    boxEndX: nx+dx,
                    boxEndY: ny+dy
                };
            }
            return null;
        }
        else {
            this.playerX = nx;
            this.playerY = ny;
            let d = S.DMS[didx];
            this.moves += d;
            return { direction: d };
        }
    }

    undo() {
        if (!this.moves) { return; } // empty string or undefined
        const mv = this.moves.slice(-1);
        const mvLC = mv.toLowerCase();

        const didx = S.DMS.indexOf(mvLC);
        const dx = S.DXS[didx];
        const dy = S.DYS[didx];

        if (mv !== mvLC) { // undo push
            this.pull(this.playerX+dx, this.playerY+dy, dx, dy);
        }
        else { // undo move
            this.playerX -= dx;
            this.playerY -= dy;
        }
        this.moves = this.moves.slice(0, -1);
    }

    restart() {
        while (this.moves.length) {
            this.undo();
        }
    }

    toString() {
        let s = '';
        for (let idx = 0, j = 0; j < this.K.h; ++j) { // idx init!
            if (j) { s += '\r\n'; }
            for (let i = 0; i < this.K.w; ++i, ++idx) { // idx inc!
                if (i === this.playerX && j === this.playerY) {
                    if (this.K.goalBV.test(idx)) { s += '+'; }
                    else { s += '@'; }
                }
                else if (this.boxBV.test(idx)) {
                    if (this.K.goalBV.test(idx)) { s += '*'; }
                    else { s += '$'; }
                }
                else if (this.K.goalBV.test(idx)) {
                    s += '.';
                }
                else {
                    if (this.K.floor[idx]) { s += ' '; }
                    else { s += '#'; }
                }
            }
        }
        return s;
    }

    numMoves() {
        return this.moves ? this.moves.length : 0;
    }

    numPushes() {
        if (this.moves) {
            let pushes = this.moves.replace(/[a-z]/g, '');
            console.log(pushes);
            return pushes.length;
        }
        else {
            return 0;
        }
    }

    getAllReachable() {
        // Hide unreachable squares
        const reachable = new BitVector(this.K.totalSqs);
        let xs = [this.playerX];
        let ys = [this.playerY];
        while (xs.length) {
            let nxs = [];
            let nys = [];
            for (let k = 0, len = xs.length; k < len; ++k) {
                let x = xs[k];
                let y = ys[k];
                let idx = this.K.w*y + x;
                // Coordinate has already been visited
                if (reachable.test(idx)) {
                    continue;
                }
                // Coordinate is obviously unreachable
                if (!this.K.floor[idx]) {
                    continue;
                }
                // Coordinate is reachable
                reachable.set(idx);
                for (let d = 0; d < 4; ++d) {
                    nxs.push(x+S.DXS[d]);
                    nys.push(y+S.DYS[d]);
                }
            }
            xs = nxs;
            ys = nys;
        }
        return reachable;
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
    console.assert(s.normIdx === s._getIdx(1, 1));

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
#. @#
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

    s = new Sokoban(
`#######
#. $ @#
#######`
    );
    hH = s.hashH;
    hL = s.hashL;
    let boxes = BitVector.copy(s.boxBV);
    s.move('l');
    s.move('l');
    s.move('l');
    s.undo();
    s.undo();
    s.undo();
    console.assert(s.hashH === hH);
    console.assert(s.hashL === hL);
    console.assert(boxes.eq(s.boxBV));
}
