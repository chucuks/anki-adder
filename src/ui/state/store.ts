import { AppSettings, WordMeaning } from '../../domain/entities';

export type AppState = AppSettings & {
    selectedMeanings: Set<number>;
    searchResults: WordMeaning[];
    isSearching: boolean;
    isAdding: boolean;
    existingIndices: Set<number>;
    totalExistingCount: number;
    currentWord: string;
    
    // Tag Manager State
    selectedGroupInManagerId: string | null;
    tagDeleteMode: boolean;
    groupDeleteMode: boolean;
    globalTagSearchQuery: string;
    globalGroupSearchQuery: string;
    dashboardTagSearchQuery: string;
    hideExistingResults: boolean;
    autoSearchDelayUnit: 'ms' | 'sec';
};

type Listener<T> = (value: T) => void;

function deepCopyAppState(state: AppState): AppState {
    return {
        ...state,
        selectedMeanings: new Set(state.selectedMeanings),
        existingIndices: new Set(state.existingIndices),
        searchResults: (state.searchResults || []).map(r => ({ ...r })),
    };
}

export class Store {
    private state: AppState;
    private listeners: Partial<Record<keyof AppState, Listener<any>[]>> = {};

    constructor(initialState: AppState) {
        this.state = deepCopyAppState(initialState);
    }

    getState(): AppState {
        return deepCopyAppState(this.state);
    }

    update<K extends keyof AppState>(key: K, value: AppState[K]) {
        const prev = this.state[key];
        if (prev === value) return;
        if (value instanceof Set && prev instanceof Set && prev.size === value.size && [...prev].every(x => value.has(x))) return;
        this.state[key] = value;
        this.notify(key);
    }

    updateMany(updates: Partial<AppState>) {
        const state = this.state as unknown as Record<string, unknown>;
        for (const key of Object.keys(updates) as (keyof AppState)[]) {
            const value = updates[key] as unknown;
            if (value instanceof Set) state[key] = new Set(value as Set<unknown>);
            else if (Array.isArray(value)) state[key] = value.map((item: unknown) => typeof item === 'object' && item !== null ? { ...item } : item);
            else state[key] = value;
        }
        for (const key of Object.keys(updates) as (keyof AppState)[]) {
            this.notify(key);
        }
    }

    subscribe<K extends keyof AppState>(key: K, listener: Listener<AppState[K]>, notifyInitial = true) {
        if (!this.listeners[key]) this.listeners[key] = [];
        this.listeners[key]!.push(listener);

        if (notifyInitial) {
            listener(this.state[key]);
        }

        return () => {
            this.listeners[key] = this.listeners[key]!.filter(l => l !== listener);
        };
    }

    private notify<K extends keyof AppState>(key: K) {
        (this.listeners[key] || []).slice().forEach(l => {
            try { l(this.state[key]); } catch (e) {
                console.error(`[Store] Error in listener for "${String(key)}":`, e);
            }
        });
    }
}
