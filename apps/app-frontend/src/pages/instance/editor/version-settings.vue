<script setup lang="ts">
import { CheckIcon, HammerIcon, SpinnerIcon, UnlinkIcon } from '@modrinth/assets'
import {
	Button,
	Chips,
	Combobox,
	commonMessages,
	defineMessages,
	formatLoaderLabel,
	injectNotificationManager,
	Toggle,
	useVIntl,
} from '@modrinth/ui'
import type { GameVersionTag } from '@modrinth/utils'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, ref, watch } from 'vue'

import { install_existing_instance } from '@/helpers/install'
import { edit, get_optimal_jre_key } from '@/helpers/instance'
import { get_loader_versions } from '@/helpers/metadata'
import { get_game_versions } from '@/helpers/tags'
import type { InstanceLoader, Manifest } from '@/helpers/types'
import { injectInstancePage } from '@/pages/instance/instance-context'
import { instanceKeys } from '@/pages/instance/query-options'

import { injectInstanceSettings } from '../components/settings-modal/instance-settings-context'

const { formatMessage } = useVIntl()
const { handleError, addNotification } = injectNotificationManager()
const queryClient = useQueryClient()
const { instance } = injectInstanceSettings()
// The settings context only carries a snapshot of the connectivity; the page
// context is reactive, so going on- or offline updates the buttons immediately.
const { offline } = injectInstancePage()

const messages = defineMessages({
	components: {
		id: 'app.instance.editor.version.components',
		defaultMessage: 'Components',
	},
	componentsDescription: {
		id: 'app.instance.editor.version.components.description',
		defaultMessage:
			'This instance is fully local. Changing the Minecraft version or loader reinstalls the game files in this instance only — your worlds and settings stay in place.',
	},
	component: {
		id: 'app.instance.editor.version.component',
		defaultMessage: 'Component',
	},
	version: {
		id: 'app.instance.editor.version.component-version',
		defaultMessage: 'Version',
	},
	minecraft: {
		id: 'app.instance.editor.version.minecraft',
		defaultMessage: 'Minecraft',
	},
	loader: {
		id: 'app.instance.editor.version.loader',
		defaultMessage: 'Mod loader',
	},
	vanilla: {
		id: 'app.instance.editor.version.vanilla',
		defaultMessage: 'None (Vanilla)',
	},
	java: {
		id: 'app.instance.editor.version.java',
		defaultMessage: 'Recommended Java',
	},
	changeVersion: {
		id: 'app.instance.editor.version.change',
		defaultMessage: 'Change version',
	},
	platform: {
		id: 'app.instance.editor.version.platform',
		defaultMessage: 'Loader',
	},
	gameVersion: {
		id: 'app.instance.editor.version.game-version',
		defaultMessage: 'Minecraft version',
	},
	loaderVersion: {
		id: 'app.instance.editor.version.loader-version',
		defaultMessage: '{loader} version',
	},
	showSnapshots: {
		id: 'app.instance.editor.version.show-snapshots',
		defaultMessage: 'Show snapshots and pre-releases',
	},
	apply: {
		id: 'app.instance.editor.version.apply',
		defaultMessage: 'Apply and reinstall',
	},
	applying: {
		id: 'app.instance.editor.version.applying',
		defaultMessage: 'Applying…',
	},
	reset: {
		id: 'app.instance.editor.version.reset',
		defaultMessage: 'Reset changes',
	},
	applied: {
		id: 'app.instance.editor.version.applied',
		defaultMessage: 'Version changed',
	},
	appliedDescription: {
		id: 'app.instance.editor.version.applied.description',
		defaultMessage: 'The instance now uses Minecraft {gameVersion} with {loader}.',
	},
	warning: {
		id: 'app.instance.editor.version.warning',
		defaultMessage:
			'Changing the Minecraft version or loader can make existing mods incompatible. Mods that do not support the new version will fail to load until you update or remove them in the Mods section.',
	},
	repair: {
		id: 'app.instance.editor.version.repair',
		defaultMessage: 'Repair installation',
	},
	repairDescription: {
		id: 'app.instance.editor.version.repair.description',
		defaultMessage:
			'Re-downloads and verifies the Minecraft and loader files of this instance without touching worlds, mods or settings.',
	},
	repairButton: {
		id: 'app.instance.editor.version.repair.button',
		defaultMessage: 'Repair',
	},
	linkedTitle: {
		id: 'app.instance.editor.version.linked.title',
		defaultMessage: 'This instance is still linked to a modpack',
	},
	linkedDescription: {
		id: 'app.instance.editor.version.linked.description',
		defaultMessage:
			'The link only records where the content originally came from. You can detach it and keep everything installed — the instance then behaves as a fully local Prism-style instance and will no longer be updated as a modpack.',
	},
	unlink: {
		id: 'app.instance.editor.version.unlink',
		defaultMessage: 'Detach and keep content',
	},
	unlinked: {
		id: 'app.instance.editor.version.unlinked',
		defaultMessage: 'Instance detached',
	},
	searchVersion: {
		id: 'app.instance.editor.version.search',
		defaultMessage: 'Search versions…',
	},
})

const loaders: InstanceLoader[] = ['vanilla', 'fabric', 'forge', 'quilt', 'neoforge']
const manifestKey: Record<string, string> = { neoforge: 'neo' }

const selectedLoader = ref<InstanceLoader>(instance.value.loader)
const selectedGameVersion = ref(instance.value.game_version)
const selectedLoaderVersion = ref(instance.value.loader_version ?? '')
const showSnapshots = ref(false)
const applying = ref(false)
const repairing = ref(false)

watch(
	() =>
		[
			instance.value.id,
			instance.value.loader,
			instance.value.game_version,
			instance.value.loader_version,
		] as const,
	() => {
		if (applying.value) return
		selectedLoader.value = instance.value.loader
		selectedGameVersion.value = instance.value.game_version
		selectedLoaderVersion.value = instance.value.loader_version ?? ''
	},
)

const gameVersionsQuery = useQuery({
	queryKey: ['instance-editor', 'game-versions'],
	queryFn: () => get_game_versions() as Promise<GameVersionTag[]>,
})
const fabricManifestQuery = useQuery({
	queryKey: ['instance-editor', 'loader-versions', 'fabric'],
	queryFn: () => get_loader_versions('fabric') as Promise<Manifest>,
})
const forgeManifestQuery = useQuery({
	queryKey: ['instance-editor', 'loader-versions', 'forge'],
	queryFn: () => get_loader_versions('forge') as Promise<Manifest>,
})
const quiltManifestQuery = useQuery({
	queryKey: ['instance-editor', 'loader-versions', 'quilt'],
	queryFn: () => get_loader_versions('quilt') as Promise<Manifest>,
})
const neoforgeManifestQuery = useQuery({
	queryKey: ['instance-editor', 'loader-versions', 'neoforge'],
	queryFn: () => get_loader_versions(manifestKey.neoforge) as Promise<Manifest>,
})
const manifests: Record<string, { data: typeof fabricManifestQuery.data }> = {
	fabric: fabricManifestQuery,
	forge: forgeManifestQuery,
	quilt: quiltManifestQuery,
	neoforge: neoforgeManifestQuery,
}
const optimalJavaQuery = useQuery({
	queryKey: computed(() => ['instance-editor', 'optimal-java', instance.value.id]),
	queryFn: () => get_optimal_jre_key(instance.value.id),
})

function getManifest(loader: string): Manifest | undefined {
	return manifests[loader]?.data.value
}

const gameVersionOptions = computed(() => {
	const versions = gameVersionsQuery.data.value ?? []
	const manifest =
		selectedLoader.value === 'vanilla' ? undefined : getManifest(selectedLoader.value)
	const filtered = versions.filter((item) => {
		if (!showSnapshots.value && item.version_type !== 'release') return false
		if (!manifest) return selectedLoader.value === 'vanilla'
		return manifest.gameVersions?.some((entry) => entry.id === item.version)
	})
	const options = filtered.map((item) => ({ value: item.version, label: item.version }))
	if (
		selectedGameVersion.value &&
		!options.some((option) => option.value === selectedGameVersion.value)
	) {
		options.unshift({ value: selectedGameVersion.value, label: selectedGameVersion.value })
	}
	return options
})

function resolveLoaderVersionIds(loader: string, gameVersion: string): string[] {
	if (loader === 'vanilla' || !gameVersion) return []
	const manifest = getManifest(loader)
	if (!manifest) return []
	const entry = manifest.gameVersions?.find((item) => item.id === gameVersion)
	if (entry?.versionGroup) {
		return (
			manifest.versionGroups
				?.find((group) => group.id === entry.versionGroup)
				?.loaders.map((l) => l.id) ?? []
		)
	}
	const placeholder = manifest.gameVersions?.find((item) => item.id === '${modrinth.gameVersion}')
	if (placeholder) {
		return manifest.gameVersions?.some((item) => item.id === gameVersion)
			? placeholder.loaders.map((l) => l.id)
			: []
	}
	return entry?.loaders.map((l) => l.id) ?? []
}

const loaderVersionOptions = computed(() => {
	const ids = resolveLoaderVersionIds(selectedLoader.value, selectedGameVersion.value)
	// The installed loader version stays selectable even when the metadata no
	// longer lists it; otherwise it was silently swapped for another version,
	// which marked the instance as changed before the user touched anything.
	const installed = instance.value.loader_version
	if (
		installed &&
		ids.length > 0 &&
		selectedLoader.value === instance.value.loader &&
		selectedGameVersion.value === instance.value.game_version &&
		!ids.includes(installed)
	) {
		ids.unshift(installed)
	}
	return ids.map((id) => ({ value: id, label: id }))
})

/**
 * Keeps the selected loader version valid for the chosen loader and game
 * version. While that loader's metadata is still loading nothing is changed, so
 * the installed version is not thrown away just because the list is empty yet.
 */
function syncLoaderVersion(options: { value: string }[]) {
	if (options.some((option) => option.value === selectedLoaderVersion.value)) return
	if (options.length > 0) {
		selectedLoaderVersion.value = options[0].value
	} else if (getManifest(selectedLoader.value)) {
		selectedLoaderVersion.value = ''
	}
}

watch([selectedLoader, selectedGameVersion], () => {
	if (selectedLoader.value === 'vanilla') {
		selectedLoaderVersion.value = ''
		return
	}
	syncLoaderVersion(loaderVersionOptions.value)
})

watch(loaderVersionOptions, (options) => {
	if (selectedLoader.value === 'vanilla') return
	syncLoaderVersion(options)
})

const hasChanges = computed(
	() =>
		selectedLoader.value !== instance.value.loader ||
		selectedGameVersion.value !== instance.value.game_version ||
		(selectedLoader.value !== 'vanilla' &&
			selectedLoaderVersion.value !== (instance.value.loader_version ?? '')),
)
const isValid = computed(
	() =>
		!!selectedGameVersion.value &&
		(selectedLoader.value === 'vanilla' ||
			loaderVersionOptions.value.some((option) => option.value === selectedLoaderVersion.value)),
)
const busy = computed(
	() =>
		applying.value ||
		repairing.value ||
		instance.value.install_stage !== 'installed' ||
		offline.value,
)

const components = computed(() => {
	const rows = [
		{
			name: formatMessage(messages.minecraft),
			version: instance.value.game_version,
		},
		{
			name: formatMessage(messages.loader),
			version:
				instance.value.loader === 'vanilla'
					? formatMessage(messages.vanilla)
					: `${formatLoaderLabel(instance.value.loader)}${instance.value.loader_version ? ` ${instance.value.loader_version}` : ''}`,
		},
	]
	if (optimalJavaQuery.data.value?.parsed_version) {
		rows.push({
			name: formatMessage(messages.java),
			version: `Java ${optimalJavaQuery.data.value.parsed_version}`,
		})
	}
	return rows
})

function resetSelection() {
	selectedLoader.value = instance.value.loader
	selectedGameVersion.value = instance.value.game_version
	selectedLoaderVersion.value = instance.value.loader_version ?? ''
}

async function applyVersion() {
	if (!hasChanges.value || !isValid.value || busy.value) return
	applying.value = true
	const gameVersion = selectedGameVersion.value
	const loader = selectedLoader.value
	try {
		await edit(instance.value.id, {
			loader,
			game_version: gameVersion,
			loader_version:
				loader === 'vanilla' ? (null as unknown as undefined) : selectedLoaderVersion.value,
		})
		await install_existing_instance(instance.value.id, false)
		await queryClient.invalidateQueries({ queryKey: instanceKeys.detail(instance.value.id) })
		await queryClient.invalidateQueries({ queryKey: instanceKeys.list() })
		addNotification({
			type: 'success',
			title: formatMessage(messages.applied),
			text: formatMessage(messages.appliedDescription, {
				gameVersion,
				loader: loader === 'vanilla' ? formatMessage(messages.vanilla) : formatLoaderLabel(loader),
			}),
		})
	} catch (error) {
		handleError(error)
	} finally {
		applying.value = false
	}
}

async function repair() {
	if (busy.value) return
	repairing.value = true
	try {
		await install_existing_instance(instance.value.id, true)
	} catch (error) {
		handleError(error)
	} finally {
		repairing.value = false
	}
}

const isLinked = computed(
	() =>
		instance.value.link?.type === 'modrinth_modpack' ||
		instance.value.link?.type === 'server_project_modpack' ||
		instance.value.link?.type === 'imported_modpack',
)

async function unlink() {
	try {
		await edit(instance.value.id, { link: null as unknown as undefined })
		await queryClient.invalidateQueries({ queryKey: instanceKeys.detail(instance.value.id) })
		addNotification({ type: 'success', title: formatMessage(messages.unlinked) })
	} catch (error) {
		handleError(error)
	}
}
</script>

<template>
	<div class="flex flex-col gap-6">
		<section class="flex flex-col gap-3">
			<div>
				<h3 class="m-0 text-lg font-semibold text-contrast">
					{{ formatMessage(messages.components) }}
				</h3>
				<p class="m-0 mt-1 text-secondary">{{ formatMessage(messages.componentsDescription) }}</p>
			</div>
			<div class="overflow-hidden rounded-xl border border-surface-5">
				<table class="w-full border-collapse text-left">
					<thead>
						<tr class="bg-surface-3 text-xs uppercase tracking-wide text-secondary">
							<th class="px-4 py-2 font-semibold">{{ formatMessage(messages.component) }}</th>
							<th class="px-4 py-2 font-semibold">{{ formatMessage(messages.version) }}</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="row in components"
							:key="row.name"
							class="border-t border-surface-5 bg-surface-2"
						>
							<td class="px-4 py-2.5 font-semibold text-contrast">{{ row.name }}</td>
							<td class="px-4 py-2.5 text-secondary">{{ row.version }}</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>

		<section
			v-if="isLinked"
			class="flex flex-col gap-3 rounded-xl border border-surface-5 bg-surface-3 p-4"
		>
			<h3 class="m-0 text-base font-semibold text-contrast">
				{{ formatMessage(messages.linkedTitle) }}
			</h3>
			<p class="m-0 text-secondary">{{ formatMessage(messages.linkedDescription) }}</p>
			<div>
				<Button type="outlined" :disabled="busy" @click="unlink">
					<UnlinkIcon /> {{ formatMessage(messages.unlink) }}
				</Button>
			</div>
		</section>

		<section class="flex flex-col gap-4">
			<h3 class="m-0 text-lg font-semibold text-contrast">
				{{ formatMessage(messages.changeVersion) }}
			</h3>

			<div class="flex flex-col gap-2.5">
				<span class="font-semibold text-contrast">{{ formatMessage(messages.platform) }}</span>
				<Chips
					v-model="selectedLoader"
					:items="loaders"
					:format-label="formatLoaderLabel"
					:capitalize="false"
					:aria-label="formatMessage(messages.platform)"
				/>
			</div>

			<div class="flex flex-col gap-2.5">
				<span class="font-semibold text-contrast">{{ formatMessage(messages.gameVersion) }}</span>
				<Combobox
					v-model="selectedGameVersion"
					:options="gameVersionOptions"
					searchable
					sync-with-selection
					:placeholder="formatMessage(commonMessages.selectVersionPlaceholder)"
					:search-placeholder="formatMessage(messages.searchVersion)"
					:display-value="selectedGameVersion"
					:aria-label="formatMessage(messages.gameVersion)"
				/>
				<label class="flex cursor-pointer items-center gap-2 text-secondary">
					<Toggle id="show-snapshots" v-model="showSnapshots" />
					{{ formatMessage(messages.showSnapshots) }}
				</label>
			</div>

			<div v-if="selectedLoader !== 'vanilla'" class="flex flex-col gap-2.5">
				<span class="font-semibold text-contrast">
					{{ formatMessage(messages.loaderVersion, { loader: formatLoaderLabel(selectedLoader) }) }}
				</span>
				<Combobox
					v-model="selectedLoaderVersion"
					:options="loaderVersionOptions"
					searchable
					sync-with-selection
					:placeholder="formatMessage(commonMessages.selectVersionPlaceholder)"
					:search-placeholder="formatMessage(messages.searchVersion)"
					:display-value="selectedLoaderVersion"
					:aria-label="
						formatMessage(messages.loaderVersion, { loader: formatLoaderLabel(selectedLoader) })
					"
				/>
			</div>

			<p v-if="hasChanges" class="m-0 rounded-xl bg-surface-3 p-4 text-secondary">
				{{ formatMessage(messages.warning) }}
			</p>

			<div class="flex flex-wrap gap-2">
				<Button
					type="colored"
					color="brand"
					:disabled="!hasChanges || !isValid || busy"
					@click="applyVersion"
				>
					<SpinnerIcon v-if="applying" class="animate-spin" />
					<CheckIcon v-else />
					{{ formatMessage(applying ? messages.applying : messages.apply) }}
				</Button>
				<Button v-if="hasChanges" type="outlined" :disabled="applying" @click="resetSelection">
					{{ formatMessage(messages.reset) }}
				</Button>
			</div>
		</section>

		<section class="flex flex-col gap-3 border-t border-surface-5 pt-6">
			<div>
				<h3 class="m-0 text-lg font-semibold text-contrast">
					{{ formatMessage(messages.repair) }}
				</h3>
				<p class="m-0 mt-1 text-secondary">{{ formatMessage(messages.repairDescription) }}</p>
			</div>
			<div>
				<Button type="outlined" :disabled="busy" @click="repair">
					<SpinnerIcon v-if="repairing" class="animate-spin" />
					<HammerIcon v-else />
					{{ formatMessage(messages.repairButton) }}
				</Button>
			</div>
		</section>
	</div>
</template>
