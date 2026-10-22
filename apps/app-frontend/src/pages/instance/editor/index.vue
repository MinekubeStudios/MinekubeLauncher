<script setup lang="ts">
import {
	ArrowLeftIcon,
	BoxesIcon,
	CpuIcon,
	DatabaseIcon,
	FileTextIcon,
	FolderOpenIcon,
	GlobeIcon,
	HammerIcon,
	ImageIcon,
	InfoIcon,
	LayersIcon,
	MonitorIcon,
	NotepadTextIcon,
	PlayIcon,
	Settings2Icon,
	SparklesIcon,
	StopCircleIcon,
	TagCategoryGamepad2Icon,
	TerminalSquareIcon,
	WrenchIcon,
} from '@modrinth/assets'
import {
	Avatar,
	Button,
	commonMessages,
	defineMessages,
	formatLoaderLabel,
	injectNotificationManager,
	Textarea,
	useVIntl,
} from '@modrinth/ui'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { type Component, computed, defineAsyncComponent, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'

import { get_instance_notes, getInstanceIconUrl, set_instance_notes } from '@/helpers/instance'
import BehaviorSettings from '@/pages/instance/components/settings-modal/behavior-settings.vue'
import HooksSettings from '@/pages/instance/components/settings-modal/hooks-settings.vue'
import { provideInstanceSettings } from '@/pages/instance/components/settings-modal/instance-settings-context'
import JavaSettings from '@/pages/instance/components/settings-modal/java-settings.vue'
import WindowSettings from '@/pages/instance/components/settings-modal/window-settings.vue'
import GameOptions from '@/pages/instance/editor/game-options.vue'
import InstanceTools from '@/pages/instance/editor/instance-tools.vue'
import Overview from '@/pages/instance/editor/overview.vue'
import VersionSettings from '@/pages/instance/editor/version-settings.vue'
import { injectInstancePage } from '@/pages/instance/instance-context'
import { instanceContentQueryOptions } from '@/pages/instance/query-options'

const ContentSettings = defineAsyncComponent(() => import('@/pages/instance/content/index.vue'))
const WorldsSettings = defineAsyncComponent(() => import('@/pages/instance/worlds/index.vue'))
const ScreenshotsSettings = defineAsyncComponent(
	() => import('@/pages/instance/screenshots/index.vue'),
)
const FilesSettings = defineAsyncComponent(() => import('@/pages/instance/files/index.vue'))
const LogsSettings = defineAsyncComponent(() => import('@/pages/instance/logs/index.vue'))

const { formatMessage } = useVIntl()
const { addNotification, handleError } = injectNotificationManager()
const queryClient = useQueryClient()
const route = useRoute()
const router = useRouter()
const instancePage = injectInstancePage()
const instance = instancePage.instance

const messages = defineMessages({
	backToHome: {
		id: 'app.instance.editor.back-to-home',
		defaultMessage: 'Back to Home',
	},
	title: {
		id: 'app.instance.editor.title',
		defaultMessage: 'Edit instance',
	},
	play: {
		id: 'app.instance.editor.play',
		defaultMessage: 'Play',
	},
	stop: {
		id: 'app.instance.editor.stop',
		defaultMessage: 'Stop',
	},
	groupInstance: {
		id: 'app.instance.editor.group.instance',
		defaultMessage: 'Instance',
	},
	groupContent: {
		id: 'app.instance.editor.group.content',
		defaultMessage: 'Content',
	},
	groupSettings: {
		id: 'app.instance.editor.group.settings',
		defaultMessage: 'Settings',
	},
	groupSystem: {
		id: 'app.instance.editor.group.system',
		defaultMessage: 'System',
	},
	overview: {
		id: 'app.instance.editor.section.overview',
		defaultMessage: 'Overview',
	},
	overviewDescription: {
		id: 'app.instance.editor.section.overview.description',
		defaultMessage: 'Summary, groups, name, icon and the main actions for this instance.',
	},
	version: {
		id: 'app.instance.editor.section.version',
		defaultMessage: 'Version',
	},
	versionDescription: {
		id: 'app.instance.editor.section.version.description',
		defaultMessage: 'Minecraft version and mod loader of this local instance.',
	},
	mods: {
		id: 'app.instance.editor.section.mods',
		defaultMessage: 'Mods',
	},
	modsDescription: {
		id: 'app.instance.editor.section.mods.description',
		defaultMessage: 'Manage the mods installed in this instance.',
	},
	resourcepacks: {
		id: 'app.instance.editor.section.resourcepacks',
		defaultMessage: 'Resource packs',
	},
	resourcepacksDescription: {
		id: 'app.instance.editor.section.resourcepacks.description',
		defaultMessage: 'Manage the resource packs installed in this instance.',
	},
	shaders: {
		id: 'app.instance.editor.section.shaders',
		defaultMessage: 'Shader packs',
	},
	shadersDescription: {
		id: 'app.instance.editor.section.shaders.description',
		defaultMessage: 'Manage the shader packs installed in this instance.',
	},
	datapacks: {
		id: 'app.instance.editor.section.datapacks',
		defaultMessage: 'Data packs',
	},
	datapacksDescription: {
		id: 'app.instance.editor.section.datapacks.description',
		defaultMessage: 'Manage the data packs installed in this instance.',
	},
	worlds: {
		id: 'app.instance.editor.section.worlds',
		defaultMessage: 'Worlds & servers',
	},
	worldsDescription: {
		id: 'app.instance.editor.section.worlds.description',
		defaultMessage: 'Manage singleplayer worlds and multiplayer servers of this instance.',
	},
	screenshots: {
		id: 'app.instance.editor.section.screenshots',
		defaultMessage: 'Screenshots',
	},
	screenshotsDescription: {
		id: 'app.instance.editor.section.screenshots.description',
		defaultMessage: 'Browse the screenshots taken in this instance.',
	},
	files: {
		id: 'app.instance.editor.section.files',
		defaultMessage: 'Files',
	},
	filesDescription: {
		id: 'app.instance.editor.section.files.description',
		defaultMessage: 'Browse and edit the files inside this instance, like in a file manager.',
	},
	java: {
		id: 'app.instance.editor.section.java',
		defaultMessage: 'Java & memory',
	},
	javaDescription: {
		id: 'app.instance.editor.section.java.description',
		defaultMessage:
			'Configure Java, minimum and maximum memory, launch arguments, and environment variables for this instance.',
	},
	window: {
		id: 'app.instance.editor.section.window',
		defaultMessage: 'Window',
	},
	windowDescription: {
		id: 'app.instance.editor.section.window.description',
		defaultMessage: 'Set a per-instance resolution and fullscreen preference.',
	},
	hooks: {
		id: 'app.instance.editor.section.hooks',
		defaultMessage: 'Launch commands',
	},
	hooksDescription: {
		id: 'app.instance.editor.section.hooks.description',
		defaultMessage: 'Run custom commands before launch, wrap the game process, or after exit.',
	},
	gameOptions: {
		id: 'app.instance.editor.section.game-options',
		defaultMessage: 'Game options',
	},
	gameOptionsDescription: {
		id: 'app.instance.editor.section.game-options.description',
		defaultMessage: 'Edit Minecraft video, sound, controls and other options for this instance.',
	},
	behavior: {
		id: 'app.instance.editor.section.behavior',
		defaultMessage: 'Interface',
	},
	behaviorDescription: {
		id: 'app.instance.editor.section.behavior.description',
		defaultMessage: 'Choose which sections are shown on the instance page.',
	},
	notes: {
		id: 'app.instance.editor.section.notes',
		defaultMessage: 'Notes',
	},
	notesDescription: {
		id: 'app.instance.editor.section.notes.description',
		defaultMessage: 'Keep private notes about this instance. Notes stay on this device.',
	},
	notesPlaceholder: {
		id: 'app.instance.editor.notes.placeholder',
		defaultMessage: 'Write notes about this instance...',
	},
	notesSaved: {
		id: 'app.instance.editor.notes.saved',
		defaultMessage: 'Notes saved',
	},
	saveNotes: {
		id: 'app.instance.editor.notes.save',
		defaultMessage: 'Save notes',
	},
	logs: {
		id: 'app.instance.editor.section.logs',
		defaultMessage: 'Logs & console',
	},
	logsDescription: {
		id: 'app.instance.editor.section.logs.description',
		defaultMessage: 'Live console output and saved log files of this instance.',
	},
	tools: {
		id: 'app.instance.editor.section.tools',
		defaultMessage: 'Files & tools',
	},
	toolsDescription: {
		id: 'app.instance.editor.section.tools.description',
		defaultMessage: 'Open the instance folder, copy its path or inspect logs, worlds and files.',
	},
})

const isMinecraftServer = ref(instancePage.isServerInstance.value)
watch(instancePage.isServerInstance, (value) => {
	isMinecraftServer.value = value
})

const instanceHomePath = '/'

/**
 * The editor is a page, not a modal. When a caller closes it to navigate
 * somewhere else, go there directly instead of bouncing through Home first.
 */
function closeEditor(onAfterClose?: () => void) {
	if (onAfterClose) {
		onAfterClose()
		return
	}
	void router.push(instanceHomePath)
}

provideInstanceSettings({
	instance,
	offline: instancePage.offline.value,
	isMinecraftServer,
	onUnlinked: () => void instancePage.refreshInstance(),
	closeModal: closeEditor,
})

type ContentType = 'mod' | 'resourcepack' | 'shader' | 'datapack'
type SectionId =
	| 'overview'
	| 'version'
	| 'notes'
	| 'mods'
	| 'resourcepacks'
	| 'shaders'
	| 'datapacks'
	| 'worlds'
	| 'screenshots'
	| 'files'
	| 'java'
	| 'window'
	| 'hooks'
	| 'game-options'
	| 'behavior'
	| 'logs'
	| 'tools'

interface EditorSection {
	id: SectionId
	label: keyof typeof messages
	description: keyof typeof messages
	icon: Component
	component: Component | null
	contentType?: ContentType
	plain?: boolean
	fixedHeight?: boolean
}

const groups: Array<{
	id: string
	label: keyof typeof messages
	sections: EditorSection[]
}> = [
	{
		id: 'instance',
		label: 'groupInstance',
		sections: [
			{
				id: 'overview',
				label: 'overview',
				description: 'overviewDescription',
				icon: InfoIcon,
				component: Overview,
			},
			{
				id: 'version',
				label: 'version',
				description: 'versionDescription',
				icon: WrenchIcon,
				component: VersionSettings,
			},
			{
				id: 'notes',
				label: 'notes',
				description: 'notesDescription',
				icon: NotepadTextIcon,
				component: null,
			},
		],
	},
	{
		id: 'content',
		label: 'groupContent',
		sections: [
			{
				id: 'mods',
				label: 'mods',
				description: 'modsDescription',
				icon: BoxesIcon,
				component: ContentSettings,
				contentType: 'mod',
				plain: true,
			},
			{
				id: 'resourcepacks',
				label: 'resourcepacks',
				description: 'resourcepacksDescription',
				icon: LayersIcon,
				component: ContentSettings,
				contentType: 'resourcepack',
				plain: true,
			},
			{
				id: 'shaders',
				label: 'shaders',
				description: 'shadersDescription',
				icon: SparklesIcon,
				component: ContentSettings,
				contentType: 'shader',
				plain: true,
			},
			{
				id: 'datapacks',
				label: 'datapacks',
				description: 'datapacksDescription',
				icon: DatabaseIcon,
				component: ContentSettings,
				contentType: 'datapack',
				plain: true,
			},
			{
				id: 'worlds',
				label: 'worlds',
				description: 'worldsDescription',
				icon: GlobeIcon,
				component: WorldsSettings,
				plain: true,
			},
			{
				id: 'screenshots',
				label: 'screenshots',
				description: 'screenshotsDescription',
				icon: ImageIcon,
				component: ScreenshotsSettings,
				plain: true,
			},
			{
				id: 'files',
				label: 'files',
				description: 'filesDescription',
				icon: FolderOpenIcon,
				component: FilesSettings,
				plain: true,
			},
		],
	},
	{
		id: 'settings',
		label: 'groupSettings',
		sections: [
			{
				id: 'java',
				label: 'java',
				description: 'javaDescription',
				icon: CpuIcon,
				component: JavaSettings,
			},
			{
				id: 'window',
				label: 'window',
				description: 'windowDescription',
				icon: MonitorIcon,
				component: WindowSettings,
			},
			{
				id: 'hooks',
				label: 'hooks',
				description: 'hooksDescription',
				icon: TerminalSquareIcon,
				component: HooksSettings,
			},
			{
				id: 'game-options',
				label: 'gameOptions',
				description: 'gameOptionsDescription',
				icon: TagCategoryGamepad2Icon,
				component: GameOptions,
			},
			{
				id: 'behavior',
				label: 'behavior',
				description: 'behaviorDescription',
				icon: Settings2Icon,
				component: BehaviorSettings,
			},
		],
	},
	{
		id: 'system',
		label: 'groupSystem',
		sections: [
			{
				id: 'logs',
				label: 'logs',
				description: 'logsDescription',
				icon: FileTextIcon,
				component: LogsSettings,
				plain: true,
				fixedHeight: true,
			},
			{
				id: 'tools',
				label: 'tools',
				description: 'toolsDescription',
				icon: HammerIcon,
				component: InstanceTools,
			},
		],
	},
]

const sections = groups.flatMap((group) => group.sections)

const legacySections: Record<string, SectionId> = {
	general: 'overview',
	installation: 'version',
	sync: 'overview',
	content: 'mods',
}

const activeSectionId = computed<SectionId>(() => {
	const raw = typeof route.query.section === 'string' ? route.query.section : ''
	if (sections.some((candidate) => candidate.id === raw)) return raw as SectionId
	return legacySections[raw] ?? 'overview'
})
const activeSection = computed(
	() => sections.find((section) => section.id === activeSectionId.value) ?? sections[0],
)
const activeComponent = computed(() => activeSection.value.component ?? null)

const contentQuery = useQuery(
	computed(() => ({
		...instanceContentQueryOptions(instancePage.instanceId.value, (error) => handleError(error)),
		enabled: !!instancePage.instanceId.value,
	})),
)
const contentCounts = computed<Partial<Record<SectionId, number>>>(() => {
	const items = contentQuery.data.value?.contentItems ?? []
	const counts: Partial<Record<SectionId, number>> = {}
	for (const item of items) {
		const type = item.project_type === 'shaderpack' ? 'shader' : item.project_type
		if (type === 'mod') counts.mods = (counts.mods ?? 0) + 1
		else if (type === 'resourcepack') counts.resourcepacks = (counts.resourcepacks ?? 0) + 1
		else if (type === 'shader') counts.shaders = (counts.shaders ?? 0) + 1
		else if (type === 'datapack') counts.datapacks = (counts.datapacks ?? 0) + 1
	}
	return counts
})

async function selectSection(section: SectionId) {
	if (notesDirty.value) {
		await saveNotes()
		if (notesDirty.value) return
	}
	void router.replace({
		path: route.path,
		query: {
			...route.query,
			section: section === 'overview' ? undefined : section,
		},
		hash: route.hash,
	})
}

const notesQuery = useQuery(
	computed(() => ({
		queryKey: ['instance-notes', instancePage.instanceId.value],
		queryFn: async () => {
			const instanceId = instancePage.instanceId.value
			return { instanceId, notes: await get_instance_notes(instanceId) }
		},
		enabled: activeSectionId.value === 'notes' && !!instancePage.instanceId.value,
		staleTime: Number.POSITIVE_INFINITY,
	})),
)
const noteDraft = ref('')
const savedNotes = ref('')
const notesLoadedFor = ref('')
const savingNotes = ref(false)
const notesDirty = computed(() => noteDraft.value !== savedNotes.value)

watch(instancePage.instanceId, () => {
	notesLoadedFor.value = ''
	noteDraft.value = ''
	savedNotes.value = ''
})
watch(
	[instancePage.instanceId, notesQuery.data],
	([instanceId, notesResult]) => {
		if (
			!notesResult ||
			notesResult.instanceId !== instanceId ||
			notesLoadedFor.value === instanceId
		) {
			return
		}
		notesLoadedFor.value = instanceId
		noteDraft.value = notesResult.notes
		savedNotes.value = notesResult.notes
	},
	{ immediate: true },
)
watch(notesQuery.error, (error) => {
	if (error) handleError(error)
})

async function saveNotes() {
	if (!notesDirty.value || savingNotes.value) return
	const instanceId = instancePage.instanceId.value
	const notes = noteDraft.value
	savingNotes.value = true
	try {
		await set_instance_notes(instanceId, notes)
		queryClient.setQueryData(['instance-notes', instanceId], {
			instanceId,
			notes,
		})
		if (instancePage.instanceId.value === instanceId) {
			savedNotes.value = notes
			notesLoadedFor.value = instanceId
		}
		addNotification({
			type: 'success',
			title: formatMessage(messages.notesSaved),
		})
	} catch (error) {
		handleError(error)
	} finally {
		savingNotes.value = false
	}
}
onBeforeRouteLeave(async () => {
	if (notesDirty.value) await saveNotes()
	return !notesDirty.value
})
// Switching straight to another instance's editor reuses this page; without this
// the unsaved notes of the previous instance were silently discarded.
onBeforeRouteUpdate(async (to, from) => {
	if (to.params.id === from.params.id || !notesDirty.value) return true
	await saveNotes()
	return !notesDirty.value
})
</script>

<template>
	<div class="flex min-h-full flex-col gap-6 p-6">
		<header class="flex flex-wrap items-center justify-between gap-4">
			<div class="flex min-w-0 items-center gap-4">
				<Button type="quiet" class="shrink-0" @click="router.push(instanceHomePath)">
					<ArrowLeftIcon aria-hidden="true" />
					{{ formatMessage(messages.backToHome) }}
				</Button>
				<div class="flex min-w-0 items-center gap-3 border-l border-surface-5 pl-4">
					<Avatar
						:src="getInstanceIconUrl(instance.icon_path)"
						size="36px"
						:tint-by="instance.id"
						pad-transparent-corners
					/>
					<div class="min-w-0">
						<p class="m-0 text-xs font-semibold uppercase tracking-wide text-secondary">
							{{ formatMessage(messages.title) }}
						</p>
						<h1 class="m-0 truncate text-xl font-bold text-contrast">
							{{ instance.name }}
						</h1>
						<p class="m-0 mt-1 truncate text-xs text-secondary">
							Minecraft {{ instance.game_version }}
							<span v-if="instance.loader !== 'vanilla'">
								· {{ formatLoaderLabel(instance.loader) }}</span
							>
							<span v-if="instance.loader_version"> {{ instance.loader_version }}</span>
						</p>
					</div>
				</div>
			</div>
			<Button
				v-if="instancePage.playing.value"
				type="colored"
				color="red"
				@click="instancePage.stop('InstanceEditor')"
			>
				<StopCircleIcon /> {{ formatMessage(messages.stop) }}
			</Button>
			<Button
				v-else
				type="colored"
				color="brand"
				:disabled="instance.quarantined || instancePage.loading.value"
				@click="instancePage.play('InstanceEditor')"
			>
				<PlayIcon /> {{ formatMessage(messages.play) }}
			</Button>
		</header>

		<div class="grid min-h-0 grid-cols-1 gap-6 xl:grid-cols-[16rem_minmax(0,1fr)]">
			<nav
				:aria-label="formatMessage(messages.title)"
				class="flex gap-4 overflow-x-auto xl:sticky xl:top-4 xl:flex-col xl:gap-5 xl:self-start xl:overflow-visible"
			>
				<div v-for="group in groups" :key="group.id" class="flex shrink-0 flex-col gap-1">
					<p
						class="m-0 hidden px-3 pb-1 text-xs font-bold uppercase tracking-wider text-secondary xl:block"
					>
						{{ formatMessage(messages[group.label]) }}
					</p>
					<button
						v-for="section in group.sections"
						:key="section.id"
						type="button"
						:aria-current="activeSectionId === section.id ? 'page' : undefined"
						:class="[
							'flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left font-semibold transition-colors',
							activeSectionId === section.id
								? 'bg-button-bg text-contrast'
								: 'text-secondary hover:bg-button-bg hover:text-primary',
						]"
						@click="selectSection(section.id)"
					>
						<component :is="section.icon" aria-hidden="true" class="size-4 shrink-0" />
						<span class="flex-1">{{ formatMessage(messages[section.label]) }}</span>
						<span
							v-if="contentCounts[section.id]"
							class="rounded-full bg-surface-3 px-2 py-0.5 text-xs font-bold text-secondary"
						>
							{{ contentCounts[section.id] }}
						</span>
					</button>
				</div>
			</nav>

			<main class="min-w-0">
				<template v-if="activeSectionId === 'notes'">
					<div class="mb-4">
						<h2 class="m-0 text-2xl font-bold text-contrast">
							{{ formatMessage(messages.notes) }}
						</h2>
						<p class="mb-0 mt-2 text-secondary">
							{{ formatMessage(messages.notesDescription) }}
						</p>
					</div>
					<div class="rounded-2xl border border-surface-5 bg-surface-2 p-5">
						<div
							v-if="notesQuery.isPending.value && notesLoadedFor !== instancePage.instanceId.value"
							role="status"
							:aria-label="formatMessage(commonMessages.loadingLabel)"
							class="h-48 animate-pulse rounded-lg bg-surface-3"
						/>
						<div v-else-if="notesQuery.isError.value" class="flex justify-end">
							<Button type="outlined" @click="notesQuery.refetch()">
								{{ formatMessage(commonMessages.refreshButton) }}
							</Button>
						</div>
						<template v-else>
							<Textarea
								id="instance-notes"
								v-model="noteDraft"
								:aria-label="formatMessage(messages.notes)"
								:placeholder="formatMessage(messages.notesPlaceholder)"
								:disabled="savingNotes"
								:rows="12"
								resize="vertical"
								wrapper-class="min-h-64"
							/>
							<div class="mt-4 flex justify-end">
								<Button
									type="colored"
									color="brand"
									:disabled="!notesDirty || savingNotes"
									@click="saveNotes"
								>
									{{ formatMessage(messages.saveNotes) }}
								</Button>
							</div>
						</template>
					</div>
				</template>

				<template v-else>
					<div class="mb-4">
						<h2 class="m-0 text-2xl font-bold text-contrast">
							{{ formatMessage(messages[activeSection.label]) }}
						</h2>
						<p class="mb-0 mt-2 text-secondary">
							{{ formatMessage(messages[activeSection.description]) }}
						</p>
					</div>
					<div
						:class="[
							activeSection.plain ? '' : 'rounded-2xl border border-surface-5 bg-surface-2 p-5',
							activeSection.fixedHeight ? 'h-[70vh] min-h-[28rem]' : '',
						]"
					>
						<Suspense v-if="activeComponent" :key="`${instance.id}-${activeSection.id}`">
							<component :is="activeComponent" :content-type="activeSection.contentType" />
							<template #fallback>
								<div
									role="status"
									:aria-label="formatMessage(commonMessages.loadingLabel)"
									class="h-48 animate-pulse rounded-lg bg-surface-3"
								/>
							</template>
						</Suspense>
					</div>
				</template>
			</main>
		</div>
	</div>
</template>
