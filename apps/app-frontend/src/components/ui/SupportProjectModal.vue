<script setup lang="ts">
import { ArrowUpRightIcon, BugIcon, GithubIcon, HeartIcon, KoFiIcon } from '@modrinth/assets'
import { defineMessages, injectNotificationManager, NewModal, useVIntl } from '@modrinth/ui'
import { openUrl } from '@tauri-apps/plugin-opener'
import { ref } from 'vue'

const { formatMessage } = useVIntl()
const { handleError } = injectNotificationManager()
const modal = ref<InstanceType<typeof NewModal>>()

const messages = defineMessages({
	title: {
		id: 'app.support-window.title',
		defaultMessage: 'Support the project',
	},
	eyebrow: {
		id: 'app.support-window.eyebrow',
		defaultMessage: 'MADE FOR PLAYERS, WITH PLAYERS',
	},
	hero: {
		id: 'app.support-window.hero',
		defaultMessage: 'Every adventure starts together.',
	},
	intro: {
		id: 'app.support-window.intro',
		defaultMessage:
			'Minekube Launcher is free and open source. If it makes your time in Minecraft a little better, there are several ways to help it grow. Supporting us is always optional.',
	},
	kofiTitle: {
		id: 'app.support-window.kofi-title',
		defaultMessage: 'Give the project a boost',
	},
	kofiDescription: {
		id: 'app.support-window.kofi-description',
		defaultMessage:
			'Voluntary contributions help cover infrastructure and ongoing development. Explore our Ko-fi support option in your browser.',
	},
	kofiAction: {
		id: 'app.support-window.kofi-action',
		defaultMessage: 'Visit Ko-fi',
	},
	githubTitle: {
		id: 'app.support-window.github-title',
		defaultMessage: 'Build with us',
	},
	githubDescription: {
		id: 'app.support-window.github-description',
		defaultMessage: 'Explore the source, contribute code or help improve translations.',
	},
	githubAction: {
		id: 'app.support-window.github-action',
		defaultMessage: 'View on GitHub',
	},
	feedbackTitle: {
		id: 'app.support-window.feedback-title',
		defaultMessage: 'Make it better',
	},
	feedbackDescription: {
		id: 'app.support-window.feedback-description',
		defaultMessage: 'Report a bug or suggest an idea. Your feedback matters just as much.',
	},
	feedbackAction: {
		id: 'app.support-window.feedback-action',
		defaultMessage: 'Open issues',
	},
	thankYou: {
		id: 'app.support-window.thank-you',
		defaultMessage:
			'Thank you for being part of Minekube. No payment is needed to enjoy the launcher.',
	},
})

function openExternal(url: string): void {
	void openUrl(url).catch(handleError)
}

defineExpose({ show: () => modal.value?.show() })
</script>

<template>
	<NewModal
		ref="modal"
		:header="formatMessage(messages.title)"
		width="780px"
		max-width="780px"
		max-content-height="min(76vh, 760px)"
		scrollable
		no-padding
		class="support-modal"
	>
		<div class="support-window">
			<section class="support-hero">
				<div class="hero-light" aria-hidden="true"></div>
				<div class="hero-content">
					<span class="heart-token"><HeartIcon aria-hidden="true" /></span>
					<p class="eyebrow">{{ formatMessage(messages.eyebrow) }}</p>
					<h2>{{ formatMessage(messages.hero) }}</h2>
					<p class="intro">{{ formatMessage(messages.intro) }}</p>
				</div>
			</section>

			<div class="support-content">
				<section class="kofi-card">
					<span class="card-icon kofi-icon"><KoFiIcon aria-hidden="true" /></span>
					<div class="card-copy">
						<h3>{{ formatMessage(messages.kofiTitle) }}</h3>
						<p>{{ formatMessage(messages.kofiDescription) }}</p>
					</div>
					<button
						type="button"
						class="kofi-button"
						@click="openExternal('https://ko-fi.com/minekubestudios')"
					>
						{{ formatMessage(messages.kofiAction) }}<ArrowUpRightIcon aria-hidden="true" />
					</button>
				</section>

				<div class="community-grid">
					<section class="community-card">
						<span class="card-icon"><GithubIcon aria-hidden="true" /></span>
						<h3>{{ formatMessage(messages.githubTitle) }}</h3>
						<p>{{ formatMessage(messages.githubDescription) }}</p>
						<button
							type="button"
							class="card-link"
							@click="openExternal('https://github.com/MinekubeStudios/MinekubeLauncher')"
						>
							{{ formatMessage(messages.githubAction) }}<ArrowUpRightIcon aria-hidden="true" />
						</button>
					</section>
					<section class="community-card">
						<span class="card-icon"><BugIcon aria-hidden="true" /></span>
						<h3>{{ formatMessage(messages.feedbackTitle) }}</h3>
						<p>{{ formatMessage(messages.feedbackDescription) }}</p>
						<button
							type="button"
							class="card-link"
							@click="openExternal('https://github.com/MinekubeStudios/MinekubeLauncher/issues')"
						>
							{{ formatMessage(messages.feedbackAction) }}<ArrowUpRightIcon aria-hidden="true" />
						</button>
					</section>
				</div>
				<p class="thank-you">
					<HeartIcon aria-hidden="true" />{{ formatMessage(messages.thankYou) }}
				</p>
			</div>
		</div>
	</NewModal>
</template>

<style scoped lang="scss">
.support-window {
	color: var(--color-contrast);
	background: var(--color-bg);

	h2,
	h3,
	p {
		margin: 0;
	}

	button {
		font: inherit;
		cursor: pointer;
	}

	button:focus-visible {
		outline: 2px solid var(--color-focus-ring);
		outline-offset: 3px;
	}
}

.support-hero {
	position: relative;
	overflow: hidden;
	padding: clamp(1.6rem, 4vw, 2.5rem);
	background:
		radial-gradient(circle at 93% 13%, rgba(252, 0, 96, 0.24), transparent 42%),
		radial-gradient(circle at 10% 12%, rgba(252, 192, 0, 0.2), transparent 48%),
		linear-gradient(125deg, var(--surface-2), var(--color-raised-bg));
	border-bottom: 1px solid var(--brand-gradient-border, var(--color-divider));
}

.hero-light {
	position: absolute;
	inset: 0;
	pointer-events: none;
	background-image: radial-gradient(rgba(255, 255, 255, 0.12) 0.7px, transparent 0.7px);
	background-size: 22px 22px;
	mask-image: linear-gradient(90deg, transparent 25%, black);
}

.hero-content {
	position: relative;
	max-width: 33rem;
}

.heart-token {
	display: grid;
	width: 3.25rem;
	height: 3.25rem;
	place-items: center;
	border: 1px solid rgba(255, 100, 117, 0.35);
	border-radius: 1.1rem;
	background: rgba(255, 74, 94, 0.13);
	color: #ff5367;
	box-shadow: 0 8px 24px rgba(139, 31, 71, 0.14);

	svg {
		width: 1.55rem;
		height: 1.55rem;
		fill: currentColor;
	}
}

.eyebrow {
	margin-top: 1.5rem !important;
	color: var(--color-brand);
	font-size: 0.7rem;
	font-weight: 800;
	letter-spacing: 0.18em;
}

.support-hero h2 {
	margin-top: 0.5rem;
	font-size: clamp(1.8rem, 3vw, 2.5rem);
	font-weight: 760;
	letter-spacing: -0.035em;
	line-height: 1.08;
}

.intro {
	margin-top: 0.9rem !important;
	color: var(--color-base);
	font-size: 0.95rem;
	line-height: 1.6;
}

.support-content {
	display: grid;
	gap: 1rem;
	padding: 1.35rem clamp(1rem, 3vw, 2rem) 1.5rem;
}

.kofi-card,
.community-card {
	border: 1px solid var(--color-divider);
	border-radius: 1rem;
	background: var(--color-raised-bg);
}

.kofi-card {
	display: flex;
	align-items: center;
	gap: 1rem;
	padding: 1.2rem;
	border-color: color-mix(in srgb, #ff6662 40%, var(--color-divider));
	background: linear-gradient(
		110deg,
		color-mix(in srgb, #ff6662 10%, var(--color-raised-bg)),
		var(--color-raised-bg)
	);
}

.card-icon {
	display: grid;
	width: 2.7rem;
	height: 2.7rem;
	flex: 0 0 auto;
	place-items: center;
	border-radius: 0.8rem;
	background: var(--color-brand-highlight);
	color: var(--color-brand);

	svg {
		width: 1.35rem;
		height: 1.35rem;
	}
}

.kofi-icon {
	background: rgba(255, 102, 98, 0.16);
	color: #ff6662;
}

.card-copy {
	flex: 1;
	min-width: 0;
}

.support-content h3 {
	font-size: 1rem;
	font-weight: 720;
}

.support-content p {
	color: var(--color-secondary);
	font-size: 0.85rem;
	line-height: 1.5;
}

.card-copy p {
	margin-top: 0.35rem;
}

.kofi-button,
.card-link {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.4rem;
	border: 0;
	font-size: 0.83rem !important;
	font-weight: 720 !important;

	svg {
		width: 1rem;
		height: 1rem;
	}
}

.kofi-button {
	flex: 0 0 auto;
	padding: 0.7rem 0.95rem;
	border-radius: 0.65rem;
	background: #ed5856;
	color: #fff;
	transition:
		background-color 160ms ease,
		transform 160ms ease;

	&:hover {
		background: #d9404b;
		transform: translateY(-1px);
	}
}

.community-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 1rem;
}

.community-card {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	padding: 1.15rem;

	h3 {
		margin-top: 0.8rem;
	}

	p {
		margin-top: 0.4rem;
		flex: 1;
	}
}

.card-link {
	margin-top: 0.9rem;
	padding: 0;
	background: none;
	color: var(--color-brand);

	&:hover {
		text-decoration: underline;
	}
}

.thank-you {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.5rem;
	padding: 0.45rem 0;
	text-align: center;

	svg {
		width: 0.95rem;
		height: 0.95rem;
		flex: 0 0 auto;
		color: #ff5367;
	}
}

@media (max-width: 620px) {
	.kofi-card {
		flex-wrap: wrap;
	}

	.kofi-button {
		margin-left: 3.7rem;
	}

	.community-grid {
		grid-template-columns: 1fr;
	}
}

@media (prefers-reduced-motion: reduce) {
	.kofi-button {
		transition: none;
	}
}
</style>
