import { reactRouter } from '@react-router/dev/vite';
import { defineConfig, loadEnv } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => {
	// Load env file based on `mode` in the current working directory.
	// Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
	const env = loadEnv(mode, process.cwd(), '');

	return {
		plugins: [reactRouter(), tsconfigPaths()],
		optimizeDeps: {
			exclude: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
			include: [
				'firebase > @firebase/app',
				'firebase > @firebase/auth',
				'firebase > @firebase/firestore',
			],
		},
		server: {
			port: Number.parseInt(env.PORT || '5173', 10),
			host: true, // 外部からのアクセスを許可
			headers: {
				// 開発環境でのCOOPエラー軽減
				'Cross-Origin-Opener-Policy': 'unsafe-none',
				'Cross-Origin-Embedder-Policy': 'unsafe-none',
			},
		},
	};
});
