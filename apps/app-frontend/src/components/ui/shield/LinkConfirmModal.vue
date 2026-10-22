<script setup lang="ts">
import { CheckIcon, ExternalIcon, XIcon } from '@modrinth/assets'
import { Button, defineMessages, NewModal, useVIntl } from '@modrinth/ui'
import { ref } from 'vue'

/**
 * Minekube Shield: asks before something that came from outside the launcher
 * (a link clicked in the browser, a file opened from Explorer) installs or
 * starts anything.
 */

const { formatMessage } = useVIntl()

const messages = defineMessages({
	from: {
		id: 'app.link-confirm.from',
		defaultMessage: 'This request came from outside the launcher — a link or a file you opened.',
	},
	cancel: { id: 'app.link-confirm.cancel', defaultMessage: 'Cancel' },
})

const modal = ref<InstanceType<typeof NewModal>>()
const title = ref('')
const text = ref('')
const confirmLabel = ref('')
let resolver: ((confirmed: boolean) => void) | null = null

function settle(confirmed: boolean): void {
	const resolve = resolver
	resolver = null
	resolve?.(confirmed)
}

function choose(confirmed: boolean): void {
	settle(confirmed)
	modal.value?.hide()
}

function ask(options: { title: string; text: string; confirmLabel: string }): Promise<boolean> {
	settle(false)
	title.value = options.title
	text.value = options.text
	confirmLabel.value = options.confirmLabel
	modal.value?.show()
	return new Promise<boolean>((resolve) => {
		resolver = resolve
	})
}

defineExpose({ ask })
</script>

<template>
	<NewModal ref="modal" :header="title" max-width="480px" :on-hide="() => settle(false)">
		<div class="flex flex-col gap-3">
			<p class="m-0 text-contrast">{{ text }}</p>
			<p class="m-0 flex items-center gap-2 text-sm text-secondary">
				<ExternalIcon class="size-4 shrink-0" />
				{{ formatMessage(messages.from) }}
			</p>
			<div class="mt-2 flex justify-end gap-2">
				<Button @click="choose(false)">
					<XIcon />
					{{ formatMessage(messages.cancel) }}
				</Button>
				<Button type="colored" color="brand" @click="choose(true)">
					<CheckIcon />
					{{ confirmLabel }}
				</Button>
			</div>
		</div>
	</NewModal>
</template>
