function isBoardLine(line) {
    const sokobanRegex = /^[- _#@+pP$*bB.0-9()|]+$/;
    if (sokobanRegex.test(line) && /#/.test(line)) {
        return true;
    }
    else {
        return false;
    }
}

function isBlankLine(line) {
    return /^\s*$/.test(line);
}

function rleDecode(str) {
    let intStack = [];
    let strStack = [];
    for (let i = 0; i < str.length; ++i) {
        if (/\d/.test(str[i])) { // is digit
            let intStr = '';
            while (/\d/.test(str[i])) {
                // get full number
                intStr += str[i];
                ++i;
            }
            let num = parseInt(intStr, 10);
            if (str[i] === '(') {
                strStack.push(str[i]);
                intStack.push(num);
            }
            else {
                strStack.push(str[i].repeat(num));
            }
        }
        else if (str[i] === ')') {
            let tmp = '';
            let pop = strStack.pop();
            while (pop !== '(') {
                tmp = pop + tmp;
                pop = strStack.pop();
            }
            tmp = tmp.repeat(intStack.pop());
            strStack.push(tmp);
        }
        else if (str[i] === '(') {
            if (/\d/.test(str[i-1])) {
                strStack.push(str[i]);
            }
            else {
                strStack.push(str[i]);
                intStack.push(1);
            }
        }
        else {
            strStack.push(str[i]);
        }
    }

    let result = '';
    while (strStack.length) {
        result = strStack.pop() + result;
    }
    return result;
}

export default function sokParse(ftext) {
    let lines = ftext.split(/\r?\n/);

    let notes = [[]];
    let puzzles = [null]; // first notes are for the file header
    let titles = [null];
    
    let idx = 0;
    let l = 0;
    let potentialTitle = null;
    let state = 'notes';
    while (l < lines.length) {
        let line = lines[l];
        let noteBuf = notes[idx];
        let puzzleBuf = puzzles[idx];
        switch (state) {
            case 'notes':
                if (isBoardLine(line)) { // new puzzle
                    if (potentialTitle) {
                        // Puzzle notes never gave title, so the potential title
                        // is probably the title.
                        titles[idx] = potentialTitle; // title for puzzle
                        potentialTitle = null;
                    }
                    let lastLine = noteBuf[noteBuf.length-1];
                    if (isBlankLine(lastLine)) {
                        noteBuf.pop();
                    }
                    lastLine = noteBuf[noteBuf.length-1];
                    let secondLastLine = noteBuf[noteBuf.length-2];
                    if (lastLine && !isBlankLine(lastLine)
                        && (!secondLastLine || isBlankLine(secondLastLine))
                        && lastLine.indexOf(':') < 0) // not a key-value pair
                    {
                        // An independent line precedes the puzzle,
                        // and it is not a key-value pair,
                        // so it is potentially the puzzle title.
                        potentialTitle = noteBuf.pop();
                    }
                    // New puzzle
                    puzzles.push([]);
                    notes.push([]);
                    ++idx;
                    state = 'puzzle';
                }
                else {
                    if (potentialTitle && /^Title:/i.test(line)) {
                        // The puzzle notes contain a title, so
                        // the potential title probably belongs back in the
                        // previous notes section
                        notes[idx-1].push(potentialTitle);
                        potentialTitle = null;
                    }
                    if (line.indexOf('::') !== 0) {
                        // ignore lines beginning with ::
                        notes[idx].push(line);
                    }
                    ++l;
                }
                break;
            case 'puzzle':
                for (; l < lines.length; ++l) {
                    // keep reading lines until puzzle ends
                    line = lines[l];
                    if (!isBoardLine(line)) {
                        break;
                    }
                    puzzles[idx].push(line);
                }
                state = 'notes';
                break;
        }
    }
    if (potentialTitle) {
        // Puzzle notes never gave title, so the potential title
        // is probably the title.
        titles[idx] = potentialTitle; // title for puzzle
        potentialTitle = null;
    }

    let collection = {
        puzzles: []
    };

    let fileHeader = notes[0];
    for (let l = 0; l < fileHeader.length; ++l) {
        let line = fileHeader[l];
        const nameRegex = /^Collection\s*:\s*/i;
        if (nameRegex.test(line)) {
            collection.name = line.replace(nameRegex, '');
        }
        const authorRegex = /^Author\s*:\s*/i;
        if (authorRegex.test(line)) {
            collection.author = line.replace(authorRegex, '');
        }
    }

    for (let i = 1; i < puzzles.length; ++i) {
        let puzzle = {
            str: ''
        };

        if (titles[i]) {
            const xsbRegex = /^;\s*/;
            if (xsbRegex.test(titles[i])) {
                puzzle.title = titles[i].replace(xsbRegex, '');
            }
            else {
                puzzle.title = titles[i];
            }
        }

        let puzzleLines = puzzles[i];
        for (let l = 0; l < puzzleLines.length; ++l) {
            if (l) { puzzle.str += '\n'; }
            let line = puzzleLines[l];
            // standardize board
            line = line.replace(/p/g, '@');
            line = line.replace(/P/g, '+');
            line = line.replace(/b/g, '$');
            line = line.replace(/B/g, '*');
            line = line.replace(/-/g, ' ');
            line = line.replace(/_/g, ' ');
            line = line.replace(/w/g, '~');
            line = rleDecode(line);
            line = line.replace(/|$/g, ''); // ignore | if at the end of line
            line = line.replace(/\|/g, '\n');
            puzzle.str += line;
        }
        
        let noteLines = notes[i];
        for (let l = 0; l < noteLines.length; ++l) {
            let line = noteLines[l];
            const titleRegex = /^Title\s*:\s*/i;
            if (titleRegex.test(line)) {
                puzzle.title = line.replace(titleRegex, '');
            }
            const authorRegex = /^Author\s*:\s*/i;
            if (authorRegex.test(line)) {
                puzzle.author = line.replace(authorRegex, '');
            }
        }

        collection.puzzles.push(puzzle);
    }
    return collection;
}

export function runTests() {
    console.assert(isBlankLine(''));
    console.assert(isBlankLine('   '));
    console.assert(isBlankLine(' \t  '));
    console.assert(!isBlankLine('a'));

    console.assert(isBoardLine('# .**$@#'));
    console.assert(isBoardLine('# bp #.#'));
    console.assert(isBoardLine('7#|#.@-#-#|#$*-$-#|#3-$-#|#-..--#|#--*--#|7#'));
    console.assert(isBoardLine('2(3(#-)#)'));
    console.assert(!isBoardLine('a'));
    console.assert(!isBoardLine('author'));

    console.assert(
        rleDecode('7#|#.@-#-#|#$*-$-#|#3-$-#|#-..--#|#--*--#|7#')
        ===
        '#######|#.@-#-#|#$*-$-#|#---$-#|#-..--#|#--*--#|#######'
    );
    console.assert(
        rleDecode('3#|#.3#|#*$-#|#--@#|5#')
        ===
        '###|#.###|#*$-#|#--@#|#####'
    );
    console.assert(rleDecode('3#4-p.#') === '###----p.#');
    console.assert(rleDecode('2(3(#(-))#)') === '#-#-#-##-#-#-#');
    console.assert(rleDecode('2(abc3(xyz))') === 'abcxyzxyzxyzabcxyzxyzxyz');
}

