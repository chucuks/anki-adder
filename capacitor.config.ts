import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.anki.adder',
    appName: 'Anki Adder',
    webDir: 'public',
    server: {
        androidScheme: 'https'
    },
    plugins: {
        CapacitorHttp: {
            enabled: true,
        },
    },
};

export default config;
