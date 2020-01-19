import Zobrist from './Zobrist.js';
import {TypedTranspositionTable as TranspositionTable} from './TranspositionTable.js';
import Flags from './Flags.js';

const PLAYER_SET = {};
PLAYER_SET[' '.charCodeAt(0)] = '@'.charCodeAt(0),
PLAYER_SET['.'.charCodeAt(0)] = '+'.charCodeAt(0)
Object.freeze(PLAYER_SET);

const PLAYER_CLEAR = {};
PLAYER_CLEAR['@'.charCodeAt(0)] = ' '.charCodeAt(0);
PLAYER_CLEAR['+'.charCodeAt(0)] = '.'.charCodeAt(0);
Object.freeze(PLAYER_CLEAR);

const PLAYER_PUSH = {};
PLAYER_PUSH['$'.charCodeAt(0)] = '@'.charCodeAt(0),
PLAYER_PUSH['*'.charCodeAt(0)] = '+'.charCodeAt(0)
Object.freeze(PLAYER_PUSH);

const BOX_PULL = {};
BOX_PULL['@'.charCodeAt(0)] = '$'.charCodeAt(0),
BOX_PULL['+'.charCodeAt(0)] = '*'.charCodeAt(0)
Object.freeze(BOX_PULL);

const BOX_SET = {};
BOX_SET[' '.charCodeAt(0)] = '$'.charCodeAt(0),
BOX_SET['.'.charCodeAt(0)] = '*'.charCodeAt(0)
Object.freeze(BOX_SET);

const BOX_CLEAR = {};
BOX_CLEAR['$'.charCodeAt(0)] = ' '.charCodeAt(0),
BOX_CLEAR['*'.charCodeAt(0)] = '.'.charCodeAt(0)
Object.freeze(BOX_CLEAR);

const CODE = Object.freeze({
    '#': '#'.charCodeAt(0),
    '@': '@'.charCodeAt(0),
    '+': '+'.charCodeAt(0),
    '$': '$'.charCodeAt(0),
    '*': '*'.charCodeAt(0),
    '.': '.'.charCodeAt(0),
    ' ': ' '.charCodeAt(0),
    '\\': '\\'.charCodeAt(0),
});
const NULL_SPACE = '\\'.charCodeAt(0);

const DXS = Object.freeze([-1, 1, 0, 0]);
const DYS = Object.freeze([0, 0, -1, 1]);
const DMS = Object.freeze(['l', 'r', 'u', 'd']);

export default class Sokoban {
    _get(x, y) {
        let idx = y*this.w + x;
        let code = this.puzzle[idx];
        return (code) ? code : 0;
    }

    _set(x, y, value) {
        let idx = y*this.w + x;
        this.puzzle[idx] = value;
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
        // Convert puzzle to numeric
        this.puzzle = new Uint8Array(this.w*this.h);
        for (let j = 0; j < this.h; ++j) {
            let row = j*this.w;
            for (let i = 0; i < this.w; ++i) {
                let idx = row + i;
                let code = str[j].charCodeAt(i);
                this.puzzle[idx] = code ? code : NULL_SPACE;
            }
        }
        // Hide unreachable squares
        const FLAG_VISITED = 0x1;
        const FLAG_REACHABLE = 0x2;
        const FLAG_UNREACHABLE = 0x4;
        let reachable = function(x, y, flags) {
            let cur = this._get(x, y);
            if (!cur || cur === CODE['#'] || cur === CODE['\\']) {
                return false;
            }
            if (flags.get(x, y) & FLAG_REACHABLE) { return true; }
            if (flags.get(x, y) & FLAG_UNREACHABLE) { return false; }

            let allxs = [];
            let allys = [];

            let reachable = false;
            let xs = [x];
            let ys = [y];
            while (xs.length) { // until every space is processed
                let nxs = [];
                let nys = [];
                for (let k = 0, len = xs.length; k < len; ++k) {
                    let i = xs[k]
                    let j = ys[k];
                    let ch = this._get(i, j);
                    if (!ch || ch === CODE['#'] || ch === CODE['\\']) {
                        continue;
                    }
                    if (flags.get(i, j) & FLAG_VISITED) { continue; }
                    flags.set(i, j, FLAG_VISITED);
                    if (ch !== CODE[' ']) { // reachable
                        reachable = true;
                    }
                    allxs.push(i);
                    allys.push(j);
                    nxs.push(i+1); nys.push(j);
                    nxs.push(i-1); nys.push(j);
                    nxs.push(i); nys.push(j+1);
                    nxs.push(i); nys.push(j-1);
                }
                xs = nxs;
                ys = nys;
            }
            for (let k = 0, len = allxs.length; k < len; ++k) {
                let i = allxs[k]
                let j = allys[k];
                if (reachable) { flags.set(i, j, FLAG_REACHABLE); }
                else { flags.set(i, j, FLAG_UNREACHABLE); }
            }
            return reachable;
        }.bind(this);
        let flags = new Flags(this.w, this.h);
        for (let j = 0; j < this.h; ++j) {
            for (let i = 0; i < this.w; ++i) {
                if (this._get(i, j) === CODE[' '] && !reachable(i, j, flags)) {
                    this._set(i, j, CODE['\\']);
                }
            }
        }
        // Position of player
        let idx = 0;
        for (let len = this.puzzle.length; idx < len; ++idx) {
            let val = this.puzzle[idx];
            if (val === CODE['@'] || val === CODE['+']) {
                break;
            }
        }
        this.x = idx % this.w;
        this.y = ~~(idx / this.w);
        // Zobrist hashing
        this.zobrist = new Zobrist(this.w, this.h);
        this.rehash();

        this.moves = '';
    }

    static copy(s) {
        // Copies width, height, x, y, hash 
        let ns = Object.assign(Object.create(Sokoban.prototype), s);
        // Copy array
        ns.puzzle = new Uint8Array(s.puzzle);
        // Zobrist object should be referenced
        // Normalized object can be referenced, since it is immutable
        // moves string can be referenced, since String type is immutable
        return ns;
    }

    static solve(s, timeout=10000) {
        let tt = new TranspositionTable();
        let ps; // array of states being processed
        let nps; // array of states to process next

        let endtime = new Date().getTime() + timeout;

        function split(s) {
            let flags = new Flags(s.w, s.h);

            let xs = [s.x];
            let ys = [s.y];
            let mls = [''];
            while (xs.length) { // until we process every reachable space
                let nxs = [];
                let nys = [];
                let nmls = [];
                for (let k = 0, len = xs.length; k < len; ++k) {
                    if (new Date().getTime() > endtime) { return null; }

                    let x = xs[k];
                    let y = ys[k];

                    if (flags.get(x, y)) { continue; }
                    flags.set(x, y, 1);

                    for (let i = 0; i < 4; ++i) {
                        let dx = DXS[i];
                        let dy = DYS[i];
                        let nx = x+dx;
                        let ny = y+dy;

                        let nch = s._get(nx, ny);
                        if (nch in PLAYER_PUSH) { // is box
                            let nnx = nx+dx;
                            let nny = ny+dy;
                            let nnch = s._get(nnx, nny);
                            if (nnch in BOX_SET) { // and box able to move
                                let cs = Sokoban.copy(s);
                                cs._set(cs.x, cs.y, PLAYER_CLEAR[cs._get(cs.x, cs.y)]);
                                cs._set(x, y, PLAYER_SET[cs._get(x, y)]);
                                cs.x = x;
                                cs.y = y;
                                cs.moves += mls[k]; // move player to this position
                                cs.move(dx, dy); // push box
                                if (cs.completed()) { return cs; } // we're done!
                                let exists = tt.entry(cs.hashH, cs.hashL);
                                if (exists) { continue; }
                                nps.push(cs);
                            }
                        }
                        else if (nch in PLAYER_SET) { // player can move here
                            nxs.push(nx);
                            nys.push(ny);
                            nmls.push(mls[k] + DMS[i]);
                        }
                    }
                }
                xs = nxs;
                ys = nys;
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
        this.normalized = this.normalizePosition(this.x, this.y);
        let h = this.zobrist.player(this.normalized.x, this.normalized.y);
        this.hashH ^= h[1];
        this.hashL ^= h[0];
        // Box hash
        for (let j = 0; j < this.h; ++j) {
            for (let i = 0; i < this.w; ++i) {
                let ch = this._get(i, j);
                if (ch === CODE['$'] || ch === CODE['*']) {
                    let h = this.zobrist.box(i, j);
                    this.hashH ^= h[1];
                    this.hashL ^= h[0];
                }
            }
        }
    }

    normalizePosition(x, y) {
        let flags = new Flags(this.w, this.h);
        let normX = x;
        let normY = y;

        let xs = [x];
        let ys = [y];
        while (xs.length) { // until we reach a reachable space, or every space is processed
            let nxs = [];
            let nys = [];
            for (let k = 0, len = xs.length; k < len; ++k) {
                let i = xs[k]
                let j = ys[k];
                let ch = this._get(i, j);
                if (!ch || ch === CODE['#'] || ch === CODE['$'] || ch === CODE['*'] || ch === CODE['\\']) {
                    continue;
                }
                if (flags.get(i, j)) { continue; }
                flags.set(i, j, 1); // visited
                if (i < normX) {
                    normX = i;
                }
                if (j < normY) {
                    normY = j;
                }
                nxs.push(i+1); nys.push(j);
                nxs.push(i-1); nys.push(j);
                nxs.push(i); nys.push(j+1);
                nxs.push(i); nys.push(j-1);
            }
            xs = nxs;
            ys = nys;
        }
        return Object.freeze({ x: normX, y: normY });
    }
    
    completed() {
        for (let i = 0, len = this.puzzle.length; i < len; ++i) {
            let val = puzzle[i];
            if (val === CODE['+'] || val === CODE['.']) {
                return false;
            }
        }
        return true;
    }

    move(dx, dy) {
        let ch = this._get(this.x, this.y);
        let nx = this.x+dx;
        let ny = this.y+dy;
        let nch = this._get(nx, ny);
        if (nch in PLAYER_SET) {
            // clear current player position
            this._set(this.x, this.y, PLAYER_CLEAR[ch]);
            // set new player position
            this._set(nx, ny, PLAYER_SET[nch]);
            this.x = nx;
            this.y = ny;

            let dir = (dx < 0) ? 'l'
                    : (dx > 0) ? 'r'
                    : (dy < 0) ? 'u'
                    : (dy > 0) ? 'd'
                    : '';
            this.moves += dir;
            return true;
        }
        else if (nch in PLAYER_PUSH) {
            let nnx = nx+dx;
            let nny = ny+dy;
            let nnch = this._get(nnx, nny);
            if (nnch in BOX_SET) {
                let h;
                // clear current box's hash
                h = this.zobrist.box(nx, ny);
                this.hashH ^= h[1];
                this.hashL ^= h[0];
                // no need to clear current box position (player overrides)
                // set box position
                this._set(nnx, nny, BOX_SET[nnch]);
                // set box's hash
                h = this.zobrist.box(nnx, nny);
                this.hashH ^= h[1];
                this.hashL ^= h[0];

                // clear current player hash
                h = this.zobrist.player(this.normalized.x, this.normalized.y);
                this.hashH ^= h[1];
                this.hashL ^= h[0];
                // clear current player position
                this._set(this.x, this.y, PLAYER_CLEAR[ch]);
                // set new player position
                this._set(nx, ny, PLAYER_PUSH[nch]);
                this.x = nx;
                this.y = ny;
                // set the new player hash
                this.normalized = this.normalizePosition(this.x, this.y);
                h = this.zobrist.player(this.normalized.x, this.normalized.y);
                this.hashH ^= h[1];
                this.hashL ^= h[0];

                let dir = (dx < 0) ? 'L'
                        : (dx > 0) ? 'R'
                        : (dy < 0) ? 'U'
                        : (dy > 0) ? 'D'
                        : '';
                this.moves += dir;
                return true;
            }
        }
        return false;
    }

    undo() {
        if (this.moves.length < 1) { return; }
        let m = this.moves.slice(-1);
        let mLower = m.toLowerCase();

        let ch = this._get(this.x, this.y);
        let lx = (mLower === 'l') ? this.x + 1
               : (mLower === 'r') ? this.x - 1
               : this.x;
        let ly = (mLower === 'u') ? this.y + 1
               : (mLower === 'd') ? this.y - 1
               : this.y;
        let lch = this._get(lx, ly);

        if (m === mLower) { // undo move
            // clear current player position
            this._set(this.x, this.y, PLAYER_CLEAR[ch]);
            // set new player position
            this._set(lx, ly, PLAYER_SET[lch]);
            this.x = lx;
            this.y = ly;
        }
        else { // undo push
            let bx = (m === 'L') ? this.x - 1
                   : (m === 'R') ? this.x + 1
                   : this.x;
            let by = (m === 'U') ? this.y - 1
                   : (m === 'D') ? this.y + 1
                   : this.y;
            let bch = this._get(bx, by);

            let h;
            // clear current box's hash
            h = this.zobrist.box(bx, by);
            this.hashH ^= h[1];
            this.hashL ^= h[0];
            // clear current box position
            this._set(bx, by, BOX_CLEAR[bch]);
            // set box position
            this._set(this.x, this.y, BOX_PULL[ch]);
            // set box's hash
            h = this.zobrist.box(this.x, this.y);
            this.hashH ^= h[1];
            this.hashL ^= h[0];

            // clear current player hash
            h = this.zobrist.player(this.normalized.x, this.normalized.y);
            this.hashH ^= h[1];
            this.hashL ^= h[0];
            // no need to clear current player position (already pulled box)
            // set new player position
            this._set(lx, ly, PLAYER_SET[lch]);
            this.x = lx;
            this.y = ly;
            // set the new player hash
            this.normalized = this.normalizePosition(this.x, this.y);
            h = this.zobrist.player(this.normalized.x, this.normalized.y);
            this.hashH ^= h[1];
            this.hashL ^= h[0];
        }
        this.moves = this.moves.slice(0, -1);
    }

    toString() {
        let str = '';
        for (let j = 0; j < this.h; ++j) {
            let idx = j*this.w;
            let arr = this.puzzle.slice(idx, idx+this.w);

            if (j) { str += '\r\n'; }
            str += String.fromCharCode(...arr);
        }
        return str;
    }
}

export function test() {
    let s = new Sokoban(
`####
# @#
####`
    );
    s._set(1, 1, CODE['$']);
    let c = s._get(1, 1);
    console.assert(c === CODE['$']);
    s = new Sokoban(
`#######
#   .+#
#####@#
#   . #
#     #
#######`
    );
    let norm = s.normalizePosition(2, 3);
    console.assert(norm.x === 1);
    console.assert(norm.y === 1);

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
    console.assert(s._get(3, 1) === CODE['@']);
    console.assert(cs._get(2, 1) === CODE['@']);
    
    s = new Sokoban(
`####
# .#
#  ###
#*@  #
#  $ #
#  ###
####  `
    );
    let sol = Sokoban.solve(s, 1000);
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
}
