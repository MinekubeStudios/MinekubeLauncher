import { OUTLINE_THEME_IDS, type OutlineThemeId } from '@modrinth/ui'
import { computed, reactive, ref, watch } from 'vue'

export const OUTLINE_THEME_OPTIONS = OUTLINE_THEME_IDS
export type OutlineTheme = OutlineThemeId

const STORAGE_KEY = 'minekube-outline-theme'

function isOutlineTheme(value: string | null): value is OutlineTheme {
	return !!value && (OUTLINE_THEME_OPTIONS as readonly string[]).includes(value)
}

function loadPreferred(): OutlineTheme {
	try {
		const stored = localStorage.getItem(STORAGE_KEY)
		if (isOutlineTheme(stored)) return stored
	} catch {
		// Private browsing can reject storage. Fall back to no outline.
	}
	return 'none'
}

const preferred = ref<OutlineTheme>(loadPreferred())
const preview = ref<OutlineTheme | null>(null)
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
		if (typeof document === 'undefined') return
		document.documentElement.dataset.outlineTheme = value
	},
	{ immediate: true },
)

export function useOutlineTheme() {
	return reactive({
		preferred,
		preview,
		active,
		options: OUTLINE_THEME_OPTIONS,
	})
}
