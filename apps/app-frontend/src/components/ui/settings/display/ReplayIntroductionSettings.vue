<script setup lang="ts">
import { SparklesIcon } from '@modrinth/assets'
import { Button, defineMessages, useVIntl } from '@modrinth/ui'
import { inject } from 'vue'

import { welcomeMessages } from '@/components/ui/welcome/messages'
import { appSettingsModalContextKey } from '@/providers/app-settings-modal'

const { formatMessage } = useVIntl()
const settingsModal = inject(appSettingsModalContextKey, null)

const messages = defineMessages({
	title: {
		id: 'app.settings.replay-introduction.title',
		defaultMessage: 'Meet Minekube again',
	},
	description: {
		id: 'app.settings.replay-introduction.description',
		defaultMessage:
			'Revisit the two-step introduction to launcher language and the features that help you get into your next world.',
	},
})
</script>

<template>
	<section class="replay-introduction">
		<div class="replay-introduction__scene" aria-hidden="true">
			<span class="replay-introduction__glow"></span>
			<span class="replay-introduction__ring replay-introduction__ring--one"></span>
			<span class="replay-introduction__ring replay-introduction__ring--two"></span>
			<span class="replay-introduction__cube"></span>
			<span class="replay-introduction__star replay-introduction__star--one"></span>
			<span class="replay-introduction__star replay-introduction__star--two"></span>
		</div>
		<div class="replay-introduction__copy">
			<span class="replay-introduction__eyebrow">
				{{ formatMessage(welcomeMessages.eyebrow) }}
			</span>
			<h2>{{ formatMessage(messages.title) }}</h2>
			<p>{{ formatMessage(messages.description) }}</p>
			<p class="replay-introduction__welcome">
				{{ formatMessage(welcomeMessages.introDescription) }}
			</p>
			<Button
				type="colored"
				color="brand"
				class="replay-introduction__button"
				:disabled="!settingsModal"
				@click="settingsModal?.replayWelcome()"
			>
				<SparklesIcon aria-hidden="true" />
				{{ formatMessage(welcomeMessages.replay) }}
			</Button>
			<p class="replay-introduction__hint">
				{{ formatMessage(welcomeMessages.replayHint) }}
			</p>
		</div>
	</section>
</template>

<style lang="scss" scoped>
.replay-introduction {
	position: relative;
	display: grid;
	min-height: 24rem;
	grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
	align-items: center;
	overflow: hidden;
	border: 1px solid var(--color-divider);
	border-radius: 1.25rem;
	background:
		radial-gradient(ellipse at 20% 50%, rgba(252, 0, 96, 0.16), transparent 52%),
		linear-gradient(135deg, #17121f, #10131f 62%, #11101a);
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, 0.055),
		0 1rem 2rem rgba(0, 0, 0, 0.12);
	isolation: isolate;
}

.replay-introduction__scene {
	position: relative;
	min-height: 22rem;
	perspective: 850px;
	transform-style: preserve-3d;
}

.replay-introduction__glow {
	position: absolute;
	top: 50%;
	left: 50%;
	width: 13rem;
	height: 10rem;
	border-radius: 50%;
	background: radial-gradient(
		ellipse,
		rgba(255, 144, 63, 0.45),
		rgba(252, 0, 96, 0.18) 44%,
		transparent 74%
	);
	filter: blur(0.9rem);
	transform: translate(-50%, -50%);
	animation: intro-glow 4.8s ease-in-out infinite alternate;
}

.replay-introduction__ring {
	position: absolute;
	top: 50%;
	left: 50%;
	width: 13rem;
	height: 5rem;
	border: 1px solid rgba(255, 218, 157, 0.62);
	border-radius: 50%;
	box-shadow: 0 0 1.3rem rgba(252, 96, 0, 0.25);
	transform: translate(-50%, -50%) rotateX(68deg) rotateZ(-24deg);
}

.replay-introduction__ring--two {
	width: 10rem;
	height: 8rem;
	border-color: rgba(161, 150, 255, 0.46);
	transform: translate(-50%, -50%) rotateX(66deg) rotateZ(42deg);
	animation: intro-spin 14s linear infinite;
}

.replay-introduction__cube {
	position: absolute;
	top: 50%;
	left: 50%;
	width: 4rem;
	height: 4rem;
	border: 1px solid rgba(255, 223, 157, 0.76);
	border-radius: 0.5rem;
	background: linear-gradient(
		145deg,
		rgba(255, 236, 173, 0.88),
		rgba(252, 96, 0, 0.65) 48%,
		rgba(252, 0, 96, 0.56)
	);
	box-shadow:
		0 0 2.2rem rgba(252, 96, 0, 0.45),
		inset 0 0 1rem rgba(255, 255, 255, 0.18);
	transform: translate(-50%, -50%) rotateX(-30deg) rotateY(42deg) rotateZ(45deg);
	animation: intro-cube-float 4s ease-in-out infinite;
}

.replay-introduction__star {
	position: absolute;
	width: 0.36rem;
	height: 0.36rem;
	border-radius: 50%;
	background: #fff6dc;
	box-shadow: 0 0 1rem 0.3rem rgba(255, 194, 100, 0.8);
	animation: intro-twinkle 2.2s ease-in-out infinite;
}

.replay-introduction__star--one {
	top: 28%;
	left: 24%;
}

.replay-introduction__star--two {
	right: 18%;
	bottom: 26%;
	width: 0.24rem;
	height: 0.24rem;
	background: #c1b7ff;
	box-shadow: 0 0 0.85rem 0.25rem rgba(157, 139, 255, 0.85);
	animation-delay: -0.8s;
}

.replay-introduction__copy {
	position: relative;
	z-index: 1;
	padding: 2rem 2rem 2rem 0.5rem;
}

.replay-introduction__eyebrow {
	color: #ffbd91;
	font-size: 0.68rem;
	font-weight: 800;
	letter-spacing: 0.12em;
	line-height: 1.4;
	text-transform: uppercase;
}

.replay-introduction h2 {
	margin: 0.8rem 0 0;
	color: #fff;
	font-size: clamp(1.55rem, 3vw, 2.1rem);
	font-weight: 800;
	letter-spacing: -0.04em;
	line-height: 1.12;
}

.replay-introduction__copy > p {
	max-width: 31rem;
	margin: 0.85rem 0 0;
	color: rgba(255, 255, 255, 0.76);
	font-size: 0.88rem;
	line-height: 1.55;
}

.replay-introduction__copy .replay-introduction__welcome {
	margin-top: 0.55rem;
	color: rgba(255, 255, 255, 0.58);
	font-size: 0.78rem;
}

.replay-introduction__button {
	margin-top: 1.25rem;
}

.replay-introduction__copy .replay-introduction__hint {
	margin-top: 0.6rem;
	font-size: 0.72rem;
}

@keyframes intro-glow {
	from {
		opacity: 0.55;
		transform: translate(-50%, -50%) scale(0.86);
	}
	to {
		opacity: 0.95;
		transform: translate(-50%, -50%) scale(1.13);
	}
}

@keyframes intro-spin {
	to {
		transform: translate(-50%, -50%) rotateX(66deg) rotateZ(402deg);
	}
}

@keyframes intro-cube-float {
	0%,
	100% {
		transform: translate(-50%, -50%) translateY(0) rotateX(-30deg) rotateY(42deg) rotateZ(45deg);
	}
	50% {
		transform: translate(-50%, -56%) rotateX(-18deg) rotateY(68deg) rotateZ(35deg);
	}
}

@keyframes intro-twinkle {
	0%,
	100% {
		opacity: 0.4;
		transform: scale(0.72);
	}
	50% {
		opacity: 1;
		transform: scale(1.2);
	}
}

@media (max-width: 640px) {
	.replay-introduction {
		grid-template-columns: minmax(0, 1fr);
	}

	.replay-introduction__scene {
		position: absolute;
		top: 0;
		right: -2rem;
		width: 13rem;
		min-height: 13rem;
		opacity: 0.42;
	}

	.replay-introduction__copy {
		padding: 1.5rem;
	}
}

@media (prefers-reduced-motion: reduce) {
	.replay-introduction *,
	.replay-introduction *::before,
	.replay-introduction *::after {
		animation-duration: 0.01ms !important;
		animation-iteration-count: 1 !important;
	}
}
</style>
