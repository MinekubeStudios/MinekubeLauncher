<script setup>
import {
	CheckIcon,
	CopyIcon,
	DropdownIcon,
	FolderOpenIcon,
	HammerIcon,
	LogInIcon,
	UpdatedIcon,
	WrenchIcon,
	XIcon,
} from '@modrinth/assets'
import {
	Button,
	ButtonLink,
	Collapsible,
	defineMessages,
	IconButton,
	injectNotificationManager,
	IntlFormatted,
	useVIntl,
} from '@modrinth/ui'
import { computed, ref } from 'vue'

import { ChatIcon } from '@/assets/icons'
import ModalWrapper from '@/components/ui/modal/ModalWrapper.vue'
import { handleSevereError } from '@/composables/use-error.js'
import { login as login_flow, set_default_user } from '@/helpers/auth.js'
import { install_existing_instance } from '@/helpers/install'
import { cancel_directory_change } from '@/helpers/settings.ts'
import { showAppDbBackupsFolder } from '@/helpers/utils.js'

const { handleError } = injectNotificationManager()
const { formatMessage } = useVIntl()

/** Every problem report goes to the Minekube Launcher issue tracker. */
const SUPPORT_URL = 'https://github.com/MinekubeStudios/MinekubeLauncher/issues'
const OFFICIAL_LAUNCHER_URL = 'https://www.minecraft.net/en-us/download'

const messages = defineMessages({
	openBackupsFolder: {
		id: 'app.error.state-init.open-backups-folder',
		defaultMessage: 'Open backups folder',
	},
	titleUnknown: { id: 'app.error.title.unknown', defaultMessage: 'An error occurred' },
	titleMinecraftAuth: {
		id: 'app.error.title.minecraft-auth',
		defaultMessage: 'Unable to sign in to Minecraft',
	},
	titleDirectoryMove: {
		id: 'app.error.title.directory-move',
		defaultMessage: 'Could not change app directory',
	},
	titleNoLoader: { id: 'app.error.title.no-loader', defaultMessage: 'No loader selected' },
	titleStateInit: {
		id: 'app.error.title.state-init',
		defaultMessage: 'Error initializing Minekube Launcher',
	},
	networkTitle: { id: 'app.error.auth.network.title', defaultMessage: 'Network issues' },
	networkBody: {
		id: 'app.error.auth.network.body',
		defaultMessage:
			"Minekube Launcher had trouble connecting to Microsoft's servers. This is often the result of a poor connection, so try again. If the problem continues, check your firewall, antivirus, VPN or proxy settings.",
	},
	hostsBody: {
		id: 'app.error.auth.hosts.body',
		defaultMessage:
			'Minekube Launcher tried to connect to Microsoft, Xbox or Minecraft services, but the remote server rejected the connection. These services may be blocked by your hosts file, firewall or antivirus.',
	},
	anotherAccountTitle: {
		id: 'app.error.auth.another-account.title',
		defaultMessage: 'Try another Microsoft account',
	},
	anotherAccountBody: {
		id: 'app.error.auth.another-account.body',
		defaultMessage:
			"Double check you've signed in with the right account. You may own Minecraft on a different Microsoft account.",
	},
	anotherAccountButton: {
		id: 'app.error.auth.another-account.button',
		defaultMessage: 'Try another account',
	},
	gamePassTitle: {
		id: 'app.error.auth.game-pass.title',
		defaultMessage: 'Using PC Game Pass, coming from Bedrock, or just bought the game?',
	},
	gamePassBody: {
		id: 'app.error.auth.game-pass.body',
		defaultMessage:
			"Try signing in with the {officialLauncher} first. Once you're done, come back here and sign in!",
	},
	officialLauncher: {
		id: 'app.error.auth.official-launcher',
		defaultMessage: 'official Minecraft Launcher',
	},
	signInAgain: { id: 'app.error.auth.sign-in-again', defaultMessage: 'Try signing in again' },
	readOnlyTitle: {
		id: 'app.error.directory.read-only.title',
		defaultMessage: 'Change directory permissions',
	},
	readOnlyBody: {
		id: 'app.error.directory.read-only.body',
		defaultMessage:
			'Minekube Launcher is unable to write to the directory you selected. Adjust the permissions of the directory and try again, or cancel the directory change.',
	},
	noSpaceTitle: { id: 'app.error.directory.no-space.title', defaultMessage: 'Not enough space' },
	noSpaceBody: {
		id: 'app.error.directory.no-space.body',
		defaultMessage:
			'There is not enough space on the disk containing the directory you selected. Free up some space and try again, or cancel the directory change.',
	},
	moveFailedBody: {
		id: 'app.error.directory.move-failed.body',
		defaultMessage:
			'Minekube Launcher is unable to move to the directory you selected. Report the problem on GitHub, or cancel the directory change.',
	},
	retryDirectory: {
		id: 'app.error.directory.retry',
		defaultMessage: 'Retry directory change',
	},
	cancelDirectory: {
		id: 'app.error.directory.cancel',
		defaultMessage: 'Cancel directory change',
	},
	stateInitBody: {
		id: 'app.error.state-init.body',
		defaultMessage:
			'Minekube Launcher failed to load correctly. This may be because of a corrupted file, or because the app is missing crucial files.',
	},
	stateInitFixes: {
		id: 'app.error.state-init.fixes',
		defaultMessage: 'You may be able to fix it in one of the following ways:',
	},
	stateInitRestart: {
		id: 'app.error.state-init.restart',
		defaultMessage: 'Make sure you are connected to the internet, then restart the app.',
	},
	stateInitRedownload: {
		id: 'app.error.state-init.redownload',
		defaultMessage: 'Download the app again.',
	},
	noLoaderBody: {
		id: 'app.error.no-loader.body',
		defaultMessage: 'Minekube Launcher could not find the loader version for this instance.',
	},
	noLoaderHint: {
		id: 'app.error.no-loader.hint',
		defaultMessage: 'To fix this, repair the instance with the button below.',
	},
	repairInstance: { id: 'app.error.no-loader.repair', defaultMessage: 'Repair instance' },
	helpText: {
		id: 'app.error.help-text',
		defaultMessage:
			'If nothing works and you need help, open an issue on {github} and include the debug information below.',
	},
	githubLink: { id: 'app.error.github-link', defaultMessage: 'Minekube Launcher GitHub' },
	getSupport: { id: 'app.error.get-support', defaultMessage: 'Get support' },
	close: { id: 'app.error.close', defaultMessage: 'Close' },
	debugTitle: { id: 'app.error.debug-title', defaultMessage: 'Debug information' },
	copyDebug: { id: 'app.error.copy-debug', defaultMessage: 'Copy debug info' },
	noMessage: { id: 'app.error.no-message', defaultMessage: 'No error message.' },
})

const errorModal = ref()
const error = ref()
const closable = ref(true)
const errorCollapsed = ref(false)

const errorType = ref('unknown')
const metadata = ref({})

const title = computed(() => {
	switch (errorType.value) {
		case 'minecraft_auth':
			return formatMessage(messages.titleMinecraftAuth)
		case 'directory_move':
			return formatMessage(messages.titleDirectoryMove)
		case 'no_loader_version':
			return formatMessage(messages.titleNoLoader)
		case 'state_init':
			return formatMessage(messages.titleStateInit)
		default:
			return formatMessage(messages.titleUnknown)
	}
})

defineExpose({
	async show(errorVal, context, canClose = true, source = null) {
		console.log(errorVal, context, canClose, source)
		closable.value = canClose
		// Each error starts from a clean slate, so hints from an earlier error
		// never show up on the next one.
		metadata.value = {}
		const message = typeof errorVal?.message === 'string' ? errorVal.message : ''

		if (message.includes('Minecraft authentication error:')) {
			errorType.value = 'minecraft_auth'
			if (
				message.includes('existing connection was forcibly closed') ||
				message.includes('error sending request for url')
			) {
				metadata.value.network = true
			}
			if (message.includes('because the target machine actively refused it')) {
				metadata.value.hostsFile = true
			}
		} else if (message.includes('Move directory error:')) {
			errorType.value = 'directory_move'
			if (message.includes('directory is not writable')) {
				metadata.value.readOnly = true
			}
			if (message.includes('Not enough space')) {
				metadata.value.notEnoughSpace = true
			}
		} else if (message.includes('No loader version selected for')) {
			errorType.value = 'no_loader_version'
			metadata.value.instanceId = context?.instanceId
		} else if (source === 'state_init') {
			errorType.value = 'state_init'
		} else {
			errorType.value = 'unknown'
		}

		error.value = errorVal
		errorModal.value.show()
	},
})

const loadingMinecraft = ref(false)
async function loginMinecraft() {
	try {
		loadingMinecraft.value = true
		const loggedIn = await login_flow()

		if (loggedIn) {
			await set_default_user(loggedIn.profile.id).catch(handleError)
		}

		loadingMinecraft.value = false
		errorModal.value.hide()
	} catch (err) {
		loadingMinecraft.value = false
		handleSevereError(err)
	}
}

async function cancelDirectoryChange() {
	try {
		await cancel_directory_change()
		window.location.reload()
	} catch (err) {
		handleError(err)
	}
}

function retryDirectoryChange() {
	window.location.reload()
}

async function openDbBackupsFolder() {
	await showAppDbBackupsFolder().catch(handleError)
}

const loadingRepair = ref(false)
async function repairInstance() {
	loadingRepair.value = true
	try {
		await install_existing_instance(metadata.value.instanceId, false)
		errorModal.value.hide()
	} catch (err) {
		handleSevereError(err)
	}
	loadingRepair.value = false
}

const hasDebugInfo = computed(
	() =>
		errorType.value === 'directory_move' ||
		errorType.value === 'minecraft_auth' ||
		errorType.value === 'state_init' ||
		errorType.value === 'no_loader_version',
)

const debugInfo = computed(
	() => error.value?.message ?? error.value ?? formatMessage(messages.noMessage),
)

const copied = ref(false)

async function copyToClipboard(text) {
	await navigator.clipboard.writeText(String(text))
	copied.value = true
	setTimeout(() => {
		copied.value = false
	}, 3000)
}
</script>

<template>
	<ModalWrapper ref="errorModal" :header="title" :closable="closable">
		<div class="modal-body max-w-[550px]">
			<div class="markdown-body">
				<template v-if="errorType === 'minecraft_auth'">
					<template v-if="metadata.network">
						<h3>{{ formatMessage(messages.networkTitle) }}</h3>
						<p>{{ formatMessage(messages.networkBody) }}</p>
					</template>
					<template v-else-if="metadata.hostsFile">
						<h3>{{ formatMessage(messages.networkTitle) }}</h3>
						<p>{{ formatMessage(messages.hostsBody) }}</p>
					</template>
					<template v-else>
						<h3>{{ formatMessage(messages.anotherAccountTitle) }}</h3>
						<p>{{ formatMessage(messages.anotherAccountBody) }}</p>
						<div class="cta-button">
							<button class="btn btn-primary" :disabled="loadingMinecraft" @click="loginMinecraft">
								<LogInIcon /> {{ formatMessage(messages.anotherAccountButton) }}
							</button>
						</div>
						<h3>{{ formatMessage(messages.gamePassTitle) }}</h3>
						<p>
							<IntlFormatted :message-id="messages.gamePassBody">
								<template #officialLauncher>
									<a :href="OFFICIAL_LAUNCHER_URL">{{
										formatMessage(messages.officialLauncher)
									}}</a>
								</template>
							</IntlFormatted>
						</p>
					</template>
					<div class="cta-button">
						<button class="btn btn-primary" :disabled="loadingMinecraft" @click="loginMinecraft">
							<LogInIcon /> {{ formatMessage(messages.signInAgain) }}
						</button>
					</div>
				</template>
				<template v-if="errorType === 'directory_move'">
					<template v-if="metadata.readOnly">
						<h3>{{ formatMessage(messages.readOnlyTitle) }}</h3>
						<p>{{ formatMessage(messages.readOnlyBody) }}</p>
					</template>
					<template v-else-if="metadata.notEnoughSpace">
						<h3>{{ formatMessage(messages.noSpaceTitle) }}</h3>
						<p>{{ formatMessage(messages.noSpaceBody) }}</p>
					</template>
					<template v-else>
						<p>{{ formatMessage(messages.moveFailedBody) }}</p>
					</template>

					<div class="cta-button">
						<button class="btn" @click="retryDirectoryChange">
							<UpdatedIcon /> {{ formatMessage(messages.retryDirectory) }}
						</button>
						<button class="btn btn-danger" @click="cancelDirectoryChange">
							<XIcon /> {{ formatMessage(messages.cancelDirectory) }}
						</button>
					</div>
				</template>
				<template v-else-if="errorType === 'state_init'">
					<p>{{ formatMessage(messages.stateInitBody) }}</p>
					<p>{{ formatMessage(messages.stateInitFixes) }}</p>
					<ul>
						<li>{{ formatMessage(messages.stateInitRestart) }}</li>
						<li>{{ formatMessage(messages.stateInitRedownload) }}</li>
					</ul>
				</template>
				<template v-else-if="errorType === 'no_loader_version'">
					<p>{{ formatMessage(messages.noLoaderBody) }}</p>
					<p>{{ formatMessage(messages.noLoaderHint) }}</p>
					<div class="cta-button">
						<button class="btn btn-primary" :disabled="loadingRepair" @click="repairInstance">
							<HammerIcon /> {{ formatMessage(messages.repairInstance) }}
						</button>
					</div>
				</template>
				<template v-else-if="errorType === 'unknown'">
					{{ debugInfo }}
				</template>
				<template v-if="hasDebugInfo">
					<div class="w-full h-[1px] bg-surface-5 mb-3"></div>
					<p>
						<IntlFormatted :message-id="messages.helpText">
							<template #github>
								<a :href="SUPPORT_URL">{{ formatMessage(messages.githubLink) }}</a>
							</template>
						</IntlFormatted>
					</p>
				</template>
			</div>
			<div class="flex items-center gap-2">
				<ButtonLink :href="SUPPORT_URL" @click="errorModal.hide()"
					><ChatIcon /> {{ formatMessage(messages.getSupport) }}</ButtonLink
				>
				<Button v-if="closable" @click="errorModal.hide()"
					><XIcon /> {{ formatMessage(messages.close) }}</Button
				>
			</div>
			<template v-if="hasDebugInfo">
				<div class="flex flex-col gap-2">
					<div class="w-full h-[1px] bg-surface-5"></div>

					<div class="overflow-clip">
						<button
							class="flex items-center justify-between w-full bg-transparent border-0 py-4 cursor-pointer"
							@click="errorCollapsed = !errorCollapsed"
						>
							<span class="flex items-center gap-2 text-contrast font-extrabold m-0">
								<WrenchIcon class="h-4 w-4" />
								{{ formatMessage(messages.debugTitle) }}
							</span>
							<DropdownIcon
								class="h-5 w-5 text-secondary transition-transform"
								:class="{ 'rotate-180': !errorCollapsed }"
							/>
						</button>
						<Collapsible :collapsed="errorCollapsed">
							<div
								class="p-3 bg-surface-2 rounded-2xl text-xs grid grid-cols-[1fr_auto] max-w-full items-start"
							>
								<div
									class="m-0 p-0 rounded-none bg-transparent text-sm font-mono break-words overflow-auto"
								>
									{{ debugInfo }}
									<button
										v-if="errorType === 'state_init'"
										class="btn"
										@click="openDbBackupsFolder"
									>
										<FolderOpenIcon aria-hidden="true" />
										{{ formatMessage(messages.openBackupsFolder) }}
									</button>
								</div>
								<IconButton
									v-tooltip="formatMessage(messages.copyDebug)"
									:label="formatMessage(messages.copyDebug)"
									:disabled="copied"
									@click="copyToClipboard(debugInfo)"
								>
									<template v-if="copied"> <CheckIcon class="text-green" /> </template>
									<template v-else> <CopyIcon /> </template>
								</IconButton>
							</div>
						</Collapsible>
					</div>
				</div>
			</template>
		</div>
	</ModalWrapper>
</template>

<style>
.light-mode {
	--color-orange-bg: rgba(255, 163, 71, 0.2);
}

.dark-mode,
.oled-mode,
.theme-dark {
	--color-orange-bg: rgba(224, 131, 37, 0.2);
}
</style>

<style scoped lang="scss">
.cta-button {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0.5rem;
	gap: 0.5rem;
}

.warning-banner {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
	padding: var(--gap-lg);
	background-color: var(--color-orange-bg);
	border: 2px solid var(--color-orange);
	border-radius: var(--radius-md);
	margin-bottom: 1rem;
}

.warning-banner__title {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	font-weight: 700;

	svg {
		color: var(--color-orange);
		height: 1.5rem;
		width: 1.5rem;
	}
}

.modal-body {
	display: flex;
	flex-direction: column;
	gap: var(--gap-md);
}

.markdown-body {
	overflow: auto;
}
</style>
