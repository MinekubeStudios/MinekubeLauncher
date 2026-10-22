import 'overlayscrollbars/overlayscrollbars.css'

import { installTooltipDirective } from '@modrinth/ui'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createApp } from 'vue'

import App from '@/App.vue'
import { initialQueryDefaults, startPerformanceSettings } from '@/composables/use-performance.ts'
import { startSplashScreenSettings } from '@/composables/use-splash-screen.ts'
import { startVisualSettings } from '@/composables/use-visual.ts'
import { overlayScrollbarsDirective } from '@/directives/overlayScrollbars'
import { setupErrorReporting } from '@/helpers/error-reporting'
import { startInputModalityTracking } from '@/helpers/input-modality'
import {
	prepareWindowArrive,
	showMainWindow,
	showMainWindowAfterTimeout,
	startWindowSettleGuard,
} from '@/helpers/main-window'
import { debugStartup, traceStartupStep } from '@/helpers/startup-debug'
import i18nPlugin from '@/plugins/i18n'
import i18nDebugPlugin from '@/plugins/i18n-debug'
import router from '@/routes'

debugStartup('Frontend entry module evaluated')

// Minekube: apply saved Visual settings (animations / enhanced animations)
// before the app mounts, so the correct classes are on <html> from the start.
startVisualSettings()

// Minekube: hold the splash entrance until the window is really visible, so
// the launch animation is not already over while the window is still hidden,
// and keep layout transitions off while the window is restored or resized.
prepareWindowArrive()
startWindowSettleGuard()
startInputModalityTracking()

// Minekube: apply the saved loading screen customisation before the first paint
// too, so the very first loading screen already matches the player's choices.
startSplashScreenSettings()

const app = createApp(App)
setupErrorReporting(app, router)

const queryClient = new QueryClient({ defaultOptions: initialQueryDefaults() })
startPerformanceSettings(queryClient)

app.use(VueQueryPlugin, { queryClient })
app.use(router)
if (import.meta.env.DEV) {
	void traceStartupStep('Initial router readiness', () => router.isReady()).catch(() => {})
}
app.use(i18nPlugin)
app.use(i18nDebugPlugin)
installTooltipDirective(app)
app.directive('overlay-scrollbars', overlayScrollbarsDirective)

// Minekube: the main window starts hidden, so a broken startup used to leave the
// launcher running invisibly or showing an empty window with no explanation.
// If Vue produced no UI at all, say what went wrong instead of staying blank.
function renderStartupFailure(error) {
	const target = document.getElementById('app')
	if (!target || target.childElementCount > 0) return

	const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
	const box = document.createElement('div')
	box.setAttribute('role', 'alert')
	box.style.cssText =
		'margin:2rem auto;max-width:44rem;padding:1.25rem 1.5rem;border:1px solid #fc6000;' +
		'border-radius:0.75rem;background:rgba(72,0,0,0.92);color:#fff;' +
		'font:14px/1.5 system-ui,sans-serif'

	const title = document.createElement('h1')
	title.textContent = 'Minekube Launcher failed to start'
	title.style.cssText = 'margin:0 0 0.5rem;font-size:1.125rem;color:#fcc000'

	const body = document.createElement('p')
	body.textContent =
		'The interface could not be rendered, so the launcher cannot continue. ' +
		'The technical reason is below — reporting it helps get this fixed.'
	body.style.cssText = 'margin:0 0 0.75rem'

	const reason = document.createElement('pre')
	reason.textContent = `${detail}\n\n${error instanceof Error ? (error.stack ?? '') : ''}`.trim()
	reason.style.cssText =
		'margin:0;padding:0.75rem;border-radius:0.5rem;background:rgba(0,0,0,0.45);' +
		'white-space:pre-wrap;word-break:break-word;max-height:16rem;overflow:auto'

	box.append(title, body, reason)
	target.replaceChildren(box)
	showMainWindow()
}

const startupErrorHandler = app.config.errorHandler
app.config.errorHandler = (error, instance, info) => {
	if (startupErrorHandler) startupErrorHandler(error, instance, info)
	else console.error(error)
	renderStartupFailure(error)
}

async function mount() {
	if (import.meta.env.DEV && import.meta.env.VITE_VUE_SCAN === 'true') {
		const { VueScanPlugin } = await traceStartupStep(
			'Load Vue render tracker',
			() => import('@taijased/vue-render-tracker'),
		)
		app.use(new VueScanPlugin({ enabled: true, showOverlay: true, log: false, playSound: false }))
	}
	debugStartup('Vue mount started')
	app.mount('#app')
	debugStartup('Vue mount completed')
}

showMainWindowAfterTimeout()

// Vue only rethrows setup errors in development; in a production build it logs
// them and keeps going, so mount() resolves with an empty app. This catches that.
window.setTimeout(() => {
	if (document.getElementById('app')?.childElementCount === 0) {
		renderStartupFailure(new Error('The interface did not render during startup.'))
	}
}, 10_000)

mount().catch((error) => {
	console.error(error)
	renderStartupFailure(error)
	showMainWindow()
})
