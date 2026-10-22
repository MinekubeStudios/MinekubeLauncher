import type { QueryClient } from '@tanstack/vue-query'
import { computed, ref, watch } from 'vue'

/**
 * Minekube Launcher — Performance settings.
 *
 * Every switch here changes something measurable:
 *   - fast loading trades memory and data freshness for instant navigation,
 *   - skin render quality sets the real supersampling factor of 3D previews,
 *   - pausing background activity stops timers and animation while the window
 *     is minimised or hidden,
 *   - freeing memory drops cached network data on demand.
 */

const STORAGE_KEY = 'minekube:performance'
const STORAGE_VERSION_KEY = `${STORAGE_KEY}:version`
const STORAGE_VERSION = '2'

export type SkinRenderQuality = 'balanced' | 'high' | 'ultra' | 'ultra-static'

export const SKIN_RENDER_QUALITIES: readonly SkinRenderQuality[] = [
	'balanced',
	'high',
	'ultra',
	'ultra-static',
]

interface PerformancePrefs {
	fastLoading: boolean
	skinRenderQuality: SkinRenderQuality
	pauseWhenHidden: boolean
}

const DEFAULT_PREFS: PerformancePrefs = {
	fastLoading: true,
	skinRenderQuality: 'balanced',
	pauseWhenHidden: true,
}

function loadPrefs(): PerformancePrefs {
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (!raw) return { ...DEFAULT_PREFS }
		const parsed = JSON.parse(raw) as Partial<Record<keyof PerformancePrefs, unknown>>
		const stored = SKIN_RENDER_QUALITIES.includes(parsed.skinRenderQuality as SkinRenderQuality)
			? (parsed.skinRenderQuality as SkinRenderQuality)
			: DEFAULT_PREFS.skinRenderQuality
		// Version 1 defaulted to Ultra, which is far too heavy as a default.
		const migratingFromV1 = localStorage.getItem(STORAGE_VERSION_KEY) !== STORAGE_VERSION
		return {
			fastLoading:
				typeof parsed.fastLoading === 'boolean' ? parsed.fastLoading : DEFAULT_PREFS.fastLoading,
			skinRenderQuality:
				migratingFromV1 && stored === 'ultra' ? DEFAULT_PREFS.skinRenderQuality : stored,
			pauseWhenHidden:
				typeof parsed.pauseWhenHidden === 'boolean'
					? parsed.pauseWhenHidden
					: DEFAULT_PREFS.pauseWhenHidden,
		}
	} catch {
		return { ...DEFAULT_PREFS }
	}
}

const initial = loadPrefs()
const fastLoading = ref(initial.fastLoading)
const skinRenderQuality = ref<SkinRenderQuality>(initial.skinRenderQuality)
const pauseWhenHidden = ref(initial.pauseWhenHidden)

/** Device pixel ratio, kept current when the window moves to another monitor. */
const devicePixelRatio = ref(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)

function watchDevicePixelRatio(): void {
	if (typeof window === 'undefined') return
	const query = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`)
	query.addEventListener(
		'change',
		() => {
			devicePixelRatio.value = window.devicePixelRatio || 1
			watchDevicePixelRatio()
		},
		{ once: true },
	)
}
watchDevicePixelRatio()

/**
 * Exact renderer pixel ratio for the 3D skin previews. Above the display's own
 * ratio the model is rendered at 2×/3×/4× the pixels and scaled down — real
 * supersampling, which is what makes single skin pixels crisp.
 */
export const skinPixelRatio = computed(() => {
	const device = devicePixelRatio.value
	switch (skinRenderQuality.value) {
		case 'ultra-static':
			return Math.max(device, 4)
		case 'ultra':
			return Math.max(device, 3)
		case 'high':
			return Math.max(device, 2)
		case 'balanced':
		default:
			return Math.min(device, 1.5)
	}
})

/**
 * At 4× the preview draws 16× the pixels, so it renders on demand instead: a
 * frame only when something changes (dragging, a new skin or cape, a resize).
 * Razor sharp and nearly free while you look at it; the idle sway holds still.
 */
export const skinStaticRender = computed(() => skinRenderQuality.value === 'ultra-static')

/** True while work the user cannot see should be paused. */
export const backgroundPaused = ref(false)

const FAST_QUERY_DEFAULTS = {
	staleTime: 5 * 60 * 1000,
	gcTime: 30 * 60 * 1000,
	refetchOnWindowFocus: false,
	refetchOnReconnect: false,
	retry: 1,
}

const STANDARD_QUERY_DEFAULTS = {
	staleTime: 0,
	gcTime: 5 * 60 * 1000,
	refetchOnWindowFocus: true,
	refetchOnReconnect: true,
	retry: 3,
}

function queryDefaults() {
	return { ...(fastLoading.value ? FAST_QUERY_DEFAULTS : STANDARD_QUERY_DEFAULTS) }
}

/** Query client defaults for the moment the client is created. */
export function initialQueryDefaults() {
	return { queries: queryDefaults() }
}

let client: QueryClient | undefined

function persist(): void {
	try {
		const prefs: PerformancePrefs = {
			fastLoading: fastLoading.value,
			skinRenderQuality: skinRenderQuality.value,
			pauseWhenHidden: pauseWhenHidden.value,
		}
		localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
		localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION)
	} catch {
		// Storage unavailable: the choice still applies for this session.
	}
}

function updateBackgroundPaused(): void {
	backgroundPaused.value =
		pauseWhenHidden.value && typeof document !== 'undefined' && document.hidden
}

/**
 * Drops every cached result nothing on screen uses any more and refreshes the
 * rest. Clearing the whole cache would also detach queries that mounted
 * components still observe, leaving them on data that never updates again.
 *
 * @returns how many cached results were released
 */
export function freeMemory(): number {
	if (!client) return 0
	const cache = client.getQueryCache()
	const inactive = cache.findAll({ type: 'inactive' }).length
	client.removeQueries({ type: 'inactive' })
	void client.invalidateQueries({ type: 'active' })
	return inactive
}

let started = false

/** Connects the settings to the query client; call once with the app's client. */
export function startPerformanceSettings(queryClient: QueryClient): void {
	client = queryClient
	client.setDefaultOptions({ queries: queryDefaults() })
	if (started) return
	started = true

	watch(
		[fastLoading, skinRenderQuality, pauseWhenHidden],
		() => {
			client?.setDefaultOptions({ queries: queryDefaults() })
			persist()
			updateBackgroundPaused()
		},
		{ immediate: true },
	)

	if (typeof document !== 'undefined') {
		document.addEventListener('visibilitychange', updateBackgroundPaused)
	}
}

export function usePerformanceSettings() {
	return { fastLoading, skinRenderQuality, pauseWhenHidden }
}

export { fastLoading, pauseWhenHidden, skinRenderQuality }
