import builtInPuzzles from './builtInPuzzles.js';
import Sokoban from './Sokoban.js';
import SokobanView from './SokobanView.js';

// Elements
const elBody = document.getElementById('warehouse_keeper_game');

const elPuzzle = document.getElementById('puzzle');
const elCollections = document.getElementById('collections');

const elBtnToggleList = document.getElementById('btnToggleList');

// Game
let puzzle;
let view;

window.addEventListener('keydown', function (evt) {
    if (!puzzle) {
        return;
    }
    let kc = evt.keyCode;
    let k = evt.key.toLowerCase();
    if (kc === 37 || k === 's' || k === 'h') { // left
        puzzle.move('l');
        evt.preventDefault();
    }
    else if (kc === 38 || k === 'e' || k === 'k') { // up
        puzzle.move('u');
        evt.preventDefault();
    }
    else if (kc === 39 || k === 'f' || k === 'l') { // right
        puzzle.move('r');
        evt.preventDefault();
    }
    else if (kc === 40 || k === 'd' || k === 'j') { // down
        puzzle.move('d');
        evt.preventDefault();
    }
    else if (k === 'u') { // undo
        puzzle.undo();
    }
    else if (k === 'r') { // restart
        puzzle.restart();
    }
    console.log(puzzle.toString());
    if (!view) {
        return;
    }
    view.update();
});

function play(puzzleObj) {
    puzzle = new Sokoban(puzzleObj.s);
    view = new SokobanView(elPuzzle, puzzle);
}

// List of puzzles
let userPuzzles = [];
// TODO: add localStorage puzzles to userCollections array
let userStats = {};

function updatePuzzleList() {
    let collections = [...builtInPuzzles, ...userPuzzles];
    collections.sort(function(a, b) {
        return a.t < b.t; // sort by title
    });

    elCollections.innerHTML = '';

    for (let i = 0, len = collections.length; i < len; ++i) {
        let c = collections[i];
        let cItem = document.createElement('li');
        cItem.classList.add('hide'); // hide by default

        let pack = document.createElement('span');
        pack.classList.add('pack');
        let title = document.createElement('span');
        title.classList.add('title');
        let author = document.createElement('span');
        author.classList.add('author');
        title.append(c.t);
        author.append(c.a);
        pack.append(title);
        pack.append(author);
        cItem.append(pack);

        let pList = document.createElement('ul');
        pList.classList.add('puzzles');
        for (let j = 0; j < c.p.length; ++j) {
            let p = c.p[j];
            let pItem = document.createElement('li');
            pItem.SokobanIdx = j;
            pItem.append(p.t);
            pList.append(pItem);
        }
        cItem.append(pList);
        cItem.addEventListener('click', function(evt) {
            let el = evt.target;
            if (el.SokobanIdx >= 0) {
                play(c.p[el.SokobanIdx]);
            }
            else {
                cItem.classList.toggle('hide');
            }
        });

        elCollections.append(cItem);
    }
}
updatePuzzleList();

elBtnToggleList.addEventListener('click', function () {
    elBody.classList.toggle('hideList');
    view.resize();
});
