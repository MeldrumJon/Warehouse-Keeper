import Sokoban from './Sokoban.js';

function main() {
    let puzzle = new Sokoban(
`#### 
# .#  
#  ###
#*@  #
#  $ #
#  ###
####  `
    );
    let sol = Sokoban.solve(puzzle);
    console.log(sol);

    const elGame = document.getElementById('game');
    elGame.innerText = puzzle.toString();
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
        elGame.innerText = puzzle.toString();
                    console.log(puzzle.toString());
    });
}

main();
