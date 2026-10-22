import { reactive, ref, watch } from 'vue'

// Minekube Launcher — loading screen (splash) customization.
// State is persisted in localStorage and applied as CSS custom properties and
// data attributes on <html>, so the loading screen reacts instantly and the
// choice survives restarts. The same values drive the live preview in
// Settings → Visual, which is why nothing here touches the DOM directly.

const STORAGE_KEY = 'minekube:splash'

/**
 * Bumped whenever a default changes in a way users should feel. Preferences
 * written by an older build are persisted on first launch (including the ones
 * nobody touched), so without this marker an old, slow default would stick
 * around forever.
 */
const SPLASH_PREFS_VERSION = 3

/** Shapes of the loading progress indicator. */
export type SplashProgressStyle = 'bar' | 'segments' | 'ring' | 'dots' | 'minimal'

export const SPLASH_PROGRESS_STYLES: readonly SplashProgressStyle[] = [
	'bar',
	'segments',
	'ring',
	'dots',
	'minimal',
]

/** Animations the Minekube wordmark can play on the loading screen. */
export type SplashLogoAnimation = 'none' | 'float' | 'breathe' | 'pulse' | 'tilt' | 'shimmer'

export const SPLASH_LOGO_ANIMATIONS: readonly SplashLogoAnimation[] = [
	'none',
	'float',
	'breathe',
	'pulse',
	'tilt',
	'shimmer',
]

export interface SplashPrefs {
	logoScale: number
	logoAnimation: SplashLogoAnimation
	logoIntensity: number
	logoGlow: number
	progressStyle: SplashProgressStyle
	progressHeight: number
	progressWidth: number
	starDensity: number
	starSpeed: number
	nebulaIntensity: number
	gridFloor: boolean
	gridIntensity: number
	backgroundEffects: boolean
	animationSpeed: number
	minDisplayMs: number
	fadeOutMs: number
	showLoadingMessage: boolean
}

export const DEFAULT_SPLASH_PREFS: SplashPrefs = {
	logoScale: 100,
	logoAnimation: 'breathe',
	logoIntensity: 100,
	logoGlow: 200,
	progressStyle: 'bar',
	progressHeight: 9,
	progressWidth: 100,
	starDensity: 200,
	starSpeed: 200,
	nebulaIntensity: 200,
	gridFloor: true,
	gridIntensity: 200,
	backgroundEffects: false,
	animationSpeed: 100,
	// The loading screen is a cover for startup work, not a place to wait: it
	// holds for a fraction of a second and then fades out.
	minDisplayMs: 400,
	fadeOutMs: 500,
	showLoadingMessage: false,
}

/**
 * The defaults earlier builds shipped. A stored value that still equals the
 * default of the build that wrote it was never adjusted by the user, so it is
 * upgraded to the current default instead of pinning the old look forever.
 */
const LEGACY_SPLASH_PREFS_V1 = {
	logoAnimation: 'float',
	animationSpeed: 50,
	minDisplayMs: 2500,
	fadeOutMs: 900,
} as const

const LEGACY_SPLASH_PREFS_V2: Partial<SplashPrefs> = {
	logoAnimation: 'none',
	logoGlow: 100,
	starDensity: 100,
	starSpeed: 100,
	nebulaIntensity: 100,
	gridIntensity: 100,
	animationSpeed: 200,
	fadeOutMs: 250,
	showLoadingMessage: true,
}

type StoredSplashPrefs = Partial<SplashPrefs> & { version?: number }

function upgradeUntouched(
	prefs: StoredSplashPrefs,
	legacy: Partial<SplashPrefs>,
): StoredSplashPrefs {
	const upgraded: StoredSplashPrefs = { ...prefs }
	for (const key of Object.keys(legacy) as (keyof SplashPrefs)[]) {
		if (upgraded[key] === legacy[key]) {
			;(upgraded as Record<string, unknown>)[key] = DEFAULT_SPLASH_PREFS[key]
		}
	}
	return upgraded
}

/**
 * Upgrades preferences written by an older build. Only values that still match
 * that build's defaults are replaced, so deliberate adjustments survive.
 */
function upgradeLegacyPrefs(parsed: StoredSplashPrefs): StoredSplashPrefs {
	const version = typeof parsed.version === 'number' ? parsed.version : 1
	if (version >= SPLASH_PREFS_VERSION) return parsed

	let upgraded: StoredSplashPrefs = { ...parsed }
	if (version < 2) upgraded = upgradeUntouched(upgraded, LEGACY_SPLASH_PREFS_V1)
	if (version < 3) upgraded = upgradeUntouched(upgraded, LEGACY_SPLASH_PREFS_V2)
	upgraded.version = SPLASH_PREFS_VERSION
	return upgraded
}

export const SPLASH_PREFS_LIMITS = {
	logoScale: { min: 50, max: 150, step: 5 },
	logoIntensity: { min: 0, max: 200, step: 10 },
	logoGlow: { min: 0, max: 200, step: 10 },
	progressHeight: { min: 4, max: 16, step: 1 },
	progressWidth: { min: 40, max: 100, step: 5 },
	starDensity: { min: 0, max: 200, step: 10 },
	starSpeed: { min: 0, max: 200, step: 10 },
	nebulaIntensity: { min: 0, max: 200, step: 10 },
	gridIntensity: { min: 0, max: 200, step: 10 },
	animationSpeed: { min: 25, max: 200, step: 5 },
	minDisplayMs: { min: 0, max: 6000, step: 100 },
	fadeOutMs: { min: 0, max: 3000, step: 50 },
} as const

function clampNumber(
	value: unknown,
	limits: { min: number; max: number },
	fallback: number,
): number {
	const parsed = typeof value === 'number' ? value : Number(value)
	if (!Number.isFinite(parsed)) return fallback
	return Math.min(limits.max, Math.max(limits.min, parsed))
}

function loadPrefs(): SplashPrefs {
	const defaults = { ...DEFAULT_SPLASH_PREFS }
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (!raw) return defaults
		const parsed = upgradeLegacyPrefs(JSON.parse(raw) as StoredSplashPrefs)
		return {
			logoScale: clampNumber(parsed.logoScale, SPLASH_PREFS_LIMITS.logoScale, defaults.logoScale),
			logoAnimation: SPLASH_LOGO_ANIMATIONS.includes(parsed.logoAnimation as SplashLogoAnimation)
				? (parsed.logoAnimation as SplashLogoAnimation)
				: defaults.logoAnimation,
			logoIntensity: clampNumber(
				parsed.logoIntensity,
				SPLASH_PREFS_LIMITS.logoIntensity,
				defaults.logoIntensity,
			),
			logoGlow: clampNumber(parsed.logoGlow, SPLASH_PREFS_LIMITS.logoGlow, defaults.logoGlow),
			progressStyle: SPLASH_PROGRESS_STYLES.includes(parsed.progressStyle as SplashProgressStyle)
				? (parsed.progressStyle as SplashProgressStyle)
				: defaults.progressStyle,
			progressHeight: clampNumber(
				parsed.progressHeight,
				SPLASH_PREFS_LIMITS.progressHeight,
				defaults.progressHeight,
			),
			progressWidth: clampNumber(
				parsed.progressWidth,
				SPLASH_PREFS_LIMITS.progressWidth,
				defaults.progressWidth,
			),
			starDensity: clampNumber(
				parsed.starDensity,
				SPLASH_PREFS_LIMITS.starDensity,
				defaults.starDensity,
			),
			starSpeed: clampNumber(parsed.starSpeed, SPLASH_PREFS_LIMITS.starSpeed, defaults.starSpeed),
			nebulaIntensity: clampNumber(
				parsed.nebulaIntensity,
				SPLASH_PREFS_LIMITS.nebulaIntensity,
				defaults.nebulaIntensity,
			),
			gridFloor: typeof parsed.gridFloor === 'boolean' ? parsed.gridFloor : defaults.gridFloor,
			gridIntensity: clampNumber(
				parsed.gridIntensity,
				SPLASH_PREFS_LIMITS.gridIntensity,
				defaults.gridIntensity,
			),
			backgroundEffects:
				typeof parsed.backgroundEffects === 'boolean'
					? parsed.backgroundEffects
					: defaults.backgroundEffects,
			animationSpeed: clampNumber(
				parsed.animationSpeed,
				SPLASH_PREFS_LIMITS.animationSpeed,
				defaults.animationSpeed,
			),
			minDisplayMs: clampNumber(
				parsed.minDisplayMs,
				SPLASH_PREFS_LIMITS.minDisplayMs,
				defaults.minDisplayMs,
			),
			fadeOutMs: clampNumber(parsed.fadeOutMs, SPLASH_PREFS_LIMITS.fadeOutMs, defaults.fadeOutMs),
			showLoadingMessage:
				typeof parsed.showLoadingMessage === 'boolean'
					? parsed.showLoadingMessage
					: defaults.showLoadingMessage,
		}
	} catch {
		return defaults
	}
}

const initial = loadPrefs()

const logoScale = ref(initial.logoScale)
const logoAnimation = ref<SplashLogoAnimation>(initial.logoAnimation)
const logoIntensity = ref(initial.logoIntensity)
const logoGlow = ref(initial.logoGlow)
const progressStyle = ref<SplashProgressStyle>(initial.progressStyle)
const progressHeight = ref(initial.progressHeight)
const progressWidth = ref(initial.progressWidth)
const starDensity = ref(initial.starDensity)
const starSpeed = ref(initial.starSpeed)
const nebulaIntensity = ref(initial.nebulaIntensity)
const gridFloor = ref(initial.gridFloor)
const gridIntensity = ref(initial.gridIntensity)
const backgroundEffects = ref(initial.backgroundEffects)
const animationSpeed = ref(initial.animationSpeed)
const minDisplayMs = ref(initial.minDisplayMs)
const fadeOutMs = ref(initial.fadeOutMs)
const showLoadingMessage = ref(initial.showLoadingMessage)

/** Number of progress segments drawn by the segmented indicator. */
export const SPLASH_SEGMENT_COUNT = 12

function applyClasses(): void {
	if (typeof document === 'undefined') return
	const el = document.documentElement
	el.dataset.splashProgress = progressStyle.value
	el.dataset.splashLogo = logoAnimation.value
	el.classList.toggle('splash-no-grid', !gridFloor.value)
	el.classList.toggle('splash-no-stars', starDensity.value === 0)
	el.style.setProperty('--splash-logo-scale', String(logoScale.value / 100))
	el.style.setProperty('--splash-logo-intensity', String(logoIntensity.value / 100))
	el.style.setProperty('--splash-logo-glow', String(logoGlow.value / 100))
	el.style.setProperty('--splash-progress-height', `${progressHeight.value}px`)
	el.style.setProperty('--splash-progress-width', `${progressWidth.value}%`)
	el.style.setProperty('--splash-star-density', String(starDensity.value / 100))
	el.style.setProperty('--splash-star-speed', String(starSpeed.value / 100))
	el.style.setProperty('--splash-nebula-intensity', String(nebulaIntensity.value / 100))
	el.style.setProperty('--splash-grid-intensity', String(gridIntensity.value / 100))
	el.style.setProperty('--splash-animation-speed', String(animationSpeed.value / 100))
	el.style.setProperty('--splash-fade-duration', `${fadeOutMs.value}ms`)
}

function persist(): void {
	try {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				version: SPLASH_PREFS_VERSION,
				logoScale: logoScale.value,
				logoAnimation: logoAnimation.value,
				logoIntensity: logoIntensity.value,
				logoGlow: logoGlow.value,
				progressStyle: progressStyle.value,
				progressHeight: progressHeight.value,
				progressWidth: progressWidth.value,
				starDensity: starDensity.value,
				starSpeed: starSpeed.value,
				nebulaIntensity: nebulaIntensity.value,
				gridFloor: gridFloor.value,
				gridIntensity: gridIntensity.value,
				backgroundEffects: backgroundEffects.value,
				animationSpeed: animationSpeed.value,
				minDisplayMs: minDisplayMs.value,
				fadeOutMs: fadeOutMs.value,
				showLoadingMessage: showLoadingMessage.value,
			}),
		)
	} catch {
		/* localStorage unavailable — ignore, prefs just won't persist */
	}
}

let started = false

/**
 * Starts watching the loading screen preferences and applies them immediately.
 * Safe to call multiple times; the watcher is only registered once.
 * Call this once during app startup so saved prefs apply before first paint.
 */
export function startSplashScreenSettings(): void {
	if (started) return
	started = true
	watch(
		[
			logoScale,
			logoAnimation,
			logoIntensity,
			logoGlow,
			progressStyle,
			progressHeight,
			progressWidth,
			starDensity,
			starSpeed,
			nebulaIntensity,
			gridFloor,
			gridIntensity,
			backgroundEffects,
			animationSpeed,
			minDisplayMs,
			fadeOutMs,
			showLoadingMessage,
		],
		() => {
			applyClasses()
			persist()
		},
		{ immediate: true },
	)
}

export function resetSplashScreenPrefs(): void {
	logoScale.value = DEFAULT_SPLASH_PREFS.logoScale
	logoAnimation.value = DEFAULT_SPLASH_PREFS.logoAnimation
	logoIntensity.value = DEFAULT_SPLASH_PREFS.logoIntensity
	logoGlow.value = DEFAULT_SPLASH_PREFS.logoGlow
	progressStyle.value = DEFAULT_SPLASH_PREFS.progressStyle
	progressHeight.value = DEFAULT_SPLASH_PREFS.progressHeight
	progressWidth.value = DEFAULT_SPLASH_PREFS.progressWidth
	starDensity.value = DEFAULT_SPLASH_PREFS.starDensity
	starSpeed.value = DEFAULT_SPLASH_PREFS.starSpeed
	nebulaIntensity.value = DEFAULT_SPLASH_PREFS.nebulaIntensity
	gridFloor.value = DEFAULT_SPLASH_PREFS.gridFloor
	gridIntensity.value = DEFAULT_SPLASH_PREFS.gridIntensity
	backgroundEffects.value = DEFAULT_SPLASH_PREFS.backgroundEffects
	animationSpeed.value = DEFAULT_SPLASH_PREFS.animationSpeed
	minDisplayMs.value = DEFAULT_SPLASH_PREFS.minDisplayMs
	fadeOutMs.value = DEFAULT_SPLASH_PREFS.fadeOutMs
	showLoadingMessage.value = DEFAULT_SPLASH_PREFS.showLoadingMessage
}

export function useSplashScreen() {
	startSplashScreenSettings()
	return reactive({
		logoScale,
		logoAnimation,
		logoIntensity,
		logoGlow,
		progressStyle,
		progressHeight,
		progressWidth,
		starDensity,
		starSpeed,
		nebulaIntensity,
		gridFloor,
		gridIntensity,
		backgroundEffects,
		animationSpeed,
		minDisplayMs,
		fadeOutMs,
		showLoadingMessage,
	})
}
