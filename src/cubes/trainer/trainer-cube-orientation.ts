import type {CubeFace} from '../cube-pieces';

export const TRAINER_CUBE_ORIENTATION = 'z2';
export const TRAINER_DEVICE_CROSS_FACE: CubeFace = 'U';

export function trainerScrambleInDeviceFrame(scramble: string): string {
    return `${TRAINER_CUBE_ORIENTATION} ${scramble} ${TRAINER_CUBE_ORIENTATION}`;
}

export const TRAINER_FACE_COLORS: Record<CubeFace, string> = {
    U: '#fdd835',
    R: '#fb8c00',
    F: '#43a047',
    D: '#ffffff',
    L: '#e53935',
    B: '#1e88e5',
};
