<template>
	<div class="flex gap-2 items-center">
		<DownloadManager />
		<div v-if="downloadState.total > 0 || hasActiveLoadingBars" class="relative">
			<IconButton
				v-tooltip="downloadToggleLabel"
				:color="downloadState.hidden > 0 ? 'brand' : undefined"
				type="quiet"
				size="sm"
				:label="downloadToggleLabel"
				class="!h-[34px] !min-w-[34px] !w-[34px]"
				@click="toggleDownloadNotifications"
			>
				<DownloadIcon />
			</IconButton>
		</div>
		<div v-if="offline" class="flex items-center gap-1">
			<UnplugIcon class="text-secondary" />
			<span class="text-sm text-contrast"> {{ formatMessage(messages.offline) }} </span>
		</div>
		<AppUpdateButton />
	</div>
</template>

<script setup lang="ts">
import { DownloadIcon, UnplugIcon } from '@modrinth/assets'
import {
	defineMessages,
	IconButton,
	injectNotificationManager,
	injectPopupNotificationManager,
	type PopupNotificationProgressItem,
	type PopupNotificationStandard,
	useVIntl,
} from '@modrinth/ui'
import { convertFileSrc } from '@tauri-apps/api/core'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import AppUpdateButton from '@/components/ui/app-update-button/index.vue'
import DownloadManager from '@/components/ui/download-manager/index.vue'
import { useAppEvent } from '@/composables/use-app-event'
import { get_many as getInstances } from '@/helpers/instance'
import type { LoadingBar } from '@/helpers/state'
import { progress_bars_list } from '@/helpers/state'

const { handleError } = injectNotificationManager()
const popupNotificationManager = injectPopupNotificationManager()
const { formatMessage } = useVIntl()

const messages = defineMessages({
	offline: {
		id: 'app.action-bar.offline',
		defaultMessage: 'Offline',
	},
	downloadingJava: {
		id: 'app.action-bar.downloading-java',
		defaultMessage: 'Downloading Java {version}',
	},
	downloads: {
		id: 'app.action-bar.downloads',
		defaultMessage: 'Downloads',
	},
	viewActiveDownloads: {
		id: 'app.action-bar.view-active-downloads',
		defaultMessage: 'View active downloads',
	},
	hideDownloads: {
		id: 'app.action-bar.hide-downloads',
		defaultMessage: 'Hide active downloads',
	},
	showDownloads: {
		id: 'app.action-bar.show-downloads',
		defaultMessage: 'Show active downloads',
	},
})

const downloadState = computed(() => popupNotificationManager.getDownloadState())
const downloadToggleLabel = computed(() =>
	formatMessage(
		downloadState.value.hidden > 0
			? messages.showDownloads
			: downloadState.value.total > 0
				? messages.hideDownloads
				: messages.viewActiveDownloads,
	),
)

function toggleDownloadNotifications(): void {
	if (downloadState.value.total > 0) {
		popupNotificationManager.toggleDownloadNotifications()
	} else if (hasActiveLoadingBars.value) {
		openDownloadToast()
	}
}

const offline = ref(!navigator.onLine)
function handleOffline() {
	offline.value = true
}
function handleOnline() {
	offline.value = false
}

onMounted(() => {
	window.addEventListener('offline', handleOffline)
	window.addEventListener('online', handleOnline)
})

const currentLoadingBars = ref<LoadingBar[]>([])
const currentLoadingBarIconUrls = ref<Record<string, string | null>>({})
const notificationId = ref<string | number | null>(null)
const dismissed = ref(false)

function getLoadingBarKey(loadingBar: LoadingBar): string {
	return `${loadingBar.loading_bar_uuid ?? loadingBar.id}`
}

function getLoadingProgress(loadingBar: LoadingBar): number {
	if (!loadingBar.total || loadingBar.total <= 0) {
		return 0
	}
	return Math.max(0, Math.min(1, (loadingBar.current ?? 0) / (loadingBar.total ?? 0)))
}

function getLoadingText(loadingBar: LoadingBar): string {
	return loadingBar.message ?? ''
}

function getDisplayIconUrl(icon: string | null | undefined): string | null {
	if (!icon) {
		return null
	}
	if (/^(https?:|data:|blob:|asset:|tauri:)/.test(icon)) {
		return icon
	}
	return convertFileSrc(icon)
}

function getNotification(): PopupNotificationStandard | null {
	if (!notificationId.value) {
		return null
	}
	const notification = popupNotificationManager
		.getNotifications()
		.find((notification) => notification.id === notificationId.value)
	return notification?.contentType === 'standard' && notification.type === 'download'
		? notification
		: null
}

function removeNotification(): void {
	if (!notificationId.value) {
		return
	}
	popupNotificationManager.removeNotification(notificationId.value)
	notificationId.value = null
}

function buildDownloadItems(): PopupNotificationProgressItem[] {
	return currentLoadingBars.value.map((bar) => ({
		id: getLoadingBarKey(bar),
		title: bar.title ?? '',
		text: getLoadingText(bar),
		iconUrl: currentLoadingBarIconUrls.value[getLoadingBarKey(bar)] ?? null,
		progress: getLoadingProgress(bar),
		waiting: !bar.total || bar.total <= 0,
		progressType: bar.bar_type?.type === 'pack_import' ? 'bytes' : 'percentage',
		progressCurrent: bar.current,
		progressTotal: bar.total,
	}))
}

const hasActiveLoadingBars = computed(() => currentLoadingBars.value.length > 0)

function updateNotification(resummon = false): void {
	if (resummon) {
		dismissed.value = false
	}

	if (currentLoadingBars.value.length === 0) {
		removeNotification()
		dismissed.value = false
		return
	}

	if (notificationId.value && !getNotification()) {
		notificationId.value = null
		dismissed.value = true
	}

	if (dismissed.value && !resummon) {
		return
	}

	const notif = getNotification()
	const progressItems = buildDownloadItems()

	if (notif) {
		notif.title = formatMessage(messages.downloads)
		notif.text = undefined
		notif.progressItems = progressItems
		notif.progress = undefined
		notif.waiting = undefined
	} else {
		const notification = popupNotificationManager.addPopupNotification({
			contentType: 'standard',
			title: formatMessage(messages.downloads),
			type: 'download',
			autoCloseMs: null,
			progressItems,
		})
		notificationId.value = notification.id
	}
}

function formatLoadingBars(loadingBar: LoadingBar): LoadingBar {
	const formatted = { ...loadingBar }
	if (formatted.bar_type?.type === 'java_download') {
		formatted.title = formatMessage(messages.downloadingJava, {
			version: formatted.bar_type.version,
		})
	}
	if (formatted.bar_type?.instance_id) {
		formatted.title = formatted.bar_type.instance_name ?? formatted.bar_type.instance_id
	}
	if (formatted.bar_type?.pack_name) {
		formatted.title = formatted.bar_type.pack_name
	}
	return formatted
}

async function refreshLoadingBars() {
	const bars: Record<string, LoadingBar> = await progress_bars_list().catch((error) => {
		handleError(error)
		return {}
	})

	currentLoadingBars.value = Object.values(bars)
		.map(formatLoadingBars)
		.filter(
			(bar) =>
				bar?.bar_type?.type !== 'launcher_update' &&
				![
					'java_download',
					'pack_file_download',
					'pack_download',
					'minecraft_download',
					'copy_instance',
				].includes(bar?.bar_type?.type ?? ''),
		)

	const instanceIds = Array.from(
		new Set(
			currentLoadingBars.value
				.map((bar) => bar.bar_type?.instance_id)
				.filter((instanceId): instanceId is string => !!instanceId),
		),
	)
	const instances = instanceIds.length
		? await getInstances(instanceIds).catch((error) => {
				handleError(error)
				return []
			})
		: []
	const instanceIconUrls = new Map(
		instances.map((instance) => [instance.id, getDisplayIconUrl(instance.icon_path)]),
	)
	currentLoadingBarIconUrls.value = Object.fromEntries(
		currentLoadingBars.value.map((bar) => {
			const barIconUrl = getDisplayIconUrl(bar.bar_type?.icon)
			const instanceIconUrl = bar.bar_type?.instance_id
				? instanceIconUrls.get(bar.bar_type.instance_id)
				: null
			return [getLoadingBarKey(bar), barIconUrl ?? instanceIconUrl ?? null]
		}),
	)

	currentLoadingBars.value.sort((a, b) => {
		const aKey = `${a.loading_bar_uuid ?? a.id ?? ''}`
		const bKey = `${b.loading_bar_uuid ?? b.id ?? ''}`
		return aKey.localeCompare(bKey)
	})

	updateNotification()
}

await refreshLoadingBars()

useAppEvent('loading', async () => {
	await refreshLoadingBars()
})

function openDownloadToast() {
	updateNotification(true)
}

onBeforeUnmount(() => {
	removeNotification()
	dismissed.value = false
	window.removeEventListener('offline', handleOffline)
	window.removeEventListener('online', handleOnline)
})
</script>
