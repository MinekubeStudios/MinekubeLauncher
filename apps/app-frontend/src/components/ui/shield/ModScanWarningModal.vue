<script setup lang="ts">
import { FolderOpenIcon, PlayIcon, ShieldAlertIcon, XIcon } from '@modrinth/assets'
import { Button, defineMessages, NewModal, useVIntl } from '@modrinth/ui'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { get_full_path } from '@/helpers/instance'
import { registerModScanPrompt, type ScanFinding, type ScanReason } from '@/helpers/mod-scan'
import { openPath } from '@/helpers/utils'

const { formatMessage } = useVIntl()

const messages = defineMessages({
	header: { id: 'app.mod-scan.header', defaultMessage: 'Minekube Shield found risky mods' },
	intro: {
		id: 'app.mod-scan.intro',
		defaultMessage:
			'Before starting the game, the mods in this instance were checked for known malware. These files look risky:',
	},
	danger: { id: 'app.mod-scan.danger', defaultMessage: 'Dangerous' },
	suspicious: { id: 'app.mod-scan.suspicious', defaultMessage: 'Suspicious' },
	advice: {
		id: 'app.mod-scan.advice',
		defaultMessage:
			'If you did not download these mods from a source you trust, delete them from the instance’s mods folder and change your Microsoft password. Suspicious does not always mean harmful — some legitimate mods do similar things.',
	},
	openFolder: { id: 'app.mod-scan.open-folder', defaultMessage: 'Open mods folder' },
	cancel: { id: 'app.mod-scan.cancel', defaultMessage: 'Don’t start' },
	launchAnyway: { id: 'app.mod-scan.launch-anyway', defaultMessage: 'Start anyway' },
	reasonKnownMalware: {
		id: 'app.mod-scan.reason.known-malware',
		defaultMessage: 'Contains code of known Minecraft malware (Fractureiser)',
	},
	reasonCredentialTheft: {
		id: 'app.mod-scan.reason.credential-theft',
		defaultMessage: 'Reads saved logins or tokens and can send them to a webhook or bot',
	},
	reasonReadsCredentials: {
		id: 'app.mod-scan.reason.reads-credentials',
		defaultMessage: 'Reads saved logins, browser data or launcher accounts',
	},
	reasonExfiltration: {
		id: 'app.mod-scan.reason.exfiltration',
		defaultMessage: 'Can send data to a Discord webhook or Telegram bot',
	},
	reasonHiddenCommands: {
		id: 'app.mod-scan.reason.hidden-commands',
		defaultMessage: 'Runs hidden PowerShell or command-line scripts',
	},
	reasonEmbeddedExecutable: {
		id: 'app.mod-scan.reason.embedded-executable',
		defaultMessage: 'Carries a Windows program or script inside the mod',
	},
})

const reasonText: Record<ScanReason, () => string> = {
	known_malware: () => formatMessage(messages.reasonKnownMalware),
	credential_theft: () => formatMessage(messages.reasonCredentialTheft),
	reads_credentials: () => formatMessage(messages.reasonReadsCredentials),
	exfiltration_channel: () => formatMessage(messages.reasonExfiltration),
	hidden_commands: () => formatMessage(messages.reasonHiddenCommands),
	embedded_executable: () => formatMessage(messages.reasonEmbeddedExecutable),
}

const modal = ref<InstanceType<typeof NewModal>>()
const findings = ref<ScanFinding[]>([])
const instanceId = ref<string | null>(null)
const hasDanger = computed(() => findings.value.some((finding) => finding.severity === 'danger'))

let resolver: ((launch: boolean) => void) | null = null

function settle(launch: boolean): void {
	const resolve = resolver
	resolver = null
	resolve?.(launch)
}

function choose(launch: boolean): void {
	settle(launch)
	modal.value?.hide()
}

async function openModsFolder(): Promise<void> {
	if (!instanceId.value) return
	try {
		const path = await get_full_path(instanceId.value)
		await openPath(`${path}/mods`)
	} catch (error) {
		console.warn('Could not open the mods folder', error)
	}
}

onMounted(() => {
	registerModScanPrompt((found, id) => {
		// A second launch while the dialog is open counts as "don't start".
		settle(false)
		findings.value = found
		instanceId.value = id
		modal.value?.show()
		return new Promise<boolean>((resolve) => {
			resolver = resolve
		})
	})
})

onBeforeUnmount(() => {
	registerModScanPrompt(null)
	settle(false)
})
</script>

<template>
	<NewModal
		ref="modal"
		:header="formatMessage(messages.header)"
		:fade="hasDanger ? 'danger' : 'warning'"
		max-width="560px"
		:on-hide="() => settle(false)"
	>
		<div class="flex flex-col gap-4">
			<p class="m-0 text-secondary">{{ formatMessage(messages.intro) }}</p>

			<ul class="m-0 flex list-none flex-col gap-2 p-0">
				<li
					v-for="finding in findings"
					:key="finding.file_name"
					class="scan-finding"
					:class="finding.severity === 'danger' ? 'is-danger' : 'is-suspicious'"
				>
					<div class="flex items-center gap-2">
						<ShieldAlertIcon class="size-4 shrink-0" />
						<span class="scan-finding__name" :title="finding.file_name">
							{{ finding.file_name }}
						</span>
						<span class="scan-finding__badge">
							{{
								finding.severity === 'danger'
									? formatMessage(messages.danger)
									: formatMessage(messages.suspicious)
							}}
						</span>
					</div>
					<ul class="scan-finding__reasons">
						<li v-for="reason in finding.reasons" :key="reason">{{ reasonText[reason]() }}</li>
					</ul>
				</li>
			</ul>

			<p class="m-0 text-sm text-secondary">{{ formatMessage(messages.advice) }}</p>

			<div class="flex flex-wrap items-center justify-between gap-2">
				<Button @click="openModsFolder">
					<FolderOpenIcon />
					{{ formatMessage(messages.openFolder) }}
				</Button>
				<div class="flex flex-wrap gap-2">
					<Button @click="choose(false)">
						<XIcon />
						{{ formatMessage(messages.cancel) }}
					</Button>
					<Button type="colored" :color="hasDanger ? 'red' : 'orange'" @click="choose(true)">
						<PlayIcon />
						{{ formatMessage(messages.launchAnyway) }}
					</Button>
				</div>
			</div>
		</div>
	</NewModal>
</template>

<style scoped>
.scan-finding {
	padding: 0.7rem 0.85rem;
	border: 1px solid var(--color-divider);
	border-left-width: 3px;
	border-radius: 0.6rem;
	background: var(--color-bg);
}

.scan-finding.is-danger {
	border-left-color: var(--color-red);
	color: var(--color-red);
}

.scan-finding.is-suspicious {
	border-left-color: var(--color-orange);
	color: var(--color-orange);
}

.scan-finding__name {
	overflow: hidden;
	color: var(--color-contrast);
	font-family: var(--mono-font, ui-monospace, monospace);
	font-size: 0.85rem;
	font-weight: 700;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.scan-finding__badge {
	margin-left: auto;
	padding: 0.05rem 0.45rem;
	border-radius: 999px;
	background: color-mix(in srgb, currentColor 14%, transparent);
	font-size: 0.66rem;
	font-weight: 800;
	letter-spacing: 0.04em;
	text-transform: uppercase;
}

.scan-finding__reasons {
	margin: 0.4rem 0 0;
	padding-left: 1.5rem;
	color: var(--color-base);
	font-size: 0.8rem;
	line-height: 1.45;
}
</style>
