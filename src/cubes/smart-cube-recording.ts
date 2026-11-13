import type {SmartCubeEvent} from 'smartcube-web-bluetooth';

type SensorEvent = Extract<SmartCubeEvent, {type: 'MOVE' | 'GYRO'}>;

export type SmartCubeRecording = {
    version: 1;
    initialFacelets: string;
    initialGyro: Extract<SmartCubeEvent, {type: 'GYRO'}> | null;
    timeOrigin: number;
    inspectionStartedAt: number;
    solveStartedAt: number | null;
    events: Array<{receivedAt: number; event: SensorEvent}>;
};

export function downloadSmartCubeRecording(recording: SmartCubeRecording): void {
    const blob = new Blob([JSON.stringify(recording, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'smart-kostka-solve.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}
