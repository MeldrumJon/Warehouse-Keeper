export default class BitVector {
    constructor(len) {
        const items = ~~((len + 32 - 1) / 32);
        this.bv = new Int32Array(items);
    }

    static copy(bv) {
        let cp = Object.create(BitVector.prototype);
        cp.bv = new Int32Array(bv.bv);
        return cp;
    }

    set(idx) {
        const item = idx >>> 5;
        const bit = idx & 0x1F;
        this.bv[item] |= (0x1 << bit);
    }

    clear(idx) {
        const item = idx >>> 5;
        const bit = idx & 0x1F;
        this.bv[item] &= ~(0x1 << bit);
    }

    test(idx) {
        const item = idx >>> 5;
        const bit = idx & 0x1F;
        return this.bv[item] & (0x1 << bit);
    }

    fill(value) {
        if (value) { this.bv.fill(~0); }
        else { this.bv.fill(0); }
    }
    
    and(o) {
        const len = this.bv.length;
        for (let i = 0; i < len; ++i) {
            this.bv[i] &= o.bv[i];
        }
    }

    or(o) {
        const len = this.bv.length;
        for (let i = 0; i < len; ++i) {
            this.bv[i] |= o.bv[i];
        }
    }

    xor(o) {
        const len = this.bv.length;
        for (let i = 0; i < len; ++i) {
            this.bv[i] ^= o.bv[i];
        }
    }

    not() {
        const len = this.bv.length;
        for (let i = 0; i < len; ++i) {
            this.bv[i] = ~this.bv[i];
        }
    }

    eq(o) {
        const len = this.bv.length;
        for (let i = 0; i < len; ++i) {
            if (this.bv[i] !== o.bv[i]) { return false; }
        }
        return true;
    }
}

export function runTests() {
    let bv = new BitVector(35);
    bv.set(0);
    bv.set(34);
    console.assert(bv.test(0));
    console.assert(bv.test(34));
    console.assert(!bv.test(5));
    console.assert(!bv.test(33));
    let cv = BitVector.copy(bv);
    bv.clear(34);
    console.assert(!bv.test(34));
    console.assert(cv.test(34));

    bv.fill(true);
    console.assert(bv.test(34));
    console.assert(bv.test(0));
    bv.fill(false);
    console.assert(!bv.test(34));
    console.assert(!bv.test(0));

    let a = new BitVector(36);
    let b = new BitVector(36);
    a.set(0);
    a.set(1);
    a.set(2);
    b.set(3);
    b.set(4);
    b.set(5);
    a.or(b);
    console.assert(a.test(0));
    console.assert(a.test(5));

    a = new BitVector(36);
    b = new BitVector(36);
    a.set(0);
    a.set(1);
    a.set(2);
    b.set(3);
    b.set(4);
    b.set(5);
    a.and(b);
    console.assert(!a.test(0));
    console.assert(!a.test(5));

    a = new BitVector(36);
    b = new BitVector(36);
    a.set(0);
    a.set(1);
    b.set(1);
    b.set(2);
    a.xor(b);
    console.assert(a.test(0));
    console.assert(!a.test(1));

    a = new BitVector(36);
    a.set(1);
    a.not();
    console.assert(a.test(35));
    console.assert(!a.test(1));
}
