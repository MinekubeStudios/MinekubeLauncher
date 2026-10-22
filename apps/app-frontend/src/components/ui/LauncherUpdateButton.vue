<template>
	<TeleportOverflowMenu
		:label="triggerLabel"
		:options="menuOptions"
		:icon-only="false"
		:circular="false"
		type="outlined"
		size="sm"
		color="brand"
		:class="launcherToolbarPill"
	>
		<RefreshCwIcon v-if="checking || restarting" class="size-4 shrink-0 animate-spin" />
		<DownloadIcon v-else-if="isDownloading" class="size-4 shrink-0" />
		<RefreshCwIcon v-else class="size-4 shrink-0" />
		<span class="main-toolbar-text">{{ triggerLabel }}</span>
	</TeleportOverflowMenu>
</template>

<script setup lang="ts">
import { DownloadIcon, RefreshCwIcon } from '@modrinth/assets'
import {
	type ButtonMenuOption,
	defineMessages,
	injectNotificationManager,
	TeleportOverflowMenu,
	useVIntl,
} from '@modrinth/ui'
import { getVersion } from '@tauri-apps/api/app'
import { openUrl } from '@tauri-apps/plugin-opener'
import { computed } from 'vue'

import { launcherToolbarPill } from '@/components/ui/launcher-toolbar-pill'
import { areUpdatesEnabled } from '@/helpers/utils.js'
import {
	appUpdateState,
	checkForAppUpdate,
	checkGitHubForNewerRelease,
	downloadAvailableAppUpdate,
	installAvailableAppUpdate,
	toggleAutoUpdatesEnabled,
} from '@/providers/app-update'

const { addNotification, handleError } = injectNotificationManager()
const { formatMessage } = useVIntl()

const messages = defineMessages({
	updates: {
		id: 'app.action-bar.updates',
		defaultMessage: 'Updates',
	},
	checkUpdates: {
		id: 'app.action-bar.check-updates',
		defaultMessage: 'Check for updates',
	},
	checkingUpdates: {
		id: 'app.action-bar.checking-updates',
		defaultMessage: 'Checking for updates…',
	},
	downloadingUpdate: {
		id: 'app.action-bar.downloading-update',
		defaultMessage: 'Downloading update',
	},
	upToDate: {
		id: 'app.action-bar.up-to-date',
		defaultMessage: 'Launcher is up to date',
	},
	upToDateBody: {
		id: 'app.action-bar.up-to-date-body',
		defaultMessage: 'You are running the latest version ({version}).',
	},
	updateAvailable: {
		id: 'app.action-bar.update-available',
		defaultMessage: 'Update available',
	},
	updateAvailableBody: {
		id: 'app.action-bar.update-available-body',
		defaultMessage: 'Version {version} is available. Downloading it now…',
	},
	githubUpdateAvailableBody: {
		id: 'app.action-bar.github-update-available-body',
		defaultMessage: 'Version {version} is available on GitHub.',
	},
	openRelease: {
		id: 'app.action-bar.open-release',
		defaultMessage: 'Open release',
	},
	automaticUpdates: {
		id: 'app.action-bar.automatic-updates',
		defaultMessage: 'Automatic updates',
	},
	automaticUpdatesDescription: {
		id: 'app.action-bar.automatic-updates-description',
		defaultMessage:
			'Check for and download new versions in the background. Installing one always asks first.',
	},
	reloadToUpdate: {
		id: 'app.action-bar.reload-to-update',
		defaultMessage: 'Reload to update',
	},
})

const {
	availableUpdate,
	checking,
	downloading,
	downloadPercent,
	downloadProgress,
	finishedDownloading,
	restarting,
	autoUpdatesEnabled,
} = appUpdateState

const isDownloading = computed(
	() =>
		downloading.value ||
		(downloadProgress.value > 0 && downloadProgress.value < 1 && !finishedDownloading.value),
)
const isBusy = computed(() => checking.value || isDownloading.value || restarting.value)

const triggerLabel = computed(() => {
	if (isDownloading.value) {
		return `${formatMessage(messages.downloadingUpdate)} ${downloadPercent.value}%`
	}
	if (checking.value) {
		return formatMessage(messages.checkingUpdates)
	}
	return formatMessage(messages.updates)
})

const updateReady = computed(() => finishedDownloading.value && !!availableUpdate.value)

const menuOptions = computed<ButtonMenuOption[]>(() => [
	updateReady.value
		? {
				id: 'install-update',
				label: formatMessage(messages.reloadToUpdate),
				icon: DownloadIcon,
				hoverFilled: true,
				action: () => void installAvailableAppUpdate(),
			}
		: {
				id: 'check-updates',
				label: formatMessage(messages.checkUpdates),
				icon: RefreshCwIcon,
				disabled: isBusy.value,
				action: () => void checkForUpdatesNow(),
			},
	{ id: 'divider', type: 'divider' },
	{
		id: 'automatic-updates',
		label: formatMessage(messages.automaticUpdates),
		tooltip: formatMessage(messages.automaticUpdatesDescription),
		remainOpen: true,
		selected: autoUpdatesEnabled.value,
		action: () => {
			toggleAutoUpdatesEnabled()
		},
	},
])

async function notifyUpToDate() {
	addNotification({
		title: formatMessage(messages.upToDate),
		text: formatMessage(messages.upToDateBody, { version: await getVersion() }),
		type: 'success',
	})
}

function notifyGitHubRelease(version: string, url: string) {
	addNotification({
		title: formatMessage(messages.updateAvailable),
		text: formatMessage(messages.githubUpdateAvailableBody, { version }),
		type: 'info',
		autoCloseMs: null,
		buttons: [
			{
				label: formatMessage(messages.openRelease),
				action: () => openUrl(url),
				color: 'brand',
			},
		],
	})
}

async function checkForUpdatesNow() {
	if (isBusy.value) {
		return
	}

	try {
		if (await areUpdatesEnabled()) {
			const update = await checkForAppUpdate()
			if (update) {
				addNotification({
					title: formatMessage(messages.updateAvailable),
					text: formatMessage(messages.updateAvailableBody, { version: update.version }),
					type: 'info',
				})
				// Download it right away, but let the player decide when to
				// restart – a downloaded update is installed from this menu (or
				// by closing the Launcher).
				await downloadAvailableAppUpdate()
				return
			}
		}

		// Fallback: ask GitHub directly for the latest Launcher release.
		const release = await checkGitHubForNewerRelease()
		if (release) {
			notifyGitHubRelease(release.version, release.url)
			return
		}
		await notifyUpToDate()
	} catch (error) {
		handleError(error as Error)
	}
}
</script>
