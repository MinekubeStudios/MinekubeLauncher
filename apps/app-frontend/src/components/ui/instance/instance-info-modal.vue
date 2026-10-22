<script setup lang="ts">
import { EditIcon } from '@modrinth/assets'
import {
	Avatar,
	Button,
	defineMessages,
	formatLoaderLabel,
	NewModal,
	useFormatDateTime,
	useVIntl,
} from '@modrinth/ui'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useImageThumbnail } from '@/composables/use-image-thumbnail'
import { getInstanceIconUrl } from '@/helpers/instance'
import { get as getSettings } from '@/helpers/settings'
import type { GameInstance } from '@/helpers/types'

const props = defineProps<{
	instance: GameInstance
}>()

const { formatMessage } = useVIntl()
// Dates follow the launcher language, not whatever locale the OS/webview reports.
const formatDateTime = useFormatDateTime({ dateStyle: 'medium', timeStyle: 'short' })

const messages = defineMessages({
	title: {
		id: 'app.instance.info.title',
		defaultMessage: 'Instance info',
	},
	memory: {
		id: 'app.instance.info.memory',
		defaultMessage: 'Memory',
	},
	memoryInstance: {
		id: 'app.instance.info.memory.instance',
		defaultMessage: '{maximum} MB',
	},
	memoryInstanceMin: {
		id: 'app.instance.info.memory.instance-min',
		defaultMessage: '{minimum}–{maximum} MB',
	},
	memoryGlobal: {
		id: 'app.instance.info.memory.global',
		defaultMessage: '{maximum} MB (global)',
	},
	playtime: {
		id: 'app.instance.info.playtime',
		defaultMessage: 'Time played',
	},
	playtimeValue: {
		id: 'app.instance.info.playtime.value',
		defaultMessage: '{hours} h {minutes} min',
	},
	minecraft: {
		id: 'app.instance.info.minecraft',
		defaultMessage: 'Minecraft',
	},
	loader: {
		id: 'app.instance.info.loader',
		defaultMessage: 'Mod loader',
	},
	lastPlayed: {
		id: 'app.instance.info.last-played',
		defaultMessage: 'Last played',
	},
	neverPlayed: {
		id: 'app.instance.info.never-played',
		defaultMessage: 'Never',
	},
	edit: {
		id: 'app.instance.info.edit',
		defaultMessage: 'Edit instance',
	},
	close: {
		id: 'app.instance.info.close',
		defaultMessage: 'Close',
	},
})

const router = useRouter()

const modal = ref<InstanceType<typeof NewModal> | null>(null)
const globalMaximumMemory = ref<number | undefined>()

const localIcon = computed(() => {
	const path = props.instance.icon_path
	return path && !/^https?:/.test(path) && !path.toLowerCase().endsWith('.svg') ? path : undefined
})
const thumbnail = useImageThumbnail(
	localIcon,
	() => 96,
	() => String(props.instance.modified),
)
const iconSrc = computed(() =>
	localIcon.value ? thumbnail.value : getInstanceIconUrl(props.instance.icon_path),
)

const memoryLabel = computed(() => {
	const memory = props.instance.memory
	if (memory?.maximum) {
		return memory.minimum
			? formatMessage(messages.memoryInstanceMin, {
					minimum: memory.minimum,
					maximum: memory.maximum,
				})
			: formatMessage(messages.memoryInstance, { maximum: memory.maximum })
	}

	const maximum = globalMaximumMemory.value
	return maximum === undefined ? '—' : formatMessage(messages.memoryGlobal, { maximum })
})

const playtimeLabel = computed(() => {
	const seconds = props.instance.submitted_time_played + props.instance.recent_time_played
	return formatMessage(messages.playtimeValue, {
		hours: Math.floor(seconds / 3600),
		minutes: Math.floor((seconds % 3600) / 60),
	})
})

const loaderLabel = computed(() => {
	const name = formatLoaderLabel(props.instance.loader)
	return props.instance.loader_version ? `${name} ${props.instance.loader_version}` : name
})

const lastPlayedLabel = computed(() =>
	props.instance.last_played
		? formatDateTime(new Date(props.instance.last_played))
		: formatMessage(messages.neverPlayed),
)

const details = computed(() => [
	{ label: formatMessage(messages.memory), value: memoryLabel.value },
	{ label: formatMessage(messages.playtime), value: playtimeLabel.value },
	{ label: formatMessage(messages.minecraft), value: props.instance.game_version },
	{ label: formatMessage(messages.loader), value: loaderLabel.value },
	{ label: formatMessage(messages.lastPlayed), value: lastPlayedLabel.value },
])

/** Re-read on every open, so a changed global memory setting is never shown stale. */
async function loadGlobalMemory(): Promise<void> {
	const maximum = (await getSettings().catch(() => null))?.memory?.maximum
	if (maximum !== undefined) globalMaximumMemory.value = maximum
}

function show(): void {
	modal.value?.show()
	void loadGlobalMemory()
}

function hide(): void {
	modal.value?.hide()
}

function editInstance(): void {
	if (props.instance.quarantined) return
	hide()
	void router.push(`/instance/${encodeURIComponent(props.instance.id)}/edit`)
}

defineExpose({ show, hide })
</script>

<template>
	<NewModal
		ref="modal"
		:header="formatMessage(messages.title)"
		max-width="480px"
		width="480px"
		actions-divider
	>
		<div class="flex flex-col gap-4">
			<div class="flex min-w-0 items-center gap-3">
				<Avatar
					:src="iconSrc"
					size="56px"
					:tint-by="instance.id"
					no-shadow
					pad-transparent-corners
				/>
				<div class="flex min-w-0 flex-col">
					<span class="truncate text-lg font-semibold text-contrast">{{ instance.name }}</span>
					<span class="truncate text-sm font-medium text-secondary">
						{{ loaderLabel }} · {{ instance.game_version }}
					</span>
				</div>
			</div>

			<dl class="m-0 grid gap-2 sm:grid-cols-2">
				<div
					v-for="detail in details"
					:key="detail.label"
					class="rounded-xl border border-surface-5 bg-surface-3 px-3 py-2"
				>
					<dt class="text-xs font-semibold uppercase tracking-wide text-secondary">
						{{ detail.label }}
					</dt>
					<dd class="m-0 mt-1 break-words font-semibold text-contrast">{{ detail.value }}</dd>
				</div>
			</dl>
		</div>

		<template #actions>
			<div class="flex justify-end gap-2">
				<Button type="outlined" @click="hide">{{ formatMessage(messages.close) }}</Button>
				<Button type="colored" color="brand" :disabled="instance.quarantined" @click="editInstance">
					<EditIcon class="size-4" />
					{{ formatMessage(messages.edit) }}
				</Button>
			</div>
		</template>
	</NewModal>
</template>
