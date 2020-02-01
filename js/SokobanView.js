import * as S from './sokoConsts.js';

const BG_GS = 'url("res/gs.svg")';
const BG_FLOOR = 'url("res/floor.svg")';
const BG_WALL = 'url("res/wall.svg")';

const BG_BOX = 'url("res/box.svg")';
const BG_POS = 'left 0% top 0%';
const BG_POS_GS = 'left 100% top 0%';

const BG_PLAYER = 'url("res/player.svg")';

const BG_NONE = 'transparent';

const PANIM = ['left 0% ', 'left 50% ', 'left 100% '];
const PDIR = ['top 0%', 'top 25%', 'top 50%', 'top 75%']; // udlr

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
                let floor = sokoban.K.floor[idx];
                if (floor !== null) {
                    let sq = document.createElement('span');
                    sq.style.position = 'absolute';
                    if (floor) {
                        sq.style.backgroundImage = sokoban.K.goalBV.test(idx) ? BG_GS : BG_FLOOR;
                    }
                    else {
                        sq.style.backgroundImage = BG_WALL;
                        if (!sokoban._floor(i-1, j)
                            && !sokoban._floor(i-1, j-1)
                            && !sokoban._floor(i, j-1)) { // clear TL corner
                            sq.style.borderTopLeftRadius = '12.3%';
                        }
                        if (!sokoban._floor(i+1, j)
                            && !sokoban._floor(i+1, j-1)
                            && !sokoban._floor(i, j-1)) { // clear TR corner
                            sq.style.borderTopRightRadius = '12.3%';
                        }
                        if (!sokoban._floor(i-1, j)
                            && !sokoban._floor(i-1, j+1)
                            && !sokoban._floor(i, j+1)) { // clear BL corner
                            sq.style.borderBottomLeftRadius = '12.3%';
                        }
                        if (!sokoban._floor(i+1, j)
                            && !sokoban._floor(i+1, j+1)
                            && !sokoban._floor(i, j+1)) { // clear BR corner
                            sq.style.borderBottomRightRadius = '12.3%';
                        }
                    }
                    elMap.append(sq);
                    this.map[j][i] = sq;
                }
                if (this.sokoban.boxBV.test(idx)) {
                    let sq = document.createElement('span');
                    sq.style.position = 'absolute';
                    sq.style.backgroundImage = BG_BOX;
                    sq.style.backgroundSize = '200% 100%';
                    sq.style.backgroundPosition = 
                            this.sokoban.K.goalBV.test(idx) ? BG_POS_GS
                            : BG_POS;
                    this.elBoxes.append(sq);
                    this.boxes[j][i] = sq;
                }
            }
        }
        this.container.append(elMap);
        this.container.append(this.elBoxes);

        this.player = document.createElement('span');
        this.player.style.position = 'absolute';
        this.player.style.backgroundImage = BG_PLAYER;
        this.player.style.backgroundSize = '300% 500%';
        this.player.style.backgroundPosition = PANIM[0] + PDIR[1];
        this.container.append(this.player);

        this.resize();

        this.animSteps = 12;
        this.animPlayer = []; // animation queue
        this.animBox = [];
        this.busy = false;
    }

    resize() {
        this.cancelAnimation = true;

        let elW = this.element.clientWidth;
        let elH = this.element.clientHeight;
        let w = elW / this.sokoban.K.w;
        let h = elH / this.sokoban.K.h;
        let s = (w < h) ? w : h;
        s = (s < 1) ? 1 : (s > 64) ? 64 : ~~(s);
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
                    box.style.backgroundImage = BG_BOX;
                    box.style.backgroundSize = '200% 100%';
                    box.style.backgroundPosition = 
                            this.sokoban.K.goalBV.test(idx) ? BG_POS_GS
                            : BG_POS;
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

    update(movementObj) {
        if (!movementObj) { return; } // no moving information

        // Move player
        let pObj = {
            ex: this.sokoban.playerX,
            ey: this.sokoban.playerY,
            didx: S.DMS.indexOf(movementObj.direction.toLowerCase())
        };
        
        if (!movementObj.boxStartX) { 
            this._animate(pObj, null);
            return;
        }

        // Move box
        let sx = movementObj.boxStartX;
        let sy = movementObj.boxStartY;
        let ex = movementObj.boxEndX;
        let ey = movementObj.boxEndY;

        let box = this.boxes[sy][sx];
        this.boxes[sy][sx] = null;
        this.boxes[ey][ex] = box;

        let bObj = {
            box: box,
            gs: this.sokoban.K.goalBV.test(this.sokoban._getIdx(ex, ey)),
            ex: ex,
            ey: ey
        };
        this._animate(pObj, bObj);
    }

    _animate(playerObj, boxObj) {
        this.animPlayer.push(playerObj);
        this.animBox.push(boxObj);

        const animPlayer = function(didx, ex, ey, callback) {
            let steps = this.animSteps;
            let anim = function() {
                let curx = parseFloat(this.player.style.left, 10);
                let cury = parseFloat(this.player.style.top, 10);
                let endx = ex*this.scale;
                let endy = ey*this.scale;
                let dx = (ex*this.scale - curx)/steps;
                let dy = (ey*this.scale - cury)/steps;

                --steps;
                if (!steps) {
                    this.player.style.left = endx + 'px';
                    this.player.style.top = endy + 'px';
                    this.player.style.backgroundPosition = PANIM[0] + PDIR[didx];
                    if (callback) { callback(); }
                    return;
                }
                else {
                    this.player.style.left = curx+dx + 'px'
                    this.player.style.top = cury+dy + 'px';
                    this.player.style.backgroundPosition = 
                            PANIM[((steps % this.animSteps) < (this.animSteps/2)) ? 1 : 2] + PDIR[didx];
                    requestAnimationFrame(anim)
                }
            }.bind(this);
            requestAnimationFrame(anim)
        }.bind(this);

        const animBox = function(box, gs, ex, ey, callback) {
            let steps = this.animSteps;
            let anim = function() {
                let curx = parseFloat(box.style.left, 10);
                let cury = parseFloat(box.style.top, 10);
                let endx = ex*this.scale;
                let endy = ey*this.scale;
                let dx = (ex*this.scale - curx)/steps;
                let dy = (ey*this.scale - cury)/steps;

                --steps;
                if (!steps) {
                    box.style.left = endx + 'px';
                    box.style.top = endy + 'px';
                    box.style.backgroundPosition = gs ? BG_POS_GS : BG_POS;
                    if (callback) { callback(); }
                    return;
                }
                else {
                    box.style.left = curx+dx + 'px'
                    box.style.top = cury+dy + 'px';
                    requestAnimationFrame(anim)
                }
            }.bind(this);
            requestAnimationFrame(anim)
        }.bind(this);

        if (this.busy) { return; }

        let animate = function () {
            let pObj = this.animPlayer.shift();
            let bObj = this.animBox.shift();

            if (!pObj && !bObj) {
                this.busy = false;
                return;
            }

            if (bObj) {
                animBox(bObj.box, bObj.gs, bObj.ex, bObj.ey);
            }
            animPlayer(pObj.didx, pObj.ex, pObj.ey, animate);
        }.bind(this);

        this.busy = true;
        animate();
    }
}
