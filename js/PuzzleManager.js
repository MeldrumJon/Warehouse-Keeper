import builtInPuzzles from './builtInPuzzles.js';

export default class PuzzleManager {
    _sort() {
        this.collections.sort(function(a, b) {
            return a.t < b.t; // sort by title
        });
    }

    _updateDOM() {
        this.ulCollections.innerHTML = '';
        for (let i = 0, len = this.collections.length; i < len; ++i) {
            const c = this.collections[i];

            const cItem = document.createElement('li');
            cItem.classList.add('hide'); // hide by default
            cItem.innerHTML = '<span class="pack"><span class="title">' + c.t + '</span><span class="author">' + c.a + '</span></span>';
            this.DOMItems[c.t] = []; // List items for this collection

            const pList = document.createElement('ul');
            pList.classList.add('puzzles');
            for (let j = 0; j < c.p.length; ++j) {
                const p = c.p[j];

                const pItem = document.createElement('li');
                pItem.innerHTML = p.t;
                pItem.SokobanIdx = j;
                this.DOMItems[c.t][j] = pItem;

                const pStats = document.createElement('span');
                pStats.classList.add('stats');
                if (this.userScores[c.t]) {
                    let score = this.userScores[c.t][j];
                    if (score) {
                        pStats.append(score.p + ' : ' + score.m);
                    }
                }
                pItem.append(pStats);

                pList.append(pItem);
            }
            cItem.append(pList);

            let cClick = function(evt) {
                let el = evt.target;
                if (el.SokobanIdx >= 0) {
                    this.select(c, el.SokobanIdx);
                }
                else {
                    cItem.classList.toggle('hide');
                }
            }.bind(this);
            cItem.addEventListener('click', cClick);
            this.ulCollections.append(cItem);
        }
        return;
    }

    constructor(ulCollections) {
        let additional = localStorage.getItem('userPuzzles');
        if (!additional) {
            this.userPuzzles = [];
        }
        else {
            this.userPuzzles = JSON.parse(additional);
        }

        this.collections = [...builtInPuzzles, ...this.userPuzzles];
        this._sort();

        let scores = localStorage.getItem('userScores');
        if (!scores) {
            this.userScores = {};
        }
        else {
            this.userScores = JSON.parse(scores);
        }

        this.ulCollections = ulCollections;
        this.DOMItems = {};
        this._updateDOM();
    }

    addCollection(collection) {
        for (let i = 0; i < this.collections.length; ++i) {
            if (this.collections[i].t === collection.t) {
                return false; // Don't allow duplicate titles
            }
        }
        this.userPuzzles.push(collection);
        this.collections.push(collection);
        this._sort();
        localStorage.setItem('userPuzzles', JSON.stringify(this.userPuzzles));
        this._updateDOM();
        return true;
    }

    addScore(pushes, moves) {
        if (!this.selectedCol || !(this.selectedIdx >= 0)) {
            return false;
        }
        let obj = this.userScores[this.selectedCol];
        if (!obj) { this.userScores[this.selectedCol] = []; }
        this.userScores[this.selectedCol][this.selectedIdx] = { p: pushes, m: moves };
        localStorage.setItem('userScores', JSON.stringify(this.userScores));

        let elItem = this.DOMItems[this.selectedCol][this.selectedIdx];
        let elStats = elItem.children[0];
        elStats.innerHTML = pushes + ' : ' + moves;
    }

    select(collection, puzzleIdx) {
        if (this.selectedCol && this.selectedIdx >= 0) {
            let elOldItem = this.DOMItems[this.selectedCol][this.selectedIdx];
            elOldItem.classList.remove('selected');
        }

        let elItem = this.DOMItems[collection.t][puzzleIdx];
        elItem.classList.add('selected');

        this.selectedCol = collection.t;
        this.selectedIdx = puzzleIdx;

        if (this.onSelected) {
            this.onSelected(collection, puzzleIdx);
        }
    }

    next() {
        if (!this.DOMItems[this.selectedCol][this.selectedIdx + 1]) {
            return;
        }
    }
}
