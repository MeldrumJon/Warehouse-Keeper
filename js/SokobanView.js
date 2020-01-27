import * as S from './sokoConsts.js';

export default class SokobanView {
    constructor(element, sokoban) {
        this.element = element;
        this.sokoban = sokoban;

        this.element.innerHTML = '';

        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.element.append(this.container);

        this.map = document.createElement('div');
        this.boxes = document.createElement('div');
        this.map.style.position = 'absolute';
        for (let idx = 0, j = 0; j < sokoban.K.h; ++j) { // idx init!
            for (let i = 0; i < sokoban.K.w; ++i, ++idx) { // idx inc!
                let bg = sokoban.K.goalBV.test(idx) ? 'res/gs.svg'
                       : sokoban.K.floor[idx] ? 'res/floor.svg'
                       : 'res/wall.svg';
                let sq = document.createElement('span');
                sq.style.position = 'absolute';
                sq.SokX = i;
                sq.SokY = j;
                sq.style.background = 'url("'+bg+'")';
                this.map.append(sq);

                if (this.sokoban.boxBV.test(idx)) {
                    let bg = this.sokoban.K.goalBV.test(idx) ? 'res/boxgs.svg'
                           : 'res/box.svg';
                    let sq = document.createElement('span');
                    sq.style.position = 'absolute';
                    sq.SokX = i;
                    sq.SokY = j;
                    sq.style.background = 'url("'+bg+'")';
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
        let w = elW / this.sokoban.K.w;
        let h = elH / this.sokoban.K.h;
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

        let contW = s*this.sokoban.K.w;
        let contH = s*this.sokoban.K.h;
        let t = ~~((elH-contH)/2);
        let l = ~~((elW-contW)/2);
        this.container.style.top = (t < 0) ? 0 : t + 'px';
        this.container.style.left = (l < 0) ? 0 : l + 'px';
    }

    update() {
        this.boxes.innerHTML = '';

        const sstr = this.scale + 'px';
        let idx = 0;
        for (let j = 0; j < this.sokoban.K.h; ++j) {
            for (let i = 0; i < this.sokoban.K.w; ++i, ++idx) {
                if (this.sokoban.boxBV.test(idx)) {
                    let bg = this.sokoban.K.goalBV.test(idx) ? 'res/boxgs.svg'
                           : 'res/box.svg';
                    let sq = document.createElement('span');
                    sq.style.position = 'absolute';
                    sq.SokX = i;
                    sq.SokY = j;
                    sq.style.background = 'url("'+bg+'")';
                    sq.style.width = sstr;
                    sq.style.height = sstr;
                    sq.style.top = j*this.scale + 'px';
                    sq.style.left = i * this.scale + 'px';
                    this.boxes.append(sq);
                }
            }
        }
        this.player.style.top = this.sokoban.playerY*this.scale + 'px';
        this.player.style.left = this.sokoban.playerX*this.scale + 'px';
    }
}
