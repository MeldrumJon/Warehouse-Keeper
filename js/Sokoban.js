import Zobrist from './Zobrist.js';
import {TypedTranspositionTable as TranspositionTable} from './TranspositionTable.js';
import Flags from './Flags.js';

const PLAYER_CLEAR = {};
PLAYER_CLEAR['@'.charCodeAt(0)] = ' '.charCodeAt(0);
PLAYER_CLEAR['+'.charCodeAt(0)] = '.'.charCodeAt(0);
Object.freeze(PLAYER_CLEAR);

const PLAYER_SET = {};
PLAYER_SET[' '.charCodeAt(0)] = '@'.charCodeAt(0),
PLAYER_SET['.'.charCodeAt(0)] = '+'.charCodeAt(0)
Object.freeze(PLAYER_SET);

const PLAYER_PUSH = {};
PLAYER_PUSH['$'.charCodeAt(0)] = '@'.charCodeAt(0),
PLAYER_PUSH['*'.charCodeAt(0)] = '+'.charCodeAt(0)
Object.freeze(PLAYER_PUSH);

const BOX_SET = {};
BOX_SET[' '.charCodeAt(0)] = '$'.charCodeAt(0),
BOX_SET['.'.charCodeAt(0)] = '*'.charCodeAt(0)
Object.freeze(BOX_SET);

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
        let sarr = str.split(/\r?\n/);
        // dimensions of puzzle
        this.h = sarr.length;
        this.w = 0;
        for (let i = 0; i < this.h; ++i) {
            let len = sarr[i].length;
            if (len > this.w) {
                this.w = len;
            }
        }
        // convert puzzle to numeric
        this.puzzle = new Uint8Array(this.w*this.h);
        for (let j = 0; j < this.h; ++j) {
            let row = j*this.w;
            for (let i = 0; i < this.w; ++i) {
                let idx = row + i;
                let code = sarr[j].charCodeAt(i);
                this.puzzle[idx] = code ? code : NULL_SPACE;
            }
        }
        // clear unreachable squares
        const FLAG_VISITING = 0x1;
        let reachable = function (x, y, flags) {
            let ch = this._get(x, y);
            if (!ch || ch === CODE['#'] || ch === CODE['\\']) { // unreachable
                return false;
            }
            if (ch !== CODE[' ']) { // reachable
                return true;
            }

            flags.set(x, y, FLAG_VISITING);
            let r = (!(flags.get(x+1, y) & FLAG_VISITING)) ? reachable(x+1, y, flags) : false;
            let l = (!(flags.get(x-1, y) & FLAG_VISITING)) ? reachable(x-1, y, flags) : false;
            let u = (!(flags.get(x, y-1) & FLAG_VISITING)) ? reachable(x, y-1, flags) : false;
            let d = (!(flags.get(x, y+1) & FLAG_VISITING)) ? reachable(x, y+1, flags) : false;
            flags.clear(x, y, FLAG_VISITING);

            if (r || l || d || u) {
                return true;
            }
            return false
        }.bind(this);
        for (let j = 0; j < this.h; ++j) {
            for (let i = 0; i < this.w; ++i) {
                let flags = new Flags(this.w, this.h);
                if (this._get(i, j) === CODE[' '] && !reachable(i, j, flags)) {
                    this._set(i, j, CODE['\\']);
                }
            }
        }
        // position of player
        let idx;
        for (let i = 0, len = this.puzzle.length; i < len; ++i) {
            if (this.puzzle[i] === CODE['@'] || this.puzzle[i] === CODE['+']) {
                idx = i;
                break;
            }
        }
        this.x = idx % this.w;
        this.y = ~~(idx / this.w);
        // zobrist hashing
        this.zobrist = new Zobrist(this.w, this.h);
        this.rehash();
    }

    static copy(s) {
        // Copies width, height, x, y, hash 
        let ns = Object.assign(Object.create(Sokoban.prototype), s);
        // Copy array
        ns.puzzle = new Uint8Array(s.puzzle);
        // Zobrist object and normalized object are referenced
        return ns;
    }

    static solve(s) {
        s.solution = '';
        let branches = [s];
        let tt = new TranspositionTable();

        function split(s, x, y, flags=null, sol='') {
            // Base case: already visited this position.
            if (flags.get(x, y)) {
                return;
            }
            flags.set(x, y, 1);
            let dxs = [-1, 1, 0, 0];
            let dys = [0, 0, -1, 1];
            for (let k = 0; k < 4; ++k) {
                let dx = dxs[k];
                let dy = dys[k];
                let nx = x+dx;
                let ny = y+dy;
                let nch = s._get(nx, ny);
                if (nch in PLAYER_PUSH) { // is box
                    let nnx = nx+dx;
                    let nny = ny+dy;
                    let nnch = s._get(nnx, nny);
                    if (nnch in BOX_SET) {
                        let cs = Sokoban.copy(s);
                        for (let i = 0, len = sol.length; i < len; ++i) {
                            if (sol[i] === 'u') { cs.move(0, -1); }
                            else if (sol[i] === 'd') { cs.move(0, 1); }
                            else if (sol[i] === 'l') { cs.move(-1, 0); }
                            else if (sol[i] === 'r') { cs.move(1, 0); }
                        }
                        cs.move(dx, dy);
                        let exists = tt.entry(cs.hashH, cs.hashL);
                        if (exists) { return; }
                        let dir = (dx < 0) ? 'L'
                                : (dx > 0) ? 'R'
                                : (dy < 0) ? 'U'
                                : (dy > 0) ? 'D'
                                : '';
                        cs.solution += sol + dir;
                        branches.push(cs);
                    }
                }
                else if (nch in PLAYER_SET) {
                    let dir = (dx < 0) ? 'l'
                            : (dx > 0) ? 'r'
                            : (dy < 0) ? 'u'
                            : (dy > 0) ? 'd'
                            : '';
                    split(s, nx, ny, flags, sol+dir);
                }
            }
        }
        for (let t = 0; t < 10000; ++t) { // only allow 10000 pushes
            let process = branches;
            branches = [];
            console.log(t);
            for (let i = 0, len = process.length; i < len; ++i) {
                if (i < 3) {
                    console.log(process[i].toString());
                    console.log(process[i].solution);
                }
                if (process[i].completed()) {
                    return process[i].solution;
                }
                let s = process[i];
                split(s, s.x, s.y, new Flags(s.w, s.h), '');
            }
        }
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

    normalizePosition(x, y, normalized=null, flags=null) {
        // First call
        if (!normalized) {
            // must be object, otherwise copies are made
            normalized = { x: x, y: y };
        }
        if (!flags) {
            flags = new Flags(this.w, this.h);
        }

        // Base case: Already visited this position
        if (flags.get(x, y)) {
            return;
        }
        // Base case: Position unreachable
        let ch = this._get(x, y);
        if (!ch || ch === CODE['#'] || ch === CODE['$'] || ch === CODE['*']) {
            return;
        }

        // Process
        if (x < normalized.x) {
            normalized.x = x;
        }
        if (y < normalized.y) {
            normalized.y = y;
        }
        flags.set(x, y, 1);

        this.normalizePosition(x, y+1, normalized, flags);
        this.normalizePosition(x, y-1, normalized, flags);
        this.normalizePosition(x+1, y, normalized, flags);
        this.normalizePosition(x-1, y, normalized, flags);

        return normalized;
    }
    
    completed() {
        for (let i = 0, len = this.puzzle.length; i < len; ++i) {
            if (this.puzzle[i] === CODE['+'] || this.puzzle[i] === CODE['.']) {
                return false;
            }
        }
        return true;
    }

    move(dx, dy) {
        let nx = this.x+dx;
        let ny = this.y+dy;
        let ch = this._get(this.x, this.y);
        let nch = this._get(nx, ny);


        if (nch in PLAYER_SET) {
            // clear current player position
            this._set(this.x, this.y, PLAYER_CLEAR[ch]);
            // set new player position
            this._set(nx, ny, PLAYER_SET[nch]);
            this.x = nx;
            this.y = ny;
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
                return true;
            }
        }
        return false;
    }

    toString() {
        let str = '';
        for (let j = 0; j < this.h; ++j) {
            let idx = j*this.w;
            let arr = this.puzzle.slice(idx, idx+this.w);
            if (j > 0) { str += '\r\n'; }
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
}
