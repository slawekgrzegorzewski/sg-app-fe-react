interface ScrambleOptions {
  turns: number;
}

type FaceStatus = 'movable' | 'not-movable'
type Face = 'U' | 'D' | 'F' | 'B' | 'R' | 'L';
type MoveVariant = '' | '\'' | '2'

export default function scramble(options: Partial<ScrambleOptions> = {turns: 20}): string[] {

  const result: string[] = [];

  const faceStatuses = new Map<Face, FaceStatus>([
    ['U', 'movable'],
    ['D', 'movable'],
    ['F', 'movable'],
    ['B', 'movable'],
    ['R', 'movable'],
    ['L', 'movable']
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
        return '\'';
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
    result.push(face + variant);
  }
  return result;
}
