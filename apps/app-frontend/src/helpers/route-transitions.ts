import { ref } from 'vue'

export type SkinPageTransition = 'fwd' | 'back'

/** The transition must survive both phases of an out-in swap (leave, then
 * enter), so the flag is only cleared after the enter — or by this watchdog
 * if the enter never runs (aborted navigation, suspense failure). */
const AUTO_CLEAR_DELAY_MS = 2500

const skinPageTransition = ref<SkinPageTransition | null>(null)
let autoClearTimer: ReturnType<typeof setTimeout> | undefined

/**
 * Marks the next route change as a Skin-selector jump so the router view plays
 * the dedicated zoom-crossfade instead of the generic page change: forward when
 * the skin button opens the Skin selector, back when it returns to the page the
 * user came from.
 */
export function setSkinPageTransition(direction: SkinPageTransition | null): void {
	skinPageTransition.value = direction
	clearTimeout(autoClearTimer)
	if (direction) {
		autoClearTimer = setTimeout(() => {
			skinPageTransition.value = null
		}, AUTO_CLEAR_DELAY_MS)
	}
}

export function useSkinPageTransition() {
	return skinPageTransition
}
