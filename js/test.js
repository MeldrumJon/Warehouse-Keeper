import {runTests as PCG32} from './PCG32.js';
import {runTests as BitVector} from './BitVector.js';
import {runTests as TranspositionTable} from './TranspositionTable.js';
import {runTests as strings} from './strings.js';
import {runTests as Sokoban} from './Sokoban.js';
//import {runTests as sokobanSolver} from './sokobanSolver.js';

function tests() {
    PCG32();
    BitVector();
    TranspositionTable();
    strings();
    Sokoban();
    //sokobanSolver();
}

tests();

