<template>
	<Transition name="splash-fade" @after-leave="onAfterLeave">
		<div
			v-if="!doneLoading"
			class="splash-screen"
			:data-splash-progress="splash.progressStyle"
			:data-splash-logo="splash.logoAnimation"
			@click="skipPreview"
		>
			<div class="galaxy-bg" data-tauri-drag-region></div>
			<canvas ref="starsCanvas" class="stars-canvas" aria-hidden="true"></canvas>
			<div class="nebula-layer" aria-hidden="true">
				<div class="nebula nebula--gold"></div>
				<div class="nebula nebula--magenta"></div>
				<div class="nebula nebula--core"></div>
			</div>
			<SplashBackgroundParticles :effect="backgroundEffect" />
			<div v-if="splash.gridFloor" class="grid-floor" aria-hidden="true"></div>
			<div class="app-logo-wrapper" data-tauri-drag-region>
				<div class="logo-halo" aria-hidden="true"></div>
				<div class="logo-stage">
					<div class="logo-trail logo-trail--gold" aria-hidden="true"></div>
					<div class="logo-trail logo-trail--pink" aria-hidden="true"></div>
					<img class="app-logo" :src="MinekubeLogo" alt="Minekube Launcher" draggable="false" />
				</div>
				<div class="loading-wrap">
					<div v-if="splash.progressStyle === 'bar'" class="loading-track">
						<div
							class="loading-fill"
							:style="{ transform: `scaleX(${Math.max(0, Math.min(loadingProgress, 100)) / 100})` }"
						></div>
					</div>

					<div v-else-if="splash.progressStyle === 'segments'" class="loading-segments">
						<span
							v-for="segment in SPLASH_SEGMENT_COUNT"
							:key="segment"
							class="loading-segment"
							:class="{ 'is-filled': loadingProgress >= (segment / SPLASH_SEGMENT_COUNT) * 100 }"
						></span>
					</div>

					<div v-else-if="splash.progressStyle === 'ring'" class="loading-ring">
						<div
							class="loading-ring__dial"
							:style="{ '--ring-progress': Math.max(0, Math.min(loadingProgress, 100)) / 100 }"
						></div>
						<span class="loading-ring__value">{{ Math.round(loadingProgress) }}%</span>
					</div>

					<div v-else-if="splash.progressStyle === 'dots'" class="loading-dots">
						<span
							v-for="dot in SPLASH_SEGMENT_COUNT"
							:key="dot"
							class="loading-dot"
							:class="{ 'is-filled': loadingProgress >= (dot / SPLASH_SEGMENT_COUNT) * 100 }"
						></span>
					</div>

					<div v-else class="loading-minimal">
						<div
							class="loading-minimal__fill"
							:style="{ transform: `scaleX(${Math.max(0, Math.min(loadingProgress, 100)) / 100})` }"
						></div>
					</div>

					<span v-if="message && splash.showLoadingMessage" class="loading-msg">{{ message }}</span>
				</div>
			</div>
			<div class="vignette" aria-hidden="true"></div>
		</div>
	</Transition>
</template>

<script setup lang="ts">
import { MinekubeLauncherLogo as MinekubeLogo } from '@modrinth/assets'
import { injectLoadingState, type LoadingStateProvider } from '@modrinth/ui'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import SplashBackgroundParticles from '@/components/ui/splash/SplashBackgroundParticles.vue'
import { useAppEvent } from '@/composables/use-app-event'
import { SPLASH_SEGMENT_COUNT, useSplashScreen } from '@/composables/use-splash-screen.ts'
import { type EffectStyle, effectStyle, useVisualSettings } from '@/composables/use-visual.ts'
import { debugStartup } from '@/helpers/startup-debug'

const props = withDefaults(defineProps<{ preview?: boolean }>(), { preview: false })

const emit = defineEmits(['ready'])

const splash = useSplashScreen()
const { animationsEnabled } = useVisualSettings()

/**
 * The background particles follow the launcher-wide effect style, so the
 * loading screen and the rest of the app share one atmosphere.
 */
const backgroundEffect = computed<EffectStyle | 'none'>(() =>
	splash.backgroundEffects ? effectStyle.value : 'none',
)

const doneLoading = ref(false)
const loadingProgress = ref(0)
const message = ref()
const starsCanvas = ref<HTMLCanvasElement | null>(null)

const PREVIEW_DURATION_MS = 1500
const mountedAt = Date.now()
let progressFrame = 0
let dismissTimer: ReturnType<typeof setTimeout> | undefined
let previewFrame = 0
let previewStartedAt: number | undefined
let cleanupStars: (() => void) | undefined

function stopProgress() {
	cancelAnimationFrame(progressFrame)
	progressFrame = 0
}

function createPreviewLoadingState(): LoadingStateProvider {
	return {
		pending: ref(false),
		barEnabled: ref(false),
		begin: () => Symbol('preview'),
		end: () => {},
		beginManual: () => {},
		setEnabled: () => {},
	}
}

const loading = props.preview ? createPreviewLoadingState() : injectLoadingState()

onMounted(() => {
	debugStartup('Splash mounted')
	initStars()
	if (props.preview) {
		// Stand in for the real status text so the setting can be judged.
		if (splash.showLoadingMessage) message.value = 'Preparing your worlds…'
		startPreviewPlayback()
	}
})
onUnmounted(() => {
	stopProgress()
	clearTimeout(dismissTimer)
	cancelAnimationFrame(previewFrame)
	cleanupStars?.()
})

function onAfterLeave() {
	cleanupStars?.()
	debugStartup('Splash fade completed', { displayedMs: Date.now() - mountedAt })
	loading.setEnabled(true)
	emit('ready')
}

watch(
	[loading.barEnabled, loading.pending],
	([barEnabled, pending]) => {
		debugStartup('Splash loading state changed', { barEnabled, pending })
		clearTimeout(dismissTimer)
		stopProgress()
		if (barEnabled || doneLoading.value) return
		if (pending) {
			fakeLoadingIncrease()
			return
		}

		const elapsed = Date.now() - mountedAt
		const finishDelay =
			loadingProgress.value < 98 &&
			animationsEnabled.value &&
			!window.matchMedia('(prefers-reduced-motion: reduce)').matches
				? 180
				: 0
		const delay = Math.max(finishDelay, splash.minDisplayMs - elapsed)
		debugStartup('Splash dismissal scheduled', { delayMs: delay, displayedMs: elapsed })

		loadingProgress.value = 100
		dismissTimer = setTimeout(() => {
			if (loading.pending.value) {
				debugStartup('Splash dismissal deferred: new loading work')
				return
			}
			doneLoading.value = true
			debugStartup('Splash fade started', { displayedMs: Date.now() - mountedAt })
		}, delay)
	},
	{ immediate: !props.preview },
)

function startPreviewPlayback() {
	const ramp = (timestamp: number) => {
		if (doneLoading.value) return
		previewStartedAt ??= timestamp
		const t = Math.min(1, (timestamp - previewStartedAt) / PREVIEW_DURATION_MS)
		loadingProgress.value = (1 - (1 - t) ** 3) * 100
		if (t < 1) {
			previewFrame = requestAnimationFrame(ramp)
			return
		}
		doneLoading.value = true
	}
	previewFrame = requestAnimationFrame(ramp)
}

function skipPreview() {
	if (!props.preview || doneLoading.value) return
	cancelAnimationFrame(previewFrame)
	loadingProgress.value = 100
	doneLoading.value = true
}

function onPreviewKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape') skipPreview()
}

if (props.preview) {
	window.addEventListener('keydown', onPreviewKeydown)
	onUnmounted(() => window.removeEventListener('keydown', onPreviewKeydown))
}

function fakeLoadingIncrease() {
	if (!animationsEnabled.value || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		loadingProgress.value = Math.max(loadingProgress.value, 90)
		return
	}

	const from = loadingProgress.value
	let startedAt: number | undefined
	const frame = (now: number) => {
		if (doneLoading.value || !loading.pending.value) return
		startedAt ??= now
		const fraction = Math.min(1, (now - startedAt) / 4200)
		loadingProgress.value = Math.max(
			loadingProgress.value,
			from + (94 - from) * (1 - (1 - fraction) ** 2),
		)
		if (fraction < 1) progressFrame = requestAnimationFrame(frame)
	}
	progressFrame = requestAnimationFrame(frame)
}

useAppEvent('loading', (e) => {
	if (e.event.type === 'directory_move' && !doneLoading.value) {
		stopProgress()
		loadingProgress.value = 100 * (e.fraction ?? 1)
		message.value = 'Updating app directory...'
	}
})

const PALETTE = ['#FFE866', '#FCC000', '#FF8A2A', '#FF5A1F', '#FF2E8B', '#FC0060', '#FFFFFF']
type Star = { x: number; y: number; z: number; r: number; sprite: number; tw: number; sp: number }
let rafRef = 0
let stars: Star[] = []
let starSprites: HTMLCanvasElement[] = []

/**
 * Every star is drawn from a pre-rendered sprite. Building a radial gradient
 * per star and per frame is what made the old star field stutter, so the
 * gradients are baked once and reused.
 */
function buildStarSprites(): HTMLCanvasElement[] {
	return PALETTE.map((color) => {
		const size = 48
		const sprite = document.createElement('canvas')
		sprite.width = size
		sprite.height = size
		const ctx = sprite.getContext('2d')
		if (!ctx) return sprite
		const center = size / 2
		const glow = ctx.createRadialGradient(center, center, 0, center, center, center)
		glow.addColorStop(0, hexA(color, 1))
		glow.addColorStop(0.24, hexA(color, 0.45))
		glow.addColorStop(1, hexA(color, 0))
		ctx.fillStyle = glow
		ctx.fillRect(0, 0, size, size)
		ctx.fillStyle = hexA('#ffffff', 0.85)
		ctx.beginPath()
		ctx.arc(center, center, size * 0.08, 0, Math.PI * 2)
		ctx.fill()
		return sprite
	})
}

function initStars() {
	const element = starsCanvas.value
	if (!element) return
	const canvas: HTMLCanvasElement = element
	const context = canvas.getContext('2d')
	if (!context) return
	const ctx: CanvasRenderingContext2D = context
	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
	const density = Math.max(0, splash.starDensity) / 100
	if (density === 0) {
		canvas.style.display = 'none'
		return
	}
	const speed = Math.max(0, splash.starSpeed) / 100
	function resize() {
		const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
		canvas.width = window.innerWidth * dpr
		canvas.height = window.innerHeight * dpr
		canvas.style.width = window.innerWidth + 'px'
		canvas.style.height = window.innerHeight + 'px'
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
	}
	resize()

	starSprites = buildStarSprites()
	const count = Math.round(
		Math.min(90, Math.floor((window.innerWidth * window.innerHeight) / 11000)) * density,
	)
	stars = []
	for (let i = 0; i < count; i++) {
		stars.push({
			x: Math.random() * window.innerWidth,
			y: Math.random() * window.innerHeight,
			z: Math.random(),
			r: Math.random() * 1.6 + 0.3,
			sprite: Math.floor(Math.random() * starSprites.length),
			tw: Math.random() * Math.PI * 2,
			sp: Math.random() * 0.03 + 0.005,
		})
	}

	let lastFrame = 0
	function frame(now: number) {
		const delta = lastFrame ? Math.min((now - lastFrame) / 16.667, 3) : 1
		lastFrame = now
		const w = window.innerWidth,
			h = window.innerHeight
		ctx.clearRect(0, 0, w, h)
		ctx.globalCompositeOperation = 'lighter'
		for (const s of stars) {
			s.tw += reducedMotion.matches ? 0 : s.sp * delta * speed
			s.y += reducedMotion.matches ? 0 : (0.05 + s.z * 0.25) * delta * speed
			if (s.y > h + 4) {
				s.y = -4
				s.x = Math.random() * w
			}
			const alpha = (0.3 + 0.7 * Math.abs(Math.sin(s.tw))) * (0.35 + s.z * 0.65)
			const rr = s.r * (0.6 + s.z * 0.9)
			const sprite = starSprites[s.sprite]
			if (!sprite) continue
			const size = rr * 8
			ctx.globalAlpha = alpha
			ctx.drawImage(sprite, s.x - size / 2, s.y - size / 2, size, size)
		}
		ctx.globalAlpha = 1
		ctx.globalCompositeOperation = 'source-over'
		if (!reducedMotion.matches && animationsEnabled.value && speed > 0 && !document.hidden) {
			rafRef = requestAnimationFrame(frame)
		}
	}
	function restart() {
		cancelAnimationFrame(rafRef)
		lastFrame = 0
		if (!document.hidden) frame(performance.now())
	}
	function handleResize() {
		resize()
		restart()
	}
	window.addEventListener('resize', handleResize)
	document.addEventListener('visibilitychange', restart)
	reducedMotion.addEventListener('change', restart)
	const stopWatchingAnimations = watch(animationsEnabled, restart)
	cleanupStars = () => {
		stopWatchingAnimations()
		cancelAnimationFrame(rafRef)
		window.removeEventListener('resize', handleResize)
		document.removeEventListener('visibilitychange', restart)
		reducedMotion.removeEventListener('change', restart)
	}
	restart()
}

function hexA(hex: string, a: number) {
	const h = hex.replace('#', '')
	const n = parseInt(
		h.length === 3
			? h
					.split('')
					.map((c) => c + c)
					.join('')
			: h,
		16,
	)
	return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}
</script>

<style scoped lang="scss">
.splash-screen {
	// Loading-screen palette, also used by the launch overlay.
	--mk-gold-1: #ffe866;
	--mk-gold-2: #fcc000;
	--mk-orange-1: #ff8a2a;
	--mk-orange-2: #ff5a1f;
	--mk-magenta-1: #ff2e8b;
	--mk-magenta-2: #fc0060;
	--splash-fade: var(--splash-fade-duration, 700ms);

	position: fixed;
	inset: 0;
	z-index: 10000;
	overflow: hidden;
	background: #06000a; /* deep space */
	color: #fff;
	font-family: var(--font-standard, sans-serif);
}

.splash-fade-leave-active {
	// Opacity plus a whisper of scale: the splash eases towards the viewer as
	// it dissolves, so the app underneath settles in instead of just appearing.
	transform-origin: center;
	will-change: opacity, transform;
	transition:
		opacity var(--splash-fade) cubic-bezier(0.22, 1, 0.36, 1),
		transform var(--splash-fade) cubic-bezier(0.22, 1, 0.36, 1);
}
.splash-fade-leave-to {
	opacity: 0;
	transform: scale(1.02);
}

@media (prefers-reduced-motion: reduce) {
	.splash-fade-leave-active {
		transform: none;
		transition: opacity var(--splash-fade) linear;
	}

	.splash-fade-leave-to {
		transform: none;
	}
}

.galaxy-bg {
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

.stars-canvas {
	position: absolute;
	inset: 0;
	z-index: 1;
	pointer-events: none;
}

.nebula-layer {
	position: absolute;
	inset: -20%;
	z-index: 2;
	pointer-events: none;
	mix-blend-mode: screen;
}
.nebula {
	position: absolute;
	border-radius: 50%;
	filter: blur(70px);
	opacity: calc(0.55 * var(--splash-nebula-intensity, 1));
	will-change: transform;
}
.nebula--gold {
	top: 20%;
	left: 30%;
	width: 50vmin;
	height: 50vmin;
	background: radial-gradient(
		circle at center,
		rgba(255, 232, 102, 0.9) 0%,
		rgba(252, 192, 0, 0.5) 35%,
		rgba(252, 156, 0, 0.15) 60%,
		transparent 75%
	);
	animation: nebula-drift calc(18s / var(--splash-animation-speed, 1)) ease-in-out infinite
		alternate;
}
.nebula--magenta {
	bottom: 15%;
	right: 22%;
	width: 55vmin;
	height: 55vmin;
	background: radial-gradient(
		circle at center,
		rgba(255, 46, 139, 0.9) 0%,
		rgba(252, 0, 96, 0.55) 35%,
		rgba(120, 0, 60, 0.18) 60%,
		transparent 75%
	);
	animation: nebula-drift calc(22s / var(--splash-animation-speed, 1)) ease-in-out infinite
		alternate-reverse;
}
.nebula--core {
	top: 42%;
	left: 42%;
	width: 36vmin;
	height: 36vmin;
	background: radial-gradient(
		circle at center,
		rgba(255, 255, 255, 0.35) 0%,
		rgba(252, 192, 0, 0.4) 25%,
		rgba(252, 0, 96, 0.25) 55%,
		transparent 75%
	);
	animation: core-pulse calc(4.5s / var(--splash-animation-speed, 1)) ease-in-out infinite;
	filter: blur(50px);
	opacity: calc(0.8 * var(--splash-nebula-intensity, 1));
}

@keyframes nebula-drift {
	0% {
		transform: translate(0, 0) scale(1) rotate(0deg);
	}
	100% {
		transform: translate(6vmin, -4vmin) scale(1.15) rotate(8deg);
	}
}
@keyframes core-pulse {
	0%,
	100% {
		opacity: 0.55;
		transform: scale(1);
	}
	50% {
		opacity: 0.9;
		transform: scale(1.12);
	}
}

.grid-floor {
	position: absolute;
	left: 50%;
	bottom: -10%;
	width: 260vw;
	height: 55vh;
	z-index: 3;
	transform: translateX(-50%) perspective(700px) rotateX(68deg);
	transform-origin: center top;
	mask-image: linear-gradient(to top, black 0%, transparent 80%);
	-webkit-mask-image: linear-gradient(to top, black 0%, transparent 80%);
	background-image:
		linear-gradient(to right, rgba(252, 192, 0, 0.22) 1px, transparent 1px),
		linear-gradient(to bottom, rgba(252, 0, 96, 0.28) 1px, transparent 1px);
	background-size:
		60px 60px,
		60px 60px;
	background-position: center center;

	opacity: calc(0.55 * var(--splash-grid-intensity, 1));
}

.app-logo-wrapper {
	position: absolute;
	inset: 0;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	gap: 1.25rem;
	z-index: 10;
	animation: splash-contents-enter 340ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes splash-contents-enter {
	from {
		opacity: 0;
		transform: translate3d(0, 9px, 0);
	}
	to {
		opacity: 1;
		transform: translate3d(0, 0, 0);
	}
}

.logo-halo {
	position: absolute;
	width: 42vmin;
	height: 42vmin;
	max-width: 520px;
	max-height: 520px;
	border-radius: 50%;
	background: radial-gradient(
		circle at center,
		rgba(255, 232, 102, 0.55) 0%,
		rgba(252, 192, 0, 0.35) 25%,
		rgba(252, 0, 96, 0.25) 50%,
		transparent 70%
	);
	filter: blur(28px);
	animation: none;
	opacity: var(--splash-logo-glow, 1);
	z-index: 0;
}
.logo-stage {
	position: relative;
	width: min(calc(44rem * var(--splash-logo-scale, 1)), calc(78vw * var(--splash-logo-scale, 1)));
}

// The wordmark animation is picked in Settings → Visual → Advanced animations.
// Every preset only moves opacity/transform so the logo never has to be
// re-rasterised while it plays.
.splash-screen[data-splash-logo='none'] .logo-stage {
	animation: none;
}

.splash-screen[data-splash-logo='float'] .logo-stage {
	animation: logo-float calc(6.5s / var(--splash-animation-speed, 1)) ease-in-out infinite;
}

.splash-screen[data-splash-logo='breathe'] .logo-stage {
	animation: logo-breathe calc(5s / var(--splash-animation-speed, 1)) ease-in-out infinite;
}

.splash-screen[data-splash-logo='pulse'] .logo-stage {
	animation: logo-pulse calc(3.6s / var(--splash-animation-speed, 1)) ease-in-out infinite;
}

.splash-screen[data-splash-logo='tilt'] .logo-stage {
	animation: logo-tilt calc(8s / var(--splash-animation-speed, 1)) ease-in-out infinite;
}

.splash-screen[data-splash-logo='shimmer'] .logo-stage {
	animation: logo-shimmer calc(7s / var(--splash-animation-speed, 1)) ease-in-out infinite;
}

.logo-stage::after {
	position: absolute;
	inset: 12% -25%;
	z-index: 3;
	content: '';
	background: linear-gradient(
		105deg,
		transparent 42%,
		rgba(255, 255, 255, 0.32) 50%,
		transparent 58%
	);
	mix-blend-mode: screen;
	opacity: 0;
	pointer-events: none;
}

.splash-screen[data-splash-logo='shimmer'] .logo-stage::after {
	animation: logo-shimmer-sweep calc(7s / var(--splash-animation-speed, 1)) ease-in-out infinite;
}

.logo-trail {
	position: absolute;
	inset: 15% -6%;
	border-radius: 50%;
	border: 1px solid rgba(255, 207, 84, 0.3);
	transform: rotate(-9deg);
	pointer-events: none;
}

.logo-trail--pink {
	inset: 0 -3%;
	transform: rotate(8deg);
	border-color: rgba(255, 46, 139, 0.25);
}

.app-logo {
	position: relative;
	z-index: 2;
	display: block;
	width: 100%;
	height: auto;
	max-height: calc(30vh * var(--splash-logo-scale, 1));
	object-fit: contain;
	filter: drop-shadow(0 0 calc(24px * var(--splash-logo-glow, 1)) rgba(252, 192, 0, 0.55))
		drop-shadow(0 0 calc(48px * var(--splash-logo-glow, 1)) rgba(252, 0, 96, 0.45))
		drop-shadow(0 12px 28px rgba(0, 0, 0, 0.6));
	animation: none;
}
@keyframes logo-float {
	0%,
	100% {
		transform: translateY(0);
	}
	50% {
		transform: translateY(calc(-9px * var(--splash-logo-intensity, 1)));
	}
}
@keyframes logo-breathe {
	0%,
	100% {
		transform: scale(1);
	}
	50% {
		transform: scale(calc(1 + 0.045 * var(--splash-logo-intensity, 1)));
	}
}
@keyframes logo-pulse {
	0%,
	100% {
		opacity: 0.88;
		transform: scale(1);
	}
	50% {
		opacity: 1;
		transform: scale(calc(1 + 0.022 * var(--splash-logo-intensity, 1)));
	}
}
@keyframes logo-tilt {
	0%,
	100% {
		transform: perspective(1100px) rotateX(5deg) rotateY(-7deg) translateY(0);
	}
	50% {
		transform: perspective(1100px) rotateX(-4deg) rotateY(8deg)
			translateY(calc(-7px * var(--splash-logo-intensity, 1)));
	}
}
@keyframes logo-shimmer {
	0%,
	100% {
		transform: translateY(0);
	}
	50% {
		transform: translateY(calc(-5px * var(--splash-logo-intensity, 1)));
	}
}
@keyframes logo-shimmer-sweep {
	0%,
	55% {
		opacity: 0;
		transform: translateX(-70%);
	}
	65% {
		opacity: 1;
	}
	85%,
	100% {
		opacity: 0;
		transform: translateX(70%);
	}
}

.loading-wrap {
	position: relative;
	z-index: 2;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.5rem;
	width: min(22rem, 72vw);
	margin-top: 0.5rem;
}
.loading-track {
	position: relative;
	width: var(--splash-progress-width, 100%);
	height: var(--splash-progress-height, 9px);
	background: rgba(72, 0, 16, 0.6);
	border: 1px solid rgba(252, 192, 0, 0.45);
	border-radius: 999px;
	overflow: hidden;
	box-shadow:
		0 0 18px rgba(252, 0, 96, 0.35),
		inset 0 1px 2px rgba(0, 0, 0, 0.6);
}
.loading-fill {
	position: absolute;
	inset: 0;
	transform: scaleX(0);
	transform-origin: left;
	background: linear-gradient(
		90deg,
		var(--mk-gold-2) 0%,
		var(--mk-orange-1) 45%,
		var(--mk-magenta-2) 100%
	);
	border-radius: 999px;
	transition: transform calc(0.28s / var(--splash-animation-speed, 1)) linear;
	box-shadow: 0 0 12px rgba(252, 192, 0, 0.8);
}
.loading-segments,
.loading-dots {
	display: flex;
	width: var(--splash-progress-width, 100%);
	align-items: center;
	justify-content: space-between;
	gap: 0.3rem;
}

.loading-segment {
	height: var(--splash-progress-height, 9px);
	flex: 1 1 0;
	border: 1px solid rgba(252, 192, 0, 0.4);
	border-radius: 2px;
	background: rgba(72, 0, 16, 0.6);
	box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.6);
	transition:
		background-color calc(0.25s / var(--splash-animation-speed, 1)) ease,
		box-shadow calc(0.25s / var(--splash-animation-speed, 1)) ease;
}

.loading-segment.is-filled {
	background: linear-gradient(
		180deg,
		var(--mk-gold-1),
		var(--mk-orange-1) 60%,
		var(--mk-magenta-2)
	);
	box-shadow: 0 0 10px rgba(252, 192, 0, 0.7);
}

.loading-dot {
	width: var(--splash-progress-height, 9px);
	height: var(--splash-progress-height, 9px);
	flex: 0 0 auto;
	border-radius: 50%;
	background: rgba(72, 0, 16, 0.75);
	box-shadow: inset 0 0 0 1px rgba(252, 192, 0, 0.4);
	transition:
		background-color calc(0.25s / var(--splash-animation-speed, 1)) ease,
		box-shadow calc(0.25s / var(--splash-animation-speed, 1)) ease,
		transform calc(0.25s / var(--splash-animation-speed, 1)) ease;
}

.loading-dot.is-filled {
	background: radial-gradient(circle at 35% 30%, #fff, var(--mk-gold-2) 45%, var(--mk-magenta-2));
	box-shadow: 0 0 12px rgba(252, 192, 0, 0.8);
	transform: scale(1.15);
}

.loading-ring {
	position: relative;
	display: grid;
	width: 4.4rem;
	height: 4.4rem;
	place-items: center;
}

.loading-ring__dial {
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
	filter: drop-shadow(0 0 12px rgba(252, 0, 96, 0.45));
	transition: background calc(0.3s / var(--splash-animation-speed, 1)) linear;
}

.loading-ring__value {
	position: relative;
	color: #ffe3ac;
	font-size: 0.72rem;
	font-weight: 800;
	font-variant-numeric: tabular-nums;
	letter-spacing: 0.02em;
	text-shadow: 0 0 10px rgba(252, 0, 96, 0.5);
}

.loading-minimal {
	width: var(--splash-progress-width, 100%);
	height: max(2px, calc(var(--splash-progress-height, 9px) / 4));
	overflow: hidden;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.14);
}

.loading-minimal__fill {
	height: 100%;
	transform: scaleX(0);
	transform-origin: left;
	background: linear-gradient(90deg, var(--mk-gold-2), var(--mk-magenta-2));
	transition: transform calc(0.28s / var(--splash-animation-speed, 1)) linear;
}

.loading-msg {
	font-size: 0.78rem;
	letter-spacing: 0.18em;
	text-transform: uppercase;
	color: rgba(255, 220, 160, 0.85);
	text-shadow: 0 0 10px rgba(252, 0, 96, 0.5);
}

.vignette {
	position: absolute;
	inset: 0;
	z-index: 9;
	pointer-events: none;
	background: radial-gradient(ellipse at center, transparent 50%, rgba(0, 0, 0, 0.75) 100%);
}

@media (prefers-reduced-motion: reduce) {
	*,
	*::before,
	*::after {
		animation-duration: 0.01ms !important;
		animation-iteration-count: 1 !important;
		transition-duration: 0.2s !important;
	}
}
</style>
