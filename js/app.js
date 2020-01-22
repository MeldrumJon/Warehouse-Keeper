import Sokoban from './Sokoban.js';
import SokoMaze from './SokoMaze.js';
import SokobanView from './SokobanView.js';
import SokoMazeView from './SokoMazeView.js';
import solveSokoban from './SokobanSolver.js';
import solveSokoMaze from './SokoMazeSolver.js';

function main() {
    let puzzle;
    let view;
    const elPuzzle = document.getElementById('puzzle');

    const pText = document.getElementById('ptext');
    const sBtn = document.getElementById('solveBtn');
    const sol = document.getElementById('solution');

    sBtn.addEventListener('click', function(evt) {
        let txt = pText.value;
        puzzle = new SokoMaze(txt);
        console.log(puzzle.toString());
        view = new SokoMazeView(elPuzzle, puzzle);
        sol.innerHTML = solveSokoMaze(puzzle);
    });

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
        view.update();
        console.log('completed:', puzzle.completed());
    });
}

main();
