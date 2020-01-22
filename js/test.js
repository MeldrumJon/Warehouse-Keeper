import {runTests as PCG32} from './PCG32.js';
import {runTests as bitVector} from './bitVector.js';
import {runTests as TranspositionTable} from './TranspositionTable.js';
import {runTests as Sokoban} from './Sokoban.js';
import {runTests as sokobanSolver} from './sokobanSolver.js';
import {runTests as SokoMaze} from './SokoMaze.js';
import {runTests as sokoMazeSolver} from './sokoMazeSolver.js';

function tests() {
    bitVector();
    PCG32();
    TranspositionTable();
    Sokoban();
    sokobanSolver();
    SokoMaze();
    sokoMazeSolver();
}

tests();
