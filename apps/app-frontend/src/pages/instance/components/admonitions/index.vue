<template>
	<Admonition
		v-if="instance.quarantined"
		v-bind="$attrs"
		type="warning"
		inline-actions
		:header="formatMessage(messages.lockedTitle)"
		:dismissible="false"
	>
		{{ formatMessage(messages.lockedText) }}
		<template #actions>
			<Button type="colored" color="orange" size="lg" @click="emit('delete')">
				<TrashIcon aria-hidden="true" />
				{{ formatMessage(messages.deleteInstance) }}
			</Button>
		</template>
	</Admonition>
</template>

<script setup lang="ts">
import { TrashIcon } from '@modrinth/assets'
import { Admonition, Button, defineMessages, useVIntl } from '@modrinth/ui'

import type { GameInstance } from '@/helpers/types'

defineOptions({
	inheritAttrs: false,
})

defineProps<{
	instance: GameInstance
}>()

const emit = defineEmits<{
	delete: []
}>()

const { formatMessage } = useVIntl()

const messages = defineMessages({
	lockedTitle: {
		id: 'instance.locked.title',
		defaultMessage: 'Instance locked',
	},
	lockedText: {
		id: 'instance.locked.text',
		defaultMessage:
			'This instance was locked and can no longer be played or updated. Deleting it frees up the space it uses.',
	},
	deleteInstance: {
		id: 'instance.locked.delete-button',
		defaultMessage: 'Delete instance',
	},
})
</script>
