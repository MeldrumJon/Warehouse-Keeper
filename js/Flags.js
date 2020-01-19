export default class Flags {
    constructor(width, height) {
        let len = width*height;
        this.a = new Uint8Array(len);
        this.w = width;
    }

    get(x, y) {
        let idx = y * this.w + x;
        return this.a[idx];
    }

    set(x, y, flags) {
        let idx = y * this.w + x;
        this.a[idx] |= flags;
    }

    clear(x, y, flags) {
        let idx = y * this.w + x;
        this.a[idx] &= ~(flags);
    }

    toString() {
        let str = '';
        let h = ~~(this.a.length/this.w);
        for (let j = 0; j < h; ++j) {
            if (j) { str += '\r\n'; }
            for (let i = 0; i < this.w; ++i) {
                if (i) { str += ' '; }
                let idx = j * this.w + i;
                let ns = this.a[idx].toString(16);
                ns = '0'.repeat(2 - ns.length) + ns;
                str += ns;
            }
        }
        return str;
    }
}

export function test() {
    let f = new Flags(2, 2);
    f.set(1, 0, 5);
    f.set(1, 1, 7);
    console.assert(f.get(0, 0) === 0);
    console.assert(f.get(1, 0) === 5);
    console.assert(f.get(1, 1) === 7);
}
