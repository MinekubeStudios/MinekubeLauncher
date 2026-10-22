<script setup lang="ts">
import { PlayIcon, PlusIcon, StopCircleIcon } from '@modrinth/assets'
import {
	Avatar,
	Button,
	defineMessages,
	formatLoaderLabel,
	injectNotificationManager,
	useVIntl,
} from '@modrinth/ui'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, inject, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ExportModal from '@/components/ui/ExportModal.vue'
import IconEditorModal from '@/components/ui/instance_settings/icon-editor-modal/index.vue'
import ConfirmDeleteInstanceModal from '@/components/ui/modal/ConfirmDeleteInstanceModal.vue'
import { useAppEvent } from '@/composables/use-app-event'
import { handleSevereError } from '@/composables/use-error.js'
import { useImageThumbnail } from '@/composables/use-image-thumbnail'
import {
	resolveSelectedInstance,
	selectedInstanceId as globalSelectedInstanceId,
	selectInstance,
} from '@/composables/use-selected-instance.ts'
import { toError } from '@/helpers/errors'
import { install_duplicate_instance } from '@/helpers/install'
import { get as getInstance, getInstanceIconUrl, kill, run } from '@/helpers/instance'
import { launcherIcon } from '@/helpers/launcher-icons'
import { get_all as getAllProcesses } from '@/helpers/process'
import type { GameInstance } from '@/helpers/types'
import { createInstanceShortcut, showInstanceInFolder } from '@/helpers/utils.js'
import { instanceKeys, instanceListQueryOptions } from '@/pages/instance/query-options'

const { formatMessage } = useVIntl()

const EditActionIcon = launcherIcon('edit')
const GroupActionIcon = launcherIcon('group')
const FolderActionIcon = launcherIcon('folder')
const ExportActionIcon = launcherIcon('export')
const DuplicateActionIcon = launcherIcon('duplicate')
const ShortcutActionIcon = launcherIcon('shortcut')
const DeleteActionIcon = launcherIcon('delete')
const { handleError } = injectNotificationManager()
const router = useRouter()
const route = useRoute()
const queryClient = useQueryClient()
const showCreationModal = inject<() => void>('showCreationModal', () => {})

const messages = defineMessages({
	instanceToolbarTitle: {
		id: 'app.sidebar.instance-toolbar.title',
		defaultMessage: 'Instance',
	},
	noInstance: {
		id: 'app.sidebar.instance-toolbar.no-instance',
		defaultMessage: 'No instance selected',
	},
	createInstance: {
		id: 'app.sidebar.instance-toolbar.create-instance',
		defaultMessage: 'Create instance',
	},
	launch: {
		id: 'app.sidebar.instance-toolbar.launch',
		defaultMessage: 'Play',
	},
	kill: {
		id: 'app.sidebar.instance-toolbar.kill',
		defaultMessage: 'Stop',
	},
	edit: {
		id: 'app.sidebar.instance-toolbar.edit',
		defaultMessage: 'Edit',
	},
	changeGroup: {
		id: 'app.sidebar.instance-toolbar.change-group',
		defaultMessage: 'Change group',
	},
	viewFolder: {
		id: 'app.sidebar.instance-toolbar.view-folder',
		defaultMessage: 'Open folder',
	},
	export: {
		id: 'app.sidebar.instance-toolbar.export',
		defaultMessage: 'Export',
	},
	duplicate: {
		id: 'app.sidebar.instance-toolbar.duplicate',
		defaultMessage: 'Duplicate',
	},
	delete: {
		id: 'app.sidebar.instance-toolbar.delete',
		defaultMessage: 'Delete',
	},
	createShortcut: {
		id: 'app.sidebar.instance-toolbar.create-shortcut',
		defaultMessage: 'Create shortcut',
	},
	rename: {
		id: 'app.sidebar.instance-toolbar.rename',
		defaultMessage: 'Rename',
	},
	changeIcon: {
		id: 'app.sidebar.instance-toolbar.change-icon',
		defaultMessage: 'Change icon',
	},
	launching: {
		id: 'app.sidebar.instance-toolbar.launching',
		defaultMessage: 'Starting…',
	},
	stopping: {
		id: 'app.sidebar.instance-toolbar.stopping',
		defaultMessage: 'Stopping…',
	},
})

const instancesQuery = useQuery(instanceListQueryOptions())
const instances = computed(() => (instancesQuery.data.value ?? []) as GameInstance[])

const routeInstanceId = computed(() => {
	if (route.path.startsWith('/instance/') && typeof route.params.id === 'string') {
		return route.params.id
	}
	if (typeof route.query.i === 'string' && route.query.i) {
		return route.query.i
	}
	return null
})

const selectedInstanceId = computed(() => {
	const resolved = resolveSelectedInstance(instances.value, routeInstanceId.value)
	return resolved?.id ?? globalSelectedInstanceId.value ?? null
})

const selectedInstance = ref<GameInstance | null>(null)

// Only the newest lookup may apply its result; a slower, older one finishing
// late would otherwise switch the toolbar back to the previous instance.
let selectionRequest = 0

async function loadSelectedInstance() {
	const request = ++selectionRequest
	const resolved = resolveSelectedInstance(instances.value, routeInstanceId.value)
	if (resolved) {
		selectedInstance.value = resolved
		return
	}
	const id = selectedInstanceId.value
	if (!id) {
		selectedInstance.value = null
		return
	}
	try {
		const inst = await getInstance(id)
		if (request === selectionRequest) selectedInstance.value = inst ?? null
	} catch {
		if (request === selectionRequest) selectedInstance.value = null
	}
}

watch(
	[selectedInstanceId, globalSelectedInstanceId, routeInstanceId, instances],
	() => {
		void loadSelectedInstance()
	},
	{ immediate: true },
)

// Running state
const runningIds = ref<Set<string>>(new Set())
const playing = computed(
	() => selectedInstance.value && runningIds.value.has(selectedInstance.value.id),
)
const loading = ref(false)
const stopping = ref(false)

let isRefreshingProcesses = false
let refreshProcessesAgain = false

async function refreshProcesses() {
	if (isRefreshingProcesses) {
		refreshProcessesAgain = true
		return
	}

	isRefreshingProcesses = true
	try {
		do {
			refreshProcessesAgain = false
			try {
				const processes = (await getAllProcesses()) as Array<{ instance_id: string }>
				runningIds.value = new Set(processes.map((process) => process.instance_id))
			} catch {
				runningIds.value = new Set()
			}
		} while (refreshProcessesAgain)
	} finally {
		isRefreshingProcesses = false
	}
}

useAppEvent('process', () => {
	void refreshProcesses()
})

void refreshProcesses()

// Actions
async function launchInstance() {
	if (!selectedInstance.value || selectedInstance.value.quarantined) return
	loading.value = true
	const instanceId = selectedInstance.value.id
	try {
		await run(instanceId, null, { name: selectedInstance.value.name })
		await queryClient.invalidateQueries({ queryKey: instanceKeys.processes(instanceId) })
	} catch (err) {
		handleSevereError(err as Error, { instanceId })
	} finally {
		loading.value = false
		await refreshProcesses()
	}
}

async function stopInstance() {
	if (!selectedInstance.value) return
	stopping.value = true
	try {
		await kill(selectedInstance.value.id).catch((e) => handleError(toError(e)))
	} finally {
		stopping.value = false
		await refreshProcesses()
	}
}

function viewFolder() {
	if (!selectedInstance.value) return
	void showInstanceInFolder(selectedInstance.value.id).catch(handleError)
}

async function duplicateInstance() {
	if (!selectedInstance.value) return
	const job = await install_duplicate_instance(selectedInstance.value.id).catch(handleError)
	if (job) await router.replace({ name: 'Home' })
}

function openInstancePage() {
	if (!selectedInstance.value) return
	void router.push({ name: 'Home' })
}

function editInstance() {
	if (!selectedInstance.value) return
	void router.push(`/instance/${encodeURIComponent(selectedInstance.value.id)}/edit`)
}

/** Group membership is edited in the Overview section of the instance editor. */
function changeGroup() {
	if (!selectedInstance.value) return
	void router.push({
		path: `/instance/${encodeURIComponent(selectedInstance.value.id)}/edit`,
		query: { section: 'overview' },
	})
}

const exportModal = ref<InstanceType<typeof ExportModal> | null>(null)
const deleteConfirmModal = ref<InstanceType<typeof ConfirmDeleteInstanceModal> | null>(null)
const iconEditorModal = ref<InstanceType<typeof IconEditorModal> | null>(null)
const selectedInstanceToDelete = ref<GameInstance | null>(null)

function openExport() {
	exportModal.value?.show()
}

function requestDelete() {
	if (!selectedInstance.value) return
	selectedInstanceToDelete.value = selectedInstance.value
	deleteConfirmModal.value?.show()
}

async function deleteSelectedInstance() {
	if (!selectedInstanceToDelete.value) return
	const id = selectedInstanceToDelete.value.id
	selectedInstanceToDelete.value = null
	if (globalSelectedInstanceId.value === id) {
		selectInstance(null)
	}
	if (route.params.id === id) {
		await router.push('/')
	}
	// remove instance
	const { remove } = await import('@/helpers/instance')
	await remove(id).catch((e) => handleError(toError(e)))
}

async function createShortcut() {
	if (!selectedInstance.value) return
	try {
		await createInstanceShortcut(selectedInstance.value.name, selectedInstance.value.id)
	} catch (e) {
		handleError(toError(e))
	}
}

function openIconEditor() {
	iconEditorModal.value?.show()
}

async function onIconSaved(iconPath: string, _config: unknown) {
	if (!selectedInstance.value) return
	// update local ref
	selectedInstance.value = { ...selectedInstance.value, icon_path: iconPath } as GameInstance
	// backend already updated via modal
	await queryClient.invalidateQueries({ queryKey: ['instances'] })
}

const localIcon = computed(() => {
	const path = selectedInstance.value?.icon_path
	return path && !/^https?:/.test(path) && !path.toLowerCase().endsWith('.svg') ? path : undefined
})

const thumbnail = useImageThumbnail(
	localIcon,
	128,
	() =>
		`${selectedInstance.value?.id ?? ''}:${selectedInstance.value?.modified ?? ''}:${selectedInstance.value?.icon_path ?? ''}`,
)

const iconUrl = computed(() =>
	localIcon.value
		? (thumbnail.value ?? getInstanceIconUrl(selectedInstance.value?.icon_path))
		: getInstanceIconUrl(selectedInstance.value?.icon_path),
)
</script>

<template>
	<div
		class="p-4 border-0 border-b-[1px] border-[--brand-gradient-border] border-solid flex flex-col gap-3"
	>
		<h3 class="text-base text-primary font-medium m-0 flex items-center justify-between">
			{{ formatMessage(messages.instanceToolbarTitle) }}
			<Button v-if="!selectedInstance" size="xs" type="quiet" @click="() => showCreationModal()">
				<PlusIcon class="size-4" />
				{{ formatMessage(messages.createInstance) }}
			</Button>
		</h3>

		<template v-if="selectedInstance">
			<!-- Prism-like: icon on top, name below -->
			<div class="flex flex-col items-center gap-2">
				<button
					class="group relative flex flex-col items-center gap-1 w-full rounded-xl p-2 hover:bg-surface-4 transition-colors"
					:title="formatMessage(messages.changeIcon)"
					@click="openIconEditor"
				>
					<Avatar
						:key="`${selectedInstance.id}:${selectedInstance.icon_path ?? ''}:${selectedInstance.modified ?? ''}`"
						:src="iconUrl"
						:tint-by="selectedInstance.id"
						size="64px"
						class="!rounded-xl !w-16 !h-16"
						no-shadow
						pad-transparent-corners
					/>
					<span
						class="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/10 transition-colors"
					/>
				</button>

				<button
					class="w-full text-center px-2 py-1 rounded-lg hover:bg-surface-4 transition-colors group"
					:title="selectedInstance.name"
					@click="openInstancePage"
				>
					<span
						class="text-[13px] font-semibold text-contrast line-clamp-2 break-words leading-tight group-hover:underline"
					>
						{{ selectedInstance.name }}
					</span>
					<span class="text-[11px] text-secondary block truncate mt-0.5">
						{{ selectedInstance.game_version }} • {{ formatLoaderLabel(selectedInstance.loader) }}
					</span>
				</button>
			</div>

			<div class="h-px bg-surface-5 w-full my-1" />

			<!-- Prism-like instance toolbar actions: Launch, Kill | Edit, View Folder, Export, Duplicate, Delete, Shortcut -->
			<div class="flex flex-col gap-1">
				<Button
					v-if="!playing"
					type="colored"
					color="brand"
					size="xl"
					class="mk-play-cta w-full justify-start"
					:disabled="loading || selectedInstance.quarantined"
					:loading="loading"
					@click="launchInstance"
				>
					<PlayIcon class="size-4 shrink-0" />
					<span class="text-[13px]">{{ formatMessage(messages.launch) }}</span>
				</Button>
				<Button
					v-else
					type="colored"
					color="red"
					size="xl"
					class="mk-stop-cta w-full justify-start"
					:disabled="stopping"
					:loading="stopping"
					@click="stopInstance"
				>
					<StopCircleIcon class="size-4 shrink-0" />
					<span class="text-[13px]">{{ formatMessage(messages.kill) }}</span>
				</Button>

				<div class="h-px bg-surface-5 w-full my-1" />

				<Button
					type="quiet"
					size="sm"
					class="w-full justify-start !h-7 !gap-2"
					@click="editInstance"
				>
					<EditActionIcon class="size-4 shrink-0" />
					<span class="text-[13px]">{{ formatMessage(messages.edit) }}</span>
				</Button>

				<Button
					type="quiet"
					size="sm"
					class="w-full justify-start !h-7 !gap-2"
					@click="changeGroup"
				>
					<GroupActionIcon class="size-4 shrink-0" />
					<span class="text-[13px]">{{ formatMessage(messages.changeGroup) }}</span>
				</Button>

				<Button type="quiet" size="sm" class="w-full justify-start !h-7 !gap-2" @click="viewFolder">
					<FolderActionIcon class="size-4 shrink-0" />
					<span class="text-[13px]">{{ formatMessage(messages.viewFolder) }}</span>
				</Button>

				<Button
					type="quiet"
					size="sm"
					class="w-full justify-start !h-7 !gap-2"
					:disabled="selectedInstance.quarantined"
					@click="openExport"
				>
					<ExportActionIcon class="size-4 shrink-0" />
					<span class="text-[13px]">{{ formatMessage(messages.export) }}</span>
				</Button>

				<Button
					type="quiet"
					size="sm"
					class="w-full justify-start !h-7 !gap-2"
					@click="duplicateInstance"
				>
					<DuplicateActionIcon class="size-4 shrink-0" />
					<span class="text-[13px]">{{ formatMessage(messages.duplicate) }}</span>
				</Button>

				<Button
					type="quiet"
					size="sm"
					class="w-full justify-start !h-7 !gap-2"
					@click="createShortcut"
				>
					<ShortcutActionIcon class="size-4 shrink-0" />
					<span class="text-[13px]">{{ formatMessage(messages.createShortcut) }}</span>
				</Button>

				<Button
					type="quiet"
					size="sm"
					color="red"
					class="w-full justify-start !h-7 !gap-2 text-red"
					@click="requestDelete"
				>
					<DeleteActionIcon class="size-4 shrink-0" />
					<span class="text-[13px]">{{ formatMessage(messages.delete) }}</span>
				</Button>
			</div>

			<!-- Hidden modals for actions -->
			<ExportModal
				v-if="!selectedInstance.quarantined"
				ref="exportModal"
				:instance="selectedInstance"
			/>
			<ConfirmDeleteInstanceModal
				ref="deleteConfirmModal"
				:instances="selectedInstanceToDelete ? [selectedInstanceToDelete] : []"
				@delete="deleteSelectedInstance"
			/>
			<IconEditorModal
				ref="iconEditorModal"
				:instance-id="selectedInstance.id"
				:config="selectedInstance.icon_config"
				@saved="onIconSaved"
			/>
		</template>

		<template v-else>
			<div class="text-sm text-secondary py-2">
				{{ formatMessage(messages.noInstance) }}
			</div>
		</template>
	</div>
</template>

<style scoped>
.line-clamp-2 {
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}
</style>
