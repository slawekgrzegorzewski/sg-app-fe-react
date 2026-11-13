import {normalizeGyroQuaternion, orientationFromInitialReference} from './gyro-orientation';

test('odrzuca niepoprawny kwaternion i normalizuje osie czujnika', () => {
    expect(normalizeGyroQuaternion({x: 0, y: 0, z: 0, w: 0})).toBeNull();
    expect(normalizeGyroQuaternion({x: NaN, y: 0, z: 0, w: 1})).toBeNull();
    expect(normalizeGyroQuaternion({x: 0, y: 2, z: 0, w: 0})).toEqual({x: 0, y: 0, z: -1, w: 0});
});

test('wyznacza obrót względem niezerowej orientacji początkowej', () => {
    const initialOrientation = {x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2};
    const same = orientationFromInitialReference(initialOrientation, initialOrientation);
    expect(same.x).toBeCloseTo(0);
    expect(same.y).toBeCloseTo(0);
    expect(same.z).toBeCloseTo(0);
    expect(same.w).toBeCloseTo(1);
    const result = orientationFromInitialReference(initialOrientation, {x: 0, y: 1, z: 0, w: 0});
    expect(result.y).toBeCloseTo(Math.SQRT1_2);
    expect(result.w).toBeCloseTo(Math.SQRT1_2);
});

test.each([
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
])('zachowuje kolejność mnożenia i nieujemne w przy znakach %s i %s', (initialSign, currentSign) => {
    const initialOrientation = {w: initialSign * Math.SQRT1_2, x: initialSign * Math.SQRT1_2, y: 0, z: 0};
    const currentOrientation = {w: currentSign * 0.5, x: currentSign * 0.5, y: currentSign * 0.5, z: currentSign * 0.5};

    const result = orientationFromInitialReference(initialOrientation, currentOrientation);

    expect(result.w).toBeCloseTo(Math.SQRT1_2);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(Math.SQRT1_2);
    expect(result.z).toBeCloseTo(0);
});
