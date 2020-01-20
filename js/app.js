import Sokoban from './Sokoban.js';
import SokobanView from './SokobanView.js';

function main() {
    const elPuzzle = document.getElementById('puzzle');

    let puzzle = new Sokoban(
`   ####
####  #
#  #  #
# . . #
# @$$ #
# # ###
#   #
#####`
    );
    let view = new SokobanView(elPuzzle, puzzle);

    window.addEventListener('keydown', function (evt) {
        if (evt.keyCode === 37) { // left
            puzzle.move(-1, 0);
        }
        else if (evt.keyCode === 38) { // up
            puzzle.move(0, -1);
        }
        else if (evt.keyCode === 39) { // right
            puzzle.move(1, 0);
        }
        else if (evt.keyCode === 40) { // down
            puzzle.move(0, 1);
        }
        else if (evt.keyCode === 85) {
            puzzle.undo();
        }
        view.update();
    });
}

main();
