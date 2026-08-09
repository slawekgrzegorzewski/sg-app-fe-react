import {scramble} from './cube-scrambler';
import {INSPECTION_ALLOWANCE_MILLIS, isInspection, Phase} from './phase';

const FACES = ['U', 'D', 'F', 'B', 'R', 'L'];
const OPPOSITES: Record<string, string> = {U: 'D', D: 'U', F: 'B', B: 'F', L: 'R', R: 'L'};

describe('scramble', () => {
    it('produces exactly the requested number of turns', () => {
        expect(scramble({turns: 30})).toHaveLength(30);
        expect(scramble({turns: 1})).toHaveLength(1);
    });

    it('produces no turns when asked for none', () => {
        expect(scramble({turns: 0})).toEqual([]);
    });

    it('only emits valid face and variant combinations', () => {
        scramble({turns: 100}).forEach(move => {
            const face = move.charAt(0);
            const variant = move.slice(1);
            expect(FACES).toContain(face);
            expect(['', "'", '2']).toContain(variant);
        });
    });

    /*
     * Two turns of the same face in a row are redundant, and a face is only released for
     * reuse once something other than it or its opposite has been turned. Both rules come
     * from the faceStatuses bookkeeping in the scrambler.
     */
    it('never turns the same face twice in a row', () => {
        for (let attempt = 0; attempt < 20; attempt++) {
            const moves = scramble({turns: 50});
            for (let i = 1; i < moves.length; i++) {
                expect(moves[i].charAt(0)).not.toBe(moves[i - 1].charAt(0));
            }
        }
    });

    it('does not repeat a face while only its opposite has been turned in between', () => {
        for (let attempt = 0; attempt < 20; attempt++) {
            const moves = scramble({turns: 50});
            for (let i = 2; i < moves.length; i++) {
                const face = moves[i].charAt(0);
                const previous = moves[i - 1].charAt(0);
                if (previous === OPPOSITES[face]) {
                    // U D U would be reducible; the scrambler keeps U blocked until an
                    // unrelated face is turned.
                    expect(moves[i - 2].charAt(0)).not.toBe(face);
                }
            }
        }
    });

    it('defaults to 20 turns when no options are given', () => {
        expect(scramble()).toHaveLength(20);
    });

    it('can generate wide turns for larger cubes', () => {
        const randomValues = [0.01, 0.01, 0.01, 0.34, 0.01, 0.01];
        let randomIndex = 0;
        const random = jest.spyOn(Math, 'random').mockImplementation(() => randomValues[randomIndex++ % 6]);

        try {
            expect(scramble({turns: 4, wideMoves: true})).toEqual(['Uw', 'Rw', 'Uw', 'Rw']);
        } finally {
            random.mockRestore();
        }
    });

    it('can generate three-layer wide turns for six- and seven-layer cubes', () => {
        const randomValues = [0.01, 0.01, 0.01, 0.99];
        let randomIndex = 0;
        const random = jest.spyOn(Math, 'random').mockImplementation(() => randomValues[randomIndex++ % 4]);

        try {
            expect(scramble({turns: 1, wideMoves: true, maxWideMoveDepth: 3})).toEqual(['3Uw']);
        } finally {
            random.mockRestore();
        }
    });
});

describe('isInspection', () => {
    it('accepts both inspection phases', () => {
        expect(isInspection('INSPECTION_EARLY')).toBe(true);
        expect(isInspection('INSPECTION_LATE')).toBe(true);
    });

    it('rejects the non-inspection phases', () => {
        expect(isInspection('IDLE')).toBe(false);
        expect(isInspection('SOLVING')).toBe(false);
    });

    it('rejects values that are not phases at all', () => {
        expect(isInspection('')).toBe(false);
        expect(isInspection('inspection_early')).toBe(false);
    });

    it('narrows the type so only inspection phases are assignable', () => {
        const phase: Phase = 'INSPECTION_LATE';
        if (isInspection(phase)) {
            const narrowed: 'INSPECTION_EARLY' | 'INSPECTION_LATE' = phase;
            expect(narrowed).toBe('INSPECTION_LATE');
        } else {
            throw new Error('expected the phase to narrow to an inspection phase');
        }
    });

    it('uses the regulation 15 second inspection allowance', () => {
        expect(INSPECTION_ALLOWANCE_MILLIS).toBe(15000);
    });
});
