import { getVersion } from '@tauri-apps/api/app'
import { invoke } from '@tauri-apps/api/core'
import { computed, ref, watch } from 'vue'

export const APP_UPDATE_POPUP_DELAY_MS = 24 * 60 * 60 * 1000

export const GITHUB_LATEST_RELEASE_URL =
	'https://github.com/MinekubeStudios/MinekubeLauncher/releases/latest'

const GITHUB_LATEST_RELEASE_API_URL =
	'https://api.github.com/repos/MinekubeStudios/MinekubeLauncher/releases/latest'

const UPDATE_PROMPT_STORAGE_KEY = 'modrinth-app-update-prompt-state'

const AUTO_UPDATES_STORAGE_KEY = 'minekube:automatic-updates'

/**
 * Whether the Launcher checks for, downloads and installs updates on its own.
 * Off by default: the player decides when to update (or stays on their
 * version) from the "Updates" menu in the toolbar, where they can also turn
 * this on. Installing a downloaded update always stays an explicit action.
 */
function loadAutoUpdatesEnabled(): boolean {
	try {
		const stored = localStorage.getItem(AUTO_UPDATES_STORAGE_KEY)
		return stored === 'true'
	} catch (error) {
		console.warn('Failed to read the automatic updates preference:', error)
		return false
	}
}

const autoUpdatesEnabled = ref(loadAutoUpdatesEnabled())

export function setAutoUpdatesEnabled(enabled: boolean): void {
	autoUpdatesEnabled.value = enabled
	try {
		localStorage.setItem(AUTO_UPDATES_STORAGE_KEY, String(enabled))
	} catch (error) {
		console.warn('Failed to persist the automatic updates preference:', error)
	}
}

/** Toggles automatic updates and returns the new state. */
export function toggleAutoUpdatesEnabled(): boolean {
	setAutoUpdatesEnabled(!autoUpdatesEnabled.value)
	return autoUpdatesEnabled.value
}

export interface AppUpdate {
	rid: number
	version: string
	currentVersion?: string
}

interface UpdatePromptState {
	version: string
	stage: AppUpdatePromptStage
	actionableSince: number
	lastUserActionAt?: number
	popupShownAt?: number
}

export type AppUpdatePromptStage = 'available' | 'downloaded'

interface AppUpdateActions {
	download?: () => Promise<void> | void
	install?: () => Promise<void> | void
	changelog?: () => Promise<void> | void
}

const progress = ref(0)
const metered = ref(true)
const finishedDownloading = ref(false)
const downloading = ref(false)
const restarting = ref(false)
const checking = ref(false)
const availableUpdate = ref<AppUpdate | null>(null)
const updateSize = ref<number | null>(null)
const updatesEnabled = ref(true)

let actions: AppUpdateActions = {}

function getCurrentAppUpdatePromptStage(): AppUpdatePromptStage {
	return finishedDownloading.value ? 'downloaded' : 'available'
}

export const appUpdateState = {
	progress,
	metered,
	finishedDownloading,
	downloading,
	restarting,
	checking,
	availableUpdate,
	updateSize,
	updatesEnabled,
	autoUpdatesEnabled,
	downloadProgress: computed(() => progress.value),
	downloadPercent: computed(() => Math.trunc(progress.value * 100)),
	isVisible: computed(() => !!availableUpdate.value && !restarting.value && updatesEnabled.value),
}

function readPromptState(): UpdatePromptState | null {
	try {
		const raw = localStorage.getItem(UPDATE_PROMPT_STORAGE_KEY)
		if (!raw) {
			return null
		}

		const parsed = JSON.parse(raw) as Partial<UpdatePromptState>
		if (!parsed.version || typeof parsed.actionableSince !== 'number') {
			return null
		}

		return {
			...parsed,
			stage: parsed.stage ?? 'available',
		} as UpdatePromptState
	} catch {
		return null
	}
}

function writePromptState(state: UpdatePromptState): void {
	try {
		localStorage.setItem(UPDATE_PROMPT_STORAGE_KEY, JSON.stringify(state))
	} catch (error) {
		console.warn('Failed to persist update prompt state:', error)
	}
}

export function markAppUpdateActionable(
	version: string,
	stage: AppUpdatePromptStage = 'available',
	now = Date.now(),
): void {
	const existing = readPromptState()
	if (existing?.version === version && existing.stage === stage) {
		return
	}

	writePromptState({
		version,
		stage,
		actionableSince: now,
	})
}

export function recordAppUpdateUserAction(
	version = availableUpdate.value?.version,
	stage: AppUpdatePromptStage = getCurrentAppUpdatePromptStage(),
): void {
	if (!version) {
		return
	}

	const now = Date.now()
	const existing = readPromptState()
	const isSamePrompt = existing?.version === version && existing.stage === stage
	writePromptState({
		version,
		stage,
		actionableSince: isSamePrompt ? existing.actionableSince : now,
		lastUserActionAt: now,
		popupShownAt: isSamePrompt ? existing.popupShownAt : undefined,
	})
}

export function markAppUpdatePopupShown(
	version: string,
	stage: AppUpdatePromptStage = 'available',
	now = Date.now(),
): void {
	const existing = readPromptState()
	const isSamePrompt = existing?.version === version && existing.stage === stage
	writePromptState({
		version,
		stage,
		actionableSince: isSamePrompt ? existing.actionableSince : now,
		lastUserActionAt: isSamePrompt ? existing.lastUserActionAt : undefined,
		popupShownAt: now,
	})
}

export function getNextAppUpdatePopupTime(
	version: string,
	stage: AppUpdatePromptStage = 'available',
): number | null {
	const existing = readPromptState()
	if (existing?.version !== version || existing.stage !== stage || existing.popupShownAt) {
		return null
	}

	return (
		Math.max(existing.actionableSince, existing.lastUserActionAt ?? 0) + APP_UPDATE_POPUP_DELAY_MS
	)
}

export function setAppUpdateActions(nextActions: AppUpdateActions): void {
	actions = nextActions
}

export async function downloadAvailableAppUpdate(): Promise<void> {
	recordAppUpdateUserAction(undefined, 'available')
	await actions.download?.()
}

export async function installAvailableAppUpdate(): Promise<void> {
	recordAppUpdateUserAction(undefined, 'downloaded')
	await actions.install?.()
}

export async function openAppUpdateChangelog(): Promise<void> {
	recordAppUpdateUserAction()
	await actions.changelog?.()
}

export interface GitHubReleaseInfo {
	version: string
	url: string
}

export function normalizeVersion(version: string): string {
	return version.trim().replace(/^v/i, '')
}

export function compareVersions(a: string, b: string): number {
	const aParts = normalizeVersion(a)
		.split('.')
		.map((part) => Number.parseInt(part, 10) || 0)
	const bParts = normalizeVersion(b)
		.split('.')
		.map((part) => Number.parseInt(part, 10) || 0)
	const length = Math.max(aParts.length, bParts.length)
	for (let i = 0; i < length; i++) {
		const diff = (aParts[i] ?? 0) - (bParts[i] ?? 0)
		if (diff !== 0) {
			return diff
		}
	}
	return 0
}

/**
 * Manually checks the configured update endpoints (the GitHub releases of the
 * Launcher) for a newer version and stores it in the shared update state.
 * Returns the available update, or null when the Launcher is up to date.
 */
export async function checkForAppUpdate(): Promise<AppUpdate | null> {
	if (checking.value) {
		return availableUpdate.value
	}
	checking.value = true
	try {
		const update = (await invoke('plugin:updater|check')) as AppUpdate | null
		if (update) {
			if (update.version !== availableUpdate.value?.version) {
				progress.value = 0
				finishedDownloading.value = false
				downloading.value = false
				updateSize.value = null
			}
			availableUpdate.value = update
		}
		return update
	} finally {
		checking.value = false
	}
}

/**
 * Asks the GitHub API for the latest Launcher release and returns it when it
 * is newer than the currently running version. Used as a fallback on builds
 * without the self-updater (and to detect releases the updater cannot
 * install by itself).
 */
export async function checkGitHubForNewerRelease(): Promise<GitHubReleaseInfo | null> {
	if (checking.value) {
		return null
	}
	checking.value = true
	try {
		const response = await fetch(GITHUB_LATEST_RELEASE_API_URL, {
			headers: { Accept: 'application/vnd.github+json' },
		})
		if (!response.ok) {
			return null
		}
		const release = (await response.json()) as {
			tag_name?: string
			html_url?: string
		}
		const version = normalizeVersion(release?.tag_name ?? '')
		if (!version || compareVersions(version, await getVersion()) <= 0) {
			return null
		}
		return {
			version,
			url: release?.html_url ?? GITHUB_LATEST_RELEASE_URL,
		}
	} finally {
		checking.value = false
	}
}

let stopAutoInstallWatch: (() => void) | null = null

/**
 * Installs the available update automatically as soon as its download
 * finishes (used by the manual "Aktualizace" button).
 */
export function requestAutoInstallOnDownloaded(): void {
	stopAutoInstallWatch?.()
	stopAutoInstallWatch = watch(finishedDownloading, (done) => {
		if (!done) {
			return
		}
		stopAutoInstallWatch?.()
		stopAutoInstallWatch = null
		void installAvailableAppUpdate()
	})
}
