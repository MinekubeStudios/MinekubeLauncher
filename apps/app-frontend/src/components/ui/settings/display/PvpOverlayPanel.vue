<script setup lang="ts">
import {
	BoxesIcon,
	DownloadIcon,
	GaugeIcon,
	KeyboardIcon,
	LayersIcon,
	MonitorCogIcon,
	ShieldCheckIcon,
	SparklesIcon,
	TagCategorySwordsIcon,
	TagCategoryTargetIcon,
	TagCategoryZapIcon,
} from '@modrinth/assets'
import { defineMessages, useVIntl } from '@modrinth/ui'
import { computed } from 'vue'

/**
 * PvP OverLay Client — announcement page. The feature itself is not built
 * yet; this page only describes what is coming.
 */

const { formatMessage } = useVIntl()

const messages = defineMessages({
	eyebrow: { id: 'app.settings.pvp.eyebrow', defaultMessage: 'PvP OverLay Client' },
	comingSoon: { id: 'app.settings.pvp.coming-soon', defaultMessage: 'Coming soon' },
	title: {
		id: 'app.settings.pvp.title',
		defaultMessage: 'A competitive client, built right into the launcher',
	},
	text: {
		id: 'app.settings.pvp.text',
		defaultMessage:
			'In the spirit of Lunar Client and Feather Client — but as a Minekube extension that lives inside your own instances. Turn it on once and the launcher downloads, configures and keeps up to date everything a serious PvP player needs. No separate client, no account, no subscription.',
	},
	factAutomatic: { id: 'app.settings.pvp.fact.automatic', defaultMessage: 'Fully automatic' },
	factEverywhere: { id: 'app.settings.pvp.fact.everywhere', defaultMessage: 'Every instance' },
	factFair: { id: 'app.settings.pvp.fact.fair', defaultMessage: 'Server-safe' },
	factFree: { id: 'app.settings.pvp.fact.free', defaultMessage: 'Free forever' },
	featuresTitle: { id: 'app.settings.pvp.features-title', defaultMessage: 'What’s coming' },
	featurePerformanceTitle: {
		id: 'app.settings.pvp.feature.performance.title',
		defaultMessage: 'Maximum FPS, minimum input lag',
	},
	featurePerformanceText: {
		id: 'app.settings.pvp.feature.performance.text',
		defaultMessage:
			'A tuned set of optimization mods for steady frame times during fights, even on modest PCs.',
	},
	featureHudTitle: {
		id: 'app.settings.pvp.feature.hud.title',
		defaultMessage: 'Competitive HUD',
	},
	featureHudText: {
		id: 'app.settings.pvp.feature.hud.text',
		defaultMessage:
			'Keystrokes, CPS, FPS and ping, armor durability, potion timers and a custom crosshair — each one movable and resizable.',
	},
	featureCombatTitle: {
		id: 'app.settings.pvp.feature.combat.title',
		defaultMessage: 'Clearer combat feedback',
	},
	featureCombatText: {
		id: 'app.settings.pvp.feature.combat.text',
		defaultMessage:
			'Hit colors, cleaner particles, low fire, toggle sprint and sneak, and zoom — the small things that decide close fights.',
	},
	featureProfilesTitle: {
		id: 'app.settings.pvp.feature.profiles.title',
		defaultMessage: 'Profiles per game mode',
	},
	featureProfilesText: {
		id: 'app.settings.pvp.feature.profiles.text',
		defaultMessage:
			'Separate layouts for Bedwars, Skywars, duels or UHC, switched with one click and synced across all your instances.',
	},
	howTitle: { id: 'app.settings.pvp.how-title', defaultMessage: 'How it will work' },
	stepOneTitle: { id: 'app.settings.pvp.step.one.title', defaultMessage: 'Turn it on' },
	stepOneText: {
		id: 'app.settings.pvp.step.one.text',
		defaultMessage: 'One switch, here in Settings. Nothing to install by hand.',
	},
	stepTwoTitle: {
		id: 'app.settings.pvp.step.two.title',
		defaultMessage: 'The launcher prepares every instance',
	},
	stepTwoText: {
		id: 'app.settings.pvp.step.two.text',
		defaultMessage:
			'Before each launch it adds the PvP mods that match the instance’s game version and loader, and keeps them up to date. Vanilla instances get a loader automatically.',
	},
	stepThreeTitle: { id: 'app.settings.pvp.step.three.title', defaultMessage: 'Play' },
	stepThreeText: {
		id: 'app.settings.pvp.step.three.text',
		defaultMessage:
			'Open the overlay in game with a single key and arrange your HUD. Turning the client off removes everything again.',
	},
	fairTitle: { id: 'app.settings.pvp.fair-title', defaultMessage: 'Fair play first' },
	fairText: {
		id: 'app.settings.pvp.fair-text',
		defaultMessage:
			'Only quality-of-life and visual improvements that large PvP servers allow. No reach, no aim assist, no X-ray — nothing that could get your account banned.',
	},
})

const facts = computed(() => [
	{ icon: DownloadIcon, label: formatMessage(messages.factAutomatic) },
	{ icon: BoxesIcon, label: formatMessage(messages.factEverywhere) },
	{ icon: ShieldCheckIcon, label: formatMessage(messages.factFair) },
	{ icon: SparklesIcon, label: formatMessage(messages.factFree) },
])

const features = computed(() => [
	{
		icon: GaugeIcon,
		title: formatMessage(messages.featurePerformanceTitle),
		text: formatMessage(messages.featurePerformanceText),
	},
	{
		icon: KeyboardIcon,
		title: formatMessage(messages.featureHudTitle),
		text: formatMessage(messages.featureHudText),
	},
	{
		icon: TagCategoryTargetIcon,
		title: formatMessage(messages.featureCombatTitle),
		text: formatMessage(messages.featureCombatText),
	},
	{
		icon: LayersIcon,
		title: formatMessage(messages.featureProfilesTitle),
		text: formatMessage(messages.featureProfilesText),
	},
])

const steps = computed(() => [
	{ title: formatMessage(messages.stepOneTitle), text: formatMessage(messages.stepOneText) },
	{ title: formatMessage(messages.stepTwoTitle), text: formatMessage(messages.stepTwoText) },
	{ title: formatMessage(messages.stepThreeTitle), text: formatMessage(messages.stepThreeText) },
])
</script>

<template>
	<div class="studio">
		<section class="studio-hero pvp-hero">
			<div class="studio-hero__copy">
				<p class="studio-eyebrow">
					<TagCategorySwordsIcon />
					{{ formatMessage(messages.eyebrow) }}
				</p>
				<p class="pvp-soon">{{ formatMessage(messages.comingSoon) }}</p>
				<h2 class="studio-hero__title">{{ formatMessage(messages.title) }}</h2>
				<p class="studio-hero__text">{{ formatMessage(messages.text) }}</p>
				<div class="pvp-facts">
					<span v-for="fact in facts" :key="fact.label" class="pvp-fact">
						<component :is="fact.icon" class="size-4 text-brand" />
						{{ fact.label }}
					</span>
				</div>
			</div>
		</section>

		<section class="studio-section">
			<div class="studio-section__head">
				<div class="studio-section__lead">
					<span class="studio-badge" aria-hidden="true"><TagCategoryZapIcon /></span>
					<div>
						<h3 class="studio-section__title">{{ formatMessage(messages.featuresTitle) }}</h3>
					</div>
				</div>
			</div>
			<div class="studio-section__body">
				<div class="pvp-grid">
					<div v-for="feature in features" :key="feature.title" class="pvp-card">
						<component :is="feature.icon" class="pvp-card__icon" />
						<p class="pvp-card__title">{{ feature.title }}</p>
						<p class="pvp-card__text">{{ feature.text }}</p>
					</div>
				</div>
			</div>
		</section>

		<section class="studio-section">
			<div class="studio-section__head">
				<div class="studio-section__lead">
					<span class="studio-badge" aria-hidden="true"><MonitorCogIcon /></span>
					<div>
						<h3 class="studio-section__title">{{ formatMessage(messages.howTitle) }}</h3>
					</div>
				</div>
			</div>
			<div class="studio-section__body">
				<ol class="pvp-steps">
					<li v-for="(step, index) in steps" :key="step.title">
						<span class="pvp-steps__number">{{ index + 1 }}</span>
						<div class="min-w-0">
							<p class="pvp-steps__title">{{ step.title }}</p>
							<p class="pvp-steps__text">{{ step.text }}</p>
						</div>
					</li>
				</ol>
			</div>
		</section>

		<section class="studio-section">
			<div class="studio-section__head">
				<div class="studio-section__lead">
					<span class="studio-badge" aria-hidden="true"><ShieldCheckIcon /></span>
					<div>
						<h3 class="studio-section__title">{{ formatMessage(messages.fairTitle) }}</h3>
						<p class="studio-section__text">{{ formatMessage(messages.fairText) }}</p>
					</div>
				</div>
			</div>
		</section>
	</div>
</template>

<style lang="scss" scoped>
@import './studio.scss';

.pvp-soon {
	display: inline-block;
	margin: 0.6rem 0 0;
	background: linear-gradient(100deg, #fcc000, #fc6000 50%, #fc0060);
	background-clip: text;
	color: transparent;
	font-size: clamp(2rem, 5vw, 2.9rem);
	font-weight: 900;
	letter-spacing: -0.035em;
	line-height: 1;
	text-transform: uppercase;
}

.pvp-hero .studio-hero__title {
	margin-top: 0.6rem;
	font-size: 1.15rem;
}

.pvp-facts {
	display: flex;
	flex-wrap: wrap;
	gap: 0.4rem;
	margin-top: 0.85rem;
}

.pvp-fact {
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

.pvp-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
	gap: 0.6rem;
}

.pvp-card {
	display: flex;
	flex-direction: column;
	gap: 0.3rem;
	padding: 0.85rem 0.95rem;
	border: 1px solid var(--color-divider);
	border-radius: 0.8rem;
	background: var(--color-bg);
}

.pvp-card__icon {
	width: 1.15rem;
	height: 1.15rem;
	margin-bottom: 0.2rem;
	color: var(--color-brand);
}

.pvp-card__title {
	margin: 0;
	color: var(--color-contrast);
	font-size: 0.86rem;
	font-weight: 750;
}

.pvp-card__text {
	margin: 0;
	color: var(--color-secondary);
	font-size: 0.8rem;
	line-height: 1.45;
}

.pvp-steps {
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
	margin: 0;
	padding: 0;
	list-style: none;

	li {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}
}

.pvp-steps__number {
	display: grid;
	flex: 0 0 auto;
	place-items: center;
	width: 1.6rem;
	height: 1.6rem;
	border: 1px solid var(--color-divider);
	border-radius: 50%;
	background: var(--color-bg);
	color: var(--color-brand);
	font-size: 0.78rem;
	font-weight: 800;
}

.pvp-steps__title {
	margin: 0.15rem 0 0;
	color: var(--color-contrast);
	font-size: 0.86rem;
	font-weight: 750;
}

.pvp-steps__text {
	margin: 0.15rem 0 0;
	color: var(--color-secondary);
	font-size: 0.8rem;
	line-height: 1.45;
}
</style>
