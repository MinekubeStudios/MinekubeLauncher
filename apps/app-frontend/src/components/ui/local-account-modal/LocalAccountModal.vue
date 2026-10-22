<template>
	<NewModal ref="modal" :header="formatMessage(messages.header)" width="520px" max-width="520px">
		<div class="flex flex-col gap-4">
			<form class="flex flex-col gap-2" @submit.prevent="create">
				<label for="local-account-username" class="font-semibold text-contrast">
					{{ formatMessage(messages.usernameLabel) }}
				</label>
				<Input
					id="local-account-username"
					ref="usernameInput"
					v-model="username"
					:icon="UserIcon"
					:placeholder="formatMessage(messages.usernamePlaceholder)"
					:maxlength="LOCAL_USERNAME_MAX_LENGTH"
					:error="!!validationMessage || !!submitError"
					:disabled="creating"
					autocomplete="off"
					autocapitalize="off"
					:spellcheck="false"
					wrapper-class="w-full"
				/>
				<p v-if="validationMessage" class="m-0 text-sm text-red">
					{{ validationMessage }}
				</p>
				<p v-else-if="submitError" class="m-0 text-sm text-red">
					{{ submitError }}
				</p>
				<p v-else class="m-0 text-sm text-secondary">
					{{
						formatMessage(messages.usernameHint, {
							min: LOCAL_USERNAME_MIN_LENGTH,
							max: LOCAL_USERNAME_MAX_LENGTH,
						})
					}}
				</p>
			</form>

			<Admonition type="info" :header="formatMessage(messages.privacyHeader)">
				{{ formatMessage(messages.privacyDescription) }}
			</Admonition>

			<div class="local-account-details" :class="{ 'is-open': detailsOpen }">
				<button
					type="button"
					class="local-account-details__toggle"
					:aria-expanded="detailsOpen"
					aria-controls="local-account-details"
					@click="detailsOpen = !detailsOpen"
				>
					<InfoIcon class="size-4 shrink-0" aria-hidden="true" />
					<span class="flex-1 text-left">{{ formatMessage(messages.detailsToggle) }}</span>
					<ChevronDownIcon
						class="local-account-details__chevron size-4 shrink-0"
						aria-hidden="true"
					/>
				</button>
				<Collapsible id="local-account-details" :collapsed="!detailsOpen">
					<div class="local-account-details__body">
						<p class="m-0">{{ formatMessage(messages.description) }}</p>
						<p class="m-0">{{ formatMessage(messages.limitations) }}</p>
					</div>
				</Collapsible>
			</div>
		</div>

		<template #actions>
			<div class="flex justify-end gap-2">
				<Button type="outlined" :disabled="creating" @click="hide">
					<XIcon />
					{{ formatMessage(commonMessages.cancelButton) }}
				</Button>
				<Button type="colored" color="brand" :disabled="!canSubmit" @click="create">
					<SpinnerIcon v-if="creating" class="animate-spin" />
					<UserPlusIcon v-else />
					{{ formatMessage(messages.createButton) }}
				</Button>
			</div>
		</template>
	</NewModal>
</template>

<script setup lang="ts">
import {
	ChevronDownIcon,
	InfoIcon,
	SpinnerIcon,
	UserIcon,
	UserPlusIcon,
	XIcon,
} from '@modrinth/assets'
import {
	Admonition,
	Button,
	Collapsible,
	commonMessages,
	defineMessages,
	Input,
	NewModal,
	useVIntl,
} from '@modrinth/ui'
import { computed, inject, type Ref, ref } from 'vue'

import type AccountsCard from '@/components/ui/AccountsCard.vue'
import {
	LOCAL_USERNAME_MAX_LENGTH,
	LOCAL_USERNAME_MIN_LENGTH,
	login_local,
	set_default_user,
	validateLocalUsername,
} from '@/helpers/auth.js'
import { toError } from '@/helpers/errors'

type LocalAccountCredential = {
	profile: {
		id: string
		name: string
	}
	account_type?: 'microsoft' | 'local'
}

const { formatMessage } = useVIntl()
const accountsCard = inject<Ref<InstanceType<typeof AccountsCard> | null> | null>(
	'accountsCard',
	null,
)

const emit = defineEmits<{
	created: [account: LocalAccountCredential]
}>()

const messages = defineMessages({
	header: {
		id: 'local-account.header',
		defaultMessage: 'Local account',
	},
	description: {
		id: 'local-account.description',
		defaultMessage:
			'Play with a local account that lives only on this computer. No Microsoft account is needed.',
	},
	usernameLabel: {
		id: 'local-account.username-label',
		defaultMessage: 'Username',
	},
	usernamePlaceholder: {
		id: 'local-account.username-placeholder',
		defaultMessage: 'Steve',
	},
	usernameHint: {
		id: 'local-account.username-hint',
		defaultMessage: '{min} to {max} characters: letters, digits and underscores.',
	},
	usernameTooShort: {
		id: 'local-account.username-too-short',
		defaultMessage: 'The username must be at least {min} characters long.',
	},
	usernameTooLong: {
		id: 'local-account.username-too-long',
		defaultMessage: 'The username may be at most {max} characters long.',
	},
	usernameInvalidCharacters: {
		id: 'local-account.username-invalid-characters',
		defaultMessage: 'Only letters (A-Z, a-z), digits (0-9) and underscores are allowed.',
	},
	privacyHeader: {
		id: 'local-account.privacy-header',
		defaultMessage: 'Private by design',
	},
	privacyDescription: {
		id: 'local-account.privacy-description',
		defaultMessage:
			'Your username is stored only in the launcher database on this device. Nothing is ever sent to Microsoft, Xbox Live, Mojang or any other cloud service for this account.',
	},
	limitations: {
		id: 'local-account.limitations',
		defaultMessage:
			'Local accounts can play singleplayer and on servers that allow offline players. Servers in online mode, Realms, and skin or cape changes require a Microsoft account that owns Minecraft.',
	},
	detailsToggle: {
		id: 'local-account.details-toggle',
		defaultMessage: 'Show all information about local accounts',
	},
	createButton: {
		id: 'local-account.create-button',
		defaultMessage: 'Create local account',
	},
})

const modal = ref<InstanceType<typeof NewModal>>()
const usernameInput = ref<InstanceType<typeof Input>>()
const username = ref('')
const creating = ref(false)
const submitError = ref<string | null>(null)
const attemptedSubmit = ref(false)
const detailsOpen = ref(false)

const validationProblem = computed(() => validateLocalUsername(username.value))

const validationMessage = computed(() => {
	const problem = validationProblem.value
	if (problem === null) return null

	// Do not shout at the user before they had a chance to type anything
	if (problem === 'too-short' && username.value.trim().length === 0 && !attemptedSubmit.value) {
		return null
	}

	switch (problem) {
		case 'too-short':
			return formatMessage(messages.usernameTooShort, { min: LOCAL_USERNAME_MIN_LENGTH })
		case 'too-long':
			return formatMessage(messages.usernameTooLong, { max: LOCAL_USERNAME_MAX_LENGTH })
		case 'invalid-characters':
			return formatMessage(messages.usernameInvalidCharacters)
		default:
			return null
	}
})

const canSubmit = computed(() => !creating.value && validationProblem.value === null)

function show(initialUsername = '') {
	username.value = initialUsername
	submitError.value = null
	attemptedSubmit.value = false
	creating.value = false
	detailsOpen.value = false
	modal.value?.show()
	// The modal moves focus to its own body shortly after opening; move it on
	// to the username field once it has done so.
	window.setTimeout(() => usernameInput.value?.focus(), 150)
}

function hide() {
	modal.value?.hide()
}

async function create() {
	attemptedSubmit.value = true
	if (!canSubmit.value) return

	creating.value = true
	submitError.value = null

	try {
		const account = await login_local(username.value)
		await set_default_user(account.profile.id)
		await accountsCard?.value?.refreshValues()
		emit('created', account)
		hide()
	} catch (error) {
		submitError.value = toError(error).message
	} finally {
		creating.value = false
	}
}

defineExpose({
	show,
	hide,
})
</script>

<style scoped>
.local-account-details {
	border: 1px solid var(--color-divider);
	border-radius: 0.8rem;
	background: var(--color-bg);
}

.local-account-details__toggle {
	display: flex;
	align-items: center;
	gap: 0.55rem;
	width: 100%;
	margin: 0;
	padding: 0.7rem 0.85rem;
	border: none;
	border-radius: inherit;
	background: transparent;
	color: var(--color-contrast);
	font: inherit;
	font-size: 0.88rem;
	font-weight: 700;
	cursor: pointer;
}

.local-account-details__toggle:hover {
	color: var(--color-brand);
}

.local-account-details__chevron {
	transition: transform var(--mk-dur-base, 200ms) var(--mk-ease-standard, ease);
}

.local-account-details.is-open .local-account-details__chevron {
	transform: rotate(180deg);
}

.local-account-details__body {
	display: flex;
	flex-direction: column;
	gap: 0.6rem;
	padding: 0 0.85rem 0.85rem 2.35rem;
	color: var(--color-secondary);
	font-size: 0.86rem;
	line-height: 1.55;
}
</style>
