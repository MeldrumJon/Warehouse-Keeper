// Constants for map
export const MEMPTY = 0x0;
export const MWALL = 0x1;
export const MGOAL = 0x2;
export const MFLOOR = 0x4;
export const MWATER = 0x8;
export const C2MAP = Object.freeze({
    '\\': MEMPTY,
    '#': MWALL,
    '@': MFLOOR,
    '+': MGOAL,
    '$': MFLOOR,
    '*': MGOAL,
    '.': MGOAL,
    ' ': MFLOOR,
    '~': MWATER
});

export const DMS = Object.freeze(['u', 'd', 'l', 'r']);
export const DXS = Object.freeze([0,  0, -1, 1]);
export const DYS = Object.freeze([-1, 1,  0, 0]);

export const DDIRS = ['u', 'l', '', 'r', 'd'];
export function _DIR(dx, dy) {
    const i = dy*2 + dx + 2;
    return DDIRS[i];
}

export const PUSH_SHIFT = 30;
export const PUSH_UP = 0x0 << PUSH_SHIFT;
export const PUSH_DOWN = 0x1 << PUSH_SHIFT;
export const PUSH_LEFT = 0x2 << PUSH_SHIFT;
export const PUSH_RIGHT = 0x3 << PUSH_SHIFT;
export const PUSH_IDX_MASK = ~(PUSH_RIGHT);
export const PUSH_DIRS = Object.freeze([PUSH_UP, PUSH_DOWN, PUSH_LEFT, PUSH_RIGHT]);

