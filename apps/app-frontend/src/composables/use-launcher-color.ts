import {
	findLauncherGradient,
	isLauncherColorHex,
	LAUNCHER_COLOR_THEME,
	launcherGradientCss,
	type LauncherGradientPreset,
	normalizeLauncherColorHex,
} from '@modrinth/ui'
import { computed, reactive, ref, watch } from 'vue'

export type LauncherColorSetting = string

const STORAGE_KEY = 'minekube-launcher-color'

const OVERRIDE_PROPERTIES = [
	'--color-brand',
	'--color-brand-highlight',
	'--color-brand-shadow',
	'--color-accent-contrast',
	'--color-button-bg-selected',
	'--color-button-text-selected',
	'--color-focus-ring',
	'--loading-bar-gradient',
	'--brand-gradient-bg',
	'--brand-gradient-strong-bg',
	'--brand-gradient-border',
	'--mk-brand-gradient',
] as const

interface Rgb {
	r: number
	g: number
	b: number
}

function parseHex(value: string): Rgb | null {
	if (!isLauncherColorHex(value)) return null
	const n = parseInt(normalizeLauncherColorHex(value).slice(1), 16)
	return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function mixChannel(channel: number, target: number, amount: number): number {
	return Math.round(channel + (target - channel) * amount)
}

function mixHex(hex: string, target: number, amount: number): string {
	const rgb = parseHex(hex)
	if (!rgb) return hex
	const r = mixChannel(rgb.r, target, amount)
	const g = mixChannel(rgb.g, target, amount)
	const b = mixChannel(rgb.b, target, amount)
	return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

function contrastColor(hex: string): string {
	const rgb = parseHex(hex)
	if (!rgb) return '#ffffff'
	const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255
	return luminance > 0.55 ? '#141018' : '#ffffff'
}

function rgba(hex: string, alpha: number): string {
	const rgb = parseHex(hex)
	return rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})` : hex
}

/** Contrast for text on a gradient: dark only when every stop is light. */
function gradientContrast(preset: LauncherGradientPreset): string {
	return preset.stops.every((stop) => contrastColor(stop) !== '#ffffff') ? '#141018' : '#ffffff'
}

let appliedValue: LauncherColorSetting | null = null

function applyLauncherColor(value: LauncherColorSetting): void {
	if (typeof document === 'undefined') return
	// Recoloring touches styles across the whole launcher; never do it twice
	// for the same value.
	if (value === appliedValue) return
	appliedValue = value
	const root = document.documentElement
	const gradient = findLauncherGradient(value)

	if (value === LAUNCHER_COLOR_THEME) {
		for (const property of OVERRIDE_PROPERTIES) {
			root.style.removeProperty(property)
		}
		delete root.dataset.launcherGradient
		return
	}

	const hex = gradient ? gradient.accent : normalizeLauncherColorHex(value)
	const rgb = parseHex(hex)
	if (!rgb) return
	const { r, g, b } = rgb
	const contrast = gradient ? gradientContrast(gradient) : contrastColor(hex)

	if (gradient) {
		const first = gradient.stops[0] ?? hex
		const end = gradient.stops[gradient.stops.length - 1] ?? hex
		root.dataset.launcherGradient = gradient.id
		root.style.setProperty('--mk-brand-gradient', launcherGradientCss(gradient))
		root.style.setProperty('--color-brand', hex)
		root.style.setProperty('--color-brand-highlight', rgba(hex, 0.28))
		root.style.setProperty('--color-brand-shadow', rgba(hex, 0.65))
		root.style.setProperty('--color-accent-contrast', contrast)
		root.style.setProperty('--color-button-bg-selected', hex)
		root.style.setProperty('--color-button-text-selected', contrast)
		root.style.setProperty('--color-focus-ring', hex)
		root.style.setProperty(
			'--loading-bar-gradient',
			`linear-gradient(to right, ${gradient.stops.join(', ')})`,
		)
		root.style.setProperty(
			'--brand-gradient-bg',
			`linear-gradient(0deg, ${rgba(first, 0.16)} 0%, ${rgba(end, 0.05)} 100%)`,
		)
		root.style.setProperty(
			'--brand-gradient-strong-bg',
			`linear-gradient(270deg, ${rgba(end, 0.22)} 0%, ${rgba(first, 0.08)} 100%)`,
		)
		root.style.setProperty('--brand-gradient-border', rgba(hex, 0.28))
		return
	}

	delete root.dataset.launcherGradient
	root.style.removeProperty('--mk-brand-gradient')

	root.style.setProperty('--color-brand', hex)
	root.style.setProperty('--color-brand-highlight', `rgba(${r}, ${g}, ${b}, 0.28)`)
	root.style.setProperty('--color-brand-shadow', `rgba(${r}, ${g}, ${b}, 0.65)`)
	root.style.setProperty('--color-accent-contrast', contrast)
	root.style.setProperty('--color-button-bg-selected', hex)
	root.style.setProperty('--color-button-text-selected', contrast)
	root.style.setProperty('--color-focus-ring', hex)
	root.style.setProperty(
		'--loading-bar-gradient',
		`linear-gradient(to right, ${mixHex(hex, 255, 0.35)}, ${hex}, ${mixHex(hex, 0, 0.2)})`,
	)
	root.style.setProperty(
		'--brand-gradient-bg',
		`linear-gradient(0deg, rgba(${r}, ${g}, ${b}, 0.16) 0%, rgba(${r}, ${g}, ${b}, 0.05) 100%)`,
	)
	root.style.setProperty(
		'--brand-gradient-strong-bg',
		`linear-gradient(270deg, rgba(${r}, ${g}, ${b}, 0.22) 0%, rgba(${r}, ${g}, ${b}, 0.08) 100%)`,
	)
	root.style.setProperty('--brand-gradient-border', `rgba(${r}, ${g}, ${b}, 0.28)`)
}

function normalizeSetting(value: string | null | undefined): LauncherColorSetting {
	if (!value) return LAUNCHER_COLOR_THEME
	if (value === LAUNCHER_COLOR_THEME) return LAUNCHER_COLOR_THEME
	if (isLauncherColorHex(value)) return normalizeLauncherColorHex(value)
	if (findLauncherGradient(value)) return value
	return LAUNCHER_COLOR_THEME
}

function loadPreferred(): LauncherColorSetting {
	try {
		return normalizeSetting(localStorage.getItem(STORAGE_KEY))
	} catch {
		return LAUNCHER_COLOR_THEME
	}
}

const preferred = ref<LauncherColorSetting>(loadPreferred())
const preview = ref<LauncherColorSetting | null>(null)
const active = computed(() => preview.value ?? preferred.value)

watch(
	preferred,
	(value) => {
		try {
			localStorage.setItem(STORAGE_KEY, value)
		} catch {
			// Ignore storage failures; the in-memory choice still applies this session.
		}
	},
	{ immediate: true },
)

watch(
	active,
	(value) => {
		applyLauncherColor(value)
	},
	{ immediate: true },
)

export function useLauncherColor() {
	return reactive({
		preferred,
		preview,
		active,
	})
}
