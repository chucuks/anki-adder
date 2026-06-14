export type ErrorSeverity = 'error' | 'warning' | 'info';

export interface UIError {
    message: string;
    severity: ErrorSeverity;
    timestamp: number;
    originalError?: any;
}

export class UIErrorService {
    private listeners: ((error: UIError) => void)[] = [];

    handleError(error: any, message?: string, severity: ErrorSeverity = 'error') {
        const uiError: UIError = {
            message: message || (error instanceof Error ? error.message : String(error)),
            severity,
            timestamp: Date.now(),
            originalError: error
        };

        console.error('[UI Error]:', uiError);
        this.notify(uiError);
    }

    subscribe(listener: (error: UIError) => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify(error: UIError) {
        this.listeners.forEach(l => l(error));
    }
}
