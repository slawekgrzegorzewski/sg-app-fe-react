import {Cube} from './cube';

function createCubeWithoutWebGl(layers: number): Cube {
    const cube = Object.create(Cube.prototype) as Cube;
    cube.layers = layers;
    cube.stickers = Array.from({length: layers * layers * 6}, (_, index) => index);
    cube.affectedStickers = [];
    cube.animationQueue = [];
    return cube;
}

describe('numbered cube wide moves', () => {
    it.each(['3Rw', '3Uw', '3Fw', '3Lw', '3Dw', '3Bw'])('performs and reverses %s', move => {
        const cube = createCubeWithoutWebGl(7);
        const solvedStickers = [...cube.stickers];

        cube.performMove(move, true);
        expect(cube.stickers).not.toEqual(solvedStickers);

        cube.performMove(`${move}'`, true);
        expect(cube.stickers).toEqual(solvedStickers);
    });

    it('supports double numbered wide moves', () => {
        const doubleTurnCube = createCubeWithoutWebGl(7);
        const twoTurnsCube = createCubeWithoutWebGl(7);

        doubleTurnCube.performMove('3Rw2', true);
        twoTurnsCube.performMove('3Rw', true);
        twoTurnsCube.performMove('3Rw', true);

        expect(doubleTurnCube.stickers).toEqual(twoTurnsCube.stickers);
    });
});
