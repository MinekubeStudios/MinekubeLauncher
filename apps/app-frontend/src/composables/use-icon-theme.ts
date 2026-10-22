import { ICON_THEME_IDS, type IconThemeId } from '@modrinth/ui'
import { computed, reactive, ref, watch } from 'vue'

export const ICON_THEME_OPTIONS = ICON_THEME_IDS
export type IconTheme = IconThemeId

const STORAGE_KEY = 'minekube-icon-theme'

function isIconTheme(value: string | null): value is IconTheme {
	return !!value && (ICON_THEME_OPTIONS as readonly string[]).includes(value)
}

function loadPreferred(): IconTheme {
	try {
		const stored = localStorage.getItem(STORAGE_KEY)
		if (isIconTheme(stored)) return stored
	} catch {
		// Private browsing can reject storage. Fall back to the default pack.
	}
	return 'outline'
}

const preferred = ref<IconTheme>(loadPreferred())
const preview = ref<IconTheme | null>(null)
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
		document.documentElement.dataset.iconTheme = value
	},
	{ immediate: true },
)

export function useIconTheme() {
	return reactive({
		preferred,
		preview,
		active,
		options: ICON_THEME_OPTIONS,
	})
}
