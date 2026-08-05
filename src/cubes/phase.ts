export type Phase = 'IDLE' | 'INSPECTION_EARLY' | 'INSPECTION_LATE' | 'SOLVING'

export type InspectionPhase = Extract<Phase, 'INSPECTION_EARLY' | 'INSPECTION_LATE'>

export const INSPECTION_ALLOWANCE_MILLIS = 15000;

export function isInspection(phase: string): phase is InspectionPhase {
    return phase === 'INSPECTION_EARLY' || phase === 'INSPECTION_LATE';
}
