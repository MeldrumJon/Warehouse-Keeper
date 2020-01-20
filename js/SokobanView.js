const MEMPTY = 0;
const MWALL = 1;
const MGOAL = 2;
const MFLOOR = 3;

const MSRC = Object.freeze([
    null,
    'res/wall.svg',
    'res/gs.svg',
    'res/floor.svg'
]);

export default class SokobanView {
    constructor(element, sokoban) {
        this.element = element;
        this.sokoban = sokoban;

        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.element.append(this.container);

        this.map = document.createElement('div');
        this.map.style.position = 'absolute';
        let idx = 0;
        for (let j = 0; j < sokoban.h; ++j) {
            for (let i = 0; i < sokoban.w; ++i, ++idx) {
                let code = sokoban.map[idx];
                let src = MSRC[code];
                if (!src) { continue; }
                let sq = document.createElement('span');
                sq.style.position = 'absolute';
                sq.SokX = i;
                sq.SokY = j;
                sq.style.background = 'url("'+src+'")';
                this.map.append(sq);
            }
        }
        this.container.append(this.map);

        this.boxXs = this.sokoban.boxXs;
        this.boxYs = this.sokoban.boxYs;
        this.boxes = new Array(this.sokoban.boxXs.length);
        for (let i = 0; i < this.boxes.length; ++i) {
            let sq = document.createElement('span');
            sq.style.position = 'absolute';
            let x = this.boxXs[i];
            let y = this.boxYs[i];
            if (this.sokoban._hasGoal(x, y)) {
                sq.style.background = 'url("res/boxgs.svg")';
            }
            else {
                sq.style.background = 'url("res/box.svg")';
            }
            this.container.append(sq);
            this.boxes[i] = sq;
        }

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
        let bXs = this.sokoban.boxXs;
        let bYs = this.sokoban.boxYs;
        for (let i = 0; i < this.boxes.length; ++i) {
            let x = bXs[i];
            let y = bYs[i];
            let box = this.boxes[i];
            box.style.width = sstr;
            box.style.height = sstr;
            box.style.top = bYs[i]*s + 'px';
            box.style.left = bXs[i]*s + 'px';
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
        let bXs = this.sokoban.boxXs;
        let bYs = this.sokoban.boxYs;
        for (let i = 0; i < bXs.length; ++i) {
            let x = bXs[i];
            let y = bYs[i];
            let box = this.boxes[i];
            if (this.sokoban._hasGoal(x, y)) {
                box.style.background = 'url("res/boxgs.svg")';
            }
            else {
                box.style.background = 'url("res/box.svg")';
            }
            box.style.top = y*this.scale + 'px';
            box.style.left = x*this.scale + 'px';
        }
        this.player.style.top = this.sokoban.playerY*this.scale + 'px';
        this.player.style.left = this.sokoban.playerX*this.scale + 'px';
    }
}
