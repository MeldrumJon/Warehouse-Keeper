import builtInPuzzles from './builtInPuzzles.js';
import PuzzleManager from './PuzzleManager.js';
import Sokoban from './Sokoban.js';
import SokobanView from './SokobanView.js';
import sokParse from './sokParse.js';

// Elements
const elBody = document.getElementById('warehouse_keeper_game');

const elPuzzle = document.getElementById('puzzle');
const elCollections = document.getElementById('collections');

const elBtnToggleList = document.getElementById('btnToggleList');
const elBtnUndo = document.getElementById('btnUndo');
const elBtnRestart = document.getElementById('btnRestart');
const elChkAnimated = document.getElementById('chkAnimated');

const elPTitle = document.getElementById('ptitle');
const elPAuth = document.getElementById('pauth');

// Gameplay
let puzzle;
let view;

let pm = new PuzzleManager(elCollections);
pm.onselect = function (collection, puzzleIdx) {
    let p = collection.p[puzzleIdx];
    puzzle = new Sokoban(p.s);
    view = new SokobanView(elPuzzle, puzzle);

    view.onanimfin = function() {
        if (puzzle.completed()) {
            window.setTimeout(function () { pm.next(); }, 150);
        }
    }

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

    let mQuery = window.matchMedia('screen and (max-width: 32rem)');
    if (mQuery.matches) {
        elBody.classList.add('hideList');
    }
};

let undo = function() {
    if (!puzzle.completed()) {
        puzzle.undo();
        view.fullUpdate();
    }
};

let restart = function() {
    if (!puzzle.completed()) {
        puzzle.restart();
        view.fullUpdate();
    }
};

window.addEventListener('keydown', function (evt) {
    if (!puzzle || !view) {
        return;
    }
    let kc = evt.keyCode;
    let k = evt.key.toLowerCase();
    if (k === 'u') {
        undo();
        return;
    }
    if (k === 'r') {
        restart();
        return;
    }

    let mObj;
    if (kc === 37 || k === 's' || k === 'h') { // left
        mObj = puzzle.move('l');
    }
    else if (kc === 38 || k === 'e' || k === 'k') { // up
        mObj = puzzle.move('u');
    }
    else if (kc === 39 || k === 'f' || k === 'l') { // right
        mObj = puzzle.move('r');
    }
    else if (kc === 40 || k === 'd' || k === 'j') { // down
        mObj = puzzle.move('d');
    }

    if (mObj) {
        view.update(mObj);
        evt.preventDefault();
        if (puzzle.completed()) {
            pm.scoreSelected(puzzle.numPushes(), puzzle.numMoves());
        }
    }
});

window.addEventListener('resize', function () {
    if (view) {
        view.resize();
    }
});

// UI
elBtnUndo.addEventListener('click', undo);
elBtnRestart.addEventListener('click', restart);

elBtnToggleList.addEventListener('click', function () {
    elBody.classList.toggle('hideList');
    view.resize();
});
elChkAnimated.addEventListener('change', function(evt) {
    SokobanView.setAnimated(elChkAnimated.checked);
});
elChkAnimated.checked = SokobanView.getAnimated();


