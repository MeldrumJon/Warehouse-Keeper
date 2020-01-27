import builtInPuzzles from './builtInPuzzles.js';
import Sokoban from './Sokoban.js';
import SokobanView from './SokobanView.js';

// Elements
const elPuzzle = document.getElementById('puzzle');
const elPuzzleList = document.getElementById('puzzleList');

// Game
let puzzle;
let view;

window.addEventListener('keydown', function (evt) {
    if (!puzzle) {
        return;
    }
    if (evt.keyCode === 37) { // left
        puzzle.move('l');
    }
    else if (evt.keyCode === 38) { // up
        puzzle.move('u');
    }
    else if (evt.keyCode === 39) { // right
        puzzle.move('r');
    }
    else if (evt.keyCode === 40) { // down
        puzzle.move('d');
    }
    else if (evt.keyCode === 85) {
        puzzle.undo();
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

function updatePuzzleList() {
    let collections = [...builtInPuzzles, ...userPuzzles];
    collections.sort(function(a, b) {
        return a.t < b.t; // sort by title
    });

    elPuzzleList.innerHTML = '';

    let cList = document.createElement('ul');
    for (let i = 0, len = collections.length; i < len; ++i) {
        let c = collections[i];
        let cItem = document.createElement('li');
        cItem.append(c.t + ' by ' + c.a);
        let pList = document.createElement('ul');
        for (let j = 0; j < c.p.length; ++j) {
            let p = c.p[j];
            let pItem = document.createElement('li');
            pItem.SokobanIdx = j;
            pItem.append(p.t);
            pList.append(pItem);
        }
        cItem.append(pList);
        cList.append(cItem);
        cItem.addEventListener('click', function(evt) {
            let el = evt.target;
            if (el.SokobanIdx >= 0) {
                play(c.p[el.SokobanIdx]);
            }
            else {
                cItem.classList.toggle('hide');
            }
        });
    }
    elPuzzleList.append(cList);
}
updatePuzzleList();

