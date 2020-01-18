import PCG32 from './PCG32.js';

export default class Zobrist {
    constructor(width, height) {
        this.w = width;
        const totalLength = width*height;

        this.BOXH = new Int32Array(totalLength);
        this.BOXL = new Int32Array(totalLength);
        this.PLAYERH = new Int32Array(totalLength);
        this.PLAYERL = new Int32Array(totalLength);

        const SEED = 1575579901796n;
        const rng = new PCG32(SEED);

        for (let i = 0; i < totalLength; ++i) {
            this.BOXH[i] = rng.rand();
            this.BOXL[i] = rng.rand();
            this.PLAYERH[i] = rng.rand();
            this.PLAYERL[i] = rng.rand();
        }
    }

    box(x, y) {
        let i = y * this.w + x;
        return [this.BOXL[i], this.BOXH[i]];
    }

    player(x, y) {
        let i = y * this.w + x;
        return [this.PLAYERL[i], this.PLAYERH[i]];
    }
}
