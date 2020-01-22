import * as S from './consts.js';
import * as bv from './bitVector.js';

const MSRC = Object.freeze({
    0x0: null,
    0x1: 'res/wall.svg',
    0x2: 'res/gs.svg',
    0x4: 'res/floor.svg',
    0x8: 'res/water.svg'
});

export default class SokobanView {
    constructor(element, sokoban) {
        this.element = element;
        this.sokoban = sokoban;

        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.element.append(this.container);

        this.map = document.createElement('div');
        this.map.style.position = 'absolute';
        this.boxes = document.createElement('div');
        let idx = 0;
        for (let j = 0; j < this.sokoban.h; ++j) {
            for (let i = 0; i < this.sokoban.w; ++i, ++idx) {
                let code = sokoban.map[idx];
                let src = MSRC[code];
                if (!src) { continue; }
                let sq = document.createElement('span');
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
                    if (bv.test(sokoban.goalBV, i)) {
                        sq.style.background = 'url("res/boxgs.svg")';
                    }
                    else {
                        sq.style.background = 'url("res/box.svg")';
                    }
                    this.boxes.append(sq);
                }
            }
        }
        this.container.append(this.map);
        this.container.append(this.boxes);

        this.player = document.createElement('span');
        this.player.style.position = 'absolute';
        this.player.style.background = 'url("res/player.svg")';
        this.container.append(this.player);

        this.resize();
    }

    resize() {
        let elW = this.element.clientWidth;
        let elH = this.element.clientHeight;
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
        this.container.style.top = (t < 0) ? 0 : t + 'px';
        this.container.style.left = (l < 0) ? 0 : l + 'px';
    }

    update() {
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
                    if (bv.test(this.sokoban.goalBV, idx)) {
                        sq.style.background = 'url("res/boxgs.svg")';
                    }
                    else {
                        sq.style.background = 'url("res/box.svg")';
                    }
                    sq.style.width = sstr;
                    sq.style.height = sstr;
                    sq.style.top = j*this.scale + 'px';
                    sq.style.left = i * this.scale + 'px';
                    this.boxes.append(sq);
                }
                if (bv.test(this.sokoban.waterBV, idx)) {
                    this.map.children[idx].style.background = 'url("res/waterbox.svg")';
                }
            }
        }
        this.player.style.top = this.sokoban.playerY*this.scale + 'px';
        this.player.style.left = this.sokoban.playerX*this.scale + 'px';
    }
}

