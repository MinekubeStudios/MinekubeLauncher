import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

/**
 * Dev-only harness for the Special buttons styles and the launch overlay.
 *
 * It renders the real stylesheet, the real runtime and the real overlay
 * component, so what you see here is what the launcher draws.
 *
 *   pnpm --filter=@modrinth/app-frontend exec vite --config preview/vite.config.ts
 */
export default defineConfig({
	root: fileURLToPath(new URL('.', import.meta.url)),
	plugins: [vue()],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('../src', import.meta.url)),
		},
	},
	server: {
		host: '0.0.0.0',
		port: 5199,
		strictPort: true,
		allowedHosts: true,
	},
})
