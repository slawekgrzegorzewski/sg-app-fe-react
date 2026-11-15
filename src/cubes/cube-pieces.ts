export const CUBE_FACES = ['U', 'R', 'F', 'D', 'L', 'B'] as const;
export const EDGES = ['UF', 'UR', 'UB', 'UL', 'DF', 'DR', 'DB', 'DL', 'FR', 'FL', 'BR', 'BL'] as const;
export const CORNERS = ['UFR', 'URB', 'UBL', 'ULF', 'DRF', 'DFL', 'DLB', 'DBR'] as const;

export type CubeFace = (typeof CUBE_FACES)[number];
export type Edge = (typeof EDGES)[number];
export type Corner = (typeof CORNERS)[number];
export type CubePiece = Edge | Corner;

export function isCubeFace(value: string): value is CubeFace {
    return CUBE_FACES.some(face => face === value);
}
