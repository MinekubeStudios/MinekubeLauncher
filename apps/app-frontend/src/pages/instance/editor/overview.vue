<script setup lang="ts">
import {
	ClipboardCopyIcon,
	FolderOpenIcon,
	LinkIcon,
	PlayIcon,
	StopCircleIcon,
} from '@modrinth/assets'
import {
	Button,
	defineMessages,
	formatLoaderLabel,
	injectNotificationManager,
	Toggle,
	useFormatDateTime,
	useVIntl,
} from '@modrinth/ui'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, ref } from 'vue'

import ExportModal from '@/components/ui/ExportModal.vue'
import { edit, get_full_path } from '@/helpers/instance'
import { list_groups } from '@/helpers/instance-groups'
import { get } from '@/helpers/settings'
import { createInstanceShortcut, showInstanceInFolder } from '@/helpers/utils.js'
import GeneralSettings from '@/pages/instance/components/settings-modal/general-settings.vue'
import { injectInstancePage } from '@/pages/instance/instance-context'
import { instanceKeys } from '@/pages/instance/query-options'

import { injectInstanceSettings } from '../components/settings-modal/instance-settings-context'

const { formatMessage } = useVIntl()
const { handleError, addNotification } = injectNotificationManager()
const queryClient = useQueryClient()
const { instance } = injectInstanceSettings()
const instancePage = injectInstancePage()
// Dates follow the launcher language, not whatever locale the OS/webview reports.
const formatDateTime = useFormatDateTime({ dateStyle: 'medium', timeStyle: 'short' })

const messages = defineMessages({
	summary: {
		id: 'app.instance.editor.overview.summary',
		defaultMessage: 'Summary',
	},
	minecraft: {
		id: 'app.instance.editor.overview.minecraft',
		defaultMessage: 'Minecraft',
	},
	loader: {
		id: 'app.instance.editor.overview.loader',
		defaultMessage: 'Loader',
	},
	vanilla: {
		id: 'app.instance.editor.overview.vanilla',
		defaultMessage: 'Vanilla',
	},
	java: {
		id: 'app.instance.editor.overview.java',
		defaultMessage: 'Java',
	},
	javaAuto: {
		id: 'app.instance.editor.overview.java.auto',
		defaultMessage: 'Automatic (global)',
	},
	memory: {
		id: 'app.instance.editor.overview.memory',
		defaultMessage: 'Memory',
	},
	memoryGlobal: {
		id: 'app.instance.editor.overview.memory.global',
		defaultMessage: '{maximum} MB (global)',
	},
	memoryInstance: {
		id: 'app.instance.editor.overview.memory.instance',
		defaultMessage: '{maximum} MB',
	},
	memoryInstanceMin: {
		id: 'app.instance.editor.overview.memory.instance-min',
		defaultMessage: '{minimum}–{maximum} MB',
	},
	playtime: {
		id: 'app.instance.editor.overview.playtime',
		defaultMessage: 'Time played',
	},
	playtimeValue: {
		id: 'app.instance.editor.overview.playtime.value',
		defaultMessage: '{hours} h {minutes} min',
	},
	created: {
		id: 'app.instance.editor.overview.created',
		defaultMessage: 'Created',
	},
	lastPlayed: {
		id: 'app.instance.editor.overview.last-played',
		defaultMessage: 'Last played',
	},
	neverPlayed: {
		id: 'app.instance.editor.overview.never-played',
		defaultMessage: 'Never played',
	},
	path: {
		id: 'app.instance.editor.overview.path',
		defaultMessage: 'Instance folder',
	},
	groups: {
		id: 'app.instance.editor.overview.groups',
		defaultMessage: 'Groups',
	},
	groupsDescription: {
		id: 'app.instance.editor.overview.groups.description',
		defaultMessage: 'Put this instance into groups to organise your library, just like in Prism.',
	},
	noGroups: {
		id: 'app.instance.editor.overview.groups.none',
		defaultMessage: 'No groups yet. Create groups from the library page.',
	},
	play: {
		id: 'app.instance.editor.overview.play',
		defaultMessage: 'Play',
	},
	stop: {
		id: 'app.instance.editor.overview.stop',
		defaultMessage: 'Stop',
	},
	openFolder: {
		id: 'app.instance.editor.overview.open-folder',
		defaultMessage: 'Open folder',
	},
	copyPath: {
		id: 'app.instance.editor.overview.copy-path',
		defaultMessage: 'Copy path',
	},
	pathCopied: {
		id: 'app.instance.editor.overview.path-copied',
		defaultMessage: 'Instance path copied',
	},
	export: {
		id: 'app.instance.editor.overview.export',
		defaultMessage: 'Export',
	},
	shortcut: {
		id: 'app.instance.editor.overview.shortcut',
		defaultMessage: 'Create shortcut',
	},
	shortcutCreated: {
		id: 'app.instance.editor.overview.shortcut.created',
		defaultMessage: 'Shortcut created',
	},
	general: {
		id: 'app.instance.editor.overview.general',
		defaultMessage: 'Name, icon and instance actions',
	},
})

const exportModal = ref<InstanceType<typeof ExportModal> | null>(null)

const fullPathQuery = useQuery({
	queryKey: computed(() => instanceKeys.rootPath(instance.value.id)),
	queryFn: () => get_full_path(instance.value.id),
})
// The library manages groups without the query cache, so always re-read them
// here; with fast loading's long stale time a freshly created group was missing.
const groupsQuery = useQuery({
	queryKey: ['instance-groups'],
	queryFn: list_groups,
	staleTime: 0,
	refetchOnMount: 'always',
})
const globalSettingsQuery = useQuery({
	queryKey: ['app-settings'],
	queryFn: () => get(),
})

const playtime = computed(
	() => instance.value.submitted_time_played + instance.value.recent_time_played,
)
const summary = computed(() => {
	const items = [
		{ label: formatMessage(messages.minecraft), value: instance.value.game_version },
		{
			label: formatMessage(messages.loader),
			value:
				instance.value.loader === 'vanilla'
					? formatMessage(messages.vanilla)
					: `${formatLoaderLabel(instance.value.loader)}${instance.value.loader_version ? ` ${instance.value.loader_version}` : ''}`,
		},
		{
			label: formatMessage(messages.java),
			value: instance.value.java_path ?? formatMessage(messages.javaAuto),
		},
		{
			label: formatMessage(messages.memory),
			value: instance.value.memory
				? instance.value.memory.minimum
					? formatMessage(messages.memoryInstanceMin, {
							minimum: instance.value.memory.minimum,
							maximum: instance.value.memory.maximum,
						})
					: formatMessage(messages.memoryInstance, { maximum: instance.value.memory.maximum })
				: globalSettingsQuery.data.value
					? formatMessage(messages.memoryGlobal, {
							maximum: globalSettingsQuery.data.value.memory.maximum,
						})
					: '—',
		},
		{
			label: formatMessage(messages.playtime),
			value: formatMessage(messages.playtimeValue, {
				hours: Math.floor(playtime.value / 3600),
				minutes: Math.floor((playtime.value % 3600) / 60),
			}),
		},
		{
			label: formatMessage(messages.created),
			value: formatDateTime(new Date(instance.value.created)),
		},
		{
			label: formatMessage(messages.lastPlayed),
			value: instance.value.last_played
				? formatDateTime(new Date(instance.value.last_played))
				: formatMessage(messages.neverPlayed),
		},
	]
	if (fullPathQuery.data.value) {
		items.push({ label: formatMessage(messages.path), value: fullPathQuery.data.value })
	}
	return items
})

const savingGroup = ref(false)
async function setGroupMembership(groupId: string, member: boolean) {
	if (savingGroup.value) return
	const current = instance.value.group_ids ?? []
	const groupIds = member ? [...current, groupId] : current.filter((id) => id !== groupId)
	savingGroup.value = true
	try {
		await edit(instance.value.id, { group_ids: groupIds })
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: instanceKeys.detail(instance.value.id) }),
			queryClient.invalidateQueries({ queryKey: instanceKeys.list() }),
		])
	} catch (error) {
		handleError(error)
	} finally {
		savingGroup.value = false
	}
}

async function copyPath() {
	try {
		const path = fullPathQuery.data.value ?? (await get_full_path(instance.value.id))
		await navigator.clipboard.writeText(path)
		addNotification({ type: 'success', title: formatMessage(messages.pathCopied) })
	} catch (error) {
		handleError(error)
	}
}

async function createShortcut() {
	try {
		const shortcutPath = await createInstanceShortcut(instance.value.name, instance.value.id)
		if (shortcutPath) {
			addNotification({ type: 'success', title: formatMessage(messages.shortcutCreated) })
		}
	} catch (error) {
		handleError(error)
	}
}
</script>

<template>
	<div class="flex flex-col gap-8">
		<ExportModal v-if="!instance.quarantined" ref="exportModal" :instance="instance" />

		<div class="flex flex-wrap gap-2">
			<Button
				v-if="instancePage.playing.value"
				type="colored"
				color="red"
				@click="instancePage.stop('InstanceEditorOverview')"
			>
				<StopCircleIcon /> {{ formatMessage(messages.stop) }}
			</Button>
			<Button
				v-else
				type="colored"
				color="brand"
				:disabled="instance.quarantined || instancePage.loading.value"
				@click="instancePage.play('InstanceEditorOverview')"
			>
				<PlayIcon /> {{ formatMessage(messages.play) }}
			</Button>
			<Button type="outlined" @click="showInstanceInFolder(instance.id).catch(handleError)">
				<FolderOpenIcon /> {{ formatMessage(messages.openFolder) }}
			</Button>
			<Button type="outlined" @click="copyPath">
				<ClipboardCopyIcon /> {{ formatMessage(messages.copyPath) }}
			</Button>
			<Button v-if="!instance.quarantined" type="outlined" @click="exportModal?.show()">
				{{ formatMessage(messages.export) }}
			</Button>
			<Button type="outlined" @click="createShortcut">
				<LinkIcon /> {{ formatMessage(messages.shortcut) }}
			</Button>
		</div>

		<section class="flex flex-col gap-3">
			<h3 class="m-0 text-lg font-semibold text-contrast">{{ formatMessage(messages.summary) }}</h3>
			<dl class="m-0 grid gap-3 sm:grid-cols-2">
				<div
					v-for="item in summary"
					:key="item.label"
					class="rounded-xl border border-surface-5 bg-surface-3 px-4 py-3"
				>
					<dt class="text-xs font-semibold uppercase tracking-wide text-secondary">
						{{ item.label }}
					</dt>
					<dd class="m-0 mt-1 break-all font-semibold text-contrast">{{ item.value }}</dd>
				</div>
			</dl>
		</section>

		<section class="flex flex-col gap-3">
			<div>
				<h3 class="m-0 text-lg font-semibold text-contrast">
					{{ formatMessage(messages.groups) }}
				</h3>
				<p class="m-0 mt-1 text-secondary">{{ formatMessage(messages.groupsDescription) }}</p>
			</div>
			<div
				v-if="groupsQuery.isPending.value"
				role="status"
				class="h-10 animate-pulse rounded-lg bg-surface-3"
			/>
			<p v-else-if="!groupsQuery.data.value?.length" class="m-0 text-secondary">
				{{ formatMessage(messages.noGroups) }}
			</p>
			<div v-else class="flex flex-col gap-3">
				<div
					v-for="group in groupsQuery.data.value"
					:key="group.id"
					class="flex items-center justify-between gap-4"
				>
					<span class="font-semibold text-contrast">{{ group.name }}</span>
					<Toggle
						:id="`group-${group.id}`"
						:model-value="(instance.group_ids ?? []).includes(group.id)"
						:disabled="savingGroup"
						@update:model-value="(member) => setGroupMembership(group.id, !!member)"
					/>
				</div>
			</div>
		</section>

		<section class="flex flex-col gap-4 border-t border-surface-5 pt-6">
			<h3 class="m-0 text-lg font-semibold text-contrast">{{ formatMessage(messages.general) }}</h3>
			<GeneralSettings />
		</section>
	</div>
</template>
