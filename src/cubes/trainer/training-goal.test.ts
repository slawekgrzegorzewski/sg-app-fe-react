import {CfopStage} from '../../types';
import {applyCubeMove, scrambleStates, SOLVED_CUBE} from '../smart-cube-state';
import {CROSS_FACES, trainingGoalReached} from './training-goal';

test.each(CROSS_FACES)('rozpoznaje krzyż %s niezależnie od obrotu przeciwnej ścianki', face => {
    const opposite = ({D: 'U', U: 'D', R: 'L', L: 'R', F: 'B', B: 'F'} as const)[face];
    const state = applyCubeMove(SOLVED_CUBE, opposite);
    expect(trainingGoalReached(state, CfopStage.Cross, face)).toBe(true);
    expect(trainingGoalReached(state, CfopStage.F2L, face)).toBe(true);
    expect(trainingGoalReached(state, CfopStage.Oll, face)).toBe(true);
    expect(trainingGoalReached(state, CfopStage.Pll, face)).toBe(false);
    expect(trainingGoalReached(applyCubeMove(SOLVED_CUBE, face), CfopStage.Cross, face)).toBe(false);
});

test('rozróżnia brakującą parę F2L, nieułożony OLL i PLL', () => {
    const after = (alg: string) => {
        const states = scrambleStates(alg);
        return states[states.length - 1];
    };
    const f2lCase = after("R U R'");
    expect(trainingGoalReached(f2lCase, CfopStage.Cross, 'D')).toBe(true);
    expect(trainingGoalReached(f2lCase, CfopStage.F2L, 'D')).toBe(false);
    const ollCase = after("R U R' U R U2 R'");
    expect(trainingGoalReached(ollCase, CfopStage.F2L, 'D')).toBe(true);
    expect(trainingGoalReached(ollCase, CfopStage.Oll, 'D')).toBe(false);
    expect(trainingGoalReached(SOLVED_CUBE, CfopStage.Pll, 'D')).toBe(true);
});
