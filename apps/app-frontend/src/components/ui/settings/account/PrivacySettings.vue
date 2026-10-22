<script setup lang="ts">
import {
	ArchiveIcon,
	BanIcon,
	CardIcon,
	FileTextIcon,
	FolderOpenIcon,
	GithubIcon,
	KeyIcon,
	LockIcon,
	SaveIcon,
	ShieldCheckIcon,
	TagCategoryGamepad2Icon,
} from '@modrinth/assets'
import { Button, defineMessages, injectNotificationManager, Toggle, useVIntl } from '@modrinth/ui'
import { openUrl } from '@tauri-apps/plugin-opener'
import { computed, ref } from 'vue'

import { toError } from '@/helpers/errors'
import { get, set } from '@/helpers/settings.ts'
import { showAppDbBackupsFolder, showLauncherRootFolder } from '@/helpers/utils.js'

import ShieldPanel from './ShieldPanel.vue'

const REPOSITORY_URL = 'https://github.com/MinekubeStudios/MinekubeLauncher'
const LICENSE_URL = `${REPOSITORY_URL}/blob/main/COPYING.md`

const { formatMessage } = useVIntl()
const { handleError } = injectNotificationManager()

const messages = defineMessages({
	eyebrow: { id: 'app.settings.privacy.v2.eyebrow', defaultMessage: 'Privacy' },
	title: { id: 'app.settings.privacy.v2.title', defaultMessage: 'Your data stays yours' },
	text: {
		id: 'app.settings.privacy.v2.text',
		defaultMessage:
			'No tracking, no ads and no account of our own. What the launcher knows about you lives on this computer, and you decide what leaves it.',
	},
	factTelemetry: { id: 'app.settings.privacy.v2.fact.telemetry', defaultMessage: 'Zero telemetry' },
	factShield: { id: 'app.settings.privacy.v2.fact.shield', defaultMessage: 'Tracker blocker' },
	factLocal: { id: 'app.settings.privacy.v2.fact.local', defaultMessage: 'Stored locally' },
	factAds: { id: 'app.settings.privacy.v2.fact.ads', defaultMessage: 'No ads' },
	factLicences: { id: 'app.settings.privacy.v2.fact.licences', defaultMessage: 'No licences' },
	factSubscription: {
		id: 'app.settings.privacy.v2.fact.subscription',
		defaultMessage: 'No subscription',
	},
	factOpen: { id: 'app.settings.privacy.v2.fact.open', defaultMessage: 'Open source' },
	discordTitle: {
		id: 'app.settings.privacy.discord-rich-presence.title',
		defaultMessage: 'Discord Rich Presence',
	},
	discordText: {
		id: 'app.settings.privacy.v2.discord-text',
		defaultMessage:
			'Shows on your Discord profile that you are playing Minecraft through Minekube Launcher. Off means Discord sees nothing from the launcher. Takes effect after a restart.',
	},
	dataTitle: { id: 'app.settings.privacy.v2.data-title', defaultMessage: 'Where your data lives' },
	dataText: {
		id: 'app.settings.privacy.v2.data-text',
		defaultMessage:
			'Instances, worlds, settings and accounts are kept in the launcher folder. Automatic database backups sit next to it, in case something ever goes wrong.',
	},
	openFolder: { id: 'app.settings.privacy.v2.open-folder', defaultMessage: 'Open launcher folder' },
	openBackups: { id: 'app.settings.privacy.v2.open-backups', defaultMessage: 'Open backups' },
	signInTitle: {
		id: 'app.settings.privacy.v2.sign-in-title',
		defaultMessage: 'Sign-in and passwords',
	},
	signInText: {
		id: 'app.settings.privacy.v2.sign-in-text',
		defaultMessage:
			'Microsoft sign-in happens directly between you and Microsoft; the launcher never sees your password. The sign-in tokens it keeps are stored encrypted on your system and never handed to the launcher’s interface. Local accounts never sign in anywhere.',
	},
	openSourceTitle: {
		id: 'app.settings.privacy.v2.open-source-title',
		defaultMessage: 'Open for everyone to check',
	},
	openSourceText: {
		id: 'app.settings.privacy.v2.open-source-text',
		defaultMessage:
			'Every line of the launcher is public under the GNU GPL-3.0 licence, so anyone can verify these promises — and the launcher can never be closed off.',
	},
	viewSource: { id: 'app.settings.privacy.v2.view-source', defaultMessage: 'View source code' },
	viewLicense: { id: 'app.settings.privacy.v2.view-license', defaultMessage: 'Read the licence' },
})

const settings = ref(await get())

const discordRpc = computed({
	get: () => !!settings.value.discord_rpc,
	set: async (value: boolean) => {
		const previous = settings.value.discord_rpc
		settings.value = { ...settings.value, discord_rpc: value }
		try {
			await set(settings.value)
		} catch (error) {
			settings.value = { ...settings.value, discord_rpc: previous }
			handleError(toError(error))
		}
	},
})

const facts = computed(() => [
	{ icon: ShieldCheckIcon, label: formatMessage(messages.factShield) },
	{ icon: LockIcon, label: formatMessage(messages.factTelemetry) },
	{ icon: SaveIcon, label: formatMessage(messages.factLocal) },
	{ icon: BanIcon, label: formatMessage(messages.factAds) },
	{ icon: KeyIcon, label: formatMessage(messages.factLicences) },
	{ icon: CardIcon, label: formatMessage(messages.factSubscription) },
	{ icon: GithubIcon, label: formatMessage(messages.factOpen) },
])

function openExternal(url: string): void {
	void openUrl(url).catch(() => window.open(url, '_blank', 'noopener,noreferrer'))
}

function openFolder(): void {
	void showLauncherRootFolder().catch((error: unknown) => handleError(toError(error)))
}

function openBackups(): void {
	void showAppDbBackupsFolder().catch((error: unknown) => handleError(toError(error)))
}
</script>

<template>
	<div class="studio">
		<section class="studio-hero">
			<div class="studio-hero__copy">
				<p class="studio-eyebrow">
					<ShieldCheckIcon />
					{{ formatMessage(messages.eyebrow) }}
				</p>
				<h2 class="studio-hero__title">{{ formatMessage(messages.title) }}</h2>
				<p class="studio-hero__text">{{ formatMessage(messages.text) }}</p>
				<div class="privacy-facts">
					<span v-for="fact in facts" :key="fact.label" class="privacy-fact">
						<component :is="fact.icon" class="size-4 text-brand" />
						{{ fact.label }}
					</span>
				</div>
			</div>
		</section>

		<ShieldPanel />

		<section class="studio-section">
			<div class="studio-section__head">
				<div class="studio-section__lead">
					<span class="studio-badge" aria-hidden="true"><TagCategoryGamepad2Icon /></span>
					<div>
						<h3 class="studio-section__title">{{ formatMessage(messages.discordTitle) }}</h3>
						<p class="studio-section__text">{{ formatMessage(messages.discordText) }}</p>
					</div>
				</div>
				<div class="studio-section__control">
					<Toggle id="disable-discord-rpc" v-model="discordRpc" />
				</div>
			</div>
		</section>

		<section class="studio-section">
			<div class="studio-section__head">
				<div class="studio-section__lead">
					<span class="studio-badge" aria-hidden="true"><FolderOpenIcon /></span>
					<div>
						<h3 class="studio-section__title">{{ formatMessage(messages.dataTitle) }}</h3>
						<p class="studio-section__text">{{ formatMessage(messages.dataText) }}</p>
					</div>
				</div>
			</div>
			<div class="studio-section__body">
				<div class="flex flex-wrap gap-2">
					<Button @click="openFolder">
						<FolderOpenIcon class="size-4" />
						{{ formatMessage(messages.openFolder) }}
					</Button>
					<Button @click="openBackups">
						<ArchiveIcon class="size-4" />
						{{ formatMessage(messages.openBackups) }}
					</Button>
				</div>
			</div>
		</section>

		<section class="studio-section">
			<div class="studio-section__head">
				<div class="studio-section__lead">
					<span class="studio-badge" aria-hidden="true"><KeyIcon /></span>
					<div>
						<h3 class="studio-section__title">{{ formatMessage(messages.signInTitle) }}</h3>
						<p class="studio-section__text">{{ formatMessage(messages.signInText) }}</p>
					</div>
				</div>
			</div>
		</section>

		<section class="studio-section">
			<div class="studio-section__head">
				<div class="studio-section__lead">
					<span class="studio-badge" aria-hidden="true"><GithubIcon /></span>
					<div>
						<h3 class="studio-section__title">{{ formatMessage(messages.openSourceTitle) }}</h3>
						<p class="studio-section__text">{{ formatMessage(messages.openSourceText) }}</p>
					</div>
				</div>
			</div>
			<div class="studio-section__body">
				<div class="flex flex-wrap gap-2">
					<Button @click="openExternal(REPOSITORY_URL)">
						<GithubIcon class="size-4" />
						{{ formatMessage(messages.viewSource) }}
					</Button>
					<Button @click="openExternal(LICENSE_URL)">
						<FileTextIcon class="size-4" />
						{{ formatMessage(messages.viewLicense) }}
					</Button>
				</div>
			</div>
		</section>
	</div>
</template>

<style lang="scss" scoped>
@import '../display/studio.scss';

.privacy-facts {
	display: flex;
	flex-wrap: wrap;
	gap: 0.4rem;
	margin-top: 0.85rem;
}

.privacy-fact {
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
	padding: 0.3rem 0.65rem;
	border: 1px solid var(--color-divider);
	border-radius: 999px;
	background: var(--color-bg);
	color: var(--color-contrast);
	font-size: 0.76rem;
	font-weight: 700;
}
</style>
