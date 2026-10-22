/**
 * The dividers a player drags (recent instances, recent worlds, instance
 * groups) pin a cursor onto the whole window while the drag is live, because
 * the pointer routinely travels far outside the handle. That is set with an
 * `!important` rule on every element, so a drag that never reports its end
 * leaves the entire launcher stuck with a resize or grabbing cursor.
 *
 * A drag can lose its end event in several ways that have nothing to do with
 * the handle itself: a re-render while an install job streams progress, the
 * pointer being released outside the window, the window losing focus, or the
 * handle being replaced mid-drag. Everything goes through here instead, so
 * the cursor classes are always removed again.
 */

const CURSOR_CLASSES = [
	'quick-instance-dragging',
	'recent-worlds-resizing',
	'instance-group-reordering',
] as const

export type DragCursorClass = (typeof CURSOR_CLASSES)[number]

const activeDrags = new Map<DragCursorClass, HTMLElement>()

let watching = false

function removeCursorClass(cls: DragCursorClass, root: HTMLElement | null) {
	if (root) {
		root.classList.remove(cls)
	}
	document.body.classList.remove(cls)
	document.documentElement.classList.remove(cls)
}

function endDragFor(cls: DragCursorClass) {
	const root = activeDrags.get(cls)
	if (root === undefined) {
		return
	}
	activeDrags.delete(cls)
	removeCursorClass(cls, root)
}

/** Called on pointer down, before the handle takes pointer capture. */
export function beginDragCursor(cls: DragCursorClass, root: HTMLElement = document.body) {
	watchForLostDrags()
	activeDrags.set(cls, root)
	root.classList.add(cls)
}

/** Safe to call more than once, and safe to call when no drag is running. */
export function endDragCursor(cls: DragCursorClass) {
	endDragFor(cls)
}

/** Drops every drag cursor, for the cases where an end event never arrived. */
export function clearDragCursors() {
	for (const cls of CURSOR_CLASSES) {
		endDragFor(cls)
	}
}

function handlePointerEnd(event: PointerEvent) {
	if (event.pointerType === 'mouse' && event.button !== 0) {
		return
	}
	clearDragCursors()
}

function handlePointerMove(event: PointerEvent) {
	// A real drag always has a button held. A move with no buttons pressed
	// means its end event was swallowed — which happens when the pointer is
	// released after leaving the window — so the cursor is released here.
	if (activeDrags.size === 0 || event.buttons !== 0) {
		return
	}
	clearDragCursors()
}

function sweepStaleCursors() {
	// Runs after the pointer down handler of the element under the cursor, so
	// a drag that is starting right now has already registered itself.
	for (const cls of CURSOR_CLASSES) {
		if (!activeDrags.has(cls)) {
			removeCursorClass(cls, null)
		}
	}
}

function watchForLostDrags() {
	if (watching) {
		return
	}
	watching = true

	window.addEventListener('pointerup', handlePointerEnd, true)
	window.addEventListener('pointercancel', handlePointerEnd, true)
	window.addEventListener('pointermove', handlePointerMove, true)
	window.addEventListener('blur', clearDragCursors)
	window.addEventListener('pointerdown', sweepStaleCursors, true)
	window.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') {
			clearDragCursors()
		}
	})
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') {
			clearDragCursors()
		}
	})
}
