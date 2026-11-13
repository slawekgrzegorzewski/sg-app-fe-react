import type {CubeQuaternion} from './quaternion';

export function convertGanZUpQuaternionToSceneYUp({x, y, z, w}: CubeQuaternion): CubeQuaternion {
    return {x, y: z, z: -y, w};
}
