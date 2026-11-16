import {Observable, Subject, Subscription} from 'rxjs';
import {connectSmartCube} from 'smartcube-web-bluetooth';
import type {SmartCubeConnection, SmartCubeEvent} from 'smartcube-web-bluetooth';
import {isCubeFacelets} from './cube-facelets';
import {parseCubeMove} from './cube-move';
import {applyCubeMove} from './smart-cube-state';
import {normalizeGyroQuaternion} from './gyro-orientation';

type GyroEvent = Extract<SmartCubeEvent, {type: 'GYRO'}>;
type AddressProvider = (device: BluetoothDevice, isFallbackCall?: boolean) => Promise<string | null>;

export class SmartCubeSession {
    private connection: SmartCubeConnection | null = null;
    private pending: Promise<SmartCubeConnection> | null = null;
    private subscription: Subscription | null = null;
    private listeners = new Set<() => void>();
    private events = new Subject<SmartCubeEvent>();
    private facelets: Extract<SmartCubeEvent, {type: 'FACELETS'}> | null = null;
    private battery: Extract<SmartCubeEvent, {type: 'BATTERY'}> | null = null;
    private gyro: GyroEvent | null = null;
    private referenceGyro: GyroEvent | null = null;
    private generation = 0;

    getConnection = (): SmartCubeConnection | null => this.connection;

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    setGyroReference(event: GyroEvent | null): void {
        if (!event) {
            this.referenceGyro = null;
        } else if (normalizeGyroQuaternion(event.quaternion)) {
            this.referenceGyro = {...event, quaternion: {...event.quaternion}};
        }
    }

    connect(provider: AddressProvider): Promise<SmartCubeConnection> {
        if (this.connection) {
            return Promise.resolve(this.connection);
        }
        if (this.pending) {
            return this.pending;
        }
        const generation = this.generation;
        const pending = this.open(provider, generation).finally(() => {
            if (this.pending === pending) {
                this.pending = null;
            }
        });
        this.pending = pending;
        return pending;
    }

    private async open(
            provider: AddressProvider,
            generation: number): Promise<SmartCubeConnection> {
        const device = await connectSmartCube(provider);
        if (generation !== this.generation) {
            await device.disconnect();
            throw new Error('Łączenie z kostką zostało anulowane.');
        }
        const connection: SmartCubeConnection = {
            deviceName: device.deviceName,
            deviceMAC: device.deviceMAC,
            protocol: device.protocol,
            capabilities: device.capabilities,
            sendCommand: command => device.sendCommand(command),
            disconnect: async () => {
                if (this.connection === connection) {
                    this.clear();
                    await device.disconnect();
                }
            },
            events$: new Observable(observer => {
                const subscription = this.events.subscribe(observer);
                const snapshots = [
                    this.facelets,
                    this.referenceGyro,
                    this.gyro !== this.referenceGyro ? this.gyro : null,
                    this.battery,
                ];
                for (const snapshot of snapshots) {
                    if (snapshot) {
                        observer.next(snapshot);
                    }
                }
                return () => subscription.unsubscribe();
            }),
        };
        this.connection = connection;
        this.subscription = device.events$.subscribe(event => {
            if (event.type === 'DISCONNECT') {
                this.clear();
                return;
            }
            this.remember(event);
            this.events.next(event);
        });
        for (const listener of this.listeners) {
            listener();
        }
        try {
            if (device.capabilities.facelets) {
                await device.sendCommand({type: 'REQUEST_FACELETS'});
            }
        } catch (error) {
            await connection.disconnect();
            throw error;
        }
        if (this.connection !== connection) {
            throw new Error('Połączenie z kostką zostało przerwane.');
        }
        return connection;
    }

    private remember(event: SmartCubeEvent): void {
        if (event.type === 'FACELETS') {
            this.facelets = isCubeFacelets(event.facelets) ? {...event} : null;
        } else if (event.type === 'MOVE' && this.facelets && isCubeFacelets(this.facelets.facelets)) {
            try {
                this.facelets = {
                    type: 'FACELETS',
                    timestamp: event.timestamp,
                    source: 'moves',
                    facelets: applyCubeMove(this.facelets.facelets, parseCubeMove(event.move)),
                };
            } catch {
                this.facelets = null;
            }
        } else if (event.type === 'BATTERY' && Number.isFinite(event.batteryLevel)
                && event.batteryLevel >= 0 && event.batteryLevel <= 100) {
            this.battery = {...event};
        } else if (event.type === 'GYRO' && normalizeGyroQuaternion(event.quaternion)) {
            this.gyro = {
                ...event,
                quaternion: {...event.quaternion},
                ...(event.velocity ? {velocity: {...event.velocity}} : {}),
            };
            this.referenceGyro ??= this.gyro;
        }
    }

    private clear(): void {
        this.generation++;
        this.pending = null;
        this.subscription?.unsubscribe();
        this.subscription = null;
        this.connection = null;
        this.facelets = null;
        this.battery = null;
        this.gyro = null;
        this.referenceGyro = null;
        this.events.next({type: 'DISCONNECT', timestamp: performance.now()});
        for (const listener of this.listeners) {
            listener();
        }
    }

    async disconnect(): Promise<void> {
        this.generation++;
        this.pending = null;
        await this.connection?.disconnect();
    }
}
