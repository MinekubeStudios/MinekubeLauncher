<script setup lang="ts">
import { defineMessages, useVIntl } from '@modrinth/ui'
import { useQuery } from '@tanstack/vue-query'
import { computed, onMounted, ref, watch } from 'vue'

import { useAppEvent } from '@/composables/use-app-event'
import { flashCharacterItem, playCharacterEmote } from '@/composables/use-character.ts'
import { resolveSelectedInstance, selectedInstanceId } from '@/composables/use-selected-instance.ts'
import { get_all } from '@/helpers/process.js'
import { instanceListQueryOptions } from '@/pages/instance/query-options'

interface InstanceLike {
	id: string
	path?: string
	name: string
	last_played?: string | null
	created?: string | null
	submitted_time_played?: number
	recent_time_played?: number
}

interface RunningProcess {
	instance_id: string
}

const { formatMessage } = useVIntl()

const instancesQuery = useQuery(instanceListQueryOptions())
const instances = computed<InstanceLike[]>(
	() => (instancesQuery.data.value ?? []) as unknown as InstanceLike[],
)

const runningIds = ref<string[]>([])
let isRefreshingProcesses = false
let refreshProcessesAgain = false

async function refreshProcesses(): Promise<void> {
	if (isRefreshingProcesses) {
		refreshProcessesAgain = true
		return
	}

	isRefreshingProcesses = true
	try {
		do {
			refreshProcessesAgain = false
			try {
				const processes = ((await get_all()) ?? []) as RunningProcess[]
				runningIds.value = processes.map((process) => process.instance_id)
			} catch {
				runningIds.value = []
			}
		} while (refreshProcessesAgain)
	} finally {
		isRefreshingProcesses = false
	}
}

const runningInstances = computed<InstanceLike[]>(() =>
	instances.value.filter((instance) => runningIds.value.includes(instance.id)),
)

let hadRunningInstance = false
watch(
	() => runningIds.value.length > 0,
	(running) => {
		if (running === hadRunningInstance) return
		hadRunningInstance = running
		if (running) {
			playCharacterEmote('cheer')
			flashCharacterItem('sparkle', 2600)
		} else {
			playCharacterEmote('wave')
		}
	},
)

const activeInstance = computed<InstanceLike | null>(() => {
	// Access selectedInstanceId.value so Vue tracks changes when switching instances
	void selectedInstanceId.value
	return resolveSelectedInstance(instances.value)
})

const totalPlaytimeSeconds = computed<number>(() => {
	if (activeInstance.value) {
		return (
			(activeInstance.value.recent_time_played ?? 0) +
			(activeInstance.value.submitted_time_played ?? 0)
		)
	}
	return instances.value.reduce(
		(sum, instance) =>
			sum + (instance.recent_time_played ?? 0) + (instance.submitted_time_played ?? 0),
		0,
	)
})

const formattedPlaytime = computed<string>(() => {
	const total = totalPlaytimeSeconds.value
	const hours = Math.floor(total / 3600)
	const minutes = Math.floor((total % 3600) / 60)
	if (hours <= 0 && minutes <= 0) return '0 min'
	if (hours <= 0) return `${minutes} min`
	return `${hours} h ${minutes} min`
})

const lastPlayedInstance = computed<InstanceLike | undefined>(() => {
	if (activeInstance.value) {
		return activeInstance.value.last_played ? activeInstance.value : undefined
	}
	const played = instances.value.filter((instance) => !!instance.last_played)
	if (played.length === 0) return undefined
	return played.reduce((newest, instance) =>
		new Date(instance.last_played as string) > new Date(newest.last_played as string)
			? instance
			: newest,
	)
})

const lastPlayedRelative = computed<string | undefined>(() => {
	const raw = lastPlayedInstance.value?.last_played
	if (!raw) return undefined
	const then = new Date(raw).getTime()
	if (Number.isNaN(then)) return undefined
	const diffSeconds = Math.round((then - Date.now()) / 1000)
	const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
	const absolute = Math.abs(diffSeconds)
	if (absolute < 3600) return formatter.format(Math.round(diffSeconds / 60), 'minute')
	if (absolute < 86400) return formatter.format(Math.round(diffSeconds / 3600), 'hour')
	return formatter.format(Math.round(diffSeconds / 86400), 'day')
})

useAppEvent('process', () => {
	void refreshProcesses()
})

onMounted(() => {
	void refreshProcesses()
})

const messages = defineMessages({
	gameStatusTitle: {
		id: 'app.sidebar.status.game-title',
		defaultMessage: 'Game status',
	},
	nothingRunning: {
		id: 'app.sidebar.status.nothing-running',
		defaultMessage: 'Nothing running',
	},
	lastPlayed: {
		id: 'app.sidebar.status.last-played',
		defaultMessage: 'Last played',
	},
	neverPlayed: {
		id: 'app.sidebar.status.never-played',
		defaultMessage: 'Never',
	},
	totalPlaytime: {
		id: 'app.sidebar.status.total-playtime',
		defaultMessage: 'Total playtime',
	},
})
</script>

<template>
	<div
		class="p-4 border-0 border-b-[1px] border-[--brand-gradient-border] border-solid flex flex-col gap-3"
	>
		<h3 class="text-base text-primary font-medium m-0">
			{{ formatMessage(messages.gameStatusTitle) }}
		</h3>

		<div v-if="runningInstances.length > 0" class="flex flex-col gap-1.5">
			<div
				v-for="instance in runningInstances"
				:key="instance.id"
				class="flex items-center gap-2 text-sm text-contrast"
			>
				<span class="size-2 rounded-full bg-brand shrink-0 running-dot" />
				<span class="truncate">{{ instance.name }}</span>
			</div>
		</div>
		<div v-else class="flex items-center gap-2 text-sm text-secondary">
			<span class="size-2 rounded-full bg-secondary shrink-0 opacity-60" />
			{{ formatMessage(messages.nothingRunning) }}
		</div>

		<div class="flex flex-col gap-1 text-sm">
			<div class="flex items-baseline justify-between gap-2">
				<span class="text-secondary">{{ formatMessage(messages.lastPlayed) }}</span>
				<span class="text-contrast truncate text-right">
					<template v-if="lastPlayedInstance">{{ lastPlayedInstance.name }}</template>
					<template v-else>{{ formatMessage(messages.neverPlayed) }}</template>
				</span>
			</div>
			<div v-if="lastPlayedRelative" class="text-right text-xs text-secondary">
				{{ lastPlayedRelative }}
			</div>
			<div class="flex items-baseline justify-between gap-2">
				<span class="text-secondary">{{ formatMessage(messages.totalPlaytime) }}</span>
				<span class="text-contrast">{{ formattedPlaytime }}</span>
			</div>
		</div>
	</div>
</template>

<style scoped>
.running-dot {
	animation: running-pulse 1.8s ease-in-out infinite;
}

@keyframes running-pulse {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.35;
	}
}
</style>
