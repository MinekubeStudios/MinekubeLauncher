<script setup lang="ts">
import { MinekubeLauncherIconV2 } from '@modrinth/assets'
import {
	commonMessages,
	commonSettingsMessages,
	defineMessage,
	defineMessages,
	injectNotificationManager,
	LoadingIndicator,
	ProgressBar,
	TabbedModal,
	UnsavedChangesPopup,
	useVIntl,
} from '@modrinth/ui'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { getVersion } from '@tauri-apps/api/app'
import { computed, inject, provide, ref } from 'vue'

import PrivacySettings from '@/components/ui/settings/account/PrivacySettings.vue'
import ProfileSettings from '@/components/ui/settings/account/ProfileSettings.vue'
import AppearanceSettings from '@/components/ui/settings/display/AppearanceSettings.vue'
import BehaviorSettings from '@/components/ui/settings/display/BehaviorSettings.vue'
import FeatureFlagSettings from '@/components/ui/settings/display/FeatureFlagSettings.vue'
import FeaturesSettings from '@/components/ui/settings/display/FeaturesSettings.vue'
import LanguageSettings from '@/components/ui/settings/display/LanguageSettings.vue'
import PerformanceSettings from '@/components/ui/settings/display/PerformanceSettings.vue'
import ReplayIntroductionSettings from '@/components/ui/settings/display/ReplayIntroductionSettings.vue'
import VisualSettings from '@/components/ui/settings/display/VisualSettings.vue'
import InstancesSyncedSettings from '@/components/ui/settings/instances/instances-synced-settings/index.vue'
import JavaSettings from '@/components/ui/settings/instances/JavaSettings.vue'
import ResourceManagementSettings from '@/components/ui/settings/instances/ResourceManagementSettings.vue'
import SettingsPageShell from '@/components/ui/settings/SettingsPageShell.vue'
import { welcomeMessages } from '@/components/ui/welcome/messages'
import { useAppSettings } from '@/composables/use-app-settings.ts'
import { playCharacterEmote, setCharacterItem } from '@/composables/use-character.ts'
import { launcherIcon } from '@/helpers/launcher-icons'
import { appSettingsKeys, appSettingsQueryOptions, set } from '@/helpers/settings.ts'
import {
	appSettingsModalContextKey,
	type UnsavedChangesController,
} from '@/providers/app-settings-modal'
import { injectAppUpdateDownloadProgress } from '@/providers/download-progress.ts'
import { welcomeTourKey } from '@/providers/welcome-tour'

// TODO: Apply COMPONENT_STRUCTURE.md here and extract out common setting option components
const appSettings = useAppSettings()

const { formatMessage } = useVIntl()
const { handleError } = injectNotificationManager()
const queryClient = useQueryClient()

const devModeCounter = ref(0)
const openWelcomeTour = inject(welcomeTourKey, undefined)
let replayWelcomeAfterHide = false

// Footer: version label under the wordmark.
const launcherVersion = ref('')
getVersion()
	.then((v) => {
		launcherVersion.value = v
	})
	.catch(() => {})
// "1.2.0" reads as "v1.2"; a real patch release keeps its number ("v1.2.1").
const displayVersion = computed(() => {
	const version = launcherVersion.value || '1.2.0'
	return `v${version.replace(/^(\d+\.\d+)\.0$/, '$1')}`
})

function replayWelcome() {
	if (close()) replayWelcomeAfterHide = true
}

function onSettingsAfterHide() {
	if (!replayWelcomeAfterHide) return
	replayWelcomeAfterHide = false
	openWelcomeTour?.()
}

const developerModeEnabled = defineMessage({
	id: 'app.settings.developer-mode-enabled',
	defaultMessage: 'Developer mode enabled.',
})

const tabCategories = defineMessages({
	display: {
		id: 'settings.sidebar.label.display',
		defaultMessage: 'Display',
	},
	account: {
		id: 'settings.sidebar.label.account',
		defaultMessage: 'Account',
	},
	otherOptions: {
		id: 'app.settings.sidebar.label.other-options',
		defaultMessage: 'Other options',
	},
})

const shellMessages = {
	appearance: defineMessages({
		title: { id: 'app.settings.page.appearance.title', defaultMessage: 'Make the launcher yours' },
		text: {
			id: 'app.settings.page.appearance.text',
			defaultMessage:
				'Theme, colors, background, icons and the window style — every change previews instantly.',
		},
	}),
	behavior: defineMessages({
		title: { id: 'app.settings.page.behavior.title', defaultMessage: 'How the launcher behaves' },
		text: {
			id: 'app.settings.page.behavior.text',
			defaultMessage:
				'Startup, your library, the download manager and which confirmations you want to see.',
		},
	}),
	language: defineMessages({
		title: { id: 'app.settings.page.language.title', defaultMessage: 'Your language' },
		text: {
			id: 'app.settings.page.language.text',
			defaultMessage: 'Choose the language of the whole launcher. The change applies right away.',
		},
	}),
	synced_options: defineMessages({
		title: {
			id: 'app.settings.page.synced-options.title',
			defaultMessage: 'One setup for every instance',
		},
		text: {
			id: 'app.settings.page.synced-options.text',
			defaultMessage:
				'Share game options, servers, packs and more between instances, so a change in one shows up in all of them.',
		},
	}),
	java: defineMessages({
		title: {
			id: 'app.settings.page.java.title',
			defaultMessage: 'The right Java for every version',
		},
		text: {
			id: 'app.settings.page.java.text',
			defaultMessage:
				'Each Minecraft version needs its own Java. The launcher finds or installs the right one automatically — or point it to your own here.',
		},
	}),
	resources: defineMessages({
		title: { id: 'app.settings.page.resources.title', defaultMessage: 'Storage and downloads' },
		text: {
			id: 'app.settings.page.resources.text',
			defaultMessage:
				'See what takes up space, clean up caches and backups, and tune how many downloads and writes run at once.',
		},
	}),
}

const tabs = [
	{
		name: defineMessage({
			id: 'app.settings.tabs.appearance',
			defaultMessage: 'Appearance',
		}),
		category: tabCategories.display,
		icon: launcherIcon('appearance'),
		content: AppearanceSettings,
		shell: shellMessages.appearance,
	},
	{
		name: defineMessage({
			id: 'app.settings.tabs.features',
			defaultMessage: 'Features',
		}),
		category: tabCategories.display,
		icon: launcherIcon('features'),
		content: FeaturesSettings,
	},
	{
		name: defineMessage({
			id: 'app.settings.tabs.behavior',
			defaultMessage: 'Behavior',
		}),
		category: tabCategories.display,
		icon: launcherIcon('behavior'),
		content: BehaviorSettings,
		shell: shellMessages.behavior,
	},
	{
		name: defineMessage({
			id: 'app.settings.tabs.language',
			defaultMessage: 'Language',
		}),
		category: tabCategories.display,
		icon: launcherIcon('language'),
		content: LanguageSettings,
		shell: shellMessages.language,
	},
	{
		name: commonSettingsMessages.featureFlags,
		category: tabCategories.display,
		icon: launcherIcon('flags'),
		content: FeatureFlagSettings,
		developerOnly: true,
	},
	{
		name: defineMessage({
			id: 'app.settings.tabs.visual',
			defaultMessage: 'Visual',
		}),
		category: tabCategories.display,
		icon: launcherIcon('visual'),
		content: VisualSettings,
	},
	{
		name: defineMessage({
			id: 'app.settings.tabs.performance',
			defaultMessage: 'Performance',
		}),
		category: tabCategories.display,
		icon: launcherIcon('performance'),
		content: PerformanceSettings,
	},
	{
		name: defineMessage({
			id: 'app.settings.tabs.profile',
			defaultMessage: 'Profile',
		}),
		category: tabCategories.account,
		icon: launcherIcon('profile'),
		content: ProfileSettings,
	},
	{
		name: defineMessage({
			id: 'app.settings.tabs.privacy',
			defaultMessage: 'Privacy',
		}),
		category: tabCategories.account,
		icon: launcherIcon('privacy'),
		content: PrivacySettings,
	},

	{
		name: defineMessage({
			id: 'app.settings.tabs.synced-options',
			defaultMessage: 'Synced settings',
		}),
		category: tabCategories.otherOptions,
		icon: launcherIcon('synced'),
		content: InstancesSyncedSettings,
		shell: shellMessages.synced_options,
	},
	{
		name: defineMessage({
			id: 'app.settings.tabs.java-installations',
			defaultMessage: 'Java installations',
		}),
		category: tabCategories.otherOptions,
		icon: launcherIcon('java'),
		content: JavaSettings,
		shell: shellMessages.java,
	},
	{
		name: defineMessage({
			id: 'app.settings.tabs.resource-management',
			defaultMessage: 'Resource management',
		}),
		category: tabCategories.otherOptions,
		icon: launcherIcon('resources'),
		content: ResourceManagementSettings,
		shell: shellMessages.resources,
	},
	{
		name: welcomeMessages.replay,
		icon: launcherIcon('replay'),
		content: ReplayIntroductionSettings,
		category: tabCategories.otherOptions,
	},
]

const availableTabs = computed(() =>
	tabs.filter((tab) => !tab.developerOnly || appSettings.devMode),
)

const modal = ref<InstanceType<typeof TabbedModal> | null>(null)
const unsavedChangesPopup = ref<{ nudge: () => void } | null>(null)
const unsavedChangesController = ref<UnsavedChangesController | null>(null)
const emptyUnsavedChangesState: Record<string, unknown> = {}
const originalUnsavedChangesState = computed(
	() => unsavedChangesController.value?.getOriginal() ?? emptyUnsavedChangesState,
)
const modifiedUnsavedChangesState = computed(
	() => unsavedChangesController.value?.getModified() ?? emptyUnsavedChangesState,
)
const savingUnsavedChanges = computed(() => unsavedChangesController.value?.isSaving() ?? false)
const hasUnsavedChanges = computed(
	() =>
		(unsavedChangesController.value?.hasChanges() ?? false) ||
		(unsavedChangesController.value?.isSaving() ?? false),
)

function canLeaveCurrentTab(): boolean {
	if (
		!unsavedChangesController.value?.hasChanges() &&
		!unsavedChangesController.value?.isSaving()
	) {
		return true
	}
	unsavedChangesPopup.value?.nudge()
	return false
}

function close(): boolean {
	return modal.value?.hide() ?? false
}

function registerUnsavedChangesController(controller: UnsavedChangesController | null): void {
	unsavedChangesController.value = controller
}

provide(appSettingsModalContextKey, {
	close,
	replayWelcome,
	registerUnsavedChangesController,
})

function resetUnsavedChanges(): void {
	unsavedChangesController.value?.reset()
}

function saveUnsavedChanges(): void {
	void unsavedChangesController.value?.save()
}

// The sidebar character joins you in the settings: it fetches a gear, shows it
// off, and carries it around until the modal closes again.
function onSettingsOpened(): void {
	setCharacterItem('gear')
	playCharacterEmote('present')
}

function onSettingsClosed(): void {
	setCharacterItem(null)
	playCharacterEmote('nod')
}

function show() {
	onSettingsOpened()
	modal.value?.show()
}

function showProfile(): void {
	onSettingsOpened()
	const profileTabIndex = availableTabs.value.findIndex((tab) => tab.content === ProfileSettings)
	if (profileTabIndex >= 0) {
		modal.value?.setTab(profileTabIndex)
	}
	modal.value?.show()
}

function showFeatureFlags(): void {
	onSettingsOpened()
	const featureFlagsTabIndex = availableTabs.value.findIndex(
		(tab) => tab.content === FeatureFlagSettings,
	)
	if (featureFlagsTabIndex >= 0) {
		modal.value?.setTab(featureFlagsTabIndex)
	}
	modal.value?.show()
}

function showSyncedOptions(): void {
	onSettingsOpened()
	const syncedOptionsTabIndex = availableTabs.value.findIndex(
		(tab) => tab.content === InstancesSyncedSettings,
	)
	if (syncedOptionsTabIndex >= 0) {
		modal.value?.setTab(syncedOptionsTabIndex)
	}
	modal.value?.show()
}

function showPrivacy(): void {
	onSettingsOpened()
	const privacyTabIndex = availableTabs.value.findIndex((tab) => tab.content === PrivacySettings)
	if (privacyTabIndex >= 0) {
		modal.value?.setTab(privacyTabIndex)
	}
	modal.value?.show()
}

defineExpose({
	show,
	showProfile,
	showFeatureFlags,
	showSyncedOptions,
	showPrivacy,
})

const { progress, version: downloadingVersion } = injectAppUpdateDownloadProgress()

const developerModeMutation = useMutation({
	mutationKey: appSettingsKeys.update,
	scope: { id: 'app-settings' },
	mutationFn: async (enabled: boolean) => {
		const settings = await queryClient.fetchQuery(appSettingsQueryOptions())
		const nextSettings = { ...settings, developer_mode: enabled }
		await set(nextSettings)
		return nextSettings
	},
	onMutate: () => queryClient.cancelQueries({ queryKey: appSettingsKeys.all }),
	onSuccess: (settings) => {
		const selectedTab = modal.value ? availableTabs.value[modal.value.selectedTab] : undefined

		queryClient.setQueryData(appSettingsKeys.all, settings)
		appSettings.devMode = settings.developer_mode

		if (modal.value) {
			const selectedTabIndex = selectedTab ? availableTabs.value.indexOf(selectedTab) : -1
			modal.value.setTab(selectedTabIndex >= 0 ? selectedTabIndex : 0)
		}
	},
	onError: handleError,
	onSettled: () => queryClient.invalidateQueries({ queryKey: appSettingsKeys.all }),
})

function devModeCount() {
	if (developerModeMutation.isPending.value) return
	devModeCounter.value++
	if (devModeCounter.value > 5) {
		devModeCounter.value = 0
		developerModeMutation.mutate(!appSettings.devMode)
	}
}

const messages = defineMessages({
	downloading: {
		id: 'app.settings.downloading',
		defaultMessage: 'Downloading v{version}',
	},
	developerModeButtonLabel: {
		id: 'app.settings.developer-mode-button.label',
		defaultMessage: 'Toggle developer mode',
	},
})
</script>
<template>
	<TabbedModal
		ref="modal"
		:tabs="availableTabs"
		:collapsible-categories="[tabCategories.otherOptions]"
		:default-collapsed-categories="[tabCategories.otherOptions]"
		:width="'min(928px, calc(95vw - 10rem))'"
		:before-hide="canLeaveCurrentTab"
		:on-hide="onSettingsClosed"
		:on-after-hide="onSettingsAfterHide"
		:before-tab-change="canLeaveCurrentTab"
		:floating-action-bar-shown="hasUnsavedChanges"
	>
		<template #content="{ tab }">
			<Suspense>
				<SettingsPageShell
					v-if="tab?.shell"
					:icon="tab.icon"
					:eyebrow="formatMessage(tab.name)"
					:title="formatMessage(tab.shell.title)"
					:text="formatMessage(tab.shell.text)"
				>
					<component :is="tab.content" />
				</SettingsPageShell>
				<component :is="tab.content" v-else-if="tab?.content" />
				<template #fallback>
					<LoadingIndicator class="py-2" />
				</template>
			</Suspense>
		</template>
		<template #title>
			<span class="text-2xl font-semibold text-contrast">
				{{ formatMessage(commonMessages.settingsLabel) }}
			</span>
		</template>
		<template #floating-action-bar>
			<UnsavedChangesPopup
				ref="unsavedChangesPopup"
				:original="originalUnsavedChangesState"
				:modified="modifiedUnsavedChangesState"
				:saving="savingUnsavedChanges"
				inline
				@reset="resetUnsavedChanges"
				@save="saveUnsavedChanges"
			/>
		</template>
		<template #footer>
			<div class="mt-auto text-secondary text-sm">
				<div class="mb-3">
					<template v-if="progress > 0 && progress < 1">
						<p class="m-0 mb-2">
							{{ formatMessage(messages.downloading, { version: downloadingVersion }) }}
						</p>
						<ProgressBar :progress="progress" />
					</template>
				</div>
				<p v-if="appSettings.devMode" class="text-brand font-semibold m-0 mb-2">
					{{ formatMessage(developerModeEnabled) }}
				</p>
				<!--
					The Minekube artwork anchors the bottom of the settings sidebar. It is
					still the hidden developer-mode switch (six clicks), but it has no
					hover glow, tooltip or focus ring of its own: it reads as artwork.
				-->
				<button
					type="button"
					:aria-label="formatMessage(messages.developerModeButtonLabel)"
					:disabled="developerModeMutation.isPending.value"
					class="settings-footer-mark custom-focus-indicator"
					@click="devModeCount"
				>
					<img
						:src="MinekubeLauncherIconV2"
						alt=""
						class="settings-footer-mark__img"
						draggable="false"
					/>
				</button>
				<div class="settings-footer-meta">
					<span class="settings-footer-meta__version">{{ displayVersion }}</span>
					<span class="settings-footer-meta__channel">RELEASE</span>
				</div>
			</div>
		</template>
	</TabbedModal>
</template>

<style scoped lang="scss">
.settings-footer-mark,
.settings-footer-mark:hover,
.settings-footer-mark:active,
.settings-footer-mark:focus,
.settings-footer-mark:focus-visible,
.settings-footer-mark:disabled {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	margin: 0;
	padding: 0;
	border: none !important;
	outline: none !important;
	background: transparent !important;
	box-shadow: none !important;
	filter: none !important;
	opacity: 1;
	translate: none !important;
	scale: none !important;
	transform: none !important;
	cursor: pointer;
}

.settings-footer-mark__img {
	display: block;
	width: auto;
	height: 9.5rem;
	max-width: 100%;
	object-fit: contain;
	object-position: center;
	pointer-events: none;
	user-select: none;
}

.settings-footer-meta {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.5rem;
	margin-top: 0.375rem;
	padding: 0 0.125rem;
}

.settings-footer-meta__version,
.settings-footer-meta__channel {
	font-size: 0.8125rem;
	font-weight: 800;
	letter-spacing: 0.04em;
	line-height: 1.75rem;
}

.settings-footer-meta__version {
	color: #ffffff;
}

/* White is unreadable on the light themes, which use their own dark text. */
:global(html:not(.theme-dark) .settings-footer-meta__version) {
	color: var(--color-contrast);
}

:global(html:not(.theme-dark) .settings-footer-meta__channel) {
	color: #1e9e55;
}

.settings-footer-meta__channel {
	color: #3ddc84;
}
</style>
