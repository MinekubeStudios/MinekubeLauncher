export const LAUNCHER_COLOR_THEME = 'theme'

export interface LauncherColorPreset {
	id: string
	hex: string
}

export const LAUNCHER_COLOR_PRESETS: readonly LauncherColorPreset[] = [
	{ id: 'gold', hex: '#fcc000' },
	{ id: 'tangerine', hex: '#ff6a00' },
	{ id: 'magenta', hex: '#fc0060' },
	{ id: 'rose', hex: '#ff3d8a' },
	{ id: 'violet', hex: '#8b5cf6' },
	{ id: 'sapphire', hex: '#2b7fff' },
	{ id: 'aqua', hex: '#00d7c7' },
	{ id: 'emerald', hex: '#1bd96a' },
	{ id: 'lime', hex: '#a3e635' },
]

/**
 * Gradient launcher colors. Stored as `gradient:<id>`. The launcher uses the
 * `accent` stop wherever a single solid color is needed (text, outlines) and
 * the full gradient on filled surfaces such as primary buttons, switches and
 * progress bars.
 */
export interface LauncherGradientPreset {
	id: string
	stops: readonly string[]
	angle: number
	accent: string
}

export const LAUNCHER_GRADIENT_PREFIX = 'gradient:'

export const LAUNCHER_GRADIENT_PRESETS: readonly LauncherGradientPreset[] = [
	{ id: 'sunset', stops: ['#fcc000', '#ff6a00', '#fc0060'], angle: 100, accent: '#ff6a00' },
	{ id: 'sunrise', stops: ['#eeb74a', '#ef7a8c', '#ef5baa'], angle: 100, accent: '#ef7a8c' },
	{ id: 'nebula', stops: ['#8b5cf6', '#ec4899', '#f97316'], angle: 110, accent: '#ec4899' },
	{ id: 'galaxy', stops: ['#4f46e5', '#8b5cf6', '#d946ef'], angle: 110, accent: '#8b5cf6' },
	{ id: 'lava', stops: ['#ffb000', '#ff3d00', '#c8004f'], angle: 100, accent: '#ff3d00' },
	{ id: 'ocean', stops: ['#2b7fff', '#06b6d4', '#00d7c7'], angle: 110, accent: '#06b6d4' },
	{ id: 'aurora', stops: ['#00d7c7', '#1bd96a', '#a3e635'], angle: 110, accent: '#1bd96a' },
	{ id: 'frost', stops: ['#a5f3fc', '#60a5fa', '#818cf8'], angle: 110, accent: '#60a5fa' },
	{ id: 'ender', stops: ['#10b981', '#14b8a6', '#6366f1'], angle: 110, accent: '#14b8a6' },
]

export function launcherGradientValue(id: string): string {
	return `${LAUNCHER_GRADIENT_PREFIX}${id}`
}

/** The gradient preset a stored value refers to, if any. */
export function findLauncherGradient(value: string): LauncherGradientPreset | undefined {
	if (!value.startsWith(LAUNCHER_GRADIENT_PREFIX)) return undefined
	const id = value.slice(LAUNCHER_GRADIENT_PREFIX.length)
	return LAUNCHER_GRADIENT_PRESETS.find((preset) => preset.id === id)
}

export function launcherGradientCss(preset: LauncherGradientPreset): string {
	return `linear-gradient(${preset.angle}deg, ${preset.stops.join(', ')})`
}

export function isLauncherColorHex(value: string): boolean {
	return /^#[0-9a-f]{6}$/i.test(value)
}

export function normalizeLauncherColorHex(value: string): string {
	return value.toLowerCase()
}

export const OUTLINE_THEME_IDS = ['none', 'glow', 'rgb', 'neon', 'aurora'] as const

export type OutlineThemeId = (typeof OUTLINE_THEME_IDS)[number]
