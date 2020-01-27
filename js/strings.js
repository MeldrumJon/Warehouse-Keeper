export function isBoardLine(line) {
    const sokobanRegex = /^[- _#@+pP$*bB.0-9()|]+$/;
    if (sokobanRegex.test(line) && /#/.test(line)) {
        return true;
    }
    else {
        return false;
    }
}

export function isBlankLine(line) {
    return /^\s*$/.test(line);
}

export function rleEncode(str) {
    let result = '';
    const len = str.length;
    let i;
    for (i = 0; i < len; ++i) {
        let count = 1;
        while (str[i] === str[i+1]) {
            ++count;
            ++i;
        }
        if (count > 1) {
            result += (count === 2) ? str[i] + str[i] : count + str[i];
        }
        else {
            result += str[i];
        }
    }
    return result;
}

export function rleDecode(str) {
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

    let r
    r = '#####-#------#-#-#-';
    console.assert(rleDecode(rleEncode(r)) === r);
    r = '#######|#.@-#-#|#$*-$-#|#---$-#|#-..--#|#--*--#|#######';
    console.assert(rleDecode(rleEncode(r)) === r);
    r = '###|#.###|#*$-#|#--@#|#####';
    console.assert(rleDecode(rleEncode(r)) === r);
    r = '###----p.#';
    console.assert(rleDecode(rleEncode(r)) === r);
    r = '#-#-#-##-#-#-#';
    console.assert(rleDecode(rleEncode(r)) === r);
    r = 'abcxyzxyzxyzabcxyzxyzxyz';
    console.assert(rleDecode(rleEncode(r)) === r);
}

