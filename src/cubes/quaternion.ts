export type CubeQuaternion = {x: number; y: number; z: number; w: number};

export function multiplyQuaternions(left: CubeQuaternion, right: CubeQuaternion): CubeQuaternion {
    return {
        w: left.w * right.w - left.x * right.x - left.y * right.y - left.z * right.z,
        x: left.w * right.x + left.x * right.w + left.y * right.z - left.z * right.y,
        y: left.w * right.y - left.x * right.z + left.y * right.w + left.z * right.x,
        z: left.w * right.z + left.x * right.y - left.y * right.x + left.z * right.w,
    };
}

export function conjugateQuaternion({w, x, y, z}: CubeQuaternion): CubeQuaternion {
    return {w, x: -x, y: -y, z: -z};
}

export function negateQuaternion({w, x, y, z}: CubeQuaternion): CubeQuaternion {
    return {w: -w, x: -x, y: -y, z: -z};
}
