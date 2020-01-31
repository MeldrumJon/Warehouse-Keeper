import * as S from './sokoConsts.js';

const BG_GS = 'url("res/gs.svg")';
const BG_FLOOR = 'url("res/floor.svg")';
const BG_WALL = 'url("res/wall.svg")';

const BG_BOX = 'url("res/box.svg")';
const BG_BOX_GS = 'url("res/boxgs.svg")';

const BG_PLAYER = 'url("res/player.svg")';

const BG_NONE = 'transparent';

const PANIM = ['left 0% ', 'left 50% ', 'left 100% '];
const PDIR = ['top 0%', 'top '+100/3+'%', 'top '+200/3+'%', 'top 100%']; // udlr

export default class SokobanView {
    constructor(element, sokoban) {
        this.element = element;
        this.sokoban = sokoban;

        this.element.innerHTML = '';

        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.element.append(this.container);

        let elMap = document.createElement('div');
        elMap.style.position = 'absolute';
        this.map = new Array(sokoban.K.h);
        this.elBoxes = document.createElement('div');
        this.boxes = new Array(sokoban.K.h);
        for (let idx = 0, j = 0; j < sokoban.K.h; ++j) { // idx init!
            this.map[j] = new Array(sokoban.K.w);
            this.boxes[j] = new Array(sokoban.K.w);
            for (let i = 0; i < sokoban.K.w; ++i, ++idx) { // idx inc!
                let sq = document.createElement('span');
                sq.style.position = 'absolute';
                sq.style.background = 
                    sokoban.K.goalBV.test(idx) ? BG_GS
                    : sokoban.K.floor[idx] ? BG_FLOOR
                    : sokoban.K.floor === null ? BG_NONE
                    : BG_WALL;
                elMap.append(sq);
                this.map[j][i] = sq;

                if (this.sokoban.boxBV.test(idx)) {
                    let sq = document.createElement('span');
                    sq.style.position = 'absolute';
                    sq.style.background =
                        this.sokoban.K.goalBV.test(idx) ? BG_BOX_GS
                        : BG_BOX;
                    this.elBoxes.append(sq);
                    this.boxes[j][i] = sq;
                }
            }
        }
        this.container.append(elMap);
        this.container.append(this.elBoxes);

        this.player = document.createElement('span');
        this.player.style.position = 'absolute';
        this.player.style.background = BG_PLAYER;
        this.player.style.backgroundSize = '300% 400%';
        this.player.style.backgroundPosition = PANIM[0] + PDIR[1];
        this.container.append(this.player);

        this.resize();

        this.animPlayer = [];
        this.animBox = [];
    }

    resize() {
        let elW = this.element.clientWidth;
        let elH = this.element.clientHeight;
        let w = elW / this.sokoban.K.w;
        let h = elH / this.sokoban.K.h;
        let s = (w < h) ? w : h;
        s = (s < 16) ? 16 : (s > 64) ? 64 : ~~(s);
        let sstr = s + 'px';
        for (let j = 0; j < this.sokoban.K.h; ++j) {
            for (let i = 0; i < this.sokoban.K.w; ++i) {
                let sq = this.map[j][i];
                if (sq) {
                    sq.style.width = sstr;
                    sq.style.height = sstr;
                    sq.style.top = j*s + 'px';
                    sq.style.left = i*s + 'px';
                }
                let box = this.boxes[j][i];
                if (box) {
                    box.style.width = sstr;
                    box.style.height = sstr;
                    box.style.top = j*s + 'px';
                    box.style.left = i*s + 'px';
                }
            }
        }
        this.player.style.width = sstr;
        this.player.style.height = sstr;
        this.player.style.top = this.sokoban.playerY*s + 'px';
        this.player.style.left = this.sokoban.playerX*s + 'px';

        this.scale = s;

        let contW = s*this.sokoban.K.w;
        let contH = s*this.sokoban.K.h;
        let t = ~~((elH-contH)/2);
        let l = ~~((elW-contW)/2);
        this.container.style.top = (t < 0) ? 0 : t + 'px';
        this.container.style.left = (l < 0) ? 0 : l + 'px';
    }

    fullUpdate() {
        this.player.style.top = this.sokoban.playerY*this.scale + 'px';
        this.player.style.left = this.sokoban.playerX*this.scale + 'px';
        this.player.style.backgroundPosition = PANIM[0] + PDIR[1];
        
        this.elBoxes.innerHTML = '';

        let sstr = this.scale + 'px';
        for (let idx = 0, j = 0; j < this.sokoban.K.h; ++j) { // idx init!
            for (let i = 0; i < this.sokoban.K.w; ++i, ++idx) { // idx inc!
                if (this.sokoban.boxBV.test(idx)) {
                    let box = document.createElement('span');
                    box.style.position = 'absolute';
                    box.style.background =
                        this.sokoban.K.goalBV.test(idx) ? BG_BOX_GS
                        : BG_BOX;
                    box.style.width = sstr;
                    box.style.height = sstr;
                    box.style.top = j*this.scale + 'px';
                    box.style.left = i*this.scale + 'px';
                    this.elBoxes.append(box);
                    this.boxes[j][i] = box;
                }
                else {
                    this.boxes[j][i] = null;
                }
            }
        }
    }

    _animate(playerObj, boxObj) {
        this.animPlayer.push(playerObj);
        this.animBox.push(boxObj);
        if (this.busy) { return; }

        this.busy = true;
        let animateMove = function() {
            let pObj = this.animPlayer.shift();
            let bObj = this.animBox.shift();

            if (!pObj && !bObj) {
                this.busy = false;
                return;
            }

            let psteps = 16;
            let xpstep = (pObj.ex - parseInt(this.player.style.left, 10))/(psteps);
            let ypstep = (pObj.ey - parseInt(this.player.style.top, 10))/(psteps);
            let animPlayer = function() {
                --psteps;
                if (!psteps) {
                    this.player.style.top = pObj.ey + 'px';
                    this.player.style.left = pObj.ex + 'px';
                    this.player.style.backgroundPosition = PANIM[0] + PDIR[pObj.didx];
                    if (!bObj) animateMove();
                    return;
                }
                let x = parseInt(this.player.style.left, 10) + xpstep;
                let y = parseInt(this.player.style.top, 10) + ypstep;
                this.player.style.backgroundPosition = PANIM[((psteps % 16) < 8) ? 1 : 2] + PDIR[pObj.didx];
                this.player.style.left = x + 'px'
                this.player.style.top = y + 'px';
                requestAnimationFrame(animPlayer);
            }.bind(this);
            requestAnimationFrame(animPlayer);

            if (!bObj) { return; }

            let bsteps = 16;
            let xbstep = (bObj.ex - parseInt(bObj.box.style.left, 10))/bsteps;
            let ybstep = (bObj.ey - parseInt(bObj.box.style.top, 10))/bsteps;
            let animBox = function() {
                --bsteps;
                if (!bsteps) {
                    bObj.box.style.background = bObj.onGoal ? BG_BOX_GS : BG_BOX;
                    bObj.box.style.left = bObj.ex + 'px';
                    bObj.box.style.top = bObj.ey + 'px';
                    animateMove();
                    return;
                }
                let x = parseInt(bObj.box.style.left, 10) + xbstep;
                let y = parseInt(bObj.box.style.top, 10) + ybstep;
                bObj.box.style.left = x + 'px'
                bObj.box.style.top = y + 'px';
                requestAnimationFrame(animBox);
            }.bind(this);
            requestAnimationFrame(animBox);
        }.bind(this);
        animateMove();
    }

    update(movementObj) {
        if (!movementObj) { return; } // no box to move

        // Move player
        let pObj = {
            ex: this.sokoban.playerX*this.scale,
            ey: this.sokoban.playerY*this.scale,
            didx: S.DMS.indexOf(movementObj.direction.toLowerCase())
        };
        

        // Move box
        if (!movementObj.boxStartX) { 
            this._animate(pObj, null);
            return;
        }
        let sx = movementObj.boxStartX;
        let sy = movementObj.boxStartY;
        let ex = movementObj.boxEndX;
        let ey = movementObj.boxEndY;

        let box = this.boxes[sy][sx];
        this.boxes[sy][sx] = null;
        this.boxes[ey][ex] = box;

        let bObj = {
            ex: ex*this.scale,
            ey: ey*this.scale,
            box: box,
            onGoal: this.sokoban.K.goalBV.test(this.sokoban._getIdx(ex, ey))
        };
        this._animate(pObj, bObj);
    }
}
