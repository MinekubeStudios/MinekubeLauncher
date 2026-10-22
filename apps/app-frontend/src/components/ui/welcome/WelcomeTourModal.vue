<script setup lang="ts">
import { injectNotificationManager, NewModal, useVIntl } from '@modrinth/ui'
import { useModalStack } from '@modrinth/ui/src/composables/modal-stack'
import { getVersion } from '@tauri-apps/api/app'
import { onMounted, ref, watch } from 'vue'

import { get_default_user, login_local, set_default_user, users } from '@/helpers/auth.js'
import { ensurePlayerAccount } from '@/helpers/player-account'
import { createWelcomeState } from '@/helpers/welcome-state'

import { welcomeMessages as m } from './messages'
import WelcomeTour from './WelcomeTour.vue'

const props = defineProps<{ ready: boolean }>()
const emit = defineEmits<{ finish: [createPlayer: boolean] }>()
const { formatMessage } = useVIntl()
const { addNotification } = injectNotificationManager()
const { stackCount } = useModalStack()
const modal = ref<InstanceType<typeof NewModal>>()
const active = ref(false)
const mounted = ref(false)
const processing = ref(false)
const version = ref<string>()
const state = createWelcomeState(() => localStorage)
let automaticCheckDone = false
let createdPlayer = false
let closing = false
let saved = true

function show() {
	if (!props.ready || active.value) return
	active.value = true
	closing = false
	createdPlayer = false
	modal.value?.show()
}

async function finish(createPlayer: boolean) {
	if (closing || processing.value) return
	processing.value = true
	if (createPlayer) {
		try {
			await ensurePlayerAccount({
				users,
				loginLocal: login_local,
				getDefaultUser: get_default_user,
				setDefaultUser: set_default_user,
			})
		} catch {
			addNotification({
				title: formatMessage(m.playerTitle),
				text: formatMessage(m.playerError),
				type: 'error',
			})
			processing.value = false
			return
		}
	}

	closing = true
	createdPlayer = createPlayer
	saved = state.complete()
	modal.value?.hide()
	processing.value = false
}

function afterHide() {
	active.value = false
	if (!saved) {
		addNotification({
			title: formatMessage(m.introLabel),
			text: formatMessage(m.saveError),
			type: 'warning',
		})
	}
	emit('finish', createdPlayer)
}

function handleDialogKeydown(event: KeyboardEvent) {
	if (event.key === 'Tab') return
	event.stopPropagation()
	if (event.key === 'Escape') event.preventDefault()
}

watch(
	[() => props.ready, stackCount, mounted],
	([ready, count, isMounted]) => {
		if (!isMounted || !ready || count > 0 || automaticCheckDone) return
		automaticCheckDone = true
		if (!state.isCompleted()) show()
	},
	{ immediate: true, flush: 'post' },
)

onMounted(async () => {
	mounted.value = true
	try {
		version.value = await getVersion()
	} catch {
		// The version is informational and must never block the welcome flow.
	}
})

defineExpose({ show })
</script>

<template>
	<NewModal
		ref="modal"
		header="Minekube Launcher"
		hide-header
		no-padding
		:closable="false"
		:close-on-esc="false"
		:close-on-click-outside="false"
		:on-after-hide="afterHide"
		width="1080px"
		max-width="1080px"
		class="welcome-modal"
		aria-label="Minekube Launcher"
		:aria-labelledby="undefined"
		@keydown="handleDialogKeydown"
	>
		<WelcomeTour v-if="active" :version="version" :finishing="processing" @finish="finish" />
	</NewModal>
</template>

<style scoped>
.welcome-modal {
	background: var(--color-bg) !important;
	border: 1px solid var(--brand-gradient-border) !important;
	border-radius: var(--radius-xl) !important;
	color: var(--color-contrast);
}
</style>
