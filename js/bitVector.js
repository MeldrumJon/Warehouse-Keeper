export function create(len) {
    const items = ~~((len + 32 - 1) / 32);
    return new Int32Array(items);
}

export function copy(bv) {
    return new Int32Array(bv);
}

export function set(bv, idx) {
    const item = idx >>> 5;
    const bit = idx & 0x1F;
    bv[item] |= (0x1 << bit);
}

export function clear(bv, idx) {
    const item = idx >>> 5;
    const bit = idx & 0x1F;
    bv[item] &= ~(0x1 << bit);
}

export function test(bv, idx) {
    const item = idx >>> 5;
    const bit = idx & 0x1F;
    return bv[item] & (0x1 << bit);
}

export function fill(bv, value) {
    if (value) {
        bv.fill(~0);
    }
    else {
        bv.fill(0);
    }
}

export function runTests() {
    let bv = create(35);
    set(bv, 0);
    set(bv, 34);
    console.assert(test(bv, 0));
    console.assert(test(bv, 34));
    console.assert(!test(bv, 5));
    console.assert(!test(bv, 33));
    let cv = copy(bv);
    clear(bv, 34);
    console.assert(!test(bv, 34));
    console.assert(test(cv, 34));

    fill(bv, true);
    console.assert(test(bv, 34));
    console.assert(test(bv, 0));
    fill(bv, false);
    console.assert(!test(bv, 34));
    console.assert(!test(bv, 0));
}
