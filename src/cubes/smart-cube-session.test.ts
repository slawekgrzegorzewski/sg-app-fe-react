import {Subject} from 'rxjs';
import {connectSmartCube} from 'smartcube-web-bluetooth';
import type {SmartCubeConnection, SmartCubeEvent} from 'smartcube-web-bluetooth';
import {SmartCubeSession} from './smart-cube-session';
import {applyCubeMove, SOLVED_CUBE} from './smart-cube-state';

jest.mock('smartcube-web-bluetooth', () => ({connectSmartCube: jest.fn()}));

function device() {
    const events = new Subject<SmartCubeEvent>();
    const disconnect = jest.fn().mockResolvedValue(undefined);
    const connection = {
        deviceName: 'GAN', deviceMAC: '', protocol: {id: 'gan', name: 'GAN'},
        capabilities: {facelets: true, battery: true, gyroscope: true, hardware: false, reset: false},
        events$: events,
        sendCommand: jest.fn().mockResolvedValue(undefined),
        disconnect,
    };
    (connectSmartCube as jest.Mock).mockResolvedValue(connection);
    return {events, connection, disconnect};
}

beforeEach(() => jest.clearAllMocks());

test('współdzieli połączenie i przekazuje aktualny stan bez odtwarzania ruchów poprzedniej próby', async () => {
    const cube = device();
    const session = new SmartCubeSession();
    const connection = await session.connect(jest.fn());
    cube.events.next({type: 'FACELETS', facelets: SOLVED_CUBE, timestamp: 0});
    cube.events.next({type: 'MOVE', move: 'R', timestamp: 1, face: 1, direction: 1, localTimestamp: 1, cubeTimestamp: 1});
    cube.events.next({type: 'BATTERY', batteryLevel: 73, timestamp: 2});
    cube.events.next({type: 'GYRO', quaternion: {w: 1, x: 0, y: 0, z: 0}, timestamp: 3});
    cube.events.next({type: 'MOVE', move: 'U', timestamp: 4, face: 0, direction: 1, localTimestamp: 4, cubeTimestamp: 4});
    const replay: SmartCubeEvent[] = [];
    const subscription = connection.events$.subscribe(event => replay.push(event));
    expect(replay.find(event => event.type === 'FACELETS')).toMatchObject({
        facelets: applyCubeMove(applyCubeMove(SOLVED_CUBE, 'R'), 'U'),
    });
    expect(replay.find(event => event.type === 'BATTERY')).toMatchObject({batteryLevel: 73});
    expect(replay.some(event => event.type === 'MOVE')).toBe(false);
    subscription.unsubscribe();
    expect(await session.connect(jest.fn())).toBe(connection);
    expect(connectSmartCube).toHaveBeenCalledTimes(1);
    expect(cube.disconnect).not.toHaveBeenCalled();
    await session.disconnect();
    expect(cube.disconnect).toHaveBeenCalledTimes(1);
    expect(session.getConnection()).toBeNull();
    expect(cube.events.observed).toBe(false);
});

test('usuwa stan po fizycznym rozłączeniu i pozwala połączyć się ponownie', async () => {
    const cube = device();
    const session = new SmartCubeSession();
    const connection = await session.connect(jest.fn());
    const onEvent = jest.fn();
    connection.events$.subscribe(onEvent);
    cube.events.next({type: 'DISCONNECT', timestamp: 1});
    expect(session.getConnection()).toBeNull();
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({type: 'DISCONNECT'}));
    await session.connect(jest.fn());
    expect(connectSmartCube).toHaveBeenCalledTimes(2);
    const replay = jest.fn();
    session.getConnection()!.events$.subscribe(replay);
    expect(replay).not.toHaveBeenCalled();
    await session.disconnect();
});

test('nie zachowuje połączenia zakończonego dopiero po opuszczeniu modułu', async () => {
    const cube = device();
    let finish!: (value: SmartCubeConnection) => void;
    (connectSmartCube as jest.Mock).mockReturnValue(new Promise<SmartCubeConnection>(resolve => {
        finish = resolve;
    }));
    const session = new SmartCubeSession();
    const pending = session.connect(jest.fn());
    expect(session.connect(jest.fn())).toBe(pending);
    await session.disconnect();
    finish(cube.connection);
    await expect(pending).rejects.toThrow('anulowane');
    expect(cube.disconnect).toHaveBeenCalledTimes(1);
    expect(session.getConnection()).toBeNull();
});

test('zachowuje punkt kalibracji i najnowszy odczyt GYRO dla kolejnego ekranu', async () => {
    const cube = device();
    const session = new SmartCubeSession();
    const connection = await session.connect(jest.fn());
    const reference = {type: 'GYRO' as const, timestamp: 1, quaternion: {w: 1, x: 0, y: 0, z: 0}};
    cube.events.next(reference);
    const calibrated = {type: 'GYRO' as const, timestamp: 2, quaternion: {w: 0.707, x: 0, y: 0.707, z: 0}};
    cube.events.next(calibrated);
    session.setGyroReference(calibrated);
    const current = {type: 'GYRO' as const, timestamp: 3, quaternion: {w: 0, x: 0, y: 1, z: 0}};
    cube.events.next(current);
    const replay: SmartCubeEvent[] = [];
    const subscription = connection.events$.subscribe(event => replay.push(event));
    expect(replay.filter(event => event.type === 'GYRO')).toEqual([calibrated, current]);
    subscription.unsubscribe();
    await session.disconnect();
});
