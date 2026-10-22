<script setup lang="ts">
import {
	AppearanceSettingsLayout,
	injectNotificationManager,
	isLauncherBackgroundMode,
	LAUNCHER_BACKGROUND_NONE,
	provideAppearanceSettings,
	useSavable,
} from '@modrinth/ui'
import { platform } from '@tauri-apps/plugin-os'
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { useAppSettings } from '@/composables/use-app-settings.ts'
import { type IconTheme, useIconTheme } from '@/composables/use-icon-theme.ts'
import {
	type LauncherBackgroundSetting,
	useLauncherBackground,
} from '@/composables/use-launcher-background.ts'
import { useLauncherColor } from '@/composables/use-launcher-color.ts'
import { type OutlineTheme, useOutlineTheme } from '@/composables/use-outline-theme.ts'
import { type SpecialButtonsStyle, useSpecialButtons } from '@/composables/use-special-buttons.ts'
import { type ColorTheme, isDarkTheme, useTheme } from '@/composables/use-theme.ts'
import { BUILTIN_WALLPAPERS } from '@/helpers/builtin-wallpapers'
import { type AppSettings, get, set } from '@/helpers/settings.ts'
import { appSettingsModalContextKey } from '@/providers/app-settings-modal'

const { handleError } = injectNotificationManager()

const theme = useTheme()
const iconTheme = useIconTheme()
const launcherColor = useLauncherColor()
const launcherBackground = useLauncherBackground()
const wallpaperFileInput = ref<HTMLInputElement | null>(null)
const outlineTheme = useOutlineTheme()
const specialButtons = useSpecialButtons()
const appSettings = useAppSettings()
const settingsModal = inject(appSettingsModalContextKey, null)
const os = platform()

type AppearanceSettingsState = {
	theme: ColorTheme
	launcherColor: string
	launcherBackground: LauncherBackgroundSetting
	iconTheme: IconTheme
	specialButtons: SpecialButtonsStyle
	outlineTheme: OutlineTheme
	advancedRendering: boolean
	nativeDecorations: boolean
}

function getAppearanceSettingsState(): AppearanceSettingsState {
	return {
		theme: theme.preferred,
		launcherColor: launcherColor.preferred,
		launcherBackground: { ...launcherBackground.preferred },
		iconTheme: iconTheme.preferred,
		specialButtons: specialButtons.preferred,
		outlineTheme: outlineTheme.preferred,
		advancedRendering: theme.advancedRendering,
		nativeDecorations: appSettings.nativeDecorations,
	}
}

const { saved, current, changes, saving, hasChanges, reset, save } = useSavable(
	getAppearanceSettingsState,
	async () => {
		const value = current.value

		const nextSettings: AppSettings = {
			...(await get()),
			theme: value.theme,
			advanced_rendering: value.advancedRendering,
			native_decorations: value.nativeDecorations,
		}

		await set(nextSettings)
		if (isDarkTheme(value.theme)) {
			theme.preferredDark = value.theme
		}
		theme.preferred = value.theme
		theme.preview = null
		launcherColor.preferred = value.launcherColor
		launcherColor.preview = null
		launcherBackground.preferred = { ...value.launcherBackground }
		launcherBackground.preview = null
		iconTheme.preferred = value.iconTheme
		iconTheme.preview = null
		specialButtons.preferred = value.specialButtons
		specialButtons.preview = null
		outlineTheme.preferred = value.outlineTheme
		outlineTheme.preview = null
		theme.advancedRendering = value.advancedRendering
		appSettings.nativeDecorations = value.nativeDecorations
	},
)

const themeOptions = computed(() => theme.options)

const preferredDarkTheme = computed(() =>
	isDarkTheme(current.value.theme) ? current.value.theme : theme.preferredDark,
)

const launcherBackgroundOptions = computed(() => [
	...BUILTIN_WALLPAPERS.map((wallpaper) => ({
		id: wallpaper.id,
		label: wallpaper.name,
		previewUrl: wallpaper.thumbUrl,
	})),
	...launcherBackground.customWallpapers.map((wallpaper) => ({
		id: wallpaper.id,
		label: wallpaper.name,
		previewUrl: wallpaper.url,
		custom: true,
	})),
])

function setTheme(value: ColorTheme): void {
	current.value.theme = value
}

function setIconTheme(value: string): void {
	if ((iconTheme.options as readonly string[]).includes(value)) {
		current.value.iconTheme = value as IconTheme
	}
}

function setLauncherColor(value: string): void {
	current.value.launcherColor = value
}

function setLauncherBackground(value: string): void {
	current.value.launcherBackground = { ...current.value.launcherBackground, wallpaper: value }
}

function setLauncherBackgroundMode(value: string): void {
	if (!isLauncherBackgroundMode(value)) return
	current.value.launcherBackground = { ...current.value.launcherBackground, mode: value }
}

function setLauncherBackgroundTransparent(value: boolean): void {
	current.value.launcherBackground = { ...current.value.launcherBackground, transparent: value }
}

function importLauncherBackground(): void {
	wallpaperFileInput.value?.click()
}

async function onWallpaperFileSelected(event: Event): Promise<void> {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	input.value = ''
	if (!file) return
	const id = await launcherBackground.addWallpaper(file).catch(handleError)
	if (id) setLauncherBackground(id)
}

async function removeLauncherBackground(id: string): Promise<void> {
	await launcherBackground.removeWallpaper(id).catch(handleError)
	if (current.value.launcherBackground.wallpaper === id) {
		setLauncherBackground(LAUNCHER_BACKGROUND_NONE)
	}
}

function setSpecialButtons(value: string): void {
	if ((specialButtons.options as readonly string[]).includes(value)) {
		current.value.specialButtons = value as SpecialButtonsStyle
	}
}

function setOutlineTheme(value: string): void {
	if ((outlineTheme.options as readonly string[]).includes(value)) {
		current.value.outlineTheme = value as OutlineTheme
	}
}

function setAdvancedRendering(enabled: boolean): void {
	current.value.advancedRendering = enabled
}

function setNativeDecorations(enabled: boolean): void {
	current.value.nativeDecorations = enabled
}

watch(
	[() => current.value.theme, () => saved.value.theme],
	([selectedTheme, savedTheme]) => {
		theme.preview = selectedTheme === savedTheme ? null : selectedTheme
	},
	{ immediate: true },
)

watch(
	[() => current.value.launcherColor, () => saved.value.launcherColor],
	([selectedColor, savedColor]) => {
		launcherColor.preview = selectedColor === savedColor ? null : selectedColor
	},
	{ immediate: true },
)

watch(
	[() => current.value.launcherBackground, () => saved.value.launcherBackground],
	([selectedBackground, savedBackground]) => {
		const unchanged =
			selectedBackground.wallpaper === savedBackground.wallpaper &&
			selectedBackground.mode === savedBackground.mode &&
			selectedBackground.transparent === savedBackground.transparent
		launcherBackground.preview = unchanged ? null : { ...selectedBackground }
	},
	{ immediate: true, deep: true },
)

watch(
	[() => current.value.iconTheme, () => saved.value.iconTheme],
	([selectedTheme, savedTheme]) => {
		iconTheme.preview = selectedTheme === savedTheme ? null : selectedTheme
	},
	{ immediate: true },
)

watch(
	[() => current.value.specialButtons, () => saved.value.specialButtons],
	([selectedStyle, savedStyle]) => {
		specialButtons.preview = selectedStyle === savedStyle ? null : selectedStyle
	},
	{ immediate: true },
)

watch(
	[() => current.value.outlineTheme, () => saved.value.outlineTheme],
	([selectedTheme, savedTheme]) => {
		outlineTheme.preview = selectedTheme === savedTheme ? null : selectedTheme
	},
	{ immediate: true },
)

async function saveAppearanceSettings(): Promise<void> {
	try {
		await save()
	} catch {
		return
	}
}

onMounted(() => {
	void launcherBackground.loadLibrary()

	settingsModal?.registerUnsavedChangesController({
		hasChanges: () => hasChanges.value,
		getOriginal: () => saved.value,
		getModified: () => changes.value,
		isSaving: () => saving.value,
		reset,
		save: saveAppearanceSettings,
	})
})

onBeforeUnmount(() => {
	theme.preview = null
	launcherColor.preview = null
	launcherBackground.preview = null
	iconTheme.preview = null
	specialButtons.preview = null
	outlineTheme.preview = null
	settingsModal?.registerUnsavedChangesController(null)
})

provideAppearanceSettings({
	deferPersistence: true,
	theme: {
		current: computed(() => current.value.theme),
		options: themeOptions,
		system: computed(() => theme.native),
		preferredDark: preferredDarkTheme,
		set: setTheme,
	},
	launcherColor: {
		current: computed(() => current.value.launcherColor),
		set: setLauncherColor,
	},
	launcherBackground: {
		current: computed(() => current.value.launcherBackground.wallpaper),
		mode: computed(() => current.value.launcherBackground.mode),
		transparent: computed(() => current.value.launcherBackground.transparent),
		options: launcherBackgroundOptions,
		importing: computed(() => launcherBackground.importing),
		set: setLauncherBackground,
		setMode: setLauncherBackgroundMode,
		setTransparent: setLauncherBackgroundTransparent,
		import: importLauncherBackground,
		remove: removeLauncherBackground,
	},
	iconTheme: {
		current: computed(() => current.value.iconTheme),
		options: computed(() => iconTheme.options),
		set: setIconTheme,
	},
	specialButtons: {
		current: computed(() => current.value.specialButtons),
		options: computed(() => specialButtons.options),
		set: setSpecialButtons,
	},
	outlineTheme: {
		current: computed(() => current.value.outlineTheme),
		options: computed(() => outlineTheme.options),
		set: setOutlineTheme,
	},
	advancedRendering: {
		value: computed(() => current.value.advancedRendering),
		set: setAdvancedRendering,
	},
	nativeDecorations:
		os !== 'macos'
			? {
					value: computed(() => current.value.nativeDecorations),
					set: setNativeDecorations,
				}
			: undefined,
})
</script>

<template>
	<div>
		<AppearanceSettingsLayout />
		<input
			ref="wallpaperFileInput"
			type="file"
			accept="image/png,image/jpeg,image/webp,image/bmp,image/gif,image/avif"
			hidden
			@change="onWallpaperFileSelected"
		/>
	</div>
</template>
