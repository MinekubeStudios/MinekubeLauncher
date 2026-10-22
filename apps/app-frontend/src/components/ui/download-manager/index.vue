<script setup lang="ts">
import { FloatingMenu } from '@modrinth/ui'
import { computed, nextTick, onScopeDispose, ref, useId, useTemplateRef, watch } from 'vue'

import { useAppSettings } from '@/composables/use-app-settings.ts'

import DownloadManagerBar from './download-manager-bar.vue'
import DownloadManagerPanel from './download-manager-panel.vue'
import { useDownloadBarState } from './use-download-bar-state'
import { DOWNLOAD_MANAGER_SESSION_START, useDownloadManager } from './use-download-manager'

const {
	activeJobs,
	attentionJobs,
	completedJobs,
	initialized,
	rate,
	retry,
	cancel,
	togglePause,
	dismiss,
	clearCompleted,
	copyDetails,
} = useDownloadManager()
const { selectedJob, completing } = useDownloadBarState({
	activeJobs,
	attentionJobs,
	completedJobs,
	initialized,
})
const appSettings = useAppSettings()
const shown = ref(false)
const animationsEnabled = ref(false)
const menu = useTemplateRef('menu')
const bar = useTemplateRef('bar')
const panel = useTemplateRef('panel')
const panelId = useId()
const progress = computed(() =>
	activeJobs.value.length
		? activeJobs.value.reduce((total, job) => total + job.overallProgress, 0) /
			activeJobs.value.length
		: 0,
)

/** The button can be pinned to the toolbar, like the other toolbar buttons. */
const pinned = computed(() => appSettings.getFeatureFlag('always_show_download_manager'))

/**
 * Failures that happened during this session still need the user, so they keep
 * the download manager around. Failures from an older session do not.
 */
const sessionAttention = computed(() =>
	attentionJobs.value.filter((job) => {
		if (!job.created) return false
		const created = new Date(job.created).getTime()
		return Number.isFinite(created) && created >= DOWNLOAD_MANAGER_SESSION_START
	}),
)

/**
 * The download manager only shows up while a whole instance or modpack is
 * being downloaded, imported, exported, duplicated or repaired.
 */
const contextualActivity = computed(
	() => activeJobs.value.length > 0 || sessionAttention.value.length > 0,
)

const GRACE_PERIOD_MS = 4000
const keepVisible = ref(false)
let graceTimer: ReturnType<typeof setTimeout> | undefined

watch(
	contextualActivity,
	(active) => {
		if (graceTimer) {
			clearTimeout(graceTimer)
			graceTimer = undefined
		}
		if (active) {
			keepVisible.value = true
			return
		}
		graceTimer = setTimeout(() => {
			keepVisible.value = false
		}, GRACE_PERIOD_MS)
	},
	{ immediate: true },
)

const visible = computed(
	() => pinned.value || shown.value || keepVisible.value || contextualActivity.value,
)
let animationFrame = 0

watch(
	initialized,
	(ready) => {
		if (!ready) return
		animationFrame = requestAnimationFrame(() => {
			animationFrame = requestAnimationFrame(() => {
				animationsEnabled.value = true
			})
		})
	},
	{ flush: 'post' },
)
onScopeDispose(() => {
	cancelAnimationFrame(animationFrame)
	if (graceTimer) clearTimeout(graceTimer)
})

function onOpen() {
	shown.value = true
	nextTick(() => panel.value?.focus())
}

function close() {
	menu.value?.hide()
	bar.value?.focus()
}
</script>

<template>
	<FloatingMenu
		v-if="visible"
		ref="menu"
		bare
		:arrow="false"
		:distance="4"
		placement="bottom-end"
		panel-class="download-manager-popper"
		@open="onOpen"
		@close="shown = false"
	>
		<DownloadManagerBar
			ref="bar"
			:selected-job="selectedJob"
			:active-count="activeJobs.length"
			:progress="progress"
			:has-attention="attentionJobs.length > 0"
			:rate="rate"
			:completing="completing"
			:animated="animationsEnabled"
			:expanded="shown"
			:panel-id="panelId"
			@close="close"
		/>
		<template #popper="{ hide }">
			<DownloadManagerPanel
				:id="panelId"
				ref="panel"
				:active-jobs="activeJobs"
				:attention-jobs="attentionJobs"
				:completed-jobs="completedJobs"
				:rate="rate"
				@retry="retry"
				@cancel="cancel"
				@toggle-pause="togglePause"
				@dismiss="dismiss"
				@clear-completed="clearCompleted"
				@copy-details="copyDetails"
				@open="hide"
				@keydown.esc.stop.prevent="close"
			/>
		</template>
	</FloatingMenu>
</template>

<style>
.download-manager-popper {
	border-radius: 1rem;
	box-shadow:
		0 2px 4px rgba(0, 0, 0, 0.04),
		0 5px 8px rgba(0, 0, 0, 0.04),
		0 10px 18px rgba(0, 0, 0, 0.03),
		0 24px 48px rgba(0, 0, 0, 0.03);
}
</style>
