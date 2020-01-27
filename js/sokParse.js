import * as str from './strings.js';

export default function sokParse(ftext) {
    let lines = ftext.split(/\r?\n/);

    let notes = [[]];
    let puzzles = [null]; // notes[0] is file header
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
                if (str.isBoardLine(line)) { // new puzzle
                    if (potentialTitle) {
                        // Puzzle notes never gave title, so the potential title
                        // is probably the title.
                        titles[idx] = potentialTitle; // title for puzzle
                        potentialTitle = null;
                    }
                    let lastLine = noteBuf[noteBuf.length-1];
                    if (str.isBlankLine(lastLine)) {
                        noteBuf.pop();
                    }
                    lastLine = noteBuf[noteBuf.length-1];
                    let secondLastLine = noteBuf[noteBuf.length-2];
                    if (lastLine && !str.isBlankLine(lastLine)
                        && (!secondLastLine || str.isBlankLine(secondLastLine))
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
                    if (!str.isBoardLine(line)) {
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
        t: null, // collections ought to have title and author, so they are defined
        a: null,
        p: []
    };

    let fileHeader = notes[0];
    for (let l = 0; l < fileHeader.length; ++l) {
        let line = fileHeader[l];
        const nameRegex = /^Collection\s*:\s*/i;
        if (nameRegex.test(line)) {
            collection.t = line.replace(nameRegex, '');
        }
        const authorRegex = /^Author\s*:\s*/i;
        if (authorRegex.test(line)) {
            collection.a = line.replace(authorRegex, '');
        }
    }

    for (let i = 1; i < puzzles.length; ++i) {
        let puzzle = {
            s: ''
        };

        if (titles[i]) {
            const xsbRegex = /^;\s*/;
            if (xsbRegex.test(titles[i])) {
                puzzle.t = titles[i].replace(xsbRegex, '');
            }
            else {
                puzzle.t = titles[i];
            }
        }

        let puzzleLines = puzzles[i];
        for (let l = 0; l < puzzleLines.length; ++l) {
            if (l) { puzzle.s += '|'; }
            let line = puzzleLines[l];
            // standardize board
            line = line.replace(/p/g, '@');
            line = line.replace(/P/g, '+');
            line = line.replace(/b/g, '$');
            line = line.replace(/B/g, '*');
            line = line.replace(/-/g, ' ');
            line = line.replace(/_/g, ' ');
            line = line.replace(/w/g, '~');
            line = str.rleDecode(line);
            line = line.replace(/|$/g, ''); // ignore | if at the end of line
            puzzle.s += line;
        }
        puzzle.s = str.rleEncode(puzzle.s); // compress puzzle for storage
        
        let noteLines = notes[i];
        for (let l = 0; l < noteLines.length; ++l) {
            let line = noteLines[l];
            const titleRegex = /^Title\s*:\s*/i;
            if (titleRegex.test(line)) {
                puzzle.t = line.replace(titleRegex, '');
            }
            const authorRegex = /^Author\s*:\s*/i;
            if (authorRegex.test(line)) {
                puzzle.a = line.replace(authorRegex, '');
            }
        }

        collection.p.push(puzzle);
    }
    return collection;
}

