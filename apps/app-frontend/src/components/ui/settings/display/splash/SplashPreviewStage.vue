<script setup lang="ts">
import { MinekubeLauncherLogo } from '@modrinth/assets'
import { defineMessages, useVIntl } from '@modrinth/ui'
import { computed, onMounted, onUnmounted, ref } from 'vue'

import SplashBackgroundParticles from '@/components/ui/splash/SplashBackgroundParticles.vue'
import { SPLASH_SEGMENT_COUNT, useSplashScreen } from '@/composables/use-splash-screen.ts'
import { type EffectStyle, effectStyle } from '@/composables/use-visual.ts'

import SplashLoadingControls from './SplashLoadingControls.vue'

const { formatMessage } = useVIntl()

const messages = defineMessages({
	status: {
		id: 'app.settings.visual.splash.preview-status',
		defaultMessage: 'Loading worlds…',
	},
})

const splash = useSplashScreen()

/**
 * The preview lives inside a collapsible section that stays mounted (hidden
 * with `display: none`) and inside a scrolling settings page. Its progress loop
 * and particle canvas only run while it can actually be seen; otherwise they
 * kept redrawing at full frame rate the whole time the settings were open.
 */
const root = ref<HTMLElement | null>(null)
const onScreen = ref(false)
let visibilityObserver: IntersectionObserver | undefined

const backgroundEffect = computed<EffectStyle | 'none'>(() =>
	splash.backgroundEffects && onScreen.value ? effectStyle.value : 'none',
)

const RAMP_MS = 2400
const HOLD_MS = 700
const PREVIEW_STARS = 14

const progress = ref(0)
let frame = 0
let startedAt: number | undefined

function animateProgress(timestamp: number) {
	startedAt ??= timestamp
	const cycle = (timestamp - startedAt) % (RAMP_MS + HOLD_MS)
	const t = Math.min(1, cycle / RAMP_MS)
	progress.value = t >= 1 ? 100 : (1 - (1 - t) ** 3) * 100
	frame = requestAnimationFrame(animateProgress)
}

function startProgress() {
	if (frame === 0) frame = requestAnimationFrame(animateProgress)
}

function stopProgress() {
	if (frame !== 0) cancelAnimationFrame(frame)
	frame = 0
}

onMounted(() => {
	if (typeof IntersectionObserver === 'undefined' || !root.value) {
		onScreen.value = true
		startProgress()
		return
	}
	visibilityObserver = new IntersectionObserver((entries) => {
		onScreen.value = entries.some((entry) => entry.isIntersecting)
		if (onScreen.value) startProgress()
		else stopProgress()
	})
	visibilityObserver.observe(root.value)
})

onUnmounted(() => {
	visibilityObserver?.disconnect()
	stopProgress()
})

function filled(index: number): boolean {
	return progress.value >= ((index + 1) / SPLASH_SEGMENT_COUNT) * 100
}
</script>

<template>
	<div
		ref="root"
		class="splash-preview"
		:data-splash-progress="splash.progressStyle"
		:data-splash-logo="splash.logoAnimation"
		aria-hidden="true"
		:inert="true"
	>
		<div class="splash-preview__sky"></div>
		<div class="splash-preview__stars">
			<span v-for="star in PREVIEW_STARS" :key="star" class="splash-preview__star"></span>
		</div>
		<div class="splash-preview__nebula splash-preview__nebula--gold"></div>
		<div class="splash-preview__nebula splash-preview__nebula--magenta"></div>
		<SplashBackgroundParticles :effect="backgroundEffect" />
		<div v-if="splash.gridFloor" class="splash-preview__grid"></div>

		<div class="splash-preview__center">
			<div class="splash-preview__halo"></div>
			<div class="splash-preview__logo-stage">
				<img class="splash-preview__logo" :src="MinekubeLauncherLogo" alt="" draggable="false" />
			</div>

			<div class="splash-preview__indicator">
				<div v-if="splash.progressStyle === 'bar'" class="splash-preview__track">
					<div
						class="splash-preview__fill"
						:style="{ transform: `scaleX(${progress / 100})` }"
					></div>
				</div>

				<div v-else-if="splash.progressStyle === 'segments'" class="splash-preview__segments">
					<span
						v-for="index in SPLASH_SEGMENT_COUNT"
						:key="index"
						class="splash-preview__segment"
						:class="{ 'is-filled': filled(index - 1) }"
					></span>
				</div>

				<div v-else-if="splash.progressStyle === 'ring'" class="splash-preview__ring">
					<div class="splash-preview__dial" :style="{ '--ring-progress': progress / 100 }"></div>
					<span class="splash-preview__ring-value">{{ Math.round(progress) }}%</span>
				</div>

				<div v-else-if="splash.progressStyle === 'dots'" class="splash-preview__dots">
					<span
						v-for="index in SPLASH_SEGMENT_COUNT"
						:key="index"
						class="splash-preview__dot"
						:class="{ 'is-filled': filled(index - 1) }"
					></span>
				</div>

				<div v-else class="splash-preview__minimal">
					<div
						class="splash-preview__fill"
						:style="{ transform: `scaleX(${progress / 100})` }"
					></div>
				</div>

				<span v-if="splash.showLoadingMessage" class="splash-preview__status">
					{{ formatMessage(messages.status) }}
				</span>
			</div>
		</div>

		<SplashLoadingControls variant="inline" />
	</div>
</template>

<style scoped lang="scss">
.splash-preview {
	// Loading-screen palette, kept in sync with SplashScreen.vue.
	--mk-gold-2: #fcc000;
	--mk-orange-1: #ff8a2a;
	--mk-magenta-2: #fc0060;
	--splash-speed: var(--splash-animation-speed, 1);

	position: relative;
	width: 100%;
	height: 11rem;
	overflow: hidden;
	border: 1px solid var(--color-divider);
	border-radius: var(--radius-lg);
	background: #06000a;
	color: #fff;
	isolation: isolate;
}

.splash-preview__sky {
	position: absolute;
	inset: 0;
	z-index: 0;
	background:
		radial-gradient(
			ellipse 80% 60% at 50% 40%,
			rgba(252, 0, 96, 0.22) 0%,
			rgba(252, 156, 0, 0.12) 28%,
			rgba(72, 0, 16, 0.08) 55%,
			rgba(6, 0, 10, 1) 85%
		),
		linear-gradient(180deg, #0a0010 0%, #1a0008 55%, #000000 100%);
}

.splash-preview__stars {
	position: absolute;
	inset: 0;
	z-index: 1;
	opacity: var(--splash-star-density, 1);
}

.splash-preview__star {
	position: absolute;
	width: 2px;
	height: 2px;
	border-radius: 50%;
	background: #fff;
	box-shadow: 0 0 4px 1px rgba(255, 232, 102, 0.85);
	animation: preview-twinkle calc(2.4s / var(--splash-speed)) ease-in-out infinite;

	&:nth-child(1) {
		top: 14%;
		left: 12%;
	}
	&:nth-child(2) {
		top: 26%;
		left: 68%;
		animation-delay: -0.4s;
	}
	&:nth-child(3) {
		top: 8%;
		left: 44%;
		animation-delay: -1.1s;
	}
	&:nth-child(4) {
		top: 46%;
		left: 86%;
		animation-delay: -0.7s;
	}
	&:nth-child(5) {
		top: 62%;
		left: 22%;
		animation-delay: -1.6s;
	}
	&:nth-child(6) {
		top: 72%;
		left: 58%;
		animation-delay: -0.2s;
	}
	&:nth-child(7) {
		top: 34%;
		left: 32%;
		animation-delay: -2s;
	}
	&:nth-child(8) {
		top: 18%;
		left: 92%;
		animation-delay: -1.3s;
	}
	&:nth-child(9) {
		top: 82%;
		left: 78%;
		animation-delay: -0.9s;
	}
	&:nth-child(10) {
		top: 54%;
		left: 6%;
		animation-delay: -1.8s;
	}
	&:nth-child(11) {
		top: 40%;
		left: 52%;
		animation-delay: -0.5s;
	}
	&:nth-child(12) {
		top: 88%;
		left: 34%;
		animation-delay: -2.2s;
	}
	&:nth-child(13) {
		top: 22%;
		left: 20%;
		animation-delay: -1.5s;
	}
	&:nth-child(14) {
		top: 66%;
		left: 94%;
		animation-delay: -0.6s;
	}
}

.splash-preview__nebula {
	position: absolute;
	z-index: 2;
	border-radius: 50%;
	filter: blur(18px);
	mix-blend-mode: screen;
	opacity: calc(0.55 * var(--splash-nebula-intensity, 1));
	animation: preview-nebula calc(14s / var(--splash-speed)) ease-in-out infinite alternate;
}

.splash-preview__nebula--gold {
	top: 6%;
	left: 18%;
	width: 8rem;
	height: 8rem;
	background: radial-gradient(
		circle at center,
		rgba(255, 232, 102, 0.9) 0%,
		rgba(252, 192, 0, 0.5) 35%,
		transparent 75%
	);
}

.splash-preview__nebula--magenta {
	right: 14%;
	bottom: 4%;
	width: 9rem;
	height: 9rem;
	background: radial-gradient(
		circle at center,
		rgba(255, 46, 139, 0.9) 0%,
		rgba(252, 0, 96, 0.55) 35%,
		transparent 75%
	);
	animation-direction: alternate-reverse;
}

.splash-preview__grid {
	position: absolute;
	bottom: -30%;
	left: 50%;
	z-index: 3;
	width: 150%;
	height: 60%;
	background-image:
		linear-gradient(to right, rgba(252, 192, 0, 0.22) 1px, transparent 1px),
		linear-gradient(to bottom, rgba(252, 0, 96, 0.28) 1px, transparent 1px);
	background-size: 24px 24px;
	mask-image: linear-gradient(to top, #000 0%, transparent 80%);
	-webkit-mask-image: linear-gradient(to top, #000 0%, transparent 80%);
	opacity: calc(0.55 * var(--splash-grid-intensity, 1));
	transform: translateX(-50%) perspective(260px) rotateX(68deg);
	transform-origin: center top;
}

.splash-preview__center {
	position: absolute;
	inset: 0;
	z-index: 4;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 0.7rem;
}

.splash-preview__halo {
	position: absolute;
	width: 11rem;
	height: 11rem;
	border-radius: 50%;
	background: radial-gradient(
		circle at center,
		rgba(255, 232, 102, 0.5) 0%,
		rgba(252, 192, 0, 0.32) 25%,
		transparent 70%
	);
	filter: blur(12px);
}

.splash-preview__logo-stage {
	position: relative;
	display: flex;
	justify-content: center;
	width: min(11rem, 52%);
}

.splash-preview__logo {
	position: relative;
	width: 100%;
	filter: drop-shadow(0 0 calc(12px * var(--splash-logo-glow, 1)) rgba(252, 192, 0, 0.55))
		drop-shadow(0 0 calc(24px * var(--splash-logo-glow, 1)) rgba(252, 0, 96, 0.4));
}

.splash-preview[data-splash-logo='none'] .splash-preview__logo-stage {
	animation: none;
}

.splash-preview[data-splash-logo='float'] .splash-preview__logo-stage {
	animation: preview-float calc(6.5s / var(--splash-speed)) ease-in-out infinite;
}

.splash-preview[data-splash-logo='breathe'] .splash-preview__logo-stage {
	animation: preview-breathe calc(5s / var(--splash-speed)) ease-in-out infinite;
}

.splash-preview[data-splash-logo='pulse'] .splash-preview__logo-stage {
	animation: preview-pulse calc(3.6s / var(--splash-speed)) ease-in-out infinite;
}

.splash-preview[data-splash-logo='tilt'] .splash-preview__logo-stage {
	animation: preview-tilt calc(8s / var(--splash-speed)) ease-in-out infinite;
}

.splash-preview[data-splash-logo='shimmer'] .splash-preview__logo-stage {
	animation: preview-float calc(7s / var(--splash-speed)) ease-in-out infinite;
}

.splash-preview__indicator {
	position: relative;
	display: flex;
	width: min(11rem, 60%);
	min-height: 0.7rem;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 0.35rem;
}

.splash-preview__status {
	color: rgba(255, 220, 160, 0.85);
	font-size: 0.42rem;
	letter-spacing: 0.14em;
	text-transform: uppercase;
	text-shadow: 0 0 6px rgba(252, 0, 96, 0.5);
	white-space: nowrap;
}

.splash-preview__track,
.splash-preview__minimal {
	position: relative;
	width: 100%;
	height: 0.45rem;
	overflow: hidden;
	border-radius: 999px;
}

.splash-preview__track {
	border: 1px solid rgba(252, 192, 0, 0.45);
	background: rgba(72, 0, 16, 0.6);
}

.splash-preview__minimal {
	height: 2px;
	background: rgba(255, 255, 255, 0.16);
}

.splash-preview__fill {
	height: 100%;
	transform: scaleX(0);
	transform-origin: left;
	border-radius: 999px;
	background: linear-gradient(
		90deg,
		var(--mk-gold-2) 0%,
		var(--mk-orange-1) 45%,
		var(--mk-magenta-2) 100%
	);
}

.splash-preview__segments,
.splash-preview__dots {
	display: flex;
	width: 100%;
	align-items: center;
	justify-content: space-between;
	gap: 0.15rem;
}

.splash-preview__segment {
	height: 0.45rem;
	flex: 1 1 0;
	border: 1px solid rgba(252, 192, 0, 0.4);
	border-radius: 1px;
	background: rgba(72, 0, 16, 0.6);

	&.is-filled {
		background: linear-gradient(180deg, #ffe866, var(--mk-orange-1) 60%, var(--mk-magenta-2));
		box-shadow: 0 0 6px rgba(252, 192, 0, 0.7);
	}
}

.splash-preview__dot {
	width: 0.45rem;
	height: 0.45rem;
	flex: 0 0 auto;
	border-radius: 50%;
	background: rgba(72, 0, 16, 0.75);
	box-shadow: inset 0 0 0 1px rgba(252, 192, 0, 0.4);

	&.is-filled {
		background: radial-gradient(circle at 35% 30%, #fff, var(--mk-gold-2) 45%, var(--mk-magenta-2));
		box-shadow: 0 0 8px rgba(252, 192, 0, 0.8);
	}
}

.splash-preview__ring {
	position: relative;
	display: grid;
	width: 2.6rem;
	height: 2.6rem;
	place-items: center;
}

.splash-preview__dial {
	position: absolute;
	inset: 0;
	border-radius: 50%;
	background: conic-gradient(
		from -90deg,
		var(--mk-gold-2) 0%,
		var(--mk-orange-1) 45%,
		var(--mk-magenta-2) calc(var(--ring-progress, 0) * 100%),
		rgba(72, 0, 16, 0.65) calc(var(--ring-progress, 0) * 100%)
	);
	mask: radial-gradient(circle, transparent 0 57%, #000 59%);
	-webkit-mask: radial-gradient(circle, transparent 0 57%, #000 59%);
}

.splash-preview__ring-value {
	position: relative;
	color: #ffe3ac;
	font-size: 0.6rem;
	font-weight: 800;
	font-variant-numeric: tabular-nums;
}

@keyframes preview-twinkle {
	0%,
	100% {
		opacity: 0.35;
		transform: scale(0.8);
	}
	50% {
		opacity: 1;
		transform: scale(1.2);
	}
}

@keyframes preview-nebula {
	0% {
		transform: translate(0, 0) scale(1);
	}
	100% {
		transform: translate(0.6rem, -0.4rem) scale(1.14);
	}
}

@keyframes preview-float {
	0%,
	100% {
		transform: translateY(0);
	}
	50% {
		transform: translateY(calc(-4px * var(--splash-logo-intensity, 1)));
	}
}

@keyframes preview-breathe {
	0%,
	100% {
		transform: scale(1);
	}
	50% {
		transform: scale(calc(1 + 0.06 * var(--splash-logo-intensity, 1)));
	}
}

@keyframes preview-pulse {
	0%,
	100% {
		opacity: 0.75;
		transform: scale(1);
	}
	50% {
		opacity: 1;
		transform: scale(calc(1 + 0.035 * var(--splash-logo-intensity, 1)));
	}
}

@keyframes preview-tilt {
	0%,
	100% {
		transform: perspective(600px) rotateX(6deg) rotateY(-8deg);
	}
	50% {
		transform: perspective(600px) rotateX(-5deg) rotateY(9deg)
			translateY(calc(-3px * var(--splash-logo-intensity, 1)));
	}
}

@media (prefers-reduced-motion: reduce) {
	.splash-preview *,
	.splash-preview *::before,
	.splash-preview *::after {
		animation-duration: 0.01ms !important;
		animation-iteration-count: 1 !important;
		transition-duration: 0.01ms !important;
	}
}
</style>
