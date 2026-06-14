import fetch from 'node-fetch';

// Mock Storage
const storage = new Map<string, string>();
export const lastOptions: any = {};

export const CapacitorHttp = {
    get: async (options: { url: string; headers?: Record<string, string>; connectTimeout?: number; readTimeout?: number }) => {
        Object.assign(lastOptions, options);
        try {
            const response = await fetch(options.url, { headers: options.headers });
            const text = await response.text();

            return {
                status: response.status,
                data: text,
                headers: response.headers
            };
        } catch (error) {
            throw error;
        }
    }
};

export const Preferences = {
    get: async (options: { key: string }) => {
        return { value: storage.get(options.key) || null };
    },
    set: async (options: { key: string; value: string }) => {
        storage.set(options.key, options.value);
    },
    remove: async (options: { key: string }) => {
        storage.delete(options.key);
    },
    clear: async () => {
        storage.clear();
    }
};
