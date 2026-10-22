<script setup lang="ts">
import { CubeIcon, ImportIcon, PlusIcon, RightArrowIcon } from '@modrinth/assets'
import { Button, defineMessages, IntlFormatted, useVIntl } from '@modrinth/ui'
import { inject, onMounted, onUnmounted, ref } from 'vue'

import minekubeIcon from '../../assets/welcome/minekube-icon.png'

const showCreationModal = inject<() => void>('showCreationModal')
const showImportModal = inject<() => void>('showImportModal')

const { formatMessage } = useVIntl()

const messages = defineMessages({
	welcomeTitle: {
		id: 'app.welcome-screen.title',
		defaultMessage: 'Welcome to Minekube Launcher',
	},
	welcomeDescription: {
		id: 'app.welcome-screen.description',
		defaultMessage: 'Ready to start playing?',
	},
	createInstance: {
		id: 'app.welcome-screen.create-instance',
		defaultMessage: 'Create an instance',
	},
	quickCreateHint: {
		id: 'app.welcome-screen.quick-create-hint',
		defaultMessage: 'Press <shortcut>N</shortcut> to quick create an instance',
	},
	importPrompt: {
		id: 'app.welcome-screen.import-prompt',
		defaultMessage: 'Escaping another launcher?',
	},
	importFromLauncher: {
		id: 'app.welcome-screen.import-from-launcher',
		defaultMessage: 'Import from launcher',
	},
})

const offline = ref(!navigator.onLine)

function handleOffline() {
	offline.value = true
}

function handleOnline() {
	offline.value = false
}

function handleQuickCreate(event: KeyboardEvent) {
	const target = event.target as HTMLElement | null
	if (
		event.key.toLowerCase() !== 'n' ||
		event.repeat ||
		event.metaKey ||
		event.ctrlKey ||
		event.altKey ||
		target?.isContentEditable ||
		['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')
	) {
		return
	}

	if (!offline.value) {
		event.preventDefault()
		showCreationModal?.()
	}
}

onMounted(() => {
	window.addEventListener('offline', handleOffline)
	window.addEventListener('online', handleOnline)
	window.addEventListener('keydown', handleQuickCreate)
})

onUnmounted(() => {
	window.removeEventListener('offline', handleOffline)
	window.removeEventListener('online', handleOnline)
	window.removeEventListener('keydown', handleQuickCreate)
})
</script>

<template>
	<div class="welcome-page">
		<div class="welcome-layout">
			<section class="welcome-hero" aria-labelledby="empty-library-welcome-title">
				<div class="welcome-hero-copy">
					<div class="welcome-brand">
						<img :src="minekubeIcon" alt="" width="48" height="48" />
						<span>Minekube Launcher</span>
					</div>
					<div class="welcome-heading">
						<h1 id="empty-library-welcome-title">{{ formatMessage(messages.welcomeTitle) }}</h1>
						<p>{{ formatMessage(messages.welcomeDescription) }}</p>
					</div>
					<div class="welcome-primary-action">
						<Button
							type="colored"
							color="brand"
							size="xl"
							class="welcome-create-button"
							:disabled="offline"
							@click="showCreationModal?.()"
						>
							<PlusIcon aria-hidden="true" />
							{{ formatMessage(messages.createInstance) }}
						</Button>
						<span class="welcome-shortcut text-secondary">
							<IntlFormatted :message-id="messages.quickCreateHint">
								<template #shortcut="{ children }">
									<kbd class="welcome-shortcut-key">
										<component :is="() => children" />
									</kbd>
								</template>
							</IntlFormatted>
						</span>
					</div>
				</div>

				<div class="welcome-art" aria-hidden="true">
					<div class="welcome-art-grid" />
					<div class="welcome-art-orbit welcome-art-orbit-one" />
					<div class="welcome-art-orbit welcome-art-orbit-two" />
					<div class="welcome-art-glow" />
					<div class="welcome-art-platform" />
					<img :src="minekubeIcon" alt="" class="welcome-art-logo" />
					<div class="welcome-art-label"><CubeIcon /> MINECRAFT JAVA</div>
				</div>
			</section>

			<section class="welcome-import-card" :aria-label="formatMessage(messages.importPrompt)">
				<div class="welcome-import-icon" aria-hidden="true"><ImportIcon /></div>
				<div class="welcome-import-copy">
					<h2>{{ formatMessage(messages.importPrompt) }}</h2>
				</div>
				<Button
					type="base"
					size="lg"
					class="welcome-import-button"
					:disabled="offline"
					@click="showImportModal?.()"
				>
					{{ formatMessage(messages.importFromLauncher) }}
					<RightArrowIcon aria-hidden="true" />
				</Button>
			</section>
		</div>
	</div>
</template>

<style scoped lang="scss">
.welcome-page {
	min-height: 100%;
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: clamp(1.25rem, 3vw, 2.25rem);
}

.welcome-layout {
	width: min(100%, 70rem);
	display: flex;
	flex-direction: column;
	gap: 1rem;
	margin-inline: auto;
}

.welcome-hero {
	position: relative;
	isolation: isolate;
	display: grid;
	grid-template-columns: minmax(0, 1.08fr) minmax(15rem, 0.92fr);
	align-items: stretch;
	min-height: min(34rem, calc(100vh - 8rem));
	overflow: hidden;
	border: 1px solid var(--brand-gradient-border);
	border-radius: var(--radius-xl);
	background: linear-gradient(135deg, var(--surface-3), var(--color-bg) 76%);
	box-shadow: var(--shadow-card);

	&::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		pointer-events: none;
		background:
			radial-gradient(
				ellipse at 82% 45%,
				color-mix(in srgb, var(--color-brand) 13%, transparent),
				transparent 47%
			),
			var(--brand-gradient-bg);
	}
}

.welcome-hero-copy {
	z-index: 1;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	justify-content: center;
	padding: clamp(1.75rem, 4vw, 3.75rem);
}

.welcome-brand {
	display: inline-flex;
	align-items: center;
	gap: 0.7rem;
	color: var(--color-contrast);
	font-size: 0.95rem;
	font-weight: 700;
	letter-spacing: 0.01em;

	img {
		width: 3rem;
		height: 3rem;
		object-fit: contain;
		filter: drop-shadow(0 0.25rem 0.75rem color-mix(in srgb, var(--color-brand) 28%, transparent));
	}
}

.welcome-heading {
	margin-top: clamp(2rem, 5vh, 3.5rem);

	h1 {
		max-width: 11ch;
		margin: 0;
		color: var(--color-contrast);
		font-size: clamp(2rem, 4.2vw, 3.5rem);
		font-weight: 750;
		letter-spacing: -0.045em;
		line-height: 1.04;
	}

	p {
		max-width: 34rem;
		margin: 1rem 0 0;
		color: var(--color-secondary);
		font-size: clamp(1rem, 1.4vw, 1.125rem);
		line-height: 1.6;
	}
}

.welcome-primary-action {
	margin-top: 2rem;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 0.875rem;
}

.welcome-create-button {
	min-height: 3rem;
}

.welcome-shortcut {
	display: inline-flex;
	align-items: center;
	gap: 0.3rem;
	font-size: 0.8125rem;
	line-height: 1.25rem;
}

.welcome-shortcut-key {
	min-width: 1.375rem;
	height: 1.375rem;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0 0.35rem;
	border: 1px solid var(--surface-5);
	border-radius: var(--radius-md);
	background: var(--surface-3);
	color: var(--color-contrast);
	font-family: inherit;
	font-size: 0.75rem;
	line-height: 1;
}

.welcome-art {
	position: relative;
	min-height: 18rem;
	display: grid;
	place-items: center;
	overflow: hidden;
	isolation: isolate;
}

.welcome-art-grid {
	position: absolute;
	inset: 0;
	background-image:
		linear-gradient(color-mix(in srgb, var(--color-brand) 8%, transparent) 1px, transparent 1px),
		linear-gradient(
			90deg,
			color-mix(in srgb, var(--color-brand) 8%, transparent) 1px,
			transparent 1px
		);
	background-size: 2rem 2rem;
	mask-image: radial-gradient(ellipse at center, #000 14%, transparent 72%);
}

.welcome-art-orbit {
	position: absolute;
	left: 50%;
	top: 50%;
	width: min(78%, 19rem);
	aspect-ratio: 1;
	border: 1px solid color-mix(in srgb, var(--color-brand) 28%, transparent);
	border-radius: 50%;
	transform: translate(-50%, -50%);
}

.welcome-art-orbit-one {
	transform: translate(-50%, -50%) rotate(-30deg) scaleY(0.56);
}

.welcome-art-orbit-two {
	width: min(90%, 21rem);
	border-style: dashed;
	opacity: 0.58;
	transform: translate(-50%, -50%) rotate(30deg) scaleY(0.56);
}

.welcome-art-glow {
	position: absolute;
	width: 58%;
	aspect-ratio: 1;
	border-radius: 50%;
	background: color-mix(in srgb, var(--color-brand) 20%, transparent);
	filter: blur(3rem);
	opacity: 0.58;
}

.welcome-art-platform {
	position: absolute;
	left: 50%;
	bottom: 20%;
	width: 42%;
	height: 0.75rem;
	border-radius: 50%;
	background: color-mix(in srgb, var(--color-brand) 24%, transparent);
	filter: blur(0.9rem);
	transform: translateX(-50%);
}

.welcome-art-logo {
	position: relative;
	z-index: 1;
	width: clamp(9rem, 18vw, 14rem);
	height: auto;
	object-fit: contain;
	filter: drop-shadow(0 1.25rem 1.75rem color-mix(in srgb, var(--color-brand) 22%, transparent));
}

.welcome-art-label {
	position: absolute;
	z-index: 2;
	right: clamp(1rem, 5%, 2rem);
	bottom: clamp(1rem, 7%, 2rem);
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.55rem 0.75rem;
	border: 1px solid var(--brand-gradient-border);
	border-radius: var(--radius-lg);
	background: color-mix(in srgb, var(--surface-3) 92%, transparent);
	box-shadow: var(--shadow-card);
	color: var(--color-secondary);
	font-size: 0.7rem;
	font-weight: 650;
	letter-spacing: 0.08em;

	svg {
		width: 1rem;
		height: 1rem;
		color: var(--color-brand);
	}
}

.welcome-import-card {
	display: flex;
	align-items: center;
	gap: 1rem;
	padding: 1rem 1.25rem;
	border: 1px solid var(--surface-5);
	border-radius: var(--radius-xl);
	background: var(--surface-3);
	box-shadow: var(--shadow-card);
}

.welcome-import-icon {
	width: 2.75rem;
	height: 2.75rem;
	flex: 0 0 auto;
	display: grid;
	place-items: center;
	border: 1px solid var(--brand-gradient-border);
	border-radius: var(--radius-lg);
	background: var(--color-brand-highlight);
	color: var(--color-brand);

	svg {
		width: 1.25rem;
		height: 1.25rem;
	}
}

.welcome-import-copy {
	min-width: 0;

	h2 {
		margin: 0;
		color: var(--color-contrast);
		font-size: 0.95rem;
		font-weight: 650;
		line-height: 1.4;
	}
}

.welcome-import-button {
	margin-left: auto;
	flex-shrink: 0;
}

@media (max-width: 960px) {
	.welcome-page {
		align-items: flex-start;
	}

	.welcome-hero {
		grid-template-columns: minmax(0, 1fr);
		min-height: 0;
	}

	.welcome-hero-copy {
		padding-bottom: 0.5rem;
	}

	.welcome-heading {
		margin-top: 2rem;
	}

	.welcome-primary-action {
		margin-top: 1.5rem;
	}

	.welcome-art {
		min-height: 14rem;
	}

	.welcome-art-logo {
		width: 9rem;
	}
}

@media (max-width: 480px) {
	.welcome-page {
		padding: 1rem;
	}

	.welcome-hero-copy {
		padding: 1.5rem;
	}

	.welcome-heading h1 {
		font-size: clamp(2rem, 10vw, 2.75rem);
	}

	.welcome-create-button,
	.welcome-import-button {
		width: 100%;
	}

	.welcome-primary-action,
	.welcome-import-card {
		width: 100%;
	}

	.welcome-import-card {
		flex-wrap: wrap;
		padding: 1rem;
	}

	.welcome-import-copy {
		flex: 1;
	}

	.welcome-import-button {
		margin-left: 0;
	}
}
</style>
