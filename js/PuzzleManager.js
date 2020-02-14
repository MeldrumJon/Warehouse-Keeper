import builtInPuzzles from './builtInPuzzles.js';

export default class PuzzleManager {
    _sort() {
        this.collections.sort(function(a, b) {
            return a.t < b.t; // sort by title
        });
    }

    _updateDOM() {
        this.elementUL.innerHTML = '';
        for (let i = 0, len = this.collections.length; i < len; ++i) {
            const c = this.collections[i];

            const cItem = document.createElement('li');
            cItem.classList.add('hide'); // hide by default
            cItem.innerHTML = '<span class="pack"><span class="title">' + c.t + '</span><span class="author">' + c.a + '</span></span>';
            this.DOMItems[c.t] = {};
            this.DOMItems[c.t].titleLI = cItem;
            this.DOMItems[c.t].puzzlesLI = []; // List items for this collection

            const pList = document.createElement('ul');
            pList.classList.add('puzzles');
            for (let j = 0; j < c.p.length; ++j) {
                const p = c.p[j];

                const pItem = document.createElement('li');
                pItem.innerHTML = p.t;
                pItem.SokobanIdx = j;
                this.DOMItems[c.t].puzzlesLI[j] = pItem;

                const pStats = document.createElement('span');
                pStats.classList.add('stats');
                let score = this.getScore(c, j);
                if (score) {
                    pItem.classList.add('completed');
                    pStats.append(score.p + ' : ' + score.m);
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
                else if (el.parentNode.SokobanIdx >= 0) {
                    this.select(c, el.parentNode.SokobanIdx);
                }
                else {
                    cItem.classList.toggle('hide');
                }
            }.bind(this);
            cItem.addEventListener('click', cClick);
            this.elementUL.append(cItem);
        }
        return;
    }

    constructor(elementUL) {
        this.elementUL = elementUL;
        this.DOMItems = {}; // keys are collection titles, which contain array of <li> elements corresponding to each puzzle idx

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
            this.userScores = {}; // keys are collection titles, which contain arrays of data corresponding to each puzzle idx
        }
        else {
            this.userScores = JSON.parse(scores);
        }

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
        localStorage.setItem('userPuzzles', JSON.stringify(this.userPuzzles));
        this._sort();
        this._updateDOM();
        return true;
    }

    scoreSelected(pushes, moves) {
        if (!(this.selCollection && this.selIdx >= 0)) {
            return; // nothing selected
        }

        if (!this.userScores[this.selCollection.t]) {
            this.userScores[this.selCollection.t] = [];
        }
        let scoreArray = this.userScores[this.selCollection.t];

        let score;
        if (!scoreArray[this.selIdx]) {
            scoreArray[this.selIdx] = { p: pushes, m: moves };
            score = scoreArray[this.selIdx];
        }
        else {
            score = scoreArray[this.selIdx];
            if (pushes < score.p) { score.p = pushes; }
            if (moves < score.m) { score.m = moves; }
        }
        localStorage.setItem('userScores', JSON.stringify(this.userScores));

        let elLI = this.DOMItems[this.selCollection.t].puzzlesLI[this.selIdx];
        elLI.classList.add('completed');
        let elStats = elLI.children[0]; // span stats
        elStats.innerHTML = score.p + ' : ' + score.m;
    }

    getScore(collection, idx) {
        let stats = this.userScores[collection.t];
        if (stats) {
            return stats[idx];
        }
        else {
            return undefined;
        }
    }

    select(collection, puzzleIdx) {
        if (this.selCollection && this.selIdx >= 0) {
            let elLI = this.DOMItems[this.selCollection.t].puzzlesLI[this.selIdx];
            elLI.classList.remove('selected');
        }
        this.selCollection = collection;
        this.selIdx = puzzleIdx;
        let elLI = this.DOMItems[this.selCollection.t].puzzlesLI[this.selIdx];
        elLI.classList.add('selected');

        if (this.onselect) {
            this.onselect(this.selCollection, this.selIdx);
        }

        localStorage.setItem('lastCollection', collection.t);
        localStorage.setItem('lastIdx', puzzleIdx);
    }

    next() {
        if (!(this.selCollection && this.selIdx >= 0)) {
            return; // nothing selected
        }
        let idx = (this.selIdx + 1) % this.selCollection.p.length;
        this.select(this.selCollection, idx);
    }

    startLastPuzzle() {
        let lastCollection = localStorage.getItem('lastCollection');
        let lastIdx = localStorage.getItem('lastIdx');
        if (lastCollection === null || lastIdx === null) {
            lastCollection = 'Microban'
            lastIdx = '0';
        }
        // get the actual collection object
        let collection;
        for (let i = 0; i < this.collections.length; ++i) {
            if (this.collections[i].t === lastCollection) {
                collection = this.collections[i];
                break;
            }
        }
        let idx = parseInt(lastIdx, 10);

        // Print error if we can't find one
        if (!collection || !(idx >= 0)) {
            console.log('Could not find collection ' + lastCollection
                + 'or idx ' + lastIdx + ' is out of range');
            return;
        }

        this.DOMItems[collection.t].titleLI.classList.remove('hide');
        this.select(collection, idx);
    }
}
