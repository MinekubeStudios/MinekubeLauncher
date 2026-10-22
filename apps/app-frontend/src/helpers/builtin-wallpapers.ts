import dungeonsFull from '@/assets/wallpapers/dungeons-ii-valorie.webp'
import dungeonsThumb from '@/assets/wallpapers/dungeons-ii-valorie-thumb.webp'
import javaFull from '@/assets/wallpapers/java-edition.webp'
import javaThumb from '@/assets/wallpapers/java-edition-thumb.webp'
import logoFull from '@/assets/wallpapers/minekube-logo.webp'
import logoThumb from '@/assets/wallpapers/minekube-logo-thumb.webp'
import pvpFull from '@/assets/wallpapers/minekube-pvp-overlay.webp'
import pvpThumb from '@/assets/wallpapers/minekube-pvp-overlay-thumb.webp'
import studiosV1Full from '@/assets/wallpapers/minekube-studios-v1.webp'
import studiosV1Thumb from '@/assets/wallpapers/minekube-studios-v1-thumb.webp'
import studiosV2Full from '@/assets/wallpapers/minekube-studios-v2.webp'
import studiosV2Thumb from '@/assets/wallpapers/minekube-studios-v2-thumb.webp'

/**
 * Wallpapers that ship with the launcher. They are bundled files (2560 px
 * WebP, plus a small preview for the picker), so choosing one never touches
 * the network, and only the selected one is ever loaded at full size.
 */
export interface BuiltinWallpaper {
	/** `builtin:<slug>` */
	id: string
	/** Proper name, shown as is in every language. */
	name: string
	url: string
	thumbUrl: string
}

export const BUILTIN_WALLPAPERS: readonly BuiltinWallpaper[] = [
	{ id: 'builtin:java-edition', name: 'Java Edition', url: javaFull, thumbUrl: javaThumb },
	{
		id: 'builtin:minekube-studios-v1',
		name: 'Minekube Studios V1',
		url: studiosV1Full,
		thumbUrl: studiosV1Thumb,
	},
	{ id: 'builtin:minekube-logo', name: 'Minekube Logo', url: logoFull, thumbUrl: logoThumb },
	{
		id: 'builtin:dungeons-ii-valorie',
		name: 'Dungeons II Valorie',
		url: dungeonsFull,
		thumbUrl: dungeonsThumb,
	},
	{
		id: 'builtin:minekube-pvp-overlay',
		name: 'Minekube PvP OverLay',
		url: pvpFull,
		thumbUrl: pvpThumb,
	},
	{
		id: 'builtin:minekube-studios-v2',
		name: 'Minekube Studios V2',
		url: studiosV2Full,
		thumbUrl: studiosV2Thumb,
	},
]

export function findBuiltinWallpaper(id: string): BuiltinWallpaper | undefined {
	return BUILTIN_WALLPAPERS.find((wallpaper) => wallpaper.id === id)
}
