const POINTER_CLASS = 'mk-pointer-input'
const NAVIGATION_KEYS = new Set([
	'Tab',
	'ArrowUp',
	'ArrowDown',
	'ArrowLeft',
	'ArrowRight',
	'Home',
	'End',
	'PageUp',
	'PageDown',
])

let started = false

/**
 * Focus rings are for keyboard navigation. Menus, dropdowns and dialogs move
 * focus back to their trigger when they close, and Chromium then paints the
 * ring even though the user only clicked. While the pointer is the active
 * input the ring is suppressed; the first navigation key brings it back.
 */
export function startInputModalityTracking(): void {
	if (started || typeof document === 'undefined') return
	started = true
	const root = document.documentElement
	root.classList.add(POINTER_CLASS)
	window.addEventListener(
		'pointerdown',
		() => {
			root.classList.add(POINTER_CLASS)
		},
		{ capture: true, passive: true },
	)
	window.addEventListener(
		'keydown',
		(event) => {
			if (NAVIGATION_KEYS.has(event.key)) root.classList.remove(POINTER_CLASS)
		},
		{ capture: true, passive: true },
	)
}
