import { prepareThemeColorTransition } from '@modrinth/ui'
import { computed, reactive, ref, watch } from 'vue'

export const THEME_OPTIONS = [
	'system',
	'light',
	'dark',
	'windows',
	'macos',
	'linux',
	'oled',
	'retro',
	'parchment',
	'ember',
	'abyss',
	'lagoon',
	'bloom',
	'nether',
	'cinder',
] as const
export const DARK_THEMES = [
	'dark',
	'windows',
	'linux',
	'oled',
	'retro',
	'ember',
	'abyss',
	'lagoon',
	'bloom',
	'nether',
	'cinder',
] as const

export type ColorTheme = (typeof THEME_OPTIONS)[number]
export type DarkTheme = (typeof DARK_THEMES)[number]
type Theme = Exclude<ColorTheme, 'system'>
type NativeTheme = 'light' | 'dark'

const PREFERRED_THEME_KEY = 'modrinth-theme'
const PREFERRED_DARK_THEME_KEY = 'modrinth-preferred-dark-theme'
const MODE_CLASSES = THEME_OPTIONS.map((option) => `${option}-mode`)
let hadStoredPreference = false

export function isDarkTheme(theme: string): theme is DarkTheme {
	return (DARK_THEMES as readonly string[]).includes(theme)
}

export function isLightTheme(theme: string): boolean {
	return theme === 'light' || theme === 'macos' || theme === 'parchment'
}

export function normalizeColorTheme(theme: string | null | undefined): ColorTheme {
	if (!theme) return 'system'
	if ((THEME_OPTIONS as readonly string[]).includes(theme)) return theme as ColorTheme
	return 'system'
}

function normalizeDarkTheme(theme: string | null | undefined): DarkTheme {
	const normalized = normalizeColorTheme(theme)
	return isDarkTheme(normalized) ? normalized : 'dark'
}

function loadPreferredTheme(): ColorTheme {
	try {
		const stored = window.localStorage.getItem(PREFERRED_THEME_KEY)
		if (stored) {
			hadStoredPreference = true
			return normalizeColorTheme(stored)
		}
	} catch {
		// storage blocked or full
	}

	return 'system'
}

function loadPreferredDarkTheme(): DarkTheme {
	try {
		return normalizeDarkTheme(window.localStorage.getItem(PREFERRED_DARK_THEME_KEY))
	} catch {
		return 'dark'
	}
}

const preferred = ref<ColorTheme>(loadPreferredTheme())
const preview = ref<ColorTheme | null>(null)
const preferredDark = ref<DarkTheme>(loadPreferredDarkTheme())
const advancedRendering = ref(true)
const nativeThemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
const native = ref<NativeTheme>(nativeThemeQuery.matches ? 'dark' : 'light')
const active = computed<Theme>(() => {
	const selectedTheme = preview.value ?? preferred.value
	if (selectedTheme !== 'system') return selectedTheme
	return native.value === 'light' ? 'light' : preferredDark.value
})

nativeThemeQuery.addEventListener('change', (event) => {
	native.value = event.matches ? 'dark' : 'light'
})

watch(preferred, (selectedTheme) => {
	if (isDarkTheme(selectedTheme)) preferredDark.value = selectedTheme
})

watch(
	preferred,
	(theme) => {
		try {
			window.localStorage.setItem(PREFERRED_THEME_KEY, theme)
		} catch {
			// storage blocked or full
		}
	},
	{ immediate: true },
)

watch(preferredDark, (theme) => {
	try {
		window.localStorage.setItem(PREFERRED_DARK_THEME_KEY, theme)
	} catch {
		// storage blocked or full
	}
})

watch(
	active,
	(theme, previousTheme) => {
		if (previousTheme && previousTheme !== theme) {
			prepareThemeColorTransition()
		}

		const html = document.documentElement
		for (const className of MODE_CLASSES) {
			html.classList.remove(className)
		}
		html.classList.add(`${theme}-mode`)
		html.classList.toggle('theme-dark', isDarkTheme(theme))
	},
	{ immediate: true },
)

function applyAccountAppearance(appearance: { auto: boolean; theme: string }): void {
	const theme = normalizeColorTheme(appearance.theme)
	if (isDarkTheme(theme)) {
		preferredDark.value = theme
	}

	if (appearance.auto) {
		preferred.value = 'system'
		return
	}

	preferred.value = theme
}

const theme = reactive({
	preferred,
	preview,
	preferredDark,
	active,
	native,
	advancedRendering,
	options: THEME_OPTIONS,
	hadStoredPreference,
	applyAccountAppearance,
})

export function useTheme() {
	return theme
}
