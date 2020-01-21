import * as S from './SokobanConsts.js';
import PCG32 from './PCG32.js';
import * as bv from './bitVector.js';

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
                if (!code || code === S.MWALL || bv.test(this.boxBV, idx)) {
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
                    nxs.push(i+S.DXS[d]);
                    nys.push(j+S.DYS[d]);
                }
            }
            xs = nxs;
            ys = nys;
        }
        this.normIdx = normY*this.w + normX;
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
                let code = S.C2MAP[ch];
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
                if (!code || code === S.MWALL) {
                    continue;
                }
                // Coordinate is reachable
                reachable[idx] = 1;
                for (let d = 0; d < 4; ++d) {
                    nxs.push(i+S.DXS[d]);
                    nys.push(j+S.DYS[d]);
                }
            }
            xs = nxs;
            ys = nys;
        }
        for (let i = 0; i < totalSquares; ++i) {
            if (!reachable[i] && this.map[i] === S.C2MAP[' ']) {
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
                if (!code || code === S.MWALL || bv.test(this.boxBV, idx)) {
                    continue;
                }
                // Test surrounding points
                for (let d = 0; d < 4; ++d) {
                    nxs.push(i+S.DXS[d]);
                    nys.push(j+S.DYS[d]);
                    nmvs.push(mvs[k]+S.DMS[d]);
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
        let dirIdx = S.DMS.indexOf(dir);
        let dx = S.DXS[dirIdx];
        let dy = S.DYS[dirIdx];

        let mv = this._move(dx, dy);
        if (mv) {
            this.moves += mv;
            return true;
        }
        return false;
    }

    _move(dx, dy) {
        const nx = this.playerX+dx;
        const ny = this.playerY+dy;
        const nidx = ny*this.w + nx;
        const ncode = this.map[nidx];
        if (!ncode || ncode === S.MWALL) {
            return null; // cannot walk into a wall
        }
        if (!bv.test(this.boxBV, nidx)) { // empty space
            this.playerX = nx;
            this.playerY = ny;
            return S._DIR(dx, dy);
        }
        else { // has a box
            const nnx = nx+dx;
            const nny = ny+dy;
            const nnidx = nny*this.w + nnx;
            const nncode = this.map[nnidx];
            if (!nncode || nncode === S.MWALL || bv.test(this.boxBV, nnidx)) {
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

            return S._DIR(dx, dy).toUpperCase();
        }
        return false;
    }

    undo() {
        if (this.moves.length < 1) { return; }
        const mv = this.moves.slice(-1);
        const mvLower = mv.toLowerCase();
        const dirIdx = S.DMS.indexOf(mvLower);

        const lx = this.playerX - S.DXS[dirIdx];
        const ly = this.playerY - S.DYS[dirIdx];

        if (mv === mvLower) { // undo move
            this.playerX = lx;
            this.playerY = ly;
        }
        else { // undo push
            const pIdx = this.playerY*this.w + this.playerX;
            const bx = this.playerX + S.DXS[dirIdx];
            const by = this.playerY + S.DYS[dirIdx];
            const bIdx = by*this.w + bx;

            // clear current box's hash
            this.hashH ^= this.ZOBBOXH[bIdx];
            this.hashL ^= this.ZOBBOXL[bIdx];
            // set box position
            bv.clear(this.boxBV, bIdx);
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
            for (let i = 0; i < this.w; ++i, ++idx) { // inc IDX too
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
}
