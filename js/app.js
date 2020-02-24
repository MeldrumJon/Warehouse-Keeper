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


const elAAdd = document.getElementById('aAdd');

const elBtnCancelParse = document.getElementById('btnCancelParse');
const elBtnCancelVerify = document.getElementById('btnCancelVerify');
const elBtnCancelError = document.getElementById('btnCancelError');

const elBtnParse = document.getElementById('btnParse');
const elBtnVerify = document.getElementById('btnVerify');

const elTACollection = document.getElementById('taCollection');
const elITTitle = document.getElementById('itTitle');
const elITAuthor = document.getElementById('itAuthor');
const elSpanNumPuzzles = document.getElementById('spanNumPuzzles');


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

    if (p.a) {
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

function sokoKeypress(evt) {
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
        evt.preventDefault();
        mObj = puzzle.move('l');
    }
    else if (kc === 38 || k === 'e' || k === 'k') { // up
        evt.preventDefault();
        mObj = puzzle.move('u');
    }
    else if (kc === 39 || k === 'f' || k === 'l') { // right
        evt.preventDefault();
        mObj = puzzle.move('r');
    }
    else if (kc === 40 || k === 'd' || k === 'j') { // down
        evt.preventDefault();
        mObj = puzzle.move('d');
    }

    if (mObj) {
        view.update(mObj);
        if (puzzle.completed()) {
            pm.scoreSelected(puzzle.numPushes(), puzzle.numMoves());
        }
    }
}

window.addEventListener('keydown', sokoKeypress);

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


function clear() {
    elBody.classList.remove('mod_collectionParse');
    elBody.classList.remove('mod_collectionVerify');
    elBody.classList.remove('mod_collectionError');
    elBody.classList.remove('shade');
}

function resume() {
    clear();
    elTACollection.value = '';
    elSpanNumPuzzles.innerHTML = '0';
    elITTitle.value = '';
    elITAuthor.value = '';
    window.addEventListener('keydown', sokoKeypress);
}

elAAdd.addEventListener('click', function() {
    window.removeEventListener('keydown', sokoKeypress);
    elBody.classList.add('shade');
    elBody.classList.add('mod_collectionParse');
});

elBtnCancelParse.addEventListener('click', resume);
elBtnCancelVerify.addEventListener('click', resume);
elBtnCancelError.addEventListener('click', resume);

let col;
elBtnParse.addEventListener('click', function() {
    col = sokParse(elTACollection.value);
    if (!col || !col.p.length) {
        clear();
        elBody.classList.add('shade');
        elBody.classList.add('mod_collectionError');
        return;
    }
    elSpanNumPuzzles.innerHTML = col.p.length;
    elITTitle.value = col.t;
    elITAuthor.value = col.a;
    clear();
    elBody.classList.add('shade');
    elBody.classList.add('mod_collectionVerify');
});

elBtnVerify.addEventListener('click', function() {
    if (!elITTitle.value) {
        elITTitle.classList.add('error');
        return;
    }
    col.t = elITTitle.value;
    col.a = elITAuthor.value;
    let result = pm.addCollection(col);
    if (!result) {
        clear();
        elBody.classList.add('shade');
        elBody.classList.add('mod_collectionError');
        return;
    }
    resume();
});

// Begin
pm.startLastPuzzle();
