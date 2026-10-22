/**
 * Special buttons styles — the look of the Play button, the Stop button and
 * the small Play orbs, chosen in Settings → Appearance.
 *
 * A style is nothing but a set of CSS custom properties consumed by
 * `@modrinth/assets/styles/special-buttons.scss`, so the list below is the
 * single source of truth for both the settings UI and the stylesheet.
 */
export const SPECIAL_BUTTON_STYLE_IDS = [
	'minekube',
	'modrinth',
	'glass',
	'neon',
	'chrome',
	'arcade',
	'aurora',
	'minimal',
] as const

export type SpecialButtonStyleId = (typeof SPECIAL_BUTTON_STYLE_IDS)[number]

export const SPECIAL_BUTTON_STYLE_DEFAULT: SpecialButtonStyleId = 'minekube'

export function isSpecialButtonStyle(value: string | null): value is SpecialButtonStyleId {
	return !!value && (SPECIAL_BUTTON_STYLE_IDS as readonly string[]).includes(value)
}

/** Short, human-readable summary of the material each style imitates. */
export const SPECIAL_BUTTON_STYLE_NOTES: Record<SpecialButtonStyleId, string> = {
	minekube: 'Brand gradient',
	modrinth: 'Original app',
	glass: 'Frosted',
	neon: 'Glowing tube',
	chrome: 'Machined metal',
	arcade: 'Chunky key',
	aurora: 'Iridescent',
	minimal: 'Sharp lines',
}
