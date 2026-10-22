import { reactive } from 'vue'

export const DEFAULT_FEATURE_FLAGS = {
	project_background: false,
	page_path: false,
	worlds_in_home: false,
	show_version_environment_column: false,
	server_ram_as_bytes_always_on: false,
	always_show_app_controls: false,
	always_show_download_manager: false,
	skip_non_essential_warnings: false,
	skip_unknown_pack_warning: false,
	i18n_debug: false,
	show_instance_play_time: false,
	compact_instance_cards: false,
	advanced_filters_collapsed: true,
	always_show_copy_details: false,
	hide_installed_modpacks: false,
	dismissed_photosensitivity_filter_warning: false,
	// Minekube Shield
	shield_strict: false,
	shield_game_mods: false,
}

export type FeatureFlag = keyof typeof DEFAULT_FEATURE_FLAGS
type FeatureFlags = Record<FeatureFlag, boolean>

const featureFlags = reactive<FeatureFlags>({ ...DEFAULT_FEATURE_FLAGS })

function getFeatureFlag(key: FeatureFlag): boolean {
	return featureFlags[key] ?? DEFAULT_FEATURE_FLAGS[key]
}

const appSettings = reactive({
	hideNametagSkinsPage: false,
	toggleSidebar: false,
	showFilesTabInInstances: true,
	showWorldsTabInInstances: true,
	showScreenshotsTabInInstances: false,
	nativeDecorations: false,
	devMode: false,
	featureFlags,
	getFeatureFlag,
})

export function useAppSettings() {
	return appSettings
}
