import { computed, ref, watch } from 'vue'

/**
 * Minekube Launcher — Visual settings.
 *
 * One source of truth for every decorative layer of the launcher: interface
 * motion, the ambient effects canvas and the 3D companion. The choices are
 * stored in localStorage and mirrored onto `<html>` as classes and data
 * attributes, so stylesheets react instantly and nothing has to be prop-drilled.
 *
 * Classes on `<html>`:
 *   `no-animations`        every animation and transition is switched off
 *   `enhanced-animations`  the motion system is on (`data-motion` names the profile)
 *   `anim-style-<profile>` the active motion profile, for profile-specific rules
 *   `enhanced-effects`     the ambient effects layer is on (`data-effect-style` names it)
 *   `motion-reduced`       the operating system asks for reduced motion
 *   `ui-galaxy-outline`    buttons and switches carry the animated galaxy outline
 *   `data-ui-glow`         `gold` or `magenta` interface glow (absent when off)
 */

const STORAGE_KEY = 'minekube:visual'
const STORAGE_VERSION_KEY = `${STORAGE_KEY}:version`
const STORAGE_VERSION = '3'

/** Motion profiles of the interface motion system. */
export type AnimationStyle = 'smooth' | 'playful' | 'snappy' | 'cinematic' | 'arcade'

export const ANIMATION_STYLES: AnimationStyle[] = [
	'smooth',
	'playful',
	'snappy',
	'cinematic',
	'arcade',
]

/** Scenes of the ambient effects layer. */
export type EffectStyle =
	| 'cubes'
	| 'embers'
	| 'snow'
	| 'fireflies'
	| 'aurora'
	| 'galaxy'
	| 'lightning'

export const EFFECT_STYLES: EffectStyle[] = [
	'cubes',
	'embers',
	'snow',
	'fireflies',
	'aurora',
	'galaxy',
	'lightning',
]

/** Colour of the optional glow on text, buttons and switches. */
export type InterfaceGlow = 'off' | 'gold' | 'magenta'

export const INTERFACE_GLOWS: InterfaceGlow[] = ['off', 'gold', 'magenta']

interface VisualPrefs {
	animationsEnabled: boolean
	enhancedAnimations: boolean
	enhancedEffects: boolean
	animationStyle: AnimationStyle
	effectStyle: EffectStyle
	sidebarCharacter: boolean
	characterReactions: boolean
	interfaceGlow: InterfaceGlow
	galaxyOutline: boolean
}

const DEFAULT_PREFS: VisualPrefs = {
	animationsEnabled: true,
	enhancedAnimations: true,
	enhancedEffects: true,
	animationStyle: 'smooth',
	effectStyle: 'cubes',
	sidebarCharacter: false,
	characterReactions: true,
	interfaceGlow: 'off',
	galaxyOutline: false,
}

function readBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === 'boolean' ? value : fallback
}

function readChoice<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
	return typeof value === 'string' && (options as readonly string[]).includes(value)
		? (value as T)
		: fallback
}

function loadPrefs(): VisualPrefs {
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (!raw) return { ...DEFAULT_PREFS }
		const parsed = JSON.parse(raw) as Partial<Record<keyof VisualPrefs, unknown>>
		// Preferences written before version 3 take on the new defaults once:
		// ambient effects on, the (beta) sidebar character off.
		const adoptNewDefaults = localStorage.getItem(STORAGE_VERSION_KEY) !== STORAGE_VERSION
		return {
			animationsEnabled: readBoolean(parsed.animationsEnabled, DEFAULT_PREFS.animationsEnabled),
			enhancedAnimations: readBoolean(parsed.enhancedAnimations, DEFAULT_PREFS.enhancedAnimations),
			enhancedEffects: adoptNewDefaults
				? DEFAULT_PREFS.enhancedEffects
				: readBoolean(parsed.enhancedEffects, DEFAULT_PREFS.enhancedEffects),
			animationStyle: readChoice(
				parsed.animationStyle,
				ANIMATION_STYLES,
				DEFAULT_PREFS.animationStyle,
			),
			effectStyle: readChoice(parsed.effectStyle, EFFECT_STYLES, DEFAULT_PREFS.effectStyle),
			sidebarCharacter: adoptNewDefaults
				? DEFAULT_PREFS.sidebarCharacter
				: readBoolean(parsed.sidebarCharacter, DEFAULT_PREFS.sidebarCharacter),
			characterReactions: readBoolean(parsed.characterReactions, DEFAULT_PREFS.characterReactions),
			interfaceGlow: readChoice(parsed.interfaceGlow, INTERFACE_GLOWS, DEFAULT_PREFS.interfaceGlow),
			galaxyOutline: readBoolean(parsed.galaxyOutline, DEFAULT_PREFS.galaxyOutline),
		}
	} catch {
		return { ...DEFAULT_PREFS }
	}
}

const initial = loadPrefs()
const animationsEnabled = ref(initial.animationsEnabled)
const enhancedAnimations = ref(initial.enhancedAnimations)
const enhancedEffects = ref(initial.enhancedEffects)
const animationStyle = ref<AnimationStyle>(initial.animationStyle)
export const effectStyle = ref<EffectStyle>(initial.effectStyle)
const sidebarCharacter = ref(initial.sidebarCharacter)
const characterReactions = ref(initial.characterReactions)
const interfaceGlow = ref<InterfaceGlow>(initial.interfaceGlow)
const galaxyOutline = ref(initial.galaxyOutline)

const reducedMotionQuery =
	typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null

/** True while the operating system asks applications to reduce motion. */
export const systemReducedMotion = ref(reducedMotionQuery?.matches ?? false)
reducedMotionQuery?.addEventListener('change', (event) => {
	systemReducedMotion.value = event.matches
})

/** True while the interface motion system is on. */
export const motionActive = computed(() => animationsEnabled.value && enhancedAnimations.value)

/** True when the ambient effects layer should render. */
export const effectsActive = computed(
	() => enhancedEffects.value && animationsEnabled.value && !systemReducedMotion.value,
)

/** True when the 3D companion may be shown in the right sidebar. */
export const sidebarCharacterActive = computed(
	() => sidebarCharacter.value && animationsEnabled.value,
)

/** True when the companion may react to what happens in the launcher. */
export const characterReactionsActive = computed(
	() => characterReactions.value && sidebarCharacterActive.value && !systemReducedMotion.value,
)

function applyToDocument(): void {
	if (typeof document === 'undefined') return
	const root = document.documentElement
	const motionOn = motionActive.value
	root.classList.toggle('no-animations', !animationsEnabled.value)
	root.classList.toggle('enhanced-animations', motionOn)
	root.classList.toggle('enhanced-effects', enhancedEffects.value && animationsEnabled.value)
	root.classList.toggle('motion-reduced', systemReducedMotion.value)
	for (const style of ANIMATION_STYLES) {
		root.classList.toggle(`anim-style-${style}`, motionOn && animationStyle.value === style)
	}
	if (motionOn) root.dataset.motion = animationStyle.value
	else delete root.dataset.motion
	root.dataset.effectStyle = effectStyle.value
	if (interfaceGlow.value === 'off') delete root.dataset.uiGlow
	else root.dataset.uiGlow = interfaceGlow.value
	root.classList.toggle('ui-galaxy-outline', galaxyOutline.value)
}

function persist(): void {
	try {
		const prefs: VisualPrefs = {
			animationsEnabled: animationsEnabled.value,
			enhancedAnimations: enhancedAnimations.value,
			enhancedEffects: enhancedEffects.value,
			animationStyle: animationStyle.value,
			effectStyle: effectStyle.value,
			sidebarCharacter: sidebarCharacter.value,
			characterReactions: characterReactions.value,
			interfaceGlow: interfaceGlow.value,
			galaxyOutline: galaxyOutline.value,
		}
		localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
		localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION)
	} catch {
		// Storage unavailable: the choice still applies for this session.
	}
}

let started = false

/**
 * Applies the saved visual preferences and keeps `<html>` in sync with them.
 * Call once during startup, before the app mounts, so the first frame already
 * has the right classes. Further calls are no-ops.
 */
export function startVisualSettings(): void {
	if (started) return
	started = true
	watch(
		[
			animationsEnabled,
			enhancedAnimations,
			enhancedEffects,
			animationStyle,
			effectStyle,
			sidebarCharacter,
			characterReactions,
			interfaceGlow,
			galaxyOutline,
		],
		() => {
			applyToDocument()
			persist()
		},
		{ immediate: true },
	)
	watch(systemReducedMotion, applyToDocument)
}

export function useVisualSettings() {
	startVisualSettings()
	return {
		animationsEnabled,
		enhancedAnimations,
		enhancedEffects,
		animationStyle,
		effectStyle,
		sidebarCharacter,
		characterReactions,
		interfaceGlow,
		galaxyOutline,
	}
}
