<script setup lang="ts">
import {
	BoxIcon,
	ChartIcon,
	CheckCircleIcon,
	ClockIcon,
	CubeIcon,
	FolderOpenIcon,
	MonitorSmartphoneIcon,
	ShirtIcon,
	UserIcon,
	UsersIcon,
} from '@modrinth/assets'
import { Avatar, Button, defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import { useQuery } from '@tanstack/vue-query'
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
	DEFAULT_USER_CHANGED_EVENT,
	get_default_user,
	isLocalAccount,
	set_default_user,
	users,
} from '@/helpers/auth'
import { toError } from '@/helpers/errors'
import { getLocalAccountHeadUrl, getPlayerHeadUrl } from '@/helpers/rendering/player-head'
import { get_available_skins } from '@/helpers/skins'
import type { GameInstance } from '@/helpers/types'
import { showLauncherRootFolder } from '@/helpers/utils.js'
import { instanceListQueryOptions } from '@/pages/instance/query-options'
import { appSettingsModalContextKey } from '@/providers/app-settings-modal'

interface MinecraftAccount {
	account_type?: string
	profile: { id: string; name: string }
}

const { formatMessage } = useVIntl()
const { handleError } = injectNotificationManager()
const router = useRouter()
const settingsModal = inject(appSettingsModalContextKey, null)

const messages = defineMessages({
	eyebrow: { id: 'app.settings.profile.v2.eyebrow', defaultMessage: 'Your profile' },
	signedOutTitle: {
		id: 'app.settings.profile.v2.signed-out-title',
		defaultMessage: 'No account yet',
	},
	signedOutText: {
		id: 'app.settings.profile.v2.signed-out-text',
		defaultMessage:
			'Add a Microsoft or local account in the sidebar under “Playing as” to start playing.',
	},
	microsoft: { id: 'app.settings.profile.v2.type.microsoft', defaultMessage: 'Microsoft account' },
	local: { id: 'app.settings.profile.v2.type.local', defaultMessage: 'Local account' },
	changeSkin: { id: 'app.settings.profile.v2.change-skin', defaultMessage: 'Change skin' },
	openFolder: {
		id: 'app.settings.profile.v2.open-folder',
		defaultMessage: 'Open launcher folder',
	},
	statsTitle: { id: 'app.settings.profile.v2.stats-title', defaultMessage: 'At a glance' },
	statAccounts: { id: 'app.settings.profile.v2.stat.accounts', defaultMessage: 'Accounts' },
	statInstances: { id: 'app.settings.profile.v2.stat.instances', defaultMessage: 'Instances' },
	statPlaytime: { id: 'app.settings.profile.v2.stat.playtime', defaultMessage: 'Time played' },
	statLastPlayed: {
		id: 'app.settings.profile.v2.stat.last-played',
		defaultMessage: 'Last played',
	},
	playtimeValue: {
		id: 'app.settings.profile.v2.playtime-value',
		defaultMessage: '{hours} h {minutes} min',
	},
	nothingPlayed: { id: 'app.settings.profile.v2.nothing-played', defaultMessage: 'Not yet' },
	accountsTitle: { id: 'app.settings.profile.v2.accounts-title', defaultMessage: 'Your accounts' },
	accountsText: {
		id: 'app.settings.profile.v2.accounts-text',
		defaultMessage:
			'The active account is the one every game starts with. Switch with one click; adding and removing accounts lives in the sidebar.',
	},
	active: { id: 'app.settings.profile.v2.active', defaultMessage: 'Active' },
	use: { id: 'app.settings.profile.v2.use', defaultMessage: 'Use' },
	localNoteTitle: {
		id: 'app.settings.profile.v2.local-note-title',
		defaultMessage: 'Everything stays on this computer',
	},
	localNote: {
		id: 'app.settings.profile.v2.local-note',
		defaultMessage:
			'Minekube Launcher has no account of its own and no cloud profile. Your profile is simply your Minecraft accounts plus the settings and instances stored on this device.',
	},
})

const accounts = ref<MinecraftAccount[]>([])
const defaultUserId = ref<string | undefined>()
const switchingTo = ref<string | null>(null)
const heads = ref<Record<string, string>>({})
const localHead = ref<string>()

const instancesQuery = useQuery(instanceListQueryOptions())
const instances = computed(() => (instancesQuery.data.value ?? []) as GameInstance[])

const activeAccount = computed(
	() => accounts.value.find((account) => account.profile.id === defaultUserId.value) ?? null,
)

const totalPlaytime = computed(() => {
	const seconds = instances.value.reduce(
		(sum, instance) =>
			sum + (instance.recent_time_played ?? 0) + (instance.submitted_time_played ?? 0),
		0,
	)
	return formatMessage(messages.playtimeValue, {
		hours: Math.floor(seconds / 3600),
		minutes: Math.floor((seconds % 3600) / 60),
	})
})

const lastPlayed = computed(() => {
	const played = instances.value
		.filter((instance) => instance.last_played)
		.sort((a, b) => new Date(b.last_played!).getTime() - new Date(a.last_played!).getTime())
	return played[0]?.name ?? formatMessage(messages.nothingPlayed)
})

const stats = computed(() => [
	{ icon: UsersIcon, label: formatMessage(messages.statAccounts), value: accounts.value.length },
	{
		icon: BoxIcon,
		label: formatMessage(messages.statInstances),
		value: instances.value.length,
	},
	{ icon: ClockIcon, label: formatMessage(messages.statPlaytime), value: totalPlaytime.value },
	{ icon: CubeIcon, label: formatMessage(messages.statLastPlayed), value: lastPlayed.value },
])

function headFor(account: MinecraftAccount): string | undefined {
	if (isLocalAccount(account)) return localHead.value
	return heads.value[account.profile.id] ?? localHead.value
}

function typeLabel(account: MinecraftAccount): string {
	return formatMessage(isLocalAccount(account) ? messages.local : messages.microsoft)
}

async function loadAccounts(): Promise<void> {
	try {
		const [list, defaultId] = await Promise.all([users(), get_default_user()])
		accounts.value = (list ?? []) as MinecraftAccount[]
		defaultUserId.value = defaultId
		// Also the stand-in head for any account whose own head is not ready yet.
		if (!localHead.value) {
			localHead.value = await getLocalAccountHeadUrl().catch(() => undefined)
		}
		await loadActiveHead()
	} catch (error) {
		handleError(toError(error))
	}
}

/** Renders the active account's head from its equipped skin, on this device. */
async function loadActiveHead(): Promise<void> {
	const id = defaultUserId.value
	if (!id || heads.value[id]) return
	try {
		const skin = (await get_available_skins()).find((candidate) => candidate.is_equipped)
		if (!skin) return
		const url = await getPlayerHeadUrl(skin)
		heads.value = { ...heads.value, [id]: url }
	} catch {
		// The default head stays in place.
	}
}

async function useAccount(account: MinecraftAccount): Promise<void> {
	if (switchingTo.value || account.profile.id === defaultUserId.value) return
	switchingTo.value = account.profile.id
	try {
		await set_default_user(account.profile.id)
		defaultUserId.value = account.profile.id
		void loadActiveHead()
	} catch (error) {
		handleError(toError(error))
	} finally {
		switchingTo.value = null
	}
}

function openSkins(): void {
	settingsModal?.close()
	void router.push('/skins')
}

function openFolder(): void {
	void showLauncherRootFolder().catch((error: unknown) => handleError(toError(error)))
}

onMounted(() => {
	void loadAccounts()
	window.addEventListener(DEFAULT_USER_CHANGED_EVENT, loadAccounts)
})

onBeforeUnmount(() => {
	window.removeEventListener(DEFAULT_USER_CHANGED_EVENT, loadAccounts)
})
</script>

<template>
	<div class="studio">
		<section class="studio-hero">
			<div class="profile-hero">
				<Avatar
					v-if="activeAccount"
					:src="headFor(activeAccount)"
					size="4.5rem"
					class="profile-hero__avatar"
					no-shadow
				/>
				<span v-else class="profile-hero__placeholder" aria-hidden="true">
					<UserIcon class="size-9 text-secondary" />
				</span>
				<div class="min-w-0">
					<p class="studio-eyebrow">{{ formatMessage(messages.eyebrow) }}</p>
					<h2 class="studio-hero__title truncate">
						{{ activeAccount?.profile.name ?? formatMessage(messages.signedOutTitle) }}
					</h2>
					<p v-if="activeAccount" class="profile-type">
						<component
							:is="isLocalAccount(activeAccount) ? MonitorSmartphoneIcon : CheckCircleIcon"
							class="size-4"
						/>
						{{ typeLabel(activeAccount) }}
					</p>
					<p v-else class="studio-hero__text">{{ formatMessage(messages.signedOutText) }}</p>
				</div>
			</div>
			<div class="profile-hero__actions">
				<Button v-if="activeAccount" color="brand" @click="openSkins">
					<ShirtIcon class="size-4" />
					{{ formatMessage(messages.changeSkin) }}
				</Button>
				<Button @click="openFolder">
					<FolderOpenIcon class="size-4" />
					{{ formatMessage(messages.openFolder) }}
				</Button>
			</div>
		</section>

		<section class="studio-section">
			<div class="studio-section__head">
				<div class="studio-section__lead">
					<span class="studio-badge" aria-hidden="true"><ChartIcon /></span>
					<h3 class="studio-section__title self-center">
						{{ formatMessage(messages.statsTitle) }}
					</h3>
				</div>
			</div>
			<div class="studio-section__body">
				<div class="profile-stats">
					<div v-for="stat in stats" :key="stat.label" class="profile-stat">
						<component :is="stat.icon" class="size-5 text-brand" />
						<span class="profile-stat__value">{{ stat.value }}</span>
						<span class="profile-stat__label">{{ stat.label }}</span>
					</div>
				</div>
			</div>
		</section>

		<section class="studio-section">
			<div class="studio-section__head">
				<div class="studio-section__lead">
					<span class="studio-badge" aria-hidden="true"><UsersIcon /></span>
					<div>
						<h3 class="studio-section__title">{{ formatMessage(messages.accountsTitle) }}</h3>
						<p class="studio-section__text">{{ formatMessage(messages.accountsText) }}</p>
					</div>
				</div>
			</div>
			<div v-if="accounts.length > 0" class="studio-section__body">
				<div
					v-for="account in accounts"
					:key="account.profile.id"
					class="studio-row items-center"
					:class="{ 'profile-account--active': account.profile.id === defaultUserId }"
				>
					<div class="flex min-w-0 items-center gap-3">
						<Avatar :src="headFor(account)" size="2.5rem" no-shadow />
						<div class="min-w-0">
							<p class="studio-subhead truncate">{{ account.profile.name }}</p>
							<p class="studio-subtext m-0">{{ typeLabel(account) }}</p>
						</div>
					</div>
					<span v-if="account.profile.id === defaultUserId" class="profile-active">
						<CheckCircleIcon class="size-4" />
						{{ formatMessage(messages.active) }}
					</span>
					<Button v-else :disabled="!!switchingTo" @click="useAccount(account)">
						{{ formatMessage(messages.use) }}
					</Button>
				</div>
			</div>
		</section>

		<p class="studio-note m-0">
			<strong>{{ formatMessage(messages.localNoteTitle) }}</strong>
			{{ formatMessage(messages.localNote) }}
		</p>
	</div>
</template>

<style lang="scss" scoped>
@import '../display/studio.scss';

.profile-hero {
	display: flex;
	align-items: center;
	gap: 1rem;
	min-width: 0;
}

.profile-hero__avatar {
	flex: 0 0 auto;
	border-radius: 1rem;
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-brand) 55%, transparent);
	image-rendering: pixelated;
}

.profile-hero__placeholder {
	display: grid;
	flex: 0 0 auto;
	place-items: center;
	width: 4.5rem;
	height: 4.5rem;
	border-radius: 1rem;
	background: var(--color-bg);
}

.profile-type {
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
	margin: 0.4rem 0 0;
	color: var(--color-secondary);
	font-size: 0.82rem;
	font-weight: 700;
}

.profile-hero__actions {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
	flex: 0 0 auto;
}

.profile-stats {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
	gap: 0.6rem;
}

.profile-stat {
	display: flex;
	flex-direction: column;
	gap: 0.3rem;
	min-width: 0;
	padding: 0.8rem 0.9rem;
	border: 1px solid var(--color-divider);
	border-radius: 0.8rem;
	background: var(--color-bg);
}

.profile-stat__value {
	overflow: hidden;
	color: var(--color-contrast);
	font-size: 1.05rem;
	font-weight: 800;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.profile-stat__label {
	color: var(--color-secondary);
	font-size: 0.74rem;
	font-weight: 700;
	letter-spacing: 0.04em;
	text-transform: uppercase;
}

.profile-account--active {
	border-color: color-mix(in srgb, var(--color-brand) 55%, var(--color-divider));
}

.profile-active {
	display: inline-flex;
	align-items: center;
	gap: 0.3rem;
	color: var(--color-brand);
	font-size: 0.82rem;
	font-weight: 800;
}

@media (max-width: 720px) {
	.profile-hero__actions {
		flex-direction: row;
		flex-wrap: wrap;
	}
}
</style>
