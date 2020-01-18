import {test as PCG32} from './PCG32.js';
import {test as TranspositionTable} from './TranspositionTable.js';
import {test as Flags} from './Flags.js';
import {test as Sokoban} from './Sokoban.js';

function tests() {
    PCG32();
    TranspositionTable();
    Flags();
    Sokoban();
}

tests();
