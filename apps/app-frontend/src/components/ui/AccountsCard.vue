<template>
	<ConfirmModal
		ref="removeAccountModal"
		:title="formatMessage(messages.removeAccountConfirmTitle)"
		:description="
			formatMessage(messages.removeAccountConfirmDescription, {
				name: accountToRemove?.profile.name ?? '',
			})
		"
		:proceed-label="formatMessage(messages.removeAccountConfirm)"
		:cancel-label="formatMessage(messages.removeAccountCancel)"
		:markdown="false"
		@proceed="removeAccount"
	/>
	<div
		v-if="accounts.length === 0"
		class="flex flex-col gap-3 bg-button-bg border border-solid border-surface-5 rounded-xl p-3 mt-2"
	>
		<!-- Brand-new installs have no accounts yet, so show the account slot
		     (avatar + name) with a placeholder instead of an empty sidebar. -->
		<div class="flex gap-2 w-full min-w-0">
			<Avatar size="36px" :src="localHeadUrl" />
			<div class="flex flex-col items-start w-full min-w-0">
				<span class="truncate w-full text-left">{{ formatMessage(messages.notLoggedIn) }}</span>
				<span class="text-secondary text-xs">{{ formatMessage(messages.minecraftAccount) }}</span>
			</div>
		</div>
		<Button type="colored" color="brand" :disabled="loginDisabled" @click="login()">
			<LogInIcon v-if="!loginDisabled" />
			<SpinnerIcon v-else class="animate-spin" />
			{{ formatMessage(messages.signInWithMicrosoft) }}
		</Button>
		<Button
			class="w-full !bg-button-bg !text-primary ![box-shadow:var(--shadow-button)]"
			:disabled="loginDisabled"
			@click="addLocalAccount()"
		>
			<UserPlusIcon />
			{{ formatMessage(messages.createLocalAccount) }}
		</Button>
		<span class="text-secondary text-xs">{{ formatMessage(messages.localAccountHint) }}</span>
	</div>
	<Accordion
		v-else
		class="w-full mt-2 bg-button-bg border border-solid border-surface-5 rounded-xl overflow-clip"
		button-class="button-base w-full bg-transparent px-3 py-2 border-0 cursor-pointer"
		:open-by-default="false"
	>
		<template #title>
			<div class="flex gap-2 w-full min-w-0">
				<Avatar size="36px" :src="selectedAccount ? avatarUrl : localHeadUrl" />
				<div class="flex flex-col items-start w-full min-w-0">
					<span class="truncate w-full text-left">{{
						selectedAccount ? selectedAccount.profile.name : formatMessage(messages.selectAccount)
					}}</span>
					<span class="text-secondary text-xs">{{
						formatMessage(
							selectedAccount && isLocalAccount(selectedAccount)
								? messages.localAccount
								: messages.minecraftAccount,
						)
					}}</span>
				</div>
			</div>
		</template>
		<div class="bg-button-bg pt-1 pb-2 border-0 border-t border-solid border-surface-5">
			<template v-if="accounts.length > 0">
				<div v-for="account in accounts" :key="account.profile.id" class="flex gap-1 items-center">
					<button
						class="flex items-center flex-shrink flex-grow overflow-clip gap-2 p-2 border-0 bg-transparent cursor-pointer button-base min-w-0"
						@click="setAccount(account)"
					>
						<RadioButtonCheckedIcon
							v-if="selectedAccount && selectedAccount.profile.id === account.profile.id"
							class="w-5 h-5 text-brand shrink-0"
						/>
						<RadioButtonIcon v-else class="w-5 h-5 text-secondary shrink-0" />
						<Avatar :src="getAccountAvatarUrl(account)" size="24px" />
						<p
							class="m-0 truncate min-w-0"
							:class="
								selectedAccount && selectedAccount.profile.id === account.profile.id
									? 'text-contrast font-semibold'
									: 'text-primary'
							"
						>
							{{ account.profile.name }}
						</p>
						<span
							v-if="isLocalAccount(account)"
							v-tooltip="formatMessage(messages.localAccountTooltip)"
							class="shrink-0 rounded-full border border-solid border-surface-5 px-1.5 py-0.5 text-xs text-secondary"
						>
							{{ formatMessage(messages.localBadge) }}
						</span>
					</button>
					<IconButton
						v-tooltip="formatMessage(appMessages.skinSelectorLabel)"
						type="quiet"
						:label="formatMessage(appMessages.skinSelectorLabel)"
						class="!bg-button-bg !text-primary ![box-shadow:var(--shadow-button)] hover:!bg-brand focus-visible:!bg-brand hover:!text-[var(--color-accent-contrast)] focus-visible:!text-[var(--color-accent-contrast)]"
						@click="openSkinSelector(account)"
					>
						<ShirtIcon />
					</IconButton>
					<IconButton
						v-tooltip="formatMessage(messages.removeAccount)"
						type="quiet"
						color="red"
						:label="formatMessage(messages.removeAccount)"
						class="mr-2 !bg-button-bg !text-primary ![box-shadow:var(--shadow-button)] hover:!bg-red focus-visible:!bg-red hover:!text-[var(--color-accent-contrast)] focus-visible:!text-[var(--color-accent-contrast)]"
						@click="confirmRemoveAccount(account)"
					>
						<TrashIcon />
					</IconButton>
				</div>
			</template>
			<div class="flex flex-col gap-2 px-2 pt-2">
				<Button
					class="w-full !bg-button-bg !text-primary ![box-shadow:var(--shadow-button)]"
					:disabled="loginDisabled"
					@click="login()"
				>
					<PlusIcon />
					{{ formatMessage(messages.addMicrosoftAccount) }}
				</Button>
				<Button
					class="w-full !bg-button-bg !text-primary ![box-shadow:var(--shadow-button)]"
					:disabled="loginDisabled"
					@click="addLocalAccount()"
				>
					<UserPlusIcon />
					{{ formatMessage(messages.addLocalAccount) }}
				</Button>
			</div>
		</div>
	</Accordion>
</template>

<script setup lang="ts">
import {
	LogInIcon,
	PlusIcon,
	RadioButtonCheckedIcon,
	RadioButtonIcon,
	ShirtIcon,
	SpinnerIcon,
	TrashIcon,
	UserPlusIcon,
} from '@modrinth/assets'
import {
	Accordion,
	Avatar,
	Button,
	ConfirmModal,
	defineMessages,
	IconButton,
	injectNotificationManager,
	useVIntl,
} from '@modrinth/ui'
import type { Ref } from 'vue'
import { computed, inject, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import type LocalAccountModal from '@/components/ui/local-account-modal/LocalAccountModal.vue'
import { useAppEvent } from '@/composables/use-app-event'
import { handleSevereError } from '@/composables/use-error.js'
import {
	get_default_user,
	isLocalAccount,
	login as login_flow,
	remove_user,
	set_default_user,
	users,
} from '@/helpers/auth'
import { getLocalAccountHeadUrl, getPlayerHeadUrl } from '@/helpers/rendering/player-head'
import { setSkinPageTransition } from '@/helpers/route-transitions.ts'
import type { Skin } from '@/helpers/skins'
import { get_available_skins } from '@/helpers/skins'
import { appMessages } from '@/utils/app-messages'

const { formatMessage } = useVIntl()
const { handleError } = injectNotificationManager()
const router = useRouter()
const route = useRoute()

const emit = defineEmits<{
	change: []
}>()

type MinecraftCredential = {
	profile: {
		id: string
		name: string
	}
	account_type?: 'microsoft' | 'local'
}

const localAccountModal = inject<Ref<InstanceType<typeof LocalAccountModal> | null> | null>(
	'localAccountModal',
	null,
)

const accounts: Ref<MinecraftCredential[]> = ref([])
const removeAccountModal = ref<InstanceType<typeof ConfirmModal>>()
const accountToRemove = ref<MinecraftCredential | null>(null)
const loginDisabled = ref(false)
const defaultUser = ref<string | undefined>()
let skinSelectorReturnRoute: string | null = null
watch(
	() => route.path,
	(path) => {
		if (path !== '/skins') skinSelectorReturnRoute = null
	},
)
const equippedSkin = ref<Skin | null>(null)
const equippedHeadUrl = ref<string>()
let headRequest = 0

async function updateHeadUrl(skin: Skin | null) {
	const request = ++headRequest
	if (equippedHeadUrl.value) URL.revokeObjectURL(equippedHeadUrl.value)
	equippedHeadUrl.value = undefined
	if (!skin) return
	const url = await getPlayerHeadUrl(skin)
	if (request !== headRequest) URL.revokeObjectURL(url)
	else equippedHeadUrl.value = url
}

onUnmounted(() => {
	headRequest++
	if (equippedHeadUrl.value) URL.revokeObjectURL(equippedHeadUrl.value)
})

// Local accounts have no online profile, so their avatar is rendered from the
// bundled default skin instead of being fetched from a player head service.
const localHeadUrl = ref<string>()

watch(
	() => accounts.value.some((account) => isLocalAccount(account)) || accounts.value.length === 0,
	(needed) => {
		if (!needed || localHeadUrl.value) return
		getLocalAccountHeadUrl()
			.then((url) => (localHeadUrl.value = url))
			.catch((error) => console.warn('Failed to render default player head:', error))
	},
	{ immediate: true },
)

async function refreshValues() {
	defaultUser.value = (await get_default_user().catch(handleError)) ?? undefined
	const userList = await users().catch(handleError)
	accounts.value = Array.isArray(userList) ? [...userList] : []
	accounts.value.sort((a, b) => (a.profile?.name ?? '').localeCompare(b.profile?.name ?? ''))

	try {
		const skins = await get_available_skins()
		equippedSkin.value = skins.find((skin) => skin.is_equipped) ?? null

		await updateHeadUrl(equippedSkin.value)
	} catch {
		equippedSkin.value = null
		void updateHeadUrl(null)
	}
}

async function setEquippedSkin(skin: Skin) {
	equippedSkin.value = skin

	try {
		await updateHeadUrl(skin)
	} catch (error) {
		console.warn('Failed to get head render for equipped skin:', error)
	}
}

function setLoginDisabled(value: boolean) {
	loginDisabled.value = value
}

defineExpose({
	refreshValues,
	setEquippedSkin,
	setLoginDisabled,
	login,
	loginDisabled,
})

await refreshValues()

const selectedAccount = computed(() =>
	accounts.value.find((account) => account.profile.id === defaultUser.value),
)

const avatarUrl = computed(() => {
	if (selectedAccount.value && isLocalAccount(selectedAccount.value)) {
		// Never look up local accounts online: they only exist on this device.
		return equippedHeadUrl.value ?? localHeadUrl.value
	}
	if (equippedSkin.value?.texture_key) {
		const cachedUrl = equippedHeadUrl.value
		if (cachedUrl) {
			return cachedUrl
		}
	}
	// Heads are always rendered on this device from the skin; no third-party
	// avatar service ever learns which accounts are used here.
	return localHeadUrl.value
})

function getAccountAvatarUrl(account: MinecraftCredential) {
	if (isLocalAccount(account)) {
		// Never look up local accounts online: they only exist on this device.
		if (account.profile.id === selectedAccount.value?.profile?.id && equippedHeadUrl.value) {
			return equippedHeadUrl.value
		}
		return localHeadUrl.value
	}
	if (
		account.profile.id === selectedAccount.value?.profile?.id &&
		equippedSkin.value?.texture_key
	) {
		const cachedUrl = equippedHeadUrl.value
		if (cachedUrl) {
			return cachedUrl
		}
	}
	return localHeadUrl.value
}

async function setAccount(account: MinecraftCredential) {
	defaultUser.value = account.profile.id
	await set_default_user(account.profile.id).catch(handleError)
	await refreshValues()
	emit('change')
}

async function login() {
	loginDisabled.value = true
	try {
		const loggedIn = await login_flow().catch(handleSevereError)
		if (loggedIn) await setAccount(loggedIn)
	} finally {
		loginDisabled.value = false
	}
}

function addLocalAccount() {
	if (localAccountModal?.value) {
		localAccountModal.value.show()
	} else {
		console.warn('Local account modal is not available')
	}
}

async function openSkinSelector(account: MinecraftCredential) {
	if (route.path === '/skins') {
		if (selectedAccount.value?.profile.id !== account.profile.id) {
			await setAccount(account)
			return
		}

		const returnRoute = skinSelectorReturnRoute
		skinSelectorReturnRoute = null
		// Mirrored zoom-crossfade back to where the user came from.
		setSkinPageTransition('back')
		if (returnRoute && window.history.state?.back === returnRoute) {
			router.back()
		} else {
			await router.replace(returnRoute ?? '/')
		}
		return
	}

	if (selectedAccount.value?.profile.id !== account.profile.id) {
		await setAccount(account)
	}

	skinSelectorReturnRoute = route.fullPath
	setSkinPageTransition('fwd')
	await router.push('/skins')
}

function confirmRemoveAccount(account: MinecraftCredential) {
	accountToRemove.value = account
	removeAccountModal.value?.show()
}

async function removeAccount() {
	const account = accountToRemove.value
	if (!account) return
	accountToRemove.value = null
	await remove_user(account.profile.id).catch(handleError)
	await refreshValues()
	if (!selectedAccount.value && accounts.value.length > 0) {
		await setAccount(accounts.value[0])
	} else {
		emit('change')
	}
}

useAppEvent('process', async (e) => {
	if (e.event === 'launched') {
		await refreshValues()
	}
})

const messages = defineMessages({
	notLoggedIn: {
		id: 'minecraft-account.not-logged-in',
		defaultMessage: 'Not logged in',
	},
	removeAccount: {
		id: 'minecraft-account.remove-account',
		defaultMessage: 'Remove account',
	},
	removeAccountConfirm: {
		id: 'minecraft-account.remove-confirm.proceed',
		defaultMessage: 'Yes, remove account',
	},
	removeAccountCancel: {
		id: 'minecraft-account.remove-confirm.cancel',
		defaultMessage: 'Not yet',
	},
	removeAccountConfirmTitle: {
		id: 'minecraft-account.remove-confirm.title',
		defaultMessage: 'Remove this account?',
	},
	removeAccountConfirmDescription: {
		id: 'minecraft-account.remove-confirm.description',
		defaultMessage:
			'This will remove {name} from the launcher. You can add a Microsoft account again by signing in, but a local account is stored only on this device and cannot be restored after it is removed.',
	},
	selectAccount: {
		id: 'minecraft-account.select-account',
		defaultMessage: 'Select account',
	},
	minecraftAccount: {
		id: 'minecraft-account.label',
		defaultMessage: 'Minecraft account',
	},
	signInWithMicrosoft: {
		id: 'minecraft-account.sign-in-microsoft',
		defaultMessage: 'Sign in with Microsoft',
	},
	createLocalAccount: {
		id: 'minecraft-account.create-local-account',
		defaultMessage: 'Create local account',
	},
	localAccountHint: {
		id: 'minecraft-account.local-account-hint',
		defaultMessage:
			'A local account needs no Microsoft account and never sends any data to the cloud.',
	},
	addMicrosoftAccount: {
		id: 'minecraft-account.add-microsoft-account',
		defaultMessage: 'Add Microsoft account',
	},
	addLocalAccount: {
		id: 'minecraft-account.add-local-account',
		defaultMessage: 'Add local account',
	},
	localAccount: {
		id: 'minecraft-account.local-account',
		defaultMessage: 'Local account',
	},
	localBadge: {
		id: 'minecraft-account.local-badge',
		defaultMessage: 'Local',
	},
	localAccountTooltip: {
		id: 'minecraft-account.local-account-tooltip',
		defaultMessage: 'Local account: stored only on this device, no data is sent to the cloud.',
	},
})
</script>
