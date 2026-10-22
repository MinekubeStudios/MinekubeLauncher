<script setup lang="ts">
import {
	ArchiveIcon,
	BanIcon,
	BoxIcon,
	EyeOffIcon,
	FileTextIcon,
	GlobeIcon,
	KeyIcon,
	LinkIcon,
	LockIcon,
	ScanEyeIcon,
	ShieldCheckIcon,
	ShieldIcon,
	TrashIcon,
} from '@modrinth/assets'
import { Button, defineMessages, injectNotificationManager, Toggle, useVIntl } from '@modrinth/ui'
import { computed, onBeforeUnmount, ref } from 'vue'

import { type FeatureFlag, useAppSettings } from '@/composables/use-app-settings'
import { toError } from '@/helpers/errors'
import { get, set } from '@/helpers/settings.ts'
import {
	cleanLogs,
	getLogRetention,
	LOG_RETENTION_CHOICES,
	type LogRetention,
	setLogRetention,
} from '@/helpers/shield'

const { formatMessage } = useVIntl()
const { handleError } = injectNotificationManager()
const appSettings = useAppSettings()

const messages = defineMessages({
	eyebrow: { id: 'app.settings.privacy.shield.eyebrow', defaultMessage: 'Minekube Shield' },
	title: {
		id: 'app.settings.privacy.shield.title',
		defaultMessage: 'Built-in tracker and telemetry blocker',
	},
	text: {
		id: 'app.settings.privacy.shield.text',
		defaultMessage:
			'Every connection the launcher makes is checked before it leaves your computer. Analytics, error reporting, ads and telemetry never get through — not even a DNS lookup.',
	},
	alwaysTitle: {
		id: 'app.settings.privacy.shield.always-title',
		defaultMessage: 'Always on',
	},
	alwaysTrackers: {
		id: 'app.settings.privacy.shield.always.trackers',
		defaultMessage: 'Trackers, analytics, ads and telemetry blocked',
	},
	alwaysIdentity: {
		id: 'app.settings.privacy.shield.always.identity',
		defaultMessage: 'Anonymous identity: no system, e-mail or install ID is sent',
	},
	alwaysAnalytics: {
		id: 'app.settings.privacy.shield.always.analytics',
		defaultMessage: 'No download, play time or server-join reporting',
	},
	alwaysGeo: {
		id: 'app.settings.privacy.shield.always.geo',
		defaultMessage: 'No location lookup from your IP address',
	},
	alwaysNoHistory: {
		id: 'app.settings.privacy.shield.always.no-history',
		defaultMessage: 'No connection history is kept — blocked requests are simply dropped',
	},
	alwaysTokens: {
		id: 'app.settings.privacy.shield.always.tokens',
		defaultMessage: 'Sign-in tokens stored encrypted on your system',
	},
	alwaysLogs: {
		id: 'app.settings.privacy.shield.always.logs',
		defaultMessage:
			'Shared logs anonymized: IP addresses, player names, account IDs, tokens and your user folder are hidden',
	},
	alwaysScanner: {
		id: 'app.settings.privacy.shield.always.scanner',
		defaultMessage: 'Mods checked for known malware before every launch',
	},
	alwaysLinks: {
		id: 'app.settings.privacy.shield.always.links',
		defaultMessage: 'Links and files from outside never install or start anything without asking',
	},
	alwaysUpdates: {
		id: 'app.settings.privacy.shield.always.updates',
		defaultMessage: 'Updates only from Minekube, checked against its signature',
	},
	logsCleanupTitle: {
		id: 'app.settings.privacy.shield.logs-cleanup-title',
		defaultMessage: 'Delete old game logs',
	},
	logsCleanupText: {
		id: 'app.settings.privacy.shield.logs-cleanup-text',
		defaultMessage:
			'Game logs and crash reports keep server addresses, chat and player names. Older ones are deleted automatically shortly after the launcher starts.',
	},
	logsCleanupNever: {
		id: 'app.settings.privacy.shield.logs-cleanup.never',
		defaultMessage: 'Keep',
	},
	logsCleanupDays: {
		id: 'app.settings.privacy.shield.logs-cleanup.days',
		defaultMessage: '{days} days',
	},
	logsDeleteAll: {
		id: 'app.settings.privacy.shield.logs-delete-all',
		defaultMessage: 'Delete all logs now',
	},
	logsDeleteConfirm: {
		id: 'app.settings.privacy.shield.logs-delete-confirm',
		defaultMessage: 'Click again to delete',
	},
	logsDeleted: {
		id: 'app.settings.privacy.shield.logs-deleted',
		defaultMessage:
			'{count, plural, =0 {No logs to delete} one {Deleted # file} other {Deleted # files}}',
	},
	alwaysJvm: {
		id: 'app.settings.privacy.shield.always.jvm',
		defaultMessage: 'Game hardened against Log4Shell-style exploits',
	},
	strictTitle: { id: 'app.settings.privacy.shield.strict-title', defaultMessage: 'Strict mode' },
	strictText: {
		id: 'app.settings.privacy.shield.strict-text',
		defaultMessage:
			'Also cuts the launcher off from the online library (browsing, search, updates), log analysis and third-party image services. Microsoft sign-in and the game files keep working. Add mods yourself from files while it is on.',
	},
	modsTitle: {
		id: 'app.settings.privacy.shield.mods-title',
		defaultMessage: 'Privacy mods in game',
	},
	modsText: {
		id: 'app.settings.privacy.shield.mods-text',
		defaultMessage:
			'Before each launch, adds the open-source mods No Telemetry (stops Minecraft’s telemetry to Microsoft) and No Chat Reports (makes your chat messages unreportable) to modded instances, and removes them again when you turn this off. A copy you installed yourself is left alone.',
	},
	modsNote: {
		id: 'app.settings.privacy.shield.mods-note',
		defaultMessage:
			'Needs Fabric, Quilt, Forge or NeoForge. On servers that require signed chat, No Chat Reports may keep you from chatting.',
	},
})

const alwaysOn = computed(() => [
	{ icon: BanIcon, label: formatMessage(messages.alwaysTrackers) },
	{ icon: EyeOffIcon, label: formatMessage(messages.alwaysIdentity) },
	{ icon: LockIcon, label: formatMessage(messages.alwaysAnalytics) },
	{ icon: GlobeIcon, label: formatMessage(messages.alwaysGeo) },
	{ icon: ShieldCheckIcon, label: formatMessage(messages.alwaysJvm) },
	{ icon: ShieldIcon, label: formatMessage(messages.alwaysNoHistory) },
	{ icon: KeyIcon, label: formatMessage(messages.alwaysTokens) },
	{ icon: FileTextIcon, label: formatMessage(messages.alwaysLogs) },
	{ icon: ScanEyeIcon, label: formatMessage(messages.alwaysScanner) },
	{ icon: LinkIcon, label: formatMessage(messages.alwaysLinks) },
	{ icon: ArchiveIcon, label: formatMessage(messages.alwaysUpdates) },
])

const saving = ref<FeatureFlag | null>(null)

async function setFlag(flag: FeatureFlag, value: boolean): Promise<void> {
	if (saving.value) return
	const previous = appSettings.getFeatureFlag(flag)
	appSettings.featureFlags[flag] = value
	saving.value = flag
	try {
		const settings = await get()
		settings.feature_flags = { ...settings.feature_flags, [flag]: value }
		await set(settings)
	} catch (error) {
		appSettings.featureFlags[flag] = previous
		handleError(toError(error))
	} finally {
		saving.value = null
	}
}

function flagModel(flag: FeatureFlag) {
	return computed({
		get: () => appSettings.getFeatureFlag(flag),
		set: (value: boolean) => void setFlag(flag, value),
	})
}

const strict = flagModel('shield_strict')
const gameMods = flagModel('shield_game_mods')

const logRetention = ref<LogRetention>(getLogRetention())
function chooseRetention(days: LogRetention): void {
	logRetention.value = days
	setLogRetention(days)
}

const deleteArmed = ref(false)
const deletingLogs = ref(false)
const deleteResult = ref<number | null>(null)
let disarmTimer: ReturnType<typeof setTimeout> | undefined

async function deleteAllLogs(): Promise<void> {
	if (!deleteArmed.value) {
		deleteArmed.value = true
		deleteResult.value = null
		clearTimeout(disarmTimer)
		disarmTimer = setTimeout(() => (deleteArmed.value = false), 4000)
		return
	}
	clearTimeout(disarmTimer)
	deleteArmed.value = false
	deletingLogs.value = true
	try {
		const report = await cleanLogs(null)
		deleteResult.value = report.files_removed
	} catch (error) {
		handleError(toError(error))
	} finally {
		deletingLogs.value = false
	}
}

onBeforeUnmount(() => clearTimeout(disarmTimer))
</script>

<template>
	<section class="studio-section shield">
		<div class="studio-section__head">
			<div class="studio-section__lead">
				<span class="studio-badge" aria-hidden="true"><ShieldIcon /></span>
				<div>
					<p class="studio-eyebrow">{{ formatMessage(messages.eyebrow) }}</p>
					<h3 class="studio-section__title">{{ formatMessage(messages.title) }}</h3>
					<p class="studio-section__text">{{ formatMessage(messages.text) }}</p>
				</div>
			</div>
		</div>

		<div class="studio-section__body">
			<div>
				<p class="studio-subhead">{{ formatMessage(messages.alwaysTitle) }}</p>
				<ul class="shield-always">
					<li v-for="item in alwaysOn" :key="item.label">
						<component :is="item.icon" class="size-4 shrink-0 text-brand" />
						{{ item.label }}
					</li>
				</ul>
			</div>

			<div class="studio-row">
				<div class="min-w-0">
					<p class="studio-subhead">{{ formatMessage(messages.strictTitle) }}</p>
					<p class="studio-subtext">{{ formatMessage(messages.strictText) }}</p>
				</div>
				<Toggle
					id="shield-strict"
					v-model="strict"
					:disabled="saving !== null"
					:aria-label="formatMessage(messages.strictTitle)"
				/>
			</div>

			<div class="studio-row">
				<div class="min-w-0">
					<p class="studio-subhead">{{ formatMessage(messages.modsTitle) }}</p>
					<p class="studio-subtext">{{ formatMessage(messages.modsText) }}</p>
					<p v-if="gameMods" class="studio-subtext shield-hint">
						<BoxIcon class="size-3.5 shrink-0" />
						{{ formatMessage(messages.modsNote) }}
					</p>
				</div>
				<Toggle
					id="shield-game-mods"
					v-model="gameMods"
					:disabled="saving !== null"
					:aria-label="formatMessage(messages.modsTitle)"
				/>
			</div>

			<div class="studio-row shield-logs">
				<div class="min-w-0">
					<p class="studio-subhead">{{ formatMessage(messages.logsCleanupTitle) }}</p>
					<p class="studio-subtext">{{ formatMessage(messages.logsCleanupText) }}</p>
					<div
						class="studio-segmented mt-3"
						role="radiogroup"
						:aria-label="formatMessage(messages.logsCleanupTitle)"
					>
						<button
							v-for="days in LOG_RETENTION_CHOICES"
							:key="days"
							type="button"
							role="radio"
							class="studio-segment"
							:class="{ 'is-selected': logRetention === days }"
							:aria-checked="logRetention === days"
							@click="chooseRetention(days)"
						>
							{{
								days === 0
									? formatMessage(messages.logsCleanupNever)
									: formatMessage(messages.logsCleanupDays, { days })
							}}
						</button>
					</div>
					<div class="mt-3 flex flex-wrap items-center gap-3">
						<Button
							v-if="deleteArmed"
							type="colored"
							color="red"
							:disabled="deletingLogs"
							@click="deleteAllLogs"
						>
							<TrashIcon class="size-4" />
							{{ formatMessage(messages.logsDeleteConfirm) }}
						</Button>
						<Button v-else :disabled="deletingLogs" @click="deleteAllLogs">
							<TrashIcon class="size-4" />
							{{ formatMessage(messages.logsDeleteAll) }}
						</Button>
						<span v-if="deleteResult !== null" class="studio-subtext m-0">
							{{ formatMessage(messages.logsDeleted, { count: deleteResult }) }}
						</span>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>

<style lang="scss" scoped>
@import '../display/studio.scss';

.shield .studio-eyebrow {
	margin-bottom: 0.2rem;
}

.shield-always {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
	gap: 0.4rem 1rem;
	margin: 0.55rem 0 0;
	padding: 0;
	list-style: none;

	li {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		color: var(--color-base);
		font-size: 0.8rem;
		line-height: 1.4;
	}
}

.shield-hint {
	display: flex;
	align-items: flex-start;
	gap: 0.35rem;
	margin-top: 0.45rem;
}

.studio-subhead {
	display: flex;
	align-items: center;
	gap: 0.4rem;
}
</style>
