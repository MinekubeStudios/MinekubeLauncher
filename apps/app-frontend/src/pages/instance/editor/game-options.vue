<script setup lang="ts">
import { EditIcon, RefreshCwIcon } from '@modrinth/assets'
import { Button, commonMessages, defineMessages, useVIntl } from '@modrinth/ui'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, ref } from 'vue'

import GameSettingsModal from '@/components/ui/settings/instances/game-settings-modal/index.vue'
import { gameOptionsSyncSourcesQueryOptions } from '@/helpers/synced-options'
import { instanceKeys } from '@/pages/instance/query-options'

import { injectInstanceSettings } from '../components/settings-modal/instance-settings-context'

const { instance } = injectInstanceSettings()
const { formatMessage } = useVIntl()
const queryClient = useQueryClient()
const sources = useQuery(gameOptionsSyncSourcesQueryOptions())
const canEdit = computed(() =>
	(sources.data.value ?? []).some(
		(source) => source.source_id === instance.value.id && source.eligible,
	),
)
const modal = ref<InstanceType<typeof GameSettingsModal> | null>(null)

const messages = defineMessages({
	edit: {
		id: 'app.instance.editor.game-options.edit',
		defaultMessage: 'Edit game options',
	},
	intro: {
		id: 'app.instance.editor.game-options.intro',
		defaultMessage:
			'Edit Minecraft video, audio, controls, language and accessibility options from this instance’s options.txt.',
	},
	noOptions: {
		id: 'app.instance.editor.game-options.no-options',
		defaultMessage:
			'No editable game options have been found yet. Launch Minecraft once to create options.txt, then refresh this page.',
	},
})

async function onSaved() {
	await queryClient.invalidateQueries({ queryKey: instanceKeys.detail(instance.value.id) })
	await sources.refetch()
}
</script>

<template>
	<div class="flex flex-col gap-5">
		<GameSettingsModal ref="modal" :instance-id="instance.id" @saved="onSaved" />
		<p class="m-0 text-secondary">{{ formatMessage(messages.intro) }}</p>
		<div
			v-if="sources.isPending.value"
			role="status"
			class="h-12 animate-pulse rounded-lg bg-surface-3"
		/>
		<div v-else-if="sources.isError.value" class="flex justify-start">
			<Button type="outlined" @click="sources.refetch()">
				<RefreshCwIcon /> {{ formatMessage(commonMessages.refreshButton) }}
			</Button>
		</div>
		<div v-else-if="canEdit">
			<Button type="colored" color="brand" @click="modal?.show()">
				<EditIcon /> {{ formatMessage(messages.edit) }}
			</Button>
		</div>
		<div v-else class="flex flex-col items-start gap-3">
			<p class="m-0 text-secondary">{{ formatMessage(messages.noOptions) }}</p>
			<Button type="outlined" @click="sources.refetch()">
				<RefreshCwIcon /> {{ formatMessage(commonMessages.refreshButton) }}
			</Button>
		</div>
	</div>
</template>
