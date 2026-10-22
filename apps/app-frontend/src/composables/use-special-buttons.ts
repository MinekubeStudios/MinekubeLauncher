import {
	isSpecialButtonStyle,
	SPECIAL_BUTTON_STYLE_DEFAULT,
	SPECIAL_BUTTON_STYLE_IDS,
	type SpecialButtonStyleId,
} from '@modrinth/ui'
import { computed, reactive, ref, watch } from 'vue'

export const SPECIAL_BUTTON_STYLE_OPTIONS = SPECIAL_BUTTON_STYLE_IDS
export type SpecialButtonsStyle = SpecialButtonStyleId

const STORAGE_KEY = 'minekube-special-buttons'

function loadPreferred(): SpecialButtonsStyle {
	try {
		const stored = localStorage.getItem(STORAGE_KEY)
		if (isSpecialButtonStyle(stored)) return stored
	} catch {
		// Private browsing can reject storage. Fall back to the brand style.
	}
	return SPECIAL_BUTTON_STYLE_DEFAULT
}

const preferred = ref<SpecialButtonsStyle>(loadPreferred())
const preview = ref<SpecialButtonsStyle | null>(null)
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
		document.documentElement.dataset.specialButtons = value
	},
	{ immediate: true },
)

export function useSpecialButtons() {
	return reactive({
		preferred,
		preview,
		active,
		options: SPECIAL_BUTTON_STYLE_OPTIONS,
	})
}
