import Sokoban from './Sokoban.js';
import SokoMaze from './SokoMaze.js';
import solve from './SokobanSolver.js';
import SokobanView from './SokobanView.js';
import SokoMazeView from './SokoMazeView.js';

function main() {
    const elPuzzle = document.getElementById('puzzle');

    let puzzle = new SokoMaze(
`~~~~~~~~~~~
~#########~
~# $      ~
.$$~~$  @ ~
~# $~~$   ~
~#  $$    ~
~#########~
~~~~~~~~~~~`
    );
    let view = new SokoMazeView(elPuzzle, puzzle);
    //console.log(solve(puzzle));

    window.addEventListener('keydown', function (evt) {
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
    });
}

main();
