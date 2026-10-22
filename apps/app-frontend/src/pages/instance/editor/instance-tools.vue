<script setup lang="ts">
import {
	ClipboardCopyIcon,
	FolderOpenIcon,
	ImageIcon,
	TerminalSquareIcon,
	WorldIcon,
} from '@modrinth/assets'
import { Button, defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { get_full_path } from '@/helpers/instance'
import { showInstanceInFolder } from '@/helpers/utils.js'

import { injectInstanceSettings } from '../components/settings-modal/instance-settings-context'

const { instance } = injectInstanceSettings()
const router = useRouter()
const { formatMessage } = useVIntl()
const { handleError, addNotification } = injectNotificationManager()
const editorPath = computed(() => `/instance/${encodeURIComponent(instance.value.id)}/edit`)
const messages = defineMessages({
	folder: {
		id: 'app.instance.editor.tools.folder',
		defaultMessage: 'Open instance folder',
	},
	path: {
		id: 'app.instance.editor.tools.path',
		defaultMessage: 'Copy instance path',
	},
	copied: {
		id: 'app.instance.editor.tools.copied',
		defaultMessage: 'Instance path copied',
	},
	logs: {
		id: 'app.instance.editor.tools.logs',
		defaultMessage: 'View console and logs',
	},
	worlds: {
		id: 'app.instance.editor.tools.worlds',
		defaultMessage: 'Manage worlds',
	},
	screenshots: {
		id: 'app.instance.editor.tools.screenshots',
		defaultMessage: 'View screenshots',
	},
	files: {
		id: 'app.instance.editor.tools.files',
		defaultMessage: 'Manage files',
	},
})

async function copyPath() {
	try {
		await navigator.clipboard.writeText(await get_full_path(instance.value.id))
		addNotification({ type: 'success', title: formatMessage(messages.copied) })
	} catch (error) {
		handleError(error)
	}
}

/**
 * The old instance sub-pages (`/instance/<id>/logs`, …) were removed and now
 * redirect to Home, so these open the matching sections of this editor.
 */
const destinations = [
	{ section: 'logs', label: 'logs', icon: TerminalSquareIcon },
	{ section: 'worlds', label: 'worlds', icon: WorldIcon },
	{ section: 'screenshots', label: 'screenshots', icon: ImageIcon },
	{ section: 'files', label: 'files', icon: FolderOpenIcon },
] as const
</script>

<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-wrap gap-2">
			<Button type="outlined" @click="showInstanceInFolder(instance.id).catch(handleError)">
				<FolderOpenIcon /> {{ formatMessage(messages.folder) }}
			</Button>
			<Button type="outlined" @click="copyPath">
				<ClipboardCopyIcon /> {{ formatMessage(messages.path) }}
			</Button>
		</div>
		<div class="grid gap-2 sm:grid-cols-2">
			<Button
				v-for="destination in destinations"
				:key="destination.section"
				type="base"
				class="!justify-start !p-4"
				@click="router.replace({ path: editorPath, query: { section: destination.section } })"
			>
				<component :is="destination.icon" /> {{ formatMessage(messages[destination.label]) }}
			</Button>
		</div>
	</div>
</template>
