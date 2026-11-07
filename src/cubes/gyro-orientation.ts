export type CubeQuaternion = {x: number; y: number; z: number; w: number};

export function normalizeGyroQuaternion({x, y, z, w}: CubeQuaternion): CubeQuaternion | null {
    const length = Math.hypot(x, y, z, w);
    if (!Number.isFinite(length) || length < 0.000001) return null;
    // Map the GAN sensor axes to the axes used by the 3D scene.
    return {x: x / length, y: z / length, z: -y / length, w: w / length};
}

export function relativeGyroQuaternion(basis: CubeQuaternion, current: CubeQuaternion): CubeQuaternion {
    const {x, y, z, w} = basis;
    const b = current;
    // conjugate(basis) × current
    return {
        x: w * b.x - x * b.w - y * b.z + z * b.y,
        y: w * b.y + x * b.z - y * b.w - z * b.x,
        z: w * b.z - x * b.y + y * b.x - z * b.w,
        w: w * b.w + x * b.x + y * b.y + z * b.z,
    };
}
