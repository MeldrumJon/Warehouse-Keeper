import Zobrist from './Zobrist.js';
import {TypedTranspositionTable as TranspositionTable} from './TranspositionTable.js';
import Flags from './Flags.js';

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

const DXS = Object.freeze([-1, 1, 0, 0]);
const DYS = Object.freeze([0, 0, -1, 1]);
const DMS = Object.freeze(['l', 'r', 'u', 'd']);

function _dir(dx, dy) {
    return (dx < 0) ? 'l'
            : (dx > 0) ? 'r'
            : (dy < 0) ? 'u'
            : (dy > 0) ? 'd'
            : '';
}

export default class Sokoban {
    _map(x, y) {
        let idx = y*this.w + x;
        return this.map[idx];
    }

    _getBox(x, y) {
        for (let i = 0, len = this.boxXs.length; i < len; ++i) {
            if (this.boxXs[i] === x && this.boxYs[i] === y) {
                return i;
            }
        }
        return null;
    }

    _hasGoal(x, y) {
        for (let i = 0, len = this.boxXs.length; i < len; ++i) {
            if (this.goalXs[i] === x && this.goalYs[i] === y) {
                return true;
            }
        }
        return false;
    }

    _hasPlayer(x, y) {
        return (this.playerX === x && this.playerY === y);
    }

    _updateNormalization() {
        let normX = this.playerX;
        let normY = this.playerY;

        let visited = new Uint8Array(this.map.length);
        let xs = [normX];
        let ys = [normY];
        while (xs.length) {
            let nxs = [];
            let nys = [];
            for (let k = 0, len = xs.length; k < len; ++k) {
                let i = xs[k]
                let j = ys[k];
                let idx = j*this.w + i;
                let code = this.map[idx];
                // Coordinate is unreachable
                if (!code || code === MWALL || this._getBox(i, j) !== null) {
                    continue;
                }
                // Already checked this point
                if (visited[idx]) { continue; }
                visited[idx] = 1;
                // Update normalized position
                if (i < normX) {
                    normX = i;
                }
                if (j < normY) {
                    normY = j;
                }
                // Test surrounding points
                nxs.push(i+1); nys.push(j);
                nxs.push(i-1); nys.push(j);
                nxs.push(i); nys.push(j+1);
                nxs.push(i); nys.push(j-1);
            }
            xs = nxs;
            ys = nys;
        }
        this.normX = normX;
        this.normY = normY;
    }

    _generateLiveSquares() {
        let lsquares = new Uint8Array(this.w*this.h);
        for (let g = 0, len = this.goalXs.length; g < len; ++g) {
            let xs = [this.goalXs[g]];
            let ys = [this.goalYs[g]];
            while (xs.length) {
                let nxs = [];
                let nys = [];
                for (let k = 0, len = xs.length; k < len; ++k) {
                    let x = xs[k];
                    let y = ys[k];
                    let idx = y*this.w + x;

                    if (lsquares[idx]) { continue; }
                    lsquares[idx] = 1;

                    for (let d = 0; d < 4; ++d) {
                        let dx = DXS[d];
                        let dy = DYS[d];
                        let nx = x+dx;
                        let ny = y+dy;
                        let ncode = this._map(nx, ny);
                        let nnx = nx+dx;
                        let nny = ny+dy;
                        let nncode = this._map(nnx, nny);
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
        return lsquares;
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
        // Convert puzzle to state representation
        this.playerX = -1;
        this.playerY = -1;
        this.boxXs = [];
        this.boxYs = [];
        this.goalXs = [];
        this.goalYs = [];

        this.map = new Uint8Array(this.w*this.h);
        let idx = 0;
        for (let j = 0; j < this.h; ++j) {
            for (let i = 0; i < this.w; ++i) {
                let ch = str[j].charAt(i);
                if (ch === '@' || ch === '+') {
                    this.playerX = i;
                    this.playerY = j;
                }
                if (ch === '$' || ch === '*') {
                    this.boxXs.push(i);
                    this.boxYs.push(j);
                }
                if (ch === '+' || ch === '*' || ch === '.') {
                    this.goalXs.push(i);
                    this.goalYs.push(j);
                }
                let code = C2MAP[ch];
                this.map[idx] = code ? code : 0;

                ++idx;
            }
        }
        this.boxXs = new Uint16Array(this.boxXs);
        this.boxYs = new Uint16Array(this.boxYs);
        this.goalXs = new Uint16Array(this.goalXs);
        this.goalYs = new Uint16Array(this.goalYs);
        // Hide unreachable squares
        let reachable = new Uint8Array(this.map.length);
        let xs = [this.playerX];
        let ys = [this.playerY];
        while (xs.length) {
            let nxs = [];
            let nys = [];
            for (let k = 0, len = xs.length; k < len; ++k) {
                let i = xs[k];
                let j = ys[k];
                let idx = this.w*j + i;
                let code = this.map[idx];
                // Coordinate is obviously unreachable
                if (!code || code === MWALL) {
                    continue;
                }
                // Coordinate has already been visited
                if (reachable[idx]) {
                    continue;
                }
                // Coordinate is reachable
                reachable[idx] = 1;
                nxs.push(i+1); nys.push(j);
                nxs.push(i-1); nys.push(j);
                nxs.push(i); nys.push(j+1);
                nxs.push(i); nys.push(j-1);
            }
            xs = nxs;
            ys = nys;
        }
        for (let i = 0, len = this.map.length; i < len; ++i) {
            if (!reachable[i] && this.map[i] === C2MAP[' ']) {
                this.map[i] = 0;
            }
        }
        // Map should not change
        this.map = this.map;

        // Zobrist hashing
        this.zobrist = new Zobrist(this.w, this.h);
        this.rehash();

        this.moves = '';
    }

    static copy(s) {
        // Copies width, height, playerX, playerY, hashH, hashL
        let cs = Object.assign(Object.create(Sokoban.prototype), s);
        // Deep copy state
        cs.boxXs = new Uint16Array(s.boxXs);
        cs.boxYs = new Uint16Array(s.boxYs);
        // Map should be referenced, since it is immutable
        // Goal list should be referenced, since it is immutable
        // Zobrist object should be referenced
        // moves string can be referenced, since String type is immutable
        return cs;
    }

    static solve(s, timeout=10000) {
        let tt = new TranspositionTable();
        const liveSquares = s._generateLiveSquares();
        let ps; // array of states being processed
        let nps; // array of states to process next

        let endtime = new Date().getTime() + timeout;

        function split(s) {
            let visited = new Array(s.map.length).fill(false);

            let xs = [s.playerX];
            let ys = [s.playerY];
            let idxs = [s.playerY*s.w + s.playerX];
            let mls = [''];
            while (xs.length) { // until we process every reachable space
                let nxs = [];
                let nys = [];
                let nidxs = [];
                let nmls = [];
                for (let k = 0, len = xs.length; k < len; ++k) {
                    if (new Date().getTime() > endtime) { return null; }

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

                        let b = s._getBox(nx, ny);
                        if (b !== null) { // is box
                            let nnx = nx+dx;
                            let nny = ny+dy;
                            let nnidx = nny*s.w + nnx;
                            if (!liveSquares[nnidx]) { continue; } // Game over when a box is pushed here
                            let nncode = s.map[nnidx];
                            if (nncode && nncode !== MWALL && s._getBox(nnx, nny) === null) { // and box able to move
                                let cs = Sokoban.copy(s);
                                cs.playerX = x;
                                cs.playerY = y;
                                cs.moves += mls[k]; // move player to this position
                                cs.move(dx, dy); // push box
                                let exists = tt.entry(cs.hashH, cs.hashL);
                                if (exists) { continue; }
                                if (cs.completed()) { return cs; } // we're done!
                                nps.push(cs);
                            }
                        }
                        else if (ncode && ncode !== MWALL) { // player can move here
                            nxs.push(nx);
                            nys.push(ny);
                            nidxs.push(nidx);
                            nmls.push(mls[k] + DMS[i]);
                        }
                    }
                }
                xs = nxs;
                ys = nys;
                idxs = nidxs;
                mls = nmls;
            }
            return null;
        }

        ps = [s];
        while (ps.length) {
            nps = [];
            for (let i = 0, len = ps.length; i < len; ++i) {
                let finished = split(ps[i]);
                if (finished) {
                    return finished.moves;
                }
                if (new Date().getTime() > endtime) { return null; }
            }
            ps = nps;
        }
        return null; // could not find a solution
    }

    rehash() {
        this.hashH = 0;
        this.hashL = 0;
        // player hash
        this._updateNormalization();
        let h = this.zobrist.player(this.normX, this.normY);
        this.hashH ^= h[1];
        this.hashL ^= h[0];
        for (let i = 0, len = this.boxXs.length; i < len; ++i) {
            let h = this.zobrist.box(this.boxXs[i], this.boxYs[i]);
            this.hashH ^= h[1];
            this.hashL ^= h[0];
        }
    }

    completed() {
        for (let j = 0, len = this.goalXs.length; j < len; ++j) {
            let i = 0, len = this.boxXs.length;
            for (; i < len; ++i) {
                if (this.goalXs[j] === this.boxXs[i] 
                        && this.goalYs[j] === this.boxYs[i]) {
                    break; // a box is on goal j
                }
            }
            if (i >= len) {
                return false; // a box was not found on a goal
            }
        }
        return true;
    }

    move(dx, dy) {
        let nx = this.playerX+dx;
        let ny = this.playerY+dy;
        let ncode = this._map(nx, ny);
        if (!ncode || ncode === MWALL) {
            return false; // cannot walk into a wall
        }
        let b = this._getBox(nx, ny);
        if (b === null) { // empty space
            this.playerX = nx;
            this.playerY = ny;
            this.moves += _dir(dx, dy);
            return true;
        }
        else { // has a box
            let nnx = nx+dx;
            let nny = ny+dy;
            let nncode = this._map(nnx, nny);
            if (!nncode || nncode === MWALL || this._getBox(nnx, nny) !== null) {
                return false; // Cannot push into a wall or another box
            }
            // Pushable box
            let h;
            // Clear current box's hash
            h = this.zobrist.box(nx, ny);
            this.hashH ^= h[1];
            this.hashL ^= h[0];
            // Update box's position
            this.boxXs[b] = nnx;
            this.boxYs[b] = nny;
            // Set box's hash
            h = this.zobrist.box(nnx, nny);
            this.hashH ^= h[1];
            this.hashL ^= h[0];

            // clear current player hash
            h = this.zobrist.player(this.normX, this.normY);
            this.hashH ^= h[1];
            this.hashL ^= h[0];
            // set new player position
            this.playerX = nx;
            this.playerY = ny;
            // set the new player hash
            this._updateNormalization();
            h = this.zobrist.player(this.normX, this.normY);
            this.hashH ^= h[1];
            this.hashL ^= h[0];

            this.moves += _dir(dx, dy).toUpperCase();
            return true;
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
            let bx = (m === 'L') ? this.playerX - 1
                   : (m === 'R') ? this.playerX + 1
                   : this.playerX;
            let by = (m === 'U') ? this.playerY - 1
                   : (m === 'D') ? this.playerY + 1
                   : this.playerY;

            let b = this._getBox(bx, by);

            let h;
            // clear current box's hash
            h = this.zobrist.box(bx, by);
            this.hashH ^= h[1];
            this.hashL ^= h[0];
            // set box position
            this.boxXs[b] = this.playerX;
            this.boxYs[b] = this.playerY;
            // set box's hash
            h = this.zobrist.box(this.playerX, this.playerY);
            this.hashH ^= h[1];
            this.hashL ^= h[0];

            // clear current player hash
            h = this.zobrist.player(this.normX, this.normY);
            this.hashH ^= h[1];
            this.hashL ^= h[0];
            // set new player position
            this.playerX = lx;
            this.playerY = ly;
            // set the new player hash
            this._updateNormalization();
            h = this.zobrist.player(this.normX, this.normY);
            this.hashH ^= h[1];
            this.hashL ^= h[0];
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
                else if (this._getBox(i, j) !== null) {
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

export function test() {
    let s = new Sokoban(
`#######
#   .+#
#####@#
#   . #
#     #
#######`
    );
    console.assert(s.normX === 1);
    console.assert(s.normY === 1);

    s = new Sokoban(
`######
#    #
# $ @#
######`
    );
    let hH = s.hashH;
    let hL = s.hashL;
    s.move(0, -1);
    s.move(-1, 0);
    s.move(-1, 0);
    s.move(-1, 0);
    s.move(-1, 0);
    s.move(-1, 0);
    s.move(-1, 0);
    s.move(-1, 0);
    s.move(-1, 0);
    s.move(0, 1);
    s.move(1, 0);
    console.assert(hH !== s.hashH);
    console.assert(hL !== s.hashL);
    s.move(0, -1);
    s.move(1, 0);
    s.move(1, 0);
    s.move(1, 0);
    s.move(1, 0);
    s.move(1, 0);
    s.move(1, 0);
    s.move(1, 0);
    s.move(0, 1);
    s.move(-1, 0);
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
    s.move(-1, 0);
    console.assert(s.completed());

    s = new Sokoban(
`#####
#  @#
#####`
    );
    let cs = Sokoban.copy(s);
    cs.move(-1, 0);
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
    let livesquares = s._generateLiveSquares();
    for (let j = 0; j < s.h; ++j) {
        for (let i = 0; i < s.w; ++i) {
            let idx = j*s.w + i;
            let val = livesquares[j*s.w+i];
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
    livesquares = s._generateLiveSquares();
    for (let j = 0; j < s.h; ++j) {
        for (let i = 0; i < s.w; ++i) {
            let idx = j*s.w + i;
            let val = livesquares[j*s.w+i];
            if ((j === 1 || j === 2) && (i >= 2 && i <= 5)) {
                console.assert(val === 1);
            }
            else {
                console.assert(val === 0);
            }
        }
    }
}
