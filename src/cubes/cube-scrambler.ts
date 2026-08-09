export interface ScrambleOptions {
    turns: number;
    wideMoves: boolean;
    maxWideMoveDepth?: number;
}

type FaceStatus = 'movable' | 'not-movable';
type Face = 'U' | 'D' | 'F' | 'B' | 'R' | 'L';
type MoveVariant = '' | "'" | '2';

export const scramble = (options: Partial<ScrambleOptions> = {turns: 20}) => {
    const result: string[] = [];

    const faceStatuses = new Map<Face, FaceStatus>([
        ['U', 'movable'],
        ['D', 'movable'],
        ['F', 'movable'],
        ['B', 'movable'],
        ['R', 'movable'],
        ['L', 'movable'],
    ]);

    function oppositeFace(face: Face): Face {
        switch (face) {
            case 'F':
                return 'B';
            case 'B':
                return 'F';
            case 'U':
                return 'D';
            case 'D':
                return 'U';
            case 'L':
                return 'R';
            case 'R':
                return 'L';
        }
    }

    function drawFaceToMove(): Face | null {
        switch (Math.floor(Math.random() * 6)) {
            case 0:
                return 'U';
            case 1:
                return 'D';
            case 2:
                return 'R';
            case 3:
                return 'L';
            case 4:
                return 'F';
            case 5:
                return 'B';
            default:
                return null;
        }
    }

    function drawMoveVariant(): MoveVariant | null {
        switch (Math.floor(Math.random() * 3)) {
            case 0:
                return '';
            case 1:
                return "'";
            case 2:
                return '2';
            default:
                return null;
        }
    }

    function setAllMovable(except: Face[]) {
        (['U', 'D', 'F', 'B', 'R', 'L'] as Face[])
            .filter(f => !except.includes(f))
            .forEach(face => faceStatuses.set(face, 'movable'));
    }

    while (result.length < (options.turns || 0)) {
        const face = drawFaceToMove();
        const variant = drawMoveVariant();
        if (face === null || variant === null || faceStatuses.get(face) === 'not-movable') {
            continue;
        }
        faceStatuses.set(face, 'not-movable');
        setAllMovable([face, oppositeFace(face)]);
        let move: string = face;
        if (options.wideMoves && Math.random() < 0.5) {
            const maxWideMoveDepth = Math.max(2, options.maxWideMoveDepth ?? 2);
            const depth = maxWideMoveDepth === 2 ? 2 : 2 + Math.floor(Math.random() * (maxWideMoveDepth - 1));
            move = depth === 2 ? `${face}w` : `${depth}${face}w`;
        }
        result.push(move + variant);
    }
    return result;
};
