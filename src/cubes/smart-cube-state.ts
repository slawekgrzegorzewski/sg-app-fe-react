const faces = 'URFDLB';
export const SOLVED_CUBE = [...faces].map(face => face.repeat(9)).join('');

type Vector = [number, number, number];
type Sticker = {position: Vector; normal: Vector};

function sticker(face: string, row: number, col: number): Sticker {
    switch (face) {
        case 'U': return {position: [col - 1, 1, row - 1], normal: [0, 1, 0]};
        case 'R': return {position: [1, 1 - row, 1 - col], normal: [1, 0, 0]};
        case 'F': return {position: [col - 1, 1 - row, 1], normal: [0, 0, 1]};
        case 'D': return {position: [col - 1, -1, 1 - row], normal: [0, -1, 0]};
        case 'L': return {position: [-1, 1 - row, col - 1], normal: [-1, 0, 0]};
        default: return {position: [1 - col, 1 - row, -1], normal: [0, 0, -1]};
    }
}

const stickers = [...faces].flatMap(face => Array.from({length: 9}, (_, i) => sticker(face, Math.floor(i / 3), i % 3)));
const key = (s: Sticker) => [...s.position, ...s.normal].join(',');
const indices = new Map(stickers.map((s, i) => [key(s), i]));

export function faceletIndicesForPiece(piece: string): number[] {
    const normals = [...piece].map(face => sticker(face, 1, 1).normal);
    const position = normals.reduce<Vector>((sum, normal) => [sum[0] + normal[0], sum[1] + normal[1], sum[2] + normal[2]], [0, 0, 0]);
    return normals.map(normal => {
        const index = indices.get(key({position, normal}));
        if (index === undefined) throw new Error('Niepoprawne położenie elementu kostki.');
        return index;
    });
}

function rotate(vector: Vector, axis: number, direction: number): Vector {
    const [x, y, z] = vector;
    if (axis === 0) return [x, -direction * z, direction * y];
    if (axis === 1) return [direction * z, y, -direction * x];
    return [-direction * y, direction * x, z];
}

export function applyCubeMove(facelets: string, move: string): string {
    const match = /^([URFDLB])([2'])?$/.exec(move);
    if (!match || facelets.length !== 54) throw new Error('Nieobsługiwany ruch kostki 3×3.');
    const index = faces.indexOf(match[1]);
    const axis = [1, 0, 2, 1, 0, 2][index];
    const sign = index < 3 ? 1 : -1;
    const turns = match[2] === '2' ? 2 : 1;
    const direction = (match[2] === "'" ? 1 : -1) * sign;
    let current = facelets;
    for (let turn = 0; turn < turns; turn++) {
        const next = [...current];
        for (let i = 0; i < stickers.length; i++) {
            const s = stickers[i];
            if (s.position[axis] !== sign) continue;
            const destination = indices.get(key({position: rotate(s.position, axis, direction), normal: rotate(s.normal, axis, direction)}));
            if (destination === undefined) throw new Error('Niepoprawny stan kostki.');
            next[destination] = current[i];
        }
        current = next.join('');
    }
    return current;
}

export function findCubeMove(before: string, after: string): string | null {
    if (before.length !== 54 || after.length !== 54 || before === after) return null;
    for (const face of faces) {
        for (const suffix of ['', "'", '2']) {
            const move = face + suffix;
            if (applyCubeMove(before, move) === after) return move;
        }
    }
    return null;
}

export function scrambleStates(scramble: string): string[] {
    return scramble.trim().split(/\s+/).filter(Boolean).reduce<string[]>((states, move) => {
        states.push(applyCubeMove(states[states.length - 1], move));
        return states;
    }, [SOLVED_CUBE]);
}
