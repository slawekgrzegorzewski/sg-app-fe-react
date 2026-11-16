import {createContext, useContext, useEffect, useState, useSyncExternalStore} from 'react';
import type {ReactNode} from 'react';
import type {SmartCubeConnection} from 'smartcube-web-bluetooth';
import {SmartCubeSession} from './smart-cube-session';

type SharedSession = {
    session: SmartCubeSession;
    connection: SmartCubeConnection | null;
};

const Context = createContext<SharedSession | null>(null);

export function SmartCubeSessionProvider({children}: {children: ReactNode}) {
    const [session] = useState(() => new SmartCubeSession());
    const connection = useSyncExternalStore(session.subscribe, session.getConnection);
    useEffect(() => () => {
        void session.disconnect();
    }, [session]);
    return <Context.Provider value={{session, connection}}>{children}</Context.Provider>;
}

export function useSmartCubeSession(): SharedSession | null {
    return useContext(Context);
}
