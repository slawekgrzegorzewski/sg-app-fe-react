import {convertGanZUpQuaternionToSceneYUp} from './gan-helper';
import {conjugateQuaternion, multiplyQuaternions, negateQuaternion} from './quaternion';
import type {CubeQuaternion} from './quaternion';

export function normalizeGyroQuaternion({x, y, z, w}: CubeQuaternion): CubeQuaternion | null {
    const length = Math.hypot(x, y, z, w);
    if (!Number.isFinite(length) || length < 0.000001) return null;
    return convertGanZUpQuaternionToSceneYUp({x: x / length, y: y / length, z: z / length, w: w / length});
}

export function orientationFromInitialReference(
    initialOrientation: CubeQuaternion,
    currentOrientation: CubeQuaternion
): CubeQuaternion {
    const orientation = multiplyQuaternions(
        conjugateQuaternion(initialOrientation),
        currentOrientation);
    return orientation.w < 0 ? negateQuaternion(orientation) : orientation;
}
