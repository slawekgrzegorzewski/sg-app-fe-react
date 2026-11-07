import {normalizeGyroQuaternion, relativeGyroQuaternion} from './gyro-orientation';

test('odrzuca niepoprawny kwaternion i normalizuje osie czujnika', () => {
    expect(normalizeGyroQuaternion({x: 0, y: 0, z: 0, w: 0})).toBeNull();
    expect(normalizeGyroQuaternion({x: NaN, y: 0, z: 0, w: 1})).toBeNull();
    expect(normalizeGyroQuaternion({x: 0, y: 2, z: 0, w: 0})).toEqual({x: 0, y: 0, z: -1, w: 0});
});

test('wyznacza obrót względem niezerowej orientacji początkowej', () => {
    const basis = {x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2};
    const same = relativeGyroQuaternion(basis, basis);
    expect(same.x).toBeCloseTo(0);
    expect(same.y).toBeCloseTo(0);
    expect(same.z).toBeCloseTo(0);
    expect(same.w).toBeCloseTo(1);
    const result = relativeGyroQuaternion(basis, {x: 0, y: 1, z: 0, w: 0});
    expect(result.y).toBeCloseTo(Math.SQRT1_2);
    expect(result.w).toBeCloseTo(Math.SQRT1_2);
});
