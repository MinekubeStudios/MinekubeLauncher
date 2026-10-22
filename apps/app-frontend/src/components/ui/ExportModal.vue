<script setup>
import { FolderOpenIcon, XIcon } from '@modrinth/assets'
import {
	Button,
	commonMessages,
	defineMessages,
	FileTreeSelect,
	injectNotificationManager,
	injectPopupNotificationManager,
	Input,
	NewModal,
	RadioButtons,
	Textarea,
	Toggle,
	useVIntl,
} from '@modrinth/ui'
import { convertFileSrc } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import { ref, shallowRef } from 'vue'

import { PackageIcon } from '@/assets/icons'
import {
	beginExternalOperation,
	endExternalOperation,
} from '@/components/ui/download-manager/external-operations'
import {
	export_instance_mrpack,
	export_instance_prism_zip,
	get_pack_export_candidates,
} from '@/helpers/instance'
import { highlightInFolder } from '@/helpers/utils'

const { handleError } = injectNotificationManager()
const popupNotificationManager = injectPopupNotificationManager()
const { formatMessage } = useVIntl()

const messages = defineMessages({
	header: { id: 'app.export-modal.header', defaultMessage: 'Export modpack' },
	prismHeader: {
		id: 'app.export-modal.prism-header',
		defaultMessage: 'Export Prism instance',
	},
	modpackNameLabel: { id: 'app.export-modal.modpack-name-label', defaultMessage: 'Modpack name' },
	modpackNamePlaceholder: {
		id: 'app.export-modal.modpack-name-placeholder',
		defaultMessage: 'Modpack name',
	},
	archiveNameLabel: { id: 'app.export-modal.archive-name-label', defaultMessage: 'Archive name' },
	archiveNamePlaceholder: {
		id: 'app.export-modal.archive-name-placeholder',
		defaultMessage: 'Archive name',
	},
	exportFormatLabel: { id: 'app.export-modal.format-label', defaultMessage: 'Export format' },
	mrpackFormatLabel: {
		id: 'app.export-modal.format.mrpack',
		defaultMessage: 'Modpack (.mrpack)',
	},
	mrpackFormatDescription: {
		id: 'app.export-modal.format.mrpack-description',
		defaultMessage: 'A portable modpack with a manifest and selected configuration files.',
	},
	prismFormatLabel: {
		id: 'app.export-modal.format.prism',
		defaultMessage: 'Prism Instance (.zip)',
	},
	prismFormatDescription: {
		id: 'app.export-modal.format.prism-description',
		defaultMessage:
			'A complete copy of the instance folder — mods, configs, worlds, saves and settings — plus instance.cfg and mmc-pack.json, exactly like Prism Launcher exports an instance. It can be imported straight back into Prism Launcher or this launcher.',
	},
	cleanPrismExportLabel: {
		id: 'app.export-modal.prism-clean-label',
		defaultMessage: 'Export as a clean instance',
	},
	cleanPrismExportHint: {
		id: 'app.export-modal.prism-clean-hint',
		defaultMessage:
			'Strips everything that belongs to the player, not to the modpack: logs, crash reports, Minecraft sessions, worlds (saves), screenshots, minimap waypoints, saved servers and local account caches. Mods, resource packs, configs, keybinds and all instance settings stay exactly as they are, so the pack is ready to play for whoever receives it.',
	},
	versionNumberLabel: {
		id: 'app.export-modal.version-number-label',
		defaultMessage: 'Version number',
	},
	versionNumberPlaceholder: {
		id: 'app.export-modal.version-number-placeholder',
		defaultMessage: '1.0.0',
	},
	descriptionPlaceholder: {
		id: 'app.export-modal.description-placeholder',
		defaultMessage: 'Enter modpack description...',
	},
	exportButton: { id: 'app.export-modal.export-button', defaultMessage: 'Export' },
	exporting: {
		id: 'app.export-modal.exporting',
		defaultMessage: 'Exporting instance…',
	},
	exportComplete: {
		id: 'app.export-modal.export-complete',
		defaultMessage: 'Export complete',
	},
	exportCompleteDescription: {
		id: 'app.export-modal.export-complete-description',
		defaultMessage: '{name} was exported successfully.',
	},
})

const props = defineProps({
	instance: {
		type: Object,
		required: true,
	},
})

defineExpose({
	show: () => {
		resetExportState()
		exportModal.value.show()
		void initFiles().catch(handleError)
	},
})

const exportModal = ref(null)
// Prism Instance (.zip) is the default: it is the only format that carries
// the whole instance, so it is never a surprise which files were left out.
const exportFormat = ref('prism')
// Opt-in: a shared instance is only stripped of personal data when the player
// asks for it, so the plain Prism export keeps behaving like Prism Launcher's.
const cleanPrismExportEnabled = ref(false)
const nameInput = ref(props.instance.name)
const exportDescription = ref('')
const versionInput = ref('1.0.0')
const files = shallowRef([])
const includedFilePaths = ref([])
const excludedFilePaths = ref([])
const fileTreeKey = ref(0)
const filesLoadId = ref(0)
const directoryEntries = new Map()
const currentDirectory = ref('')

async function initFiles() {
	const loadId = ++filesLoadId.value
	const exportCandidates = await get_pack_export_candidates(props.instance.id)
	if (loadId !== filesLoadId.value) return

	files.value = exportCandidates
	directoryEntries.set('', exportCandidates)
	currentDirectory.value = ''
	includedFilePaths.value = files.value
		.filter((file) => !file.disabled && file.defaultSelected)
		.map((file) => file.path)
}

const exportPack = async () => {
	const isMrpack = exportFormat.value === 'mrpack'
	const extension = isMrpack ? 'mrpack' : 'zip'
	const fileType = formatMessage(isMrpack ? messages.mrpackFormatLabel : messages.prismFormatLabel)
	const baseName = nameInput.value
	const defaultName = isMrpack
		? `${baseName} ${versionInput.value}.${extension}`
		: `${baseName}.${extension}`
	const selectedPath = await save({
		defaultPath: defaultName,
		filters: [{ name: fileType, extensions: [extension] }],
	})

	if (!selectedPath) return

	const outputPath = ensureExportExtension(selectedPath, extension)
	exportModal.value.hide()

	// Exporting is a whole-instance operation, so it shows up in the download
	// manager just like installing or duplicating an instance does.
	const operationId = `export-${props.instance.id}-${Date.now()}`
	beginExternalOperation({
		id: operationId,
		title: props.instance.name,
		text: formatMessage(messages.exporting),
		iconUrl: props.instance.icon_path ? convertFileSrc(props.instance.icon_path) : null,
	})

	try {
		if (isMrpack) {
			await export_instance_mrpack(
				props.instance.id,
				outputPath,
				includedFilePaths.value,
				excludedFilePaths.value,
				versionInput.value,
				exportDescription.value,
				nameInput.value,
			)
		} else {
			await export_instance_prism_zip(props.instance.id, outputPath, cleanPrismExportEnabled.value)
		}

		const fileName = outputPath.split(/[\\/]/).pop() ?? outputPath
		popupNotificationManager.addPopupNotification({
			title: formatMessage(messages.exportComplete),
			text: formatMessage(messages.exportCompleteDescription, { name: fileName }),
			type: 'success',
			buttons: [
				{
					label: formatMessage(commonMessages.openInFolderButton),
					icon: FolderOpenIcon,
					action: () => highlightInFolder(outputPath).catch(handleError),
				},
			],
		})
	} catch (error) {
		handleError(error)
	} finally {
		endExternalOperation(operationId)
	}
}

function ensureExportExtension(path, extension) {
	const archiveExtension = /\.(mrpack|zip)$/i
	return archiveExtension.test(path)
		? path.replace(archiveExtension, `.${extension}`)
		: `${path}.${extension}`
}

function resetExportState() {
	exportFormat.value = 'prism'
	cleanPrismExportEnabled.value = false
	nameInput.value = props.instance.name
	exportDescription.value = ''
	versionInput.value = '1.0.0'
	files.value = []
	includedFilePaths.value = []
	excludedFilePaths.value = []
	fileTreeKey.value += 1
	directoryEntries.clear()
	currentDirectory.value = ''
}

async function loadExportDirectory(path) {
	const normalizedPath = normalizeExportPath(path)
	currentDirectory.value = normalizedPath

	const cachedEntries = directoryEntries.get(normalizedPath)
	if (cachedEntries) {
		files.value = cachedEntries
		return
	}

	const loadId = filesLoadId.value
	files.value = []

	try {
		const childItems = await get_pack_export_candidates(
			props.instance.id,
			normalizedPath || undefined,
		)
		if (loadId !== filesLoadId.value) return

		directoryEntries.set(normalizedPath, childItems)
		if (currentDirectory.value === normalizedPath) {
			files.value = childItems
		}
	} catch {
		if (currentDirectory.value === normalizedPath) files.value = []
	}
}

function normalizeExportPath(path) {
	return path.replaceAll('\\', '/').split('/').filter(Boolean).join('/')
}
</script>

<template>
	<NewModal
		ref="exportModal"
		:header="formatMessage(exportFormat === 'mrpack' ? messages.header : messages.prismHeader)"
		scrollable
		width="46rem"
		max-width="calc(100vw - 2rem)"
	>
		<div class="flex flex-col gap-4">
			<div class="flex flex-col gap-2">
				<p class="m-0 text-contrast font-semibold">
					{{ formatMessage(messages.exportFormatLabel) }}
				</p>
				<RadioButtons
					v-model="exportFormat"
					:items="['prism', 'mrpack']"
					class="!flex-row flex-wrap"
				>
					<template #default="{ item }">
						{{
							formatMessage(
								item === 'mrpack' ? messages.mrpackFormatLabel : messages.prismFormatLabel,
							)
						}}
					</template>
				</RadioButtons>
				<p class="m-0 text-sm text-secondary">
					{{
						formatMessage(
							exportFormat === 'mrpack'
								? messages.mrpackFormatDescription
								: messages.prismFormatDescription,
						)
					}}
				</p>
			</div>
			<div class="grid gap-4" :class="exportFormat === 'mrpack' ? 'grid-cols-2' : 'grid-cols-1'">
				<div class="labeled_input w-full">
					<p class="text-contrast font-semibold">
						{{
							formatMessage(
								exportFormat === 'mrpack' ? messages.modpackNameLabel : messages.archiveNameLabel,
							)
						}}
					</p>
					<Input
						v-model="nameInput"
						type="text"
						:placeholder="
							formatMessage(
								exportFormat === 'mrpack'
									? messages.modpackNamePlaceholder
									: messages.archiveNamePlaceholder,
							)
						"
						clearable
						wrapper-class="w-full"
					/>
				</div>
				<div v-if="exportFormat === 'mrpack'" class="labeled_input w-full">
					<p class="text-contrast font-semibold">
						{{ formatMessage(messages.versionNumberLabel) }}
					</p>
					<Input
						v-model="versionInput"
						type="text"
						:placeholder="formatMessage(messages.versionNumberPlaceholder)"
						clearable
						wrapper-class="w-full"
					/>
				</div>
			</div>
			<!-- A clean export is a Prism-only option: the .mrpack format already
			     carries its own manifest and override selection. -->
			<div
				v-if="exportFormat === 'prism'"
				class="flex flex-col gap-2 rounded-xl border border-solid border-surface-5 p-3"
			>
				<div class="flex items-center justify-between gap-4">
					<p class="m-0 text-contrast font-semibold">
						{{ formatMessage(messages.cleanPrismExportLabel) }}
					</p>
					<Toggle id="export-modal-clean-prism" v-model="cleanPrismExportEnabled" />
				</div>
				<p class="m-0 text-sm text-secondary">
					{{ formatMessage(messages.cleanPrismExportHint) }}
				</p>
			</div>
			<div v-if="exportFormat === 'mrpack'" class="flex flex-col gap-2 min-w-0">
				<p class="m-0 text-contrast font-semibold">
					{{ formatMessage(commonMessages.descriptionLabel) }}
				</p>
				<Textarea
					v-model="exportDescription"
					:placeholder="formatMessage(messages.descriptionPlaceholder)"
					wrapper-class="w-full"
				/>
			</div>
			<!-- The Prism export always contains the whole instance, so there is
		     deliberately no file picker in that mode. -->
			<FileTreeSelect
				v-if="exportFormat === 'mrpack'"
				:key="fileTreeKey"
				v-model="includedFilePaths"
				v-model:excluded-paths="excludedFilePaths"
				class="min-w-0"
				:items="files"
				lazy
				@navigate="loadExportDirectory"
			/>
		</div>
		<template #actions>
			<div class="flex items-center justify-end gap-2">
				<Button type="outlined" @click="exportModal.hide">
					<XIcon />
					{{ formatMessage(commonMessages.cancelButton) }}
				</Button>
				<Button type="colored" color="brand" @click="exportPack">
					<PackageIcon />
					{{ formatMessage(messages.exportButton) }}
				</Button>
			</div>
		</template>
	</NewModal>
</template>
