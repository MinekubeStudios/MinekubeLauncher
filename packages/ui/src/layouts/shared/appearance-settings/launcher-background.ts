/**
 * Shared description of the launcher background feature.
 *
 * Imported images live in the desktop app because only it knows about its
 * storage. The component library only needs to agree on how a wallpaper is
 * named and which background styles exist.
 */

/** The theme background is used — no wallpaper at all. */
export const LAUNCHER_BACKGROUND_NONE = 'none'

/** Prefix of the ids of the wallpapers that ship with the launcher. */
export const BUILTIN_LAUNCHER_BACKGROUND_PREFIX = 'builtin:'

/** Prefix of the ids of wallpapers imported by the player. */
export const CUSTOM_LAUNCHER_BACKGROUND_PREFIX = 'custom:'

export const LAUNCHER_BACKGROUND_MODES = ['blur', 'sharp'] as const

export type LauncherBackgroundMode = (typeof LAUNCHER_BACKGROUND_MODES)[number]

/** A wallpaper shown in the picker: built in, or imported by the player. */
export interface LauncherBackgroundOption {
	/** Stable wallpaper id: `builtin:<slug>` or `custom:<uuid>`. */
	id: string
	/** Already localized display name. */
	label: string
	/** Image used for the tile preview. */
	previewUrl: string
	/** Imported images can be removed from the library. */
	custom?: boolean
}

export function isLauncherBackgroundMode(value: string): value is LauncherBackgroundMode {
	return (LAUNCHER_BACKGROUND_MODES as readonly string[]).includes(value)
}

export function isBuiltinLauncherBackground(id: string): boolean {
	return id.startsWith(BUILTIN_LAUNCHER_BACKGROUND_PREFIX)
}

export function isCustomLauncherBackground(id: string): boolean {
	return id.startsWith(CUSTOM_LAUNCHER_BACKGROUND_PREFIX)
}

/** Builds the wallpaper id used for a stored custom wallpaper. */
export function customLauncherBackgroundId(key: string): string {
	return `${CUSTOM_LAUNCHER_BACKGROUND_PREFIX}${key}`
}

/** Extracts the storage key from a custom wallpaper id. */
export function customLauncherBackgroundKey(id: string): string {
	return isCustomLauncherBackground(id) ? id.slice(CUSTOM_LAUNCHER_BACKGROUND_PREFIX.length) : id
}
