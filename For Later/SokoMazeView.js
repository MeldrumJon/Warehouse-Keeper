import * as S from './consts.js';
import * as bv from './bitVector.js';

const MSRC = Object.freeze({
    0x0: 'res/wall.svg',
    0x1: 'res/wall.svg',
    0x2: 'res/gs.svg',
    0x4: 'res/floor.svg',
    0x8: 'res/water.svg',
    0x14: 'res/finish.svg'
});

export default class SokoMazeView {
    constructor(container, sokoban) {
        this.container = container;
        this.sokoban = sokoban;

        this.element = document.createElement('div');
        this.element.style.position = 'absolute';
        this.element.innerHTML = '';
        container.append(this.element);

        this.map = document.createElement('div');
        this.map.style.position = 'absolute';
        this.boxes = document.createElement('div');
        let idx = 0;
        for (let j = 0; j < this.sokoban.h; ++j) {
            for (let i = 0; i < this.sokoban.w; ++i, ++idx) {
                const code = sokoban.map[idx];
                const src = MSRC[code];
                const sq = document.createElement('span');
                sq.style.position = 'absolute';
                sq.SokX = i;
                sq.SokY = j;
                sq.style.background = 'url("'+src+'")';
                this.map.append(sq);

                if (bv.test(this.sokoban.boxBV, idx)) {
                    let sq = document.createElement('span');
                    sq.style.position = 'absolute';
                    sq.SokX = i;
                    sq.SokY = j;
                    sq.style.background = 'url("res/box.svg")';
                    this.boxes.append(sq);
                }
            }
        }
        this.element.append(this.map);
        this.element.append(this.boxes);

        this.player = document.createElement('span');
        this.player.style.position = 'absolute';
        this.player.style.background = 'url("res/player.svg")';
        this.element.append(this.player);

        this.lastBoxBV = this.sokoban.boxBV;
        this.lastPlayerX = this.sokoban.playerX;
        this.lastPlayerY = this.sokoban.playerY;

        this.resize();
    }

    resize() {
        let elW = this.container.clientWidth;
        let elH = this.container.clientHeight;
        let w = elW / this.sokoban.w;
        let h = elH / this.sokoban.h;
        let s = (w < h) ? w : h;
        s = (s < 16) ? 16 : (s > 64) ? 64 : ~~(s);
        let sstr = s + 'px';
        for (let i = 0; i < this.map.children.length; ++i) {
            let sq = this.map.children[i];
            sq.style.width = sstr;
            sq.style.height = sstr;
            sq.style.top = sq.SokY*s + 'px';
            sq.style.left = sq.SokX*s + 'px';
        }
        for (let i = 0; i < this.boxes.children.length; ++i) {
            let sq = this.boxes.children[i];
            sq.style.width = sstr;
            sq.style.height = sstr;
            sq.style.top = sq.SokY*s + 'px';
            sq.style.left = sq.SokX*s + 'px';
        }
        this.player.style.width = sstr;
        this.player.style.height = sstr;
        this.player.style.top = this.sokoban.playerY*s + 'px';
        this.player.style.left = this.sokoban.playerX*s + 'px';

        this.scale = s;
        this.step = s/30; // for animations

        let contW = s*this.sokoban.w;
        let contH = s*this.sokoban.h;
        let t = ~~((elH-contH)/2);
        let l = ~~((elW-contW)/2);
        this.element.style.top = (t < 0) ? 0 : t + 'px';
        this.element.style.left = (l < 0) ? 0 : l + 'px';
    }

    redraw() {
        this.boxes.innerHTML = '';
        const sstr = this.scale + 'px';
        let idx = 0;
        for (let j = 0; j < this.sokoban.h; ++j) {
            for (let i = 0; i < this.sokoban.w; ++i, ++idx) {
                if (bv.test(this.sokoban.boxBV, idx)) {
                    let sq = document.createElement('span');
                    sq.style.position = 'absolute';
                    sq.SokX = i;
                    sq.SokY = j;
                    sq.style.background = 'url("res/box.svg")';
                    sq.style.width = sstr;
                    sq.style.height = sstr;
                    sq.style.top = j*this.scale + 'px';
                    sq.style.left = i * this.scale + 'px';
                    this.boxes.append(sq);
                }
                if (this.sokoban.map[idx] & S.MWATER && bv.test(this.sokoban.waterBV, idx)) {
                    this.map.children[idx].style.background = 'url("res/waterbox.svg")';
                }
                else if (this.sokoban.map[idx] & S.MWATER) {
                    this.map.children[idx].style.background = 'url("res/water.svg")';
                }
            }
        }
        this.player.style.top = this.sokoban.playerY*this.scale + 'px';
        this.player.style.left = this.sokoban.playerX*this.scale + 'px';
    }

    update() {
        this.redraw();
        return;
        this.busy = true;

        let mv = this.sokoban.lastMove();
        let mvLower = mv.toLowerCase();
        if (mv !== mvLower) {
            // move box
            for (let i = 0; i < this.boxes.children.length; ++i) {
                let b = this.boxes.children[i];
                if (b.SokX === this.sokoban.playerX && b.SokY === this.sokoban.playerY) {
                    let dirIdx = S.DMS.indexOf(mv);
                    let dx = S.DXS[dirIdx];
                    let dy = S.DYS[dirIdx];
                    b.SokX += dx;
                    b.SokY += dy;
                    b.style.top = b.SokY*this.scale + 'px';
                    b.style.left = b.SokX*this.scale + 'px';
                }
            }
            // move player
            this.player.style.top = this.sokoban.playerY*this.scale + 'px';
            this.player.style.left = this.sokoban.playerX*this.scale + 'px';
        }
        else {
            // move player
            this.player.style.top = this.sokoban.playerY*this.scale + 'px';
            this.player.style.left = this.sokoban.playerX*this.scale + 'px';
        }

        this.busy = false;
    }
}

