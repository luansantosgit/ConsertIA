import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import pkg from './package.json';
export default defineConfig(function (_a) {
    var _b;
    var mode = _a.mode;
    // .env carregado explicitamente (process.env nao contem VITE_* no Windows).
    // Chave VAPID publica injetada no bundle a chave privada NUNCA sai do servidor.
    var env = loadEnv(mode, process.cwd(), '');
    var vapidPublicKey = JSON.stringify((_b = env.VITE_VAPID_PUBLIC_KEY) !== null && _b !== void 0 ? _b : '');
    return {
        plugins: [react()],
        base: '/',
        // Versao do package.json disponivel no app via `__APP_VERSION__`.
        define: {
            __APP_VERSION__: JSON.stringify(pkg.version),
            VAPID_PUBLIC_KEY: vapidPublicKey,
        },
        server: {
            port: 5174,
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
                '@components': path.resolve(__dirname, './src/components'),
                '@pages': path.resolve(__dirname, './src/pages'),
                '@services': path.resolve(__dirname, './src/services'),
                '@repositories': path.resolve(__dirname, './src/repositories'),
                '@stores': path.resolve(__dirname, './src/stores'),
                '@hooks': path.resolve(__dirname, './src/hooks'),
                '@types': path.resolve(__dirname, './src/types'),
                '@i18n': path.resolve(__dirname, './src/i18n'),
                '@utils': path.resolve(__dirname, './src/utils'),
            },
        },
    };
});
