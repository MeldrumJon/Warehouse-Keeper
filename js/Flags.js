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
}

export function test() {
    let f = new Flags(2, 2);
    f.set(1, 0, 5);
    f.set(1, 1, 7);
    console.assert(f.get(0, 0) === 0);
    console.assert(f.get(1, 0) === 5);
    console.assert(f.get(1, 1) === 7);
}
