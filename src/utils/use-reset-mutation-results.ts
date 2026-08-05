import {useEffect} from "react";

type ResettableMutationResult = {
    called: boolean;
    loading: boolean;
    reset: () => void;
};

export function useResetMutationResults(...results: ResettableMutationResult[]): void {
    useEffect(() => {
        results.forEach(result => {
            if (result.called && !result.loading) {
                result.reset();
            }
        });
    });
}
