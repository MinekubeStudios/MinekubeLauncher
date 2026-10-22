<script setup lang="ts">
import { computed, ref } from 'vue'

import SettingsDisclosure from '#ui/components/base/SettingsDisclosure.vue'
import Toggle from '#ui/components/base/Toggle.vue'
import { useVIntl } from '#ui/composables'

import AppearanceSettingsIconThemeSelector from './components/appearance-settings-icon-theme-selector.vue'
import AppearanceSettingsLauncherBackgroundSelector from './components/appearance-settings-launcher-background-selector.vue'
import AppearanceSettingsLauncherColorSelector from './components/appearance-settings-launcher-color-selector.vue'
import AppearanceSettingsOutlineThemeSelector from './components/appearance-settings-outline-theme-selector.vue'
import AppearanceSettingsSpecialButtonsSelector from './components/appearance-settings-special-buttons-selector.vue'
import AppearanceSettingsThemeSelector from './components/appearance-settings-theme-selector.vue'
import AppearanceSettingRow from './components/AppearanceSettingRow.vue'
import ProjectLayoutSelector from './components/ProjectLayoutSelector.vue'
import type { LauncherBackgroundMode } from './launcher-background'
import { appearanceSettingsMessages as messages } from './messages'
import { injectAppearanceSettings } from './providers'

const appearance = injectAppearanceSettings()
const { formatMessage } = useVIntl()

const theme = appearance.theme
const iconTheme = appearance.iconTheme
const launcherColor = appearance.launcherColor
const launcherBackground = appearance.launcherBackground
const outlineTheme = appearance.outlineTheme
const currentTheme = theme.current
const themeOptions = theme.options
const mainThemeIds = ['light', 'dark', 'oled', 'windows', 'macos', 'linux'] as const
const mainThemeIdSet = new Set<string>(mainThemeIds)
const mainThemeOptions = computed(() =>
	mainThemeIds.filter((option) => themeOptions.value.includes(option)),
)
const specialThemeOptions = computed(() =>
	themeOptions.value.filter((option) => option !== 'system' && !mainThemeIdSet.has(option)),
)
const specialThemesExpanded = ref(false)
const iconThemeCurrent = iconTheme?.current
const iconThemeOptions = iconTheme?.options
const specialButtons = appearance.specialButtons
const specialButtonsCurrent = specialButtons?.current
const specialButtonsOptions = specialButtons?.options
const launcherColorCurrent = launcherColor?.current
const launcherBackgroundCurrent = launcherBackground?.current
const launcherBackgroundMode = launcherBackground?.mode
const launcherBackgroundTransparent = launcherBackground?.transparent
const launcherBackgroundOptions = launcherBackground?.options
const launcherBackgroundImporting = launcherBackground?.importing
const outlineThemeCurrent = outlineTheme?.current
const outlineThemeOptions = outlineTheme?.options
const systemTheme = theme.system
const preferredDarkTheme = theme.preferredDark
const advancedRendering = appearance.advancedRendering.value
const nativeDecorations = appearance.nativeDecorations
const nativeDecorationsValue = nativeDecorations?.value
const projectLayouts = appearance.projectLayouts
const projectLayoutValues = projectLayouts?.value
const externalLinksNewTab = appearance.externalLinksNewTab
const externalLinksNewTabValue = externalLinksNewTab?.value
const sidebarPreferences = appearance.sidebarPreferences
const sidebarPreferenceValues = sidebarPreferences?.value

const advancedCustomizationExpanded = ref(false)

const advancedCustomizationCount = computed(
	() => [iconTheme, specialButtons, outlineTheme].filter(Boolean).length,
)

function updateFollowSystem(enabled: boolean): void {
	void theme.update(enabled ? 'system' : systemTheme.value === 'light' ? 'light' : 'dark')
}

function updateIconTheme(value: string): void {
	void iconTheme?.update(value)
}

function updateSpecialButtons(value: string): void {
	void specialButtons?.update(value)
}

function updateLauncherColor(value: string): void {
	void launcherColor?.update(value)
}

function updateLauncherBackground(value: string): void {
	void launcherBackground?.update(value)
}

function updateLauncherBackgroundMode(value: string): void {
	void launcherBackground?.updateMode(value as LauncherBackgroundMode)
}

function updateOutlineTheme(value: string): void {
	void outlineTheme?.update(value)
}
</script>

<template>
	<div>
		<section>
			<div class="flex flex-col gap-1">
				<h2 class="m-0 text-xl font-semibold text-contrast">
					{{ formatMessage(messages.colorThemeTitle) }}
				</h2>
				<p class="m-0 text-secondary">
					{{ formatMessage(messages.colorThemeDescription) }}
				</p>
			</div>

			<AppearanceSettingRow
				class="mt-4"
				control-id="follow-system-theme"
				:title="formatMessage(messages.followSystemTitle)"
				:description="formatMessage(messages.followSystemDescription)"
			>
				<template #default="{ labelledBy }">
					<Toggle
						id="follow-system-theme"
						:model-value="currentTheme === 'system'"
						:aria-labelledby="labelledBy"
						@update:model-value="updateFollowSystem"
					/>
				</template>
			</AppearanceSettingRow>

			<AppearanceSettingsThemeSelector
				class="mt-4"
				:aria-label="formatMessage(messages.colorThemeTitle)"
				:model-value="currentTheme"
				:theme-options="mainThemeOptions"
				:system-theme-color="systemTheme"
				:preferred-dark-theme="preferredDarkTheme"
				@update:model-value="theme.update"
			/>

			<SettingsDisclosure
				v-if="specialThemeOptions.length"
				v-model="specialThemesExpanded"
				class="mt-5"
				:heading-level="3"
				:hidden-count="specialThemeOptions.length"
				:title="formatMessage(messages.otherSpecialThemesTitle)"
				:description="formatMessage(messages.otherSpecialThemesDescription)"
			>
				<AppearanceSettingsThemeSelector
					:aria-label="formatMessage(messages.otherSpecialThemesTitle)"
					:model-value="currentTheme"
					:theme-options="specialThemeOptions"
					:system-theme-color="systemTheme"
					:preferred-dark-theme="preferredDarkTheme"
					@update:model-value="theme.update"
				/>
			</SettingsDisclosure>
		</section>

		<section v-if="launcherColor" class="mt-8 border-0 border-t border-solid border-divider pt-6">
			<div class="flex flex-col gap-1">
				<h2 class="m-0 text-xl font-semibold text-contrast">
					{{ formatMessage(messages.launcherColorTitle) }}
				</h2>
				<p class="m-0 text-secondary">
					{{ formatMessage(messages.launcherColorDescription) }}
				</p>
			</div>
			<AppearanceSettingsLauncherColorSelector
				class="mt-4"
				:model-value="launcherColorCurrent"
				@update:model-value="updateLauncherColor"
			/>
		</section>

		<section
			v-if="launcherBackground"
			class="mt-8 border-0 border-t border-solid border-divider pt-6"
		>
			<div class="flex flex-col gap-1">
				<h2 class="m-0 text-xl font-semibold text-contrast">
					{{ formatMessage(messages.launcherBackgroundTitle) }}
				</h2>
				<p class="m-0 text-secondary">
					{{ formatMessage(messages.launcherBackgroundDescription) }}
				</p>
			</div>
			<AppearanceSettingsLauncherBackgroundSelector
				class="mt-4"
				:model-value="launcherBackgroundCurrent ?? 'none'"
				:mode="launcherBackgroundMode ?? 'blur'"
				:transparent="launcherBackgroundTransparent ?? false"
				:options="launcherBackgroundOptions ?? []"
				:importing="launcherBackgroundImporting ?? false"
				@update:model-value="updateLauncherBackground"
				@update:mode="updateLauncherBackgroundMode"
				@update:transparent="launcherBackground?.updateTransparent($event)"
				@import="launcherBackground?.import()"
				@remove="launcherBackground?.remove($event)"
			/>
		</section>

		<section v-if="projectLayouts" class="mt-8 border-0 border-t border-solid border-divider pt-6">
			<div class="flex flex-col gap-1">
				<h2 class="m-0 text-xl font-semibold text-contrast">
					{{ formatMessage(messages.projectListLayoutsTitle) }}
				</h2>
				<p class="m-0 text-secondary">
					{{ formatMessage(messages.projectListLayoutsDescription) }}
				</p>
			</div>
			<div class="mt-4 flex flex-col gap-6">
				<ProjectLayoutSelector
					v-for="projectLayout in projectLayoutValues"
					:key="projectLayout.type"
					:title="formatMessage(messages[projectLayout.type])"
					:model-value="projectLayout.layout"
					@update:model-value="projectLayouts.update(projectLayout.type, $event)"
				/>
			</div>
		</section>

		<div class="mt-8 border-0 border-t border-solid border-divider pt-6">
			<div class="flex flex-col gap-6">
				<AppearanceSettingRow
					control-id="advanced-rendering"
					:title="formatMessage(messages.advancedRenderingTitle)"
					:description="formatMessage(messages.advancedRenderingDescription)"
				>
					<template #default="{ labelledBy }">
						<Toggle
							id="advanced-rendering"
							:model-value="advancedRendering"
							:aria-labelledby="labelledBy"
							@update:model-value="appearance.advancedRendering.update"
						/>
					</template>
				</AppearanceSettingRow>

				<AppearanceSettingRow
					v-if="externalLinksNewTab"
					control-id="external-links-new-tab"
					:title="formatMessage(messages.externalLinksNewTabTitle)"
					:description="formatMessage(messages.externalLinksNewTabDescription)"
				>
					<template #default="{ labelledBy }">
						<Toggle
							id="external-links-new-tab"
							:model-value="externalLinksNewTabValue ?? false"
							:aria-labelledby="labelledBy"
							@update:model-value="externalLinksNewTab.update"
						/>
					</template>
				</AppearanceSettingRow>

				<template v-if="sidebarPreferences">
					<AppearanceSettingRow
						control-id="search-layout-toggle"
						:title="formatMessage(messages.rightAlignedFiltersSidebarTitle)"
						:description="formatMessage(messages.rightAlignedFiltersSidebarDescription)"
					>
						<template #default="{ labelledBy }">
							<Toggle
								id="search-layout-toggle"
								:model-value="sidebarPreferenceValues?.right_aligned_search ?? false"
								:aria-labelledby="labelledBy"
								@update:model-value="sidebarPreferences.update('right_aligned_search', $event)"
							/>
						</template>
					</AppearanceSettingRow>

					<AppearanceSettingRow
						control-id="project-layout-toggle"
						:title="formatMessage(messages.leftAlignedContentSidebarTitle)"
						:description="formatMessage(messages.leftAlignedContentSidebarDescription)"
					>
						<template #default="{ labelledBy }">
							<Toggle
								id="project-layout-toggle"
								:model-value="sidebarPreferenceValues?.left_aligned_content ?? false"
								:aria-labelledby="labelledBy"
								@update:model-value="sidebarPreferences.update('left_aligned_content', $event)"
							/>
						</template>
					</AppearanceSettingRow>
				</template>

				<AppearanceSettingRow
					v-if="nativeDecorations"
					control-id="native-decorations"
					:title="formatMessage(messages.nativeDecorationsTitle)"
					:description="formatMessage(messages.nativeDecorationsDescription)"
				>
					<template #default="{ labelledBy }">
						<Toggle
							id="native-decorations"
							:model-value="nativeDecorationsValue ?? false"
							:aria-labelledby="labelledBy"
							@update:model-value="nativeDecorations.update"
						/>
					</template>
				</AppearanceSettingRow>
			</div>
		</div>

		<SettingsDisclosure
			v-model="advancedCustomizationExpanded"
			class="mt-8"
			:hidden-count="advancedCustomizationCount"
			:title="formatMessage(messages.advancedCustomizationTitle)"
			:description="formatMessage(messages.advancedCustomizationDescription)"
		>
			<section v-if="iconTheme">
				<div class="flex flex-col gap-1">
					<h3 class="m-0 text-lg font-semibold text-contrast">
						{{ formatMessage(messages.iconThemeTitle) }}
					</h3>
					<p class="m-0 text-secondary">
						{{ formatMessage(messages.iconThemeDescription) }}
					</p>
				</div>
				<AppearanceSettingsIconThemeSelector
					class="mt-4"
					:model-value="iconThemeCurrent"
					:options="iconThemeOptions ?? []"
					@update:model-value="updateIconTheme"
				/>
			</section>

			<section v-if="specialButtons">
				<div class="flex flex-col gap-1">
					<h3 class="m-0 text-lg font-semibold text-contrast">
						{{ formatMessage(messages.specialButtonsTitle) }}
					</h3>
					<p class="m-0 text-secondary">
						{{ formatMessage(messages.specialButtonsDescription) }}
					</p>
				</div>
				<AppearanceSettingsSpecialButtonsSelector
					class="mt-4"
					:model-value="specialButtonsCurrent"
					:options="specialButtonsOptions ?? []"
					@update:model-value="updateSpecialButtons"
				/>
			</section>

			<section v-if="outlineTheme">
				<div class="flex flex-col gap-1">
					<h3 class="m-0 text-lg font-semibold text-contrast">
						{{ formatMessage(messages.outlineThemeTitle) }}
					</h3>
					<p class="m-0 text-secondary">
						{{ formatMessage(messages.outlineThemeDescription) }}
					</p>
				</div>
				<AppearanceSettingsOutlineThemeSelector
					class="mt-4"
					:model-value="outlineThemeCurrent"
					:options="outlineThemeOptions ?? []"
					@update:model-value="updateOutlineTheme"
				/>
			</section>
		</SettingsDisclosure>
	</div>
</template>
