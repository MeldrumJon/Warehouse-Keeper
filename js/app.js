import builtInPuzzles from './builtInPuzzles.js';
import PuzzleManager from './PuzzleManager.js';
import Sokoban from './Sokoban.js';
import SokobanView from './SokobanView.js';

// Elements
const elBody = document.getElementById('warehouse_keeper_game');

const elPuzzle = document.getElementById('puzzle');
const elCollections = document.getElementById('collections');

const elBtnToggleList = document.getElementById('btnToggleList');

const elPTitle = document.getElementById('ptitle');
const elPAuth = document.getElementById('pauth');

// Game
let puzzle;
let view;

let pm = new PuzzleManager(elCollections);
pm.onselect = function (collection, puzzleIdx) {
    let p = collection.p[puzzleIdx];
    puzzle = new Sokoban(p.s);
    view = new SokobanView(elPuzzle, puzzle);

    if (p.auth) {
        elPAuth.innerHTML = p.a;
    }
    else {
        elPAuth.innerHTML = collection.a;
    }

    elPTitle.innerHTML = collection.t;
    if (p.t) {
        elPTitle.innerHTML += ' - ' + p.t;
    }
    else {
        elPTitle.innerHTML += ' #' + puzzleIdx;
    }
};
elBtnToggleList.addEventListener('click', function () {
    elBody.classList.toggle('hideList');
    view.resize();
});

window.addEventListener('resize', function () {
    if (view) {
        view.resize();
    }
});

window.addEventListener('keydown', function (evt) {
    if (!puzzle) {
        return;
    }
    let kc = evt.keyCode;
    let k = evt.key.toLowerCase();
    let mObj;
    if (kc === 37 || k === 's' || k === 'h') { // left
        mObj = puzzle.move('l');
        view.update(mObj);
        evt.preventDefault();
    }
    else if (kc === 38 || k === 'e' || k === 'k') { // up
        mObj = puzzle.move('u');
        view.update(mObj);
        evt.preventDefault();
    }
    else if (kc === 39 || k === 'f' || k === 'l') { // right
        mObj = puzzle.move('r');
        view.update(mObj);
        evt.preventDefault();
    }
    else if (kc === 40 || k === 'd' || k === 'j') { // down
        mObj = puzzle.move('d');
        view.update(mObj);
        evt.preventDefault();
    }
    else if (k === 'u') { // undo
        puzzle.undo();
        view.fullUpdate();
    }
    else if (k === 'r') { // restart
        puzzle.restart();
        view.fullUpdate();
    }
    if (puzzle.completed()) {
        pm.scoreSelected(puzzle.numPushes(), puzzle.numMoves());
    }
});

function play(puzzleObj) {
    puzzle = new Sokoban(puzzleObj.s);
    view = new SokobanView(elPuzzle, puzzle);
}

