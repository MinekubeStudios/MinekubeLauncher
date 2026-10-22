import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'

const STARTUP_FALLBACK_DELAY_MS = 10_000

const STARTING_CLASS = 'mk-window-starting'

let shown = false
let prepared = false
let closing = false

/**
 * Holds the splash entrance animation until the window is actually visible.
 * Call once during startup, after the saved visual settings have been applied.
 *
 * The window starts hidden, and CSS animations run while it is hidden too — so
 * without this the logo entrance would already be over by the time the window
 * appears. It is skipped when animations are off or reduced motion is asked for.
 */
export function prepareWindowArrive(): void {
	if (prepared || typeof document === 'undefined') return
	prepared = true
	if (document.documentElement.classList.contains('no-animations')) return
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
	document.documentElement.classList.add(STARTING_CLASS)
}

/**
 * Shows the main window, which starts hidden (`visible: false` in `tauri.conf.json`).
 * Safe to call multiple times; only the first call reaches the backend.
 *
 * The window appears at once and fully painted. The former fade-in held the
 * whole page invisible until the backend answered and then eased it in, which
 * made every start feel delayed; the window is now shown as soon as it is ready.
 */
export function showMainWindow(): void {
	if (shown) return
	shown = true

	invoke('show_window')
		.catch((error) => {
			shown = false
			console.error('Failed to show the main window', error)
		})
		.finally(() => {
			document.documentElement.classList.remove(STARTING_CLASS)
		})
}

/**
 * Closes the launcher window immediately. The window is hidden first, so it
 * disappears on the click while the backend finishes its shutdown work (saving
 * a pending skin change, stopping services) out of sight. Never throws: if the
 * close fails the window is shown again instead of staying invisible.
 */
export async function closeMainWindow(): Promise<void> {
	if (closing) return
	closing = true

	const appWindow = getCurrentWindow()
	let hidden = false
	try {
		await appWindow.hide()
		hidden = true
	} catch {
		// Hiding is only cosmetic; closing below still works without it.
	}

	try {
		await appWindow.close()
	} catch (error) {
		closing = false
		if (hidden) await appWindow.show().catch(() => {})
		console.error('Failed to close the launcher window', error)
	}
}

const SETTLING_CLASS = 'mk-window-settling'
/** How long transitions stay off after the window was restored or resized. */
const SETTLE_DURATION_MS = 160
let settleTimer: ReturnType<typeof setTimeout> | undefined
let settleGuardStarted = false

function settleWindow(): void {
	const root = document.documentElement
	root.classList.add(SETTLING_CLASS)
	if (settleTimer) clearTimeout(settleTimer)
	settleTimer = setTimeout(() => {
		settleTimer = undefined
		root.classList.remove(SETTLING_CLASS)
	}, SETTLE_DURATION_MS)
}

/**
 * Restoring the launcher from the taskbar (or resizing it) changes the
 * viewport, and every size-dependent transition then animated from the old
 * layout to the new one — open dialogs such as the settings briefly showed a
 * wrong size and structure. While the window settles, transitions are switched
 * off so the layout lands in its final state in the very first frame.
 */
export function startWindowSettleGuard(): void {
	if (settleGuardStarted || typeof document === 'undefined') return
	settleGuardStarted = true
	window.addEventListener('resize', settleWindow, { passive: true })
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') settleWindow()
	})
}

/**
 * Makes sure the window becomes visible even if the app fails to mount, so the launcher
 * can never keep running invisibly in the background.
 */
export function showMainWindowAfterTimeout(delay = STARTUP_FALLBACK_DELAY_MS): void {
	window.setTimeout(() => {
		if (shown) return
		console.error('Main window was not shown during startup, showing it anyway')
		showMainWindow()
	}, delay)
}
