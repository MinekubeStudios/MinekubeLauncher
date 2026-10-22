/**
 * Global (singleton) state for the fullscreen Minecraft-launching overlay.
 *
 * Exists as a plain TS module (not a Vue composable) on purpose: the helpers
 * that actually invoke the game (helpers/instance.ts `run`) need to be able
 * to signal the UI without a component context.
 */

export type LaunchOverlayPhase = 'preparing' | 'jvm_booting' | 'loading_game' | 'window_ready'
export type LaunchOverlayDismissReason = 'game_started' | 'manual' | 'terminated'

export interface LaunchOverlayState {
	visible: boolean
	phase: LaunchOverlayPhase
	dismissReason: LaunchOverlayDismissReason
	instanceId: string | null
	instanceName: string | null
	startedAt: number
}

const PHASE_ORDER: Record<LaunchOverlayPhase, number> = {
	preparing: 0,
	jvm_booting: 1,
	loading_game: 2,
	window_ready: 3,
}

const SAFETY_TIMEOUT_MS = 180_000

const state: LaunchOverlayState = {
	visible: false,
	phase: 'preparing',
	dismissReason: 'game_started',
	instanceId: null,
	instanceName: null,
	startedAt: 0,
}

let safetyTimer: ReturnType<typeof setTimeout> | null = null
let completionTimer: ReturnType<typeof setTimeout> | null = null

type Listener = () => void

const listeners = new Set<Listener>()

export function getLaunchOverlayState(): Readonly<LaunchOverlayState> {
	return state
}

export function subscribeLaunchOverlayState(listener: Listener): () => void {
	listeners.add(listener)
	return () => listeners.delete(listener)
}

function emit(): void {
	for (const listener of listeners) {
		try {
			listener()
		} catch {
			// swallow listener errors so one bad subscriber can't break launch
		}
	}
}

function clearTimers(): void {
	if (safetyTimer !== null) {
		clearTimeout(safetyTimer)
		safetyTimer = null
	}
	if (completionTimer !== null) {
		clearTimeout(completionTimer)
		completionTimer = null
	}
}

export function showLaunchOverlay(
	instance?: {
		id?: string | null
		name?: string | null
	} | null,
): void {
	const nextId = instance?.id ?? null
	const nextName = instance?.name ?? null

	// If already visible for the same instance (e.g. lazy name resolution),
	// just update the instance name without resetting progress/timers.
	if (state.visible && nextId && state.instanceId === nextId) {
		if (nextName && state.instanceName !== nextName) {
			state.instanceName = nextName
			emit()
		}
		return
	}

	clearTimers()
	state.visible = true
	state.phase = 'preparing'
	state.dismissReason = 'game_started'
	state.instanceId = nextId
	state.instanceName = nextName
	state.startedAt = Date.now()
	safetyTimer = setTimeout(() => {
		hideLaunchOverlay('terminated')
	}, SAFETY_TIMEOUT_MS)
	emit()
}

export function setLaunchOverlayPhase(phase: LaunchOverlayPhase, instanceId?: string | null): void {
	if (!state.visible) return
	if (instanceId && state.instanceId && state.instanceId !== instanceId) return
	if (PHASE_ORDER[phase] <= PHASE_ORDER[state.phase]) return
	state.phase = phase
	emit()
}

/**
 * Called as soon as the actual Minecraft game window / client is detected in
 * the OS. Advances the progress bar to 100 % ("window_ready") and then begins
 * the slow, smooth fade-out transition.
 */
export function completeAndHideLaunchOverlay(instanceId?: string | null): void {
	if (!state.visible) return
	if (instanceId && state.instanceId && state.instanceId !== instanceId) return
	if (completionTimer !== null) return

	state.phase = 'window_ready'
	state.dismissReason = 'game_started'
	emit()

	completionTimer = setTimeout(() => {
		completionTimer = null
		if (!state.visible) return
		clearTimers()
		state.visible = false
		emit()
	}, 280)
}

export function hideLaunchOverlay(reason: LaunchOverlayDismissReason = 'terminated'): void {
	clearTimers()
	if (!state.visible) return
	state.dismissReason = reason
	state.visible = false
	emit()
}

export function isMinecraftGameWindowLogLine(message: string | null | undefined): boolean {
	if (!message) return false
	return (
		message.includes('Backend library: LWJGL') ||
		message.includes('LWJGL Version:') ||
		message.includes('OpenAL initialized') ||
		message.includes('Sound engine started') ||
		message.includes('Narrator library') ||
		(message.includes('Created:') && message.includes('textures/atlas'))
	)
}

export function isMinecraftEarlyBootLogLine(message: string | null | undefined): boolean {
	if (!message) return false
	return (
		message.includes('Loading Minecraft') ||
		message.includes('ModLauncher') ||
		message.includes('FabricLoader') ||
		message.includes('NeoForge') ||
		message.includes('SpongePowered MIXIN') ||
		message.includes('Setting user:') ||
		message.includes('Datafixer') ||
		message.includes('Launching target')
	)
}
