import {
	customLauncherBackgroundId,
	customLauncherBackgroundKey,
	isCustomLauncherBackground,
	isLauncherBackgroundMode,
	LAUNCHER_BACKGROUND_NONE,
	type LauncherBackgroundMode,
} from '@modrinth/ui'
import { computed, reactive, ref, watch } from 'vue'

import { findBuiltinWallpaper } from '@/helpers/builtin-wallpapers'
import {
	createWallpaperKey,
	deleteStoredWallpaper,
	listStoredWallpapers,
	prepareWallpaperBlob,
	readWallpaperBlob,
	readWallpaperIndex,
	writeWallpaper,
	writeWallpaperIndex,
} from '@/helpers/launcher-wallpapers'

import { useTheme } from './use-theme'

export interface LauncherBackgroundCustomWallpaper {
	/** Wallpaper id, always prefixed with `custom:`. */
	id: string
	name: string
	/** Object URL of the stored image, empty until it has been read. */
	url: string
	addedAt: number
}

export interface LauncherBackgroundSetting {
	/** `none`, a `builtin:` id or a `custom:` id. */
	wallpaper: string
	mode: LauncherBackgroundMode
	/**
	 * Transparent mode: the whole launcher (top bar, sidebar, cards) turns to
	 * glass over the wallpaper. Off, only the page background shows it.
	 */
	transparent: boolean
}

const STORAGE_KEY = 'minekube-launcher-background'

const DEFAULT_SETTING: LauncherBackgroundSetting = {
	wallpaper: LAUNCHER_BACKGROUND_NONE,
	mode: 'blur',
	transparent: false,
}

/**
 * How much of the theme background is kept on top of the wallpaper. Lower
 * numbers show more of the picture; higher numbers keep text easier to read.
 */
const MODE_ALPHAS: Record<
	LauncherBackgroundMode,
	{ content: number; chrome: number; scrim: number; glass: number }
> = {
	blur: { content: 0.24, chrome: 0.52, scrim: 0.1, glass: 0.55 },
	sharp: { content: 0.3, chrome: 0.58, scrim: 0.12, glass: 0.66 },
}

function isKnownWallpaper(id: string): boolean {
	return (
		id === LAUNCHER_BACKGROUND_NONE ||
		isCustomLauncherBackground(id) ||
		findBuiltinWallpaper(id) !== undefined
	)
}

function normalizeSetting(value: unknown): LauncherBackgroundSetting {
	if (typeof value !== 'object' || value === null) return { ...DEFAULT_SETTING }
	const candidate = value as Partial<LauncherBackgroundSetting>
	const wallpaper =
		typeof candidate.wallpaper === 'string' && isKnownWallpaper(candidate.wallpaper)
			? candidate.wallpaper
			: LAUNCHER_BACKGROUND_NONE
	const mode =
		typeof candidate.mode === 'string' && isLauncherBackgroundMode(candidate.mode)
			? candidate.mode
			: DEFAULT_SETTING.mode
	const transparent =
		typeof candidate.transparent === 'boolean' ? candidate.transparent : DEFAULT_SETTING.transparent
	return { wallpaper, mode, transparent }
}

function loadPreferred(): LauncherBackgroundSetting {
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (!raw) return { ...DEFAULT_SETTING }
		return normalizeSetting(JSON.parse(raw))
	} catch {
		return { ...DEFAULT_SETTING }
	}
}

const preferred = ref<LauncherBackgroundSetting>(loadPreferred())
const preview = ref<LauncherBackgroundSetting | null>(null)
const active = computed(() => preview.value ?? preferred.value)
const activeWallpaper = computed(() => active.value.wallpaper)
const activeMode = computed(() => active.value.mode)
const activeTransparent = computed(() => active.value.transparent === true)
const activeUrl = ref<string | null>(null)
const importing = ref(false)
const customWallpapers = ref<LauncherBackgroundCustomWallpaper[]>(
	readWallpaperIndex().map((meta) => ({
		id: customLauncherBackgroundId(meta.id),
		name: meta.name,
		url: '',
		addedAt: meta.addedAt,
	})),
)

/** Object URLs handed out for stored images, keyed by wallpaper id. */
const customUrls = new Map<string, string>()
const theme = useTheme()

watch(
	preferred,
	(value) => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
		} catch {
			// Ignore storage failures; the choice still applies this session.
		}
	},
	{ immediate: true },
)

function persistLibraryIndex(): void {
	writeWallpaperIndex(
		customWallpapers.value.map((wallpaper) => ({
			id: customLauncherBackgroundKey(wallpaper.id),
			name: wallpaper.name,
			addedAt: wallpaper.addedAt,
		})),
	)
}

async function ensureCustomUrl(id: string): Promise<string | null> {
	const cached = customUrls.get(id)
	if (cached) return cached

	const blob = await readWallpaperBlob(customLauncherBackgroundKey(id))
	if (!blob) return null

	const url = URL.createObjectURL(blob)
	customUrls.set(id, url)
	const item = customWallpapers.value.find((wallpaper) => wallpaper.id === id)
	if (item && item.url !== url) item.url = url
	return url
}

function forgetCustomWallpaper(id: string): void {
	const url = customUrls.get(id)
	if (url) {
		URL.revokeObjectURL(url)
		customUrls.delete(id)
	}
	customWallpapers.value = customWallpapers.value.filter((wallpaper) => wallpaper.id !== id)
	persistLibraryIndex()
}

function clearWallpaperSelection(id: string): void {
	if (preferred.value.wallpaper === id) {
		preferred.value = { ...preferred.value, wallpaper: LAUNCHER_BACKGROUND_NONE }
	}
	if (preview.value?.wallpaper === id) {
		preview.value = { ...preview.value, wallpaper: LAUNCHER_BACKGROUND_NONE }
	}
}

/** Reads the wallpaper library from IndexedDB and resolves tile previews. */
async function loadLibrary(): Promise<void> {
	const stored = await listStoredWallpapers()
	customWallpapers.value = stored.map((meta) => {
		const id = customLauncherBackgroundId(meta.id)
		return {
			id,
			name: meta.name,
			url: customUrls.get(id) ?? '',
			addedAt: meta.addedAt,
		}
	})

	await Promise.all(stored.map((meta) => ensureCustomUrl(customLauncherBackgroundId(meta.id))))

	const missing = customWallpapers.value.filter((wallpaper) => !wallpaper.url)
	if (missing.length > 0) {
		customWallpapers.value = customWallpapers.value.filter((wallpaper) => wallpaper.url)
		persistLibraryIndex()
		for (const wallpaper of missing) clearWallpaperSelection(wallpaper.id)
	}
}

/** Stores a file chosen through the webview's file picker, without requiring FS path permissions. */
async function addWallpaper(file: File): Promise<string | null> {
	if (importing.value) return null
	importing.value = true
	try {
		const blob = await prepareWallpaperBlob(file)
		const key = createWallpaperKey()
		const displayName = file.name?.trim() || 'wallpaper'
		const addedAt = Date.now()

		const stored = await writeWallpaper({ id: key, name: displayName, addedAt }, blob)
		if (!stored)
			throw new Error('Could not save the image on this device. Please try another image.')

		const id = customLauncherBackgroundId(key)
		const url = URL.createObjectURL(blob)
		customUrls.set(id, url)
		customWallpapers.value = [{ id, name: displayName, url, addedAt }, ...customWallpapers.value]
		persistLibraryIndex()
		return id
	} finally {
		importing.value = false
	}
}

async function removeWallpaper(id: string): Promise<void> {
	if (!isCustomLauncherBackground(id)) return
	await deleteStoredWallpaper(customLauncherBackgroundKey(id))
	forgetCustomWallpaper(id)
	clearWallpaperSelection(id)
}

function parseColor(value: string): [number, number, number] | null {
	const raw = value.trim()
	if (raw.startsWith('#')) {
		const hex = raw.slice(1)
		if (hex.length === 3 || hex.length === 4) {
			const r = parseInt(hex[0] + hex[0], 16)
			const g = parseInt(hex[1] + hex[1], 16)
			const b = parseInt(hex[2] + hex[2], 16)
			return Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b) ? null : [r, g, b]
		}
		if (hex.length === 6 || hex.length === 8) {
			const r = parseInt(hex.slice(0, 2), 16)
			const g = parseInt(hex.slice(2, 4), 16)
			const b = parseInt(hex.slice(4, 6), 16)
			return Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b) ? null : [r, g, b]
		}
		return null
	}

	const match = raw.match(/rgba?\(([^)]+)\)/i)
	if (!match) return null
	const parts = match[1]
		.split(/[\s,/]+/)
		.filter(Boolean)
		.map(Number)
	if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) return null
	return [parts[0], parts[1], parts[2]]
}

function themeColor(
	variable: string,
	fallback: [number, number, number],
): [number, number, number] {
	if (typeof document === 'undefined') return fallback
	const raw = getComputedStyle(document.documentElement).getPropertyValue(variable)
	return parseColor(raw) ?? fallback
}

function rgba([r, g, b]: [number, number, number], alpha: number): string {
	return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Publishes the surface tints used on top of the wallpaper. The theme's own
 * colors are read from the document, so every color theme keeps its character.
 */
function applyLauncherBackground(): void {
	if (typeof document === 'undefined') return
	const root = document.documentElement
	const url = activeUrl.value

	if (activeWallpaper.value === LAUNCHER_BACKGROUND_NONE || !url) {
		delete root.dataset.launcherBackground
		delete root.dataset.launcherGlass
		for (const variable of SURFACE_VARIABLES) root.style.removeProperty(variable)
		return
	}

	const alpha = MODE_ALPHAS[activeMode.value] ?? MODE_ALPHAS.blur
	const content = themeColor('--color-bg', [22, 16, 20])
	const chrome = themeColor('--color-raised-bg', [48, 30, 36])

	root.dataset.launcherBackground = activeMode.value
	root.style.setProperty('--launcher-surface-bg', rgba(content, alpha.content))
	root.style.setProperty('--launcher-background-scrim', rgba(content, alpha.scrim))

	if (!activeTransparent.value) {
		// Only the page background shows the wallpaper; the top bar, the
		// sidebar and every card stay solid.
		delete root.dataset.launcherGlass
		root.style.removeProperty('--launcher-surface-raised')
		root.style.setProperty('--launcher-surface-sidebar', rgba(content, 1))
		for (const variable of GLASS_VARIABLES) root.style.removeProperty(variable)
		return
	}

	root.dataset.launcherGlass = ''
	root.style.setProperty('--launcher-surface-raised', rgba(chrome, alpha.chrome))
	root.style.setProperty('--launcher-surface-sidebar', rgba(content, alpha.content))
	root.style.setProperty('--launcher-glass-raised', rgba(chrome, alpha.glass))
	for (const [index, variable] of GLASS_SURFACES.entries()) {
		const color = themeColor(`--surface-${index + 1}`, chrome)
		root.style.setProperty(variable, rgba(color, alpha.glass))
	}
}

const GLASS_SURFACES = [
	'--launcher-glass-surface-1',
	'--launcher-glass-surface-2',
	'--launcher-glass-surface-3',
] as const
const GLASS_VARIABLES = ['--launcher-glass-raised', ...GLASS_SURFACES] as const
const SURFACE_VARIABLES = [
	'--launcher-surface-bg',
	'--launcher-surface-raised',
	'--launcher-surface-sidebar',
	'--launcher-background-scrim',
	...GLASS_VARIABLES,
] as const

watch(
	activeWallpaper,
	async (wallpaper) => {
		if (wallpaper === LAUNCHER_BACKGROUND_NONE) {
			activeUrl.value = null
			return
		}

		const builtin = findBuiltinWallpaper(wallpaper)
		if (builtin) {
			activeUrl.value = builtin.url
			return
		}

		if (!isCustomLauncherBackground(wallpaper)) {
			activeUrl.value = null
			return
		}

		// A stored image has to be read before it can be shown; until then the
		// interface simply keeps the ordinary theme background.
		activeUrl.value = null
		const url = await ensureCustomUrl(wallpaper)
		if (activeWallpaper.value !== wallpaper) return
		if (!url) {
			forgetCustomWallpaper(wallpaper)
			clearWallpaperSelection(wallpaper)
			return
		}
		activeUrl.value = url
	},
	{ immediate: true },
)

watch(
	[activeWallpaper, activeMode, activeTransparent, activeUrl, () => theme.active],
	() => applyLauncherBackground(),
	// After the DOM update, so a new theme's colors are already in place.
	{ immediate: true, flush: 'post' },
)

export function useLauncherBackground() {
	return reactive({
		preferred,
		preview,
		active,
		activeWallpaper,
		activeMode,
		activeTransparent,
		activeUrl,
		customWallpapers,
		importing,
		addWallpaper,
		removeWallpaper,
		loadLibrary,
	})
}
