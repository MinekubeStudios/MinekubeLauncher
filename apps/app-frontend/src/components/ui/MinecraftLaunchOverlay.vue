<script setup lang="ts">
import { defineMessages, useVIntl } from '@modrinth/ui'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import minekubeIcon from '@/assets/welcome/minekube-icon.png'
import {
	getLaunchOverlayState,
	hideLaunchOverlay,
	type LaunchOverlayDismissReason,
	type LaunchOverlayPhase,
	subscribeLaunchOverlayState,
} from '@/helpers/launch-overlay-state'

const { formatMessage } = useVIntl()

/**
 * Everything the overlay says is translatable; the uppercase look is CSS
 * (`text-transform`), so the strings themselves stay in sentence case and
 * screen readers read them normally. The HUD labels in the corners are
 * decoration and are hidden from assistive technology instead.
 */
const messages = defineMessages({
	aria: {
		id: 'app.launch-overlay.aria',
		defaultMessage: 'Minecraft is starting',
	},
	starting: {
		id: 'app.launch-overlay.starting',
		defaultMessage: 'Starting Minecraft',
	},
	hint: {
		id: 'app.launch-overlay.hint',
		defaultMessage: 'Keep the launcher open until the game starts',
	},
	status: {
		id: 'app.launch-overlay.status',
		defaultMessage: '{stage} — {percent}% complete',
	},
	stagePreparing: {
		id: 'app.launch-overlay.stage.preparing',
		defaultMessage: 'Preparing',
	},
	stageLoading: {
		id: 'app.launch-overlay.stage.loading',
		defaultMessage: 'Loading',
	},
	stageAssembling: {
		id: 'app.launch-overlay.stage.assembling',
		defaultMessage: 'Assembling',
	},
	stageLaunching: {
		id: 'app.launch-overlay.stage.launching',
		defaultMessage: 'Launching',
	},
	tipEnvironment: {
		id: 'app.launch-overlay.tip.environment',
		defaultMessage: 'Preparing environment…',
	},
	tipJvm: {
		id: 'app.launch-overlay.tip.jvm',
		defaultMessage: 'Booting the JVM…',
	},
	tipAccount: {
		id: 'app.launch-overlay.tip.account',
		defaultMessage: 'Signing in to Minecraft…',
	},
	tipMods: {
		id: 'app.launch-overlay.tip.mods',
		defaultMessage: 'Loading mods…',
	},
	tipWorld: {
		id: 'app.launch-overlay.tip.world',
		defaultMessage: 'Preparing the world…',
	},
	tipWindow: {
		id: 'app.launch-overlay.tip.window',
		defaultMessage: 'Opening the game window…',
	},
	tipShaders: {
		id: 'app.launch-overlay.tip.shaders',
		defaultMessage: 'Configuring shaders…',
	},
	tipTerrain: {
		id: 'app.launch-overlay.tip.terrain',
		defaultMessage: 'Generating terrain…',
	},
	tipTextures: {
		id: 'app.launch-overlay.tip.textures',
		defaultMessage: 'Uploading textures…',
	},
	tipFinish: {
		id: 'app.launch-overlay.tip.finish',
		defaultMessage: 'Finishing start-up…',
	},
})

const tips = computed(() => [
	formatMessage(messages.tipEnvironment),
	formatMessage(messages.tipJvm),
	formatMessage(messages.tipAccount),
	formatMessage(messages.tipMods),
	formatMessage(messages.tipWorld),
	formatMessage(messages.tipWindow),
	formatMessage(messages.tipShaders),
	formatMessage(messages.tipTerrain),
	formatMessage(messages.tipTextures),
	formatMessage(messages.tipFinish),
])

/** Stage names for the little progress rail, one per quarter of the bar. */
const stages = computed(() => [
	formatMessage(messages.stagePreparing),
	formatMessage(messages.stageLoading),
	formatMessage(messages.stageAssembling),
	formatMessage(messages.stageLaunching),
])

const progress = ref(0)
const tipIndex = ref(0)
const instanceName = ref<string | null>(null)
const phase = ref<LaunchOverlayPhase>('preparing')
const dismissReason = ref<LaunchOverlayDismissReason>('game_started')
const visible = ref(false)
const entering = ref(false)
const leaving = ref(false)
const bursting = ref(false)
let burstTimer: ReturnType<typeof setTimeout> | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null

let rafId: number | null = null
let tipTimer: ReturnType<typeof setInterval> | null = null

function getTargetProgress(currentPhase: LaunchOverlayPhase): number {
	switch (currentPhase) {
		case 'preparing':
			return 28
		case 'jvm_booting':
			return 62
		case 'loading_game':
			return 92
		case 'window_ready':
			return 100
	}
}

function startProgress(): void {
	progress.value = 0
	let lastTime = performance.now()
	const step = (now: number) => {
		const dt = Math.min(100, Math.max(0, now - lastTime)) / 1000
		lastTime = now
		const target = getTargetProgress(phase.value)
		const diff = target - progress.value
		if (diff > 0.05) {
			const rate = phase.value === 'window_ready' ? 10 : phase.value === 'loading_game' ? 0.55 : 0.9
			progress.value = Math.min(target, progress.value + Math.max(diff * rate * dt, 0.4 * dt))
		}
		if (visible.value && !leaving.value) {
			rafId = requestAnimationFrame(step)
		}
	}
	rafId = requestAnimationFrame(step)
}

function stopProgress(): void {
	if (rafId !== null) {
		cancelAnimationFrame(rafId)
		rafId = null
	}
	progress.value = 100
}

function show(name: string | null): void {
	if (hideTimer) {
		clearTimeout(hideTimer)
		hideTimer = null
	}
	if (visible.value && !leaving.value) {
		instanceName.value = name
		return
	}
	instanceName.value = name
	phase.value = getLaunchOverlayState().phase
	dismissReason.value = 'game_started'
	visible.value = true
	entering.value = true
	leaving.value = false
	// The brand burst is a one-shot: it plays once per launch, then this
	// layer is removed so nothing keeps animating off screen.
	bursting.value = true
	if (burstTimer) clearTimeout(burstTimer)
	burstTimer = setTimeout(() => {
		bursting.value = false
	}, 1900)
	requestAnimationFrame(() => {
		entering.value = false
	})
	startProgress()
	tipIndex.value = 0
	if (tipTimer) clearInterval(tipTimer)
	tipTimer = setInterval(() => {
		tipIndex.value = (tipIndex.value + 1) % tips.value.length
	}, 1600)
}

function hide(reason: LaunchOverlayDismissReason = 'game_started'): void {
	if (!visible.value || leaving.value) return
	dismissReason.value = reason
	leaving.value = true
	if (tipTimer) {
		clearInterval(tipTimer)
		tipTimer = null
	}
	stopProgress()
	// Slow, smooth fade-out (~1.8s) when the actual Minecraft game window opens,
	// or a quick fade-out (~480ms) if dismissed manually with ESC or on crash.
	const fadeDurationMs = reason === 'game_started' ? 1800 : 480
	if (hideTimer) clearTimeout(hideTimer)
	hideTimer = setTimeout(() => {
		hideTimer = null
		visible.value = false
		leaving.value = false
		instanceName.value = null
		progress.value = 0
	}, fadeDurationMs)
}

function handleKeydown(event: KeyboardEvent): void {
	if (!visible.value || leaving.value) return
	if (event.key === 'Escape') {
		event.preventDefault()
		event.stopPropagation()
		hideLaunchOverlay('manual')
	}
}

const subtitle = computed(() => tips.value[tipIndex.value])

const stageLabel = computed(() => {
	const list = stages.value
	const index = Math.min(list.length - 1, Math.floor((progress.value / 100) * list.length))
	return list[index]
})

/**
 * The one thing a screen reader should announce, and rarely: the stage and
 * the progress in steps of 10 %. The bar itself redraws every frame, which
 * is far too often for a live region.
 */
const statusText = computed(() =>
	formatMessage(messages.status, {
		stage: stageLabel.value,
		percent: Math.round(progress.value / 10) * 10,
	}),
)

function syncFromState(): void {
	const s = getLaunchOverlayState()
	phase.value = s.phase
	if (s.phase === 'window_ready') {
		progress.value = 100
	}
	if (s.instanceName !== instanceName.value && s.visible) {
		instanceName.value = s.instanceName
	}
	if (s.visible && (!visible.value || leaving.value)) {
		show(s.instanceName)
	} else if (!s.visible && visible.value) {
		hide(s.dismissReason)
	}
}

let unsubscribe: (() => void) | null = null
onMounted(() => {
	window.addEventListener('keydown', handleKeydown, true)
	unsubscribe = subscribeLaunchOverlayState(syncFromState)
	syncFromState()
})

onBeforeUnmount(() => {
	window.removeEventListener('keydown', handleKeydown, true)
	unsubscribe?.()
	if (tipTimer) clearInterval(tipTimer)
	if (rafId !== null) cancelAnimationFrame(rafId)
	if (burstTimer) clearTimeout(burstTimer)
	if (hideTimer) clearTimeout(hideTimer)
})

watch(
	() => getLaunchOverlayState().instanceName,
	(name) => {
		instanceName.value = name
	},
)
</script>

<template>
	<Transition name="launch-fade">
		<div
			v-if="visible"
			class="launch-overlay"
			:class="{
				'is-entering': entering,
				'is-leaving': leaving,
				'is-slow-fade': dismissReason === 'game_started',
			}"
			role="region"
			aria-busy="true"
			:aria-label="formatMessage(messages.aria)"
		>
			<!-- One polite announcement; the visible bar updates every frame. -->
			<p class="mk-sr" role="status" aria-live="polite">{{ statusText }}</p>

			<!-- One-shot brand burst fired the moment the overlay appears -->
			<div v-if="bursting" class="mk-burst" aria-hidden="true">
				<span class="mk-burst-core" />
				<span class="mk-burst-ring mk-burst-ring--1" />
				<span class="mk-burst-ring mk-burst-ring--2" />
				<span class="mk-burst-ring mk-burst-ring--3" />
			</div>

			<!-- Deep maroon room with a gold and magenta haze breathing in it -->
			<div class="mk-haze mk-haze--gold" aria-hidden="true" />
			<div class="mk-haze mk-haze--magenta" aria-hidden="true" />

			<!-- Perspective grid floor — two layers, brand colours only -->
			<div class="mk-grid" aria-hidden="true" />
			<div class="mk-grid mk-grid--two" aria-hidden="true" />

			<!-- Floating pixel cubes (the Minecraft make of the Minekube mark) -->
			<span
				v-for="n in 8"
				:key="n"
				class="mk-particle"
				:class="`mk-particle--${n}`"
				aria-hidden="true"
			/>

			<!-- Orbit rings with brand-coloured arcs and travelling sparks -->
			<div class="mk-ring" aria-hidden="true">
				<span class="mk-ring-arc mk-ring-arc--gold" />
				<span class="mk-ring-arc mk-ring-arc--magenta" />
				<span class="mk-ring-arc mk-ring-arc--soft" />
				<span class="mk-orbit-dot mk-orbit-dot--gold" />
				<span class="mk-orbit-dot mk-orbit-dot--magenta" />
			</div>

			<div class="mk-core" aria-hidden="true" />

			<!-- Central content -->
			<div class="mk-content">
				<div class="mk-logo-stage">
					<img :src="minekubeIcon" alt="" class="mk-logo" width="96" height="96" />
					<span class="mk-logo-shadow" aria-hidden="true" />
				</div>

				<h1 class="mk-title">
					<span class="mk-title-word">MINEKUBE</span>
					<span class="mk-title-sep" aria-hidden="true">//</span>
					<span class="mk-title-launch">{{ formatMessage(messages.starting) }}</span>
				</h1>

				<p v-if="instanceName" class="mk-instance">
					<span class="mk-pill-dot" />
					{{ instanceName }}
				</p>

				<p :key="tipIndex" class="mk-subtitle">{{ subtitle }}</p>

				<div class="mk-progress">
					<div class="mk-progress-head">
						<span class="mk-progress-stage">{{ stageLabel }}</span>
						<span class="mk-progress-percent">{{ Math.round(progress) }}%</span>
					</div>
					<div
						class="mk-progress-track"
						role="progressbar"
						:aria-valuenow="Math.round(progress)"
						aria-valuemin="0"
						aria-valuemax="100"
					>
						<div class="mk-progress-fill" :style="{ width: `${progress}%` }" />
						<div class="mk-progress-shine" aria-hidden="true" />
						<div class="mk-progress-ticks" aria-hidden="true" />
					</div>
				</div>

				<div class="mk-hint">
					<button
						type="button"
						class="mk-hint-key cursor-pointer"
						@click="hideLaunchOverlay('manual')"
					>
						ESC
					</button>
					<span class="mk-hint-sep" aria-hidden="true">·</span>
					<span>{{ formatMessage(messages.hint) }}</span>
				</div>
			</div>

			<!-- Top / bottom brand rails: a thin lit edge that sweeps -->
			<div class="mk-rail mk-rail--top" aria-hidden="true" />
			<div class="mk-rail mk-rail--bottom" aria-hidden="true" />

			<div class="mk-vignette" aria-hidden="true" />
			<div class="mk-scanlines" aria-hidden="true" />

			<div class="mk-corner mk-corner--tl" aria-hidden="true">
				<span class="mk-corner-k">MINEKUBE</span>
				<span class="mk-corner-v">LAUNCH PROTOCOL</span>
			</div>
			<div class="mk-corner mk-corner--tr" aria-hidden="true">
				<span class="mk-corner-k">SECURE CHANNEL</span>
				<span class="mk-corner-v">AUTH · MODS · ASSETS</span>
			</div>
			<div class="mk-corner mk-corner--bl" aria-hidden="true">
				<span class="mk-corner-k">JAVA RUNTIME</span>
				<span class="mk-corner-v">BOOTING · ALLOCATING HEAP</span>
			</div>
			<div class="mk-corner mk-corner--br" aria-hidden="true">
				<span class="mk-corner-k">SYSTEM</span>
				<span class="mk-corner-v">{{ stageLabel }} · READY FOR PLAY</span>
			</div>
		</div>
	</Transition>
</template>

<style scoped lang="scss">
/*
 * Minekube Studios launch sequence.
 *
 * Palette (sampled from the logo, no foreign colours anywhere):
 *   gold #FFE866 / #FCC000 · orange #FF8A2A / #FF5A1F
 *   magenta #FF2E8B / #FC0060 · maroon #6B0018 / #3A0008 / #14010A
 *
 * Everything animates transform, opacity or filter, and the whole layer
 * holds still when the launcher's animations are switched off.
 */
.launch-overlay {
	--mk-gold-1: #ffe866;
	--mk-gold-2: #fcc000;
	--mk-orange-1: #ff8a2a;
	--mk-orange-2: #ff5a1f;
	--mk-magenta-1: #ff2e8b;
	--mk-magenta-2: #fc0060;
	--mk-maroon-mid: #6b0018;
	--mk-maroon-deep: #3a0008;
	--mk-ink: #1a0106;

	position: fixed;
	inset: 0;
	z-index: 20000;
	padding-top: env(safe-area-inset-top, 0);
	overflow: hidden;
	isolation: isolate;
	color: #fff6e8;
	font-family: var(--font-standard, sans-serif);
	background:
		radial-gradient(ellipse at 50% 42%, #26041100 0%, #1a0309 38%, #0d0104 68%, #000 100%),
		linear-gradient(180deg, #14010a 0%, #0a0104 55%, #000 100%);
}

/* Visually hidden, but announced: the stage and the progress in 10 % steps. */
.mk-sr {
	position: absolute;
	width: 1px;
	height: 1px;
	margin: -1px;
	padding: 0;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
	border: 0;
}

/* ------------------------------- Entry burst ------------------------------- */
.mk-burst {
	position: absolute;
	left: 50%;
	top: 42%;
	width: 0;
	height: 0;
	pointer-events: none;
	opacity: 0;
	animation: mk-burst-out 1.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.mk-burst-core,
.mk-burst-ring {
	position: absolute;
	left: 0;
	top: 0;
	transform: translate(-50%, -50%);
	border-radius: 50%;
}

.mk-burst-core {
	width: 40vmin;
	height: 40vmin;
	background: radial-gradient(
		circle,
		rgba(255, 255, 255, 0.95) 0%,
		var(--mk-gold-1) 22%,
		var(--mk-orange-2) 48%,
		rgba(252, 0, 96, 0.35) 72%,
		transparent 100%
	);
	filter: blur(10px);
}

.mk-burst-ring {
	width: 20vmin;
	height: 20vmin;
	border: 2px solid var(--mk-gold-2);
	box-shadow: 0 0 40px var(--mk-gold-2);
}

.mk-burst-core {
	animation: mk-burst-core-out 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.mk-burst-ring--1 {
	animation: mk-burst-ring-out 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.mk-burst-ring--2 {
	animation: mk-burst-ring-out 1.5s 0.12s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	border-color: var(--mk-orange-2);
}

.mk-burst-ring--3 {
	animation: mk-burst-ring-out 1.5s 0.24s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	border-color: var(--mk-magenta-2);
}

@keyframes mk-burst-out {
	0% {
		opacity: 1;
	}
	100% {
		opacity: 0;
	}
}

@keyframes mk-burst-core-out {
	0% {
		transform: translate(-50%, -50%) scale(0.1);
		opacity: 0.95;
	}
	55% {
		transform: translate(-50%, -50%) scale(1.05);
		opacity: 0.55;
	}
	100% {
		transform: translate(-50%, -50%) scale(1.7);
		opacity: 0;
	}
}

@keyframes mk-burst-ring-out {
	0% {
		transform: translate(-50%, -50%) scale(0.2);
		opacity: 0;
	}
	18% {
		opacity: 0.85;
	}
	100% {
		transform: translate(-50%, -50%) scale(5.6);
		opacity: 0;
	}
}

/* --------------------------------- Haze ----------------------------------- */
.mk-haze {
	position: absolute;
	width: 70vmax;
	height: 70vmax;
	border-radius: 50%;
	filter: blur(70px);
	opacity: 0.5;
	pointer-events: none;
}

.mk-haze--gold {
	left: -18vmax;
	top: -26vmax;
	background: radial-gradient(
		circle,
		rgba(252, 192, 0, 0.5) 0%,
		rgba(255, 122, 0, 0.22) 45%,
		transparent 72%
	);
	animation: mk-haze-drift 16s ease-in-out infinite alternate;
}

.mk-haze--magenta {
	right: -22vmax;
	bottom: -30vmax;
	background: radial-gradient(
		circle,
		rgba(252, 0, 96, 0.48) 0%,
		rgba(107, 0, 24, 0.3) 48%,
		transparent 74%
	);
	animation: mk-haze-drift 21s ease-in-out infinite alternate-reverse;
}

@keyframes mk-haze-drift {
	0% {
		transform: translate3d(0, 0, 0) scale(1);
	}
	100% {
		transform: translate3d(6vmax, 4vmax, 0) scale(1.18);
	}
}

/* ------------------------------ Grid floor -------------------------------- */
.mk-grid {
	position: absolute;
	inset: -10% -10% -35% -10%;
	background-image:
		linear-gradient(rgba(252, 192, 0, 0.55) 1px, transparent 1px),
		linear-gradient(90deg, rgba(252, 192, 0, 0.4) 1px, transparent 1px);
	background-size: 48px 48px;
	transform: perspective(720px) rotateX(62deg) translateY(18%);
	mask-image: linear-gradient(to top, #000 0%, transparent 75%);
	-webkit-mask-image: linear-gradient(to top, #000 0%, transparent 75%);
	opacity: 0.45;
	animation: mk-grid-drift 8s linear infinite;
}

.mk-grid--two {
	background-image:
		linear-gradient(rgba(252, 0, 96, 0.55) 1px, transparent 1px),
		linear-gradient(90deg, rgba(255, 46, 139, 0.35) 1px, transparent 1px);
	background-size: 96px 96px;
	opacity: 0.3;
	animation-duration: 18s;
	animation-direction: reverse;
}

@keyframes mk-grid-drift {
	from {
		background-position:
			0 0,
			0 0;
	}
	to {
		background-position:
			0 48px,
			48px 0;
	}
}

/* ------------------------------ Particles --------------------------------- */
.mk-particle {
	position: absolute;
	width: 7px;
	height: 7px;
	border-radius: 1px;
	background: var(--mk-gold-2);
	box-shadow:
		0 0 12px rgba(252, 192, 0, 0.7),
		0 0 26px rgba(252, 0, 96, 0.35);
	opacity: 0;
}

.mk-particle--1 {
	left: 14%;
	top: 78%;
	animation: mk-rise 4.5s 0.1s ease-in infinite;
}
.mk-particle--2 {
	left: 24%;
	top: 82%;
	width: 4px;
	height: 4px;
	background: var(--mk-magenta-1);
	animation: mk-rise 5.2s 0.9s ease-in infinite;
}
.mk-particle--3 {
	left: 70%;
	top: 80%;
	animation: mk-rise 4.9s 0.3s ease-in infinite;
}
.mk-particle--4 {
	left: 82%;
	top: 86%;
	width: 9px;
	height: 9px;
	background: var(--mk-orange-1);
	animation: mk-rise 5.8s 1.4s ease-in infinite;
}
.mk-particle--5 {
	left: 42%;
	top: 84%;
	animation: mk-rise 6.1s 2.1s ease-in infinite;
}
.mk-particle--6 {
	left: 55%;
	top: 77%;
	width: 4px;
	height: 4px;
	background: var(--mk-magenta-2);
	animation: mk-rise 4.3s 0.7s ease-in infinite;
}
.mk-particle--7 {
	left: 8%;
	top: 72%;
	background: var(--mk-gold-1);
	animation: mk-rise 5.5s 1.8s ease-in infinite;
}
.mk-particle--8 {
	left: 90%;
	top: 75%;
	width: 5px;
	height: 5px;
	background: var(--mk-magenta-1);
	animation: mk-rise 4.7s 2.6s ease-in infinite;
}

@keyframes mk-rise {
	0% {
		transform: translateY(0) rotate(0deg) scale(0.6);
		opacity: 0;
	}
	15% {
		opacity: 1;
	}
	100% {
		transform: translateY(-60vh) rotate(220deg) scale(1);
		opacity: 0;
	}
}

/* --------------------------------- Rings ---------------------------------- */
.mk-ring {
	position: absolute;
	left: 50%;
	top: 42%;
	width: min(46vmin, 380px);
	height: min(46vmin, 380px);
	transform: translate(-50%, -50%);
	pointer-events: none;
}

.mk-ring-arc {
	position: absolute;
	inset: 0;
	border-radius: 50%;
	border: 2px solid transparent;
}

.mk-ring-arc--gold {
	border-top-color: var(--mk-gold-1);
	border-right-color: rgba(252, 192, 0, 0.35);
	filter: drop-shadow(0 0 8px rgba(252, 192, 0, 0.65));
	animation: mk-spin 3.4s linear infinite;
}

.mk-ring-arc--magenta {
	inset: 12%;
	border-bottom-color: var(--mk-magenta-1);
	border-left-color: rgba(252, 0, 96, 0.35);
	filter: drop-shadow(0 0 8px rgba(252, 0, 96, 0.6));
	animation: mk-spin 2.6s linear reverse infinite;
}

.mk-ring-arc--soft {
	inset: 24%;
	border-top-color: rgba(255, 138, 42, 0.75);
	filter: drop-shadow(0 0 10px rgba(255, 90, 31, 0.55));
	animation: mk-spin 4.8s linear infinite;
}

.mk-orbit-dot {
	position: absolute;
	left: 50%;
	top: 0;
	width: 7px;
	height: 7px;
	margin: -3.5px 0 0 -3.5px;
	border-radius: 50%;
}

.mk-orbit-dot--gold {
	background: var(--mk-gold-1);
	box-shadow: 0 0 14px var(--mk-gold-2);
	animation: mk-orbit 3.4s linear infinite;
}

.mk-orbit-dot--magenta {
	background: var(--mk-magenta-1);
	box-shadow: 0 0 14px var(--mk-magenta-2);
	animation: mk-orbit 2.6s linear reverse infinite;
}

@keyframes mk-spin {
	to {
		transform: rotate(360deg);
	}
}

@keyframes mk-orbit {
	from {
		transform: rotate(0deg) translateX(min(23vmin, 190px)) rotate(0deg);
	}
	to {
		transform: rotate(360deg) translateX(min(23vmin, 190px)) rotate(-360deg);
	}
}

/* ---------------------------------- Core ---------------------------------- */
.mk-core {
	position: absolute;
	left: 50%;
	top: 42%;
	width: 42vmin;
	height: 42vmin;
	transform: translate(-50%, -50%);
	border-radius: 50%;
	pointer-events: none;
	background: radial-gradient(
		circle,
		rgba(255, 232, 102, 0.5) 0%,
		rgba(252, 156, 0, 0.28) 32%,
		rgba(252, 0, 96, 0.16) 58%,
		transparent 74%
	);
	filter: blur(26px);
	animation: mk-core-breathe 3.2s ease-in-out infinite;
}

@keyframes mk-core-breathe {
	0%,
	100% {
		opacity: 0.8;
		transform: translate(-50%, -50%) scale(1);
	}
	50% {
		opacity: 1;
		transform: translate(-50%, -50%) scale(1.07);
	}
}

/* -------------------------------- Content --------------------------------- */
.mk-content {
	position: relative;
	z-index: 2;
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 0.7rem;
	padding: 2rem;
	text-align: center;
}

.mk-logo-stage {
	position: relative;
	display: grid;
	place-items: center;
	margin-bottom: 0.35rem;
}

.mk-logo {
	position: relative;
	z-index: 2;
	width: clamp(5rem, 12vmin, 8.5rem);
	height: auto;
	object-fit: contain;
	filter: drop-shadow(0 10px 26px rgba(252, 0, 96, 0.45))
		drop-shadow(0 4px 14px rgba(252, 192, 0, 0.5));
	animation: mk-logo-float 4.2s ease-in-out infinite;
}

.mk-logo-shadow {
	position: absolute;
	bottom: -14%;
	left: 50%;
	width: 60%;
	height: 12%;
	transform: translateX(-50%);
	border-radius: 50%;
	background: radial-gradient(ellipse, rgba(252, 0, 96, 0.55) 0%, transparent 70%);
	filter: blur(8px);
	animation: mk-logo-shadow 4.2s ease-in-out infinite;
}

@keyframes mk-logo-float {
	0%,
	100% {
		transform: translateY(0) rotateX(0deg) rotateY(0deg);
	}
	35% {
		transform: translateY(-8px) rotateX(4deg) rotateY(-5deg);
	}
	70% {
		transform: translateY(-4px) rotateX(-3deg) rotateY(4deg);
	}
}

@keyframes mk-logo-shadow {
	0%,
	100% {
		opacity: 0.55;
		transform: translateX(-50%) scaleX(1);
	}
	35% {
		opacity: 0.35;
		transform: translateX(-50%) scaleX(0.86);
	}
	70% {
		opacity: 0.45;
		transform: translateX(-50%) scaleX(0.94);
	}
}

.mk-title {
	margin: 0.5rem 0 0;
	text-transform: uppercase;
	display: inline-flex;
	flex-wrap: wrap;
	justify-content: center;
	align-items: baseline;
	gap: 0.6rem;
	font-size: clamp(1.35rem, 2.6vw, 2.15rem);
	font-weight: 800;
	letter-spacing: 0.16em;
	line-height: 1.1;

	.mk-title-word {
		background: linear-gradient(
			100deg,
			var(--mk-gold-1) 0%,
			var(--mk-orange-1) 42%,
			var(--mk-magenta-1) 100%
		);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		filter: drop-shadow(0 0 14px rgba(252, 156, 0, 0.45));
	}

	.mk-title-sep {
		color: rgba(255, 232, 102, 0.65);
	}

	.mk-title-launch {
		color: #ffffff;
		text-shadow: 0 0 18px rgba(252, 0, 96, 0.45);
	}
}

.mk-instance {
	margin: 0.25rem 0 0;
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.4rem 0.95rem;
	border-radius: 999px;
	background: rgba(252, 0, 96, 0.14);
	border: 1px solid rgba(255, 46, 139, 0.45);
	color: #ffeaf3;
	font-size: 0.9rem;
	font-weight: 600;
	letter-spacing: 0.04em;
	backdrop-filter: blur(6px);

	.mk-pill-dot {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		background: var(--mk-magenta-1);
		box-shadow: 0 0 10px var(--mk-magenta-2);
		animation: mk-pill-blink 1.2s ease-in-out infinite;
	}
}

@keyframes mk-pill-blink {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.3;
	}
}

.mk-subtitle {
	margin: 0.7rem 0 0.2rem;
	min-height: 1.4em;
	font-size: clamp(0.85rem, 1.2vw, 1rem);
	font-weight: 600;
	letter-spacing: 0.18em;
	text-transform: uppercase;
	color: #ffd9a8;
	text-shadow: 0 0 12px rgba(252, 156, 0, 0.45);
	animation: mk-subtitle-fade 0.35s ease-out;
}

@keyframes mk-subtitle-fade {
	from {
		opacity: 0;
		transform: translateY(4px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

/* -------------------------------- Progress -------------------------------- */
.mk-progress {
	margin-top: 0.35rem;
	width: min(34rem, 82vw);
	display: flex;
	flex-direction: column;
	gap: 0.45rem;
}

.mk-progress-head {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	font-size: 0.7rem;
	font-weight: 700;
	letter-spacing: 0.2em;
	text-transform: uppercase;
}

.mk-progress-stage {
	color: var(--mk-gold-2);
	text-shadow: 0 0 10px rgba(252, 192, 0, 0.5);
}

.mk-progress-percent {
	color: #ffffff;
	font-variant-numeric: tabular-nums;
	font-size: 0.85rem;
	letter-spacing: 0.08em;
}

.mk-progress-track {
	position: relative;
	height: 10px;
	border-radius: 999px;
	background: linear-gradient(180deg, rgba(58, 0, 8, 0.9), rgba(20, 1, 10, 0.9));
	border: 1px solid rgba(252, 192, 0, 0.35);
	box-shadow:
		inset 0 1px 3px rgba(0, 0, 0, 0.7),
		0 0 22px -6px rgba(252, 0, 96, 0.6);
	overflow: hidden;
}

.mk-progress-fill {
	position: absolute;
	inset: 0 auto 0 0;
	border-radius: 999px;
	background: linear-gradient(
		90deg,
		var(--mk-gold-2) 0%,
		var(--mk-orange-1) 45%,
		var(--mk-magenta-2) 100%
	);
	box-shadow:
		0 0 14px rgba(252, 192, 0, 0.7),
		0 0 26px rgba(252, 0, 96, 0.45);
	transition: width 0.2s linear;

	&::after {
		content: '';
		position: absolute;
		right: -1px;
		top: -2px;
		bottom: -2px;
		width: 3px;
		border-radius: 999px;
		background: #ffffff;
		box-shadow: 0 0 12px #fff;
	}
}

.mk-progress-shine {
	position: absolute;
	top: 0;
	bottom: 0;
	left: -35%;
	width: 32%;
	background: linear-gradient(
		90deg,
		transparent 0%,
		rgba(255, 255, 255, 0.75) 50%,
		transparent 100%
	);
	animation: mk-shine 2.2s cubic-bezier(0.65, 0, 0.35, 1) infinite;
	opacity: 0.85;
}

.mk-progress-ticks {
	position: absolute;
	inset: 0;
	background-image: repeating-linear-gradient(
		90deg,
		rgba(26, 1, 6, 0.55) 0 1px,
		transparent 1px 14px
	);
	opacity: 0.7;
}

@keyframes mk-shine {
	0% {
		transform: translateX(0);
	}
	60%,
	100% {
		transform: translateX(420%);
	}
}

.mk-hint {
	margin-top: 1rem;
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	font-size: 0.72rem;
	font-weight: 600;
	letter-spacing: 0.16em;
	text-transform: uppercase;
	color: rgba(255, 240, 224, 0.62);

	.mk-hint-key {
		padding: 0.15rem 0.5rem;
		border: 1px solid rgba(252, 192, 0, 0.5);
		border-radius: 5px;
		background: rgba(252, 192, 0, 0.12);
		color: var(--mk-gold-1);
		font-weight: 800;
	}

	.mk-hint-sep {
		opacity: 0.6;
	}
}

/* --------------------------------- Chrome --------------------------------- */
.mk-rail {
	position: absolute;
	left: 0;
	right: 0;
	height: 2px;
	pointer-events: none;
	overflow: hidden;

	&::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			90deg,
			transparent 0%,
			var(--mk-gold-1) 20%,
			var(--mk-orange-1) 45%,
			var(--mk-magenta-2) 72%,
			transparent 100%
		);
		filter: blur(0.4px);
		animation: mk-rail-sweep 4.5s cubic-bezier(0.5, 0, 0.5, 1) infinite;
	}
}

.mk-rail--top {
	top: 0;
}

.mk-rail--bottom {
	bottom: 0;
	transform: scaleY(-1);
}

@keyframes mk-rail-sweep {
	0% {
		transform: translateX(-100%);
	}
	55%,
	100% {
		transform: translateX(100%);
	}
}

.mk-vignette {
	position: absolute;
	inset: 0;
	pointer-events: none;
	z-index: 1;
	background: radial-gradient(ellipse at center, transparent 52%, rgba(0, 0, 0, 0.7) 100%);
}

.mk-scanlines {
	position: absolute;
	inset: 0;
	pointer-events: none;
	z-index: 3;
	opacity: 0.07;
	mix-blend-mode: overlay;
	background: repeating-linear-gradient(
		to bottom,
		rgba(255, 255, 255, 0.6) 0px,
		rgba(255, 255, 255, 0.6) 1px,
		transparent 1px,
		transparent 3px
	);
}

.mk-corner {
	position: absolute;
	z-index: 3;
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: 0.9rem 1.05rem;
	font-size: 0.68rem;
	font-weight: 700;
	letter-spacing: 0.18em;
	text-transform: uppercase;

	.mk-corner-k {
		color: var(--mk-gold-2);
		text-shadow: 0 0 10px rgba(252, 192, 0, 0.4);
	}

	.mk-corner-v {
		color: rgba(255, 236, 214, 0.68);
	}

	&::before {
		content: '';
		position: absolute;
		width: 18px;
		height: 18px;
		border: 1.5px solid var(--mk-magenta-1);
		opacity: 0.8;
	}
}

.mk-corner--tl {
	top: 1rem;
	left: 1rem;
	&::before {
		top: 0;
		left: 0;
		border-right: 0;
		border-bottom: 0;
	}
}
.mk-corner--tr {
	top: 1rem;
	right: 1rem;
	text-align: right;
	&::before {
		top: 0;
		right: 0;
		border-left: 0;
		border-bottom: 0;
	}
}
.mk-corner--bl {
	bottom: 1rem;
	left: 1rem;
	&::before {
		bottom: 0;
		left: 0;
		border-right: 0;
		border-top: 0;
	}
}
.mk-corner--br {
	bottom: 1rem;
	right: 1rem;
	text-align: right;
	&::before {
		bottom: 0;
		right: 0;
		border-left: 0;
		border-top: 0;
	}
}

/* ------------------------------ Transitions ------------------------------- */
.launch-fade-enter-active {
	transition: opacity 0.45s ease-out;

	.mk-content {
		transition:
			transform 0.5s cubic-bezier(0.16, 1, 0.3, 1),
			opacity 0.45s ease-out,
			filter 0.45s ease-out;
	}
	.mk-grid,
	.mk-core,
	.mk-haze {
		transition: opacity 0.45s ease-out;
	}
}

.launch-fade-leave-active {
	--fade-out-time: 0.48s;
	transition: opacity var(--fade-out-time) cubic-bezier(0.22, 1, 0.36, 1);

	&.is-slow-fade {
		--fade-out-time: 1.8s;
	}

	.mk-content {
		transition:
			transform var(--fade-out-time) cubic-bezier(0.22, 1, 0.36, 1),
			opacity var(--fade-out-time) cubic-bezier(0.22, 1, 0.36, 1),
			filter var(--fade-out-time) ease-out;
	}
	.mk-grid,
	.mk-core,
	.mk-haze,
	.mk-ring,
	.mk-rail,
	.mk-corner {
		transition: opacity var(--fade-out-time) cubic-bezier(0.22, 1, 0.36, 1);
	}
}

.launch-fade-enter-from {
	opacity: 0;

	.mk-content {
		opacity: 0;
		transform: scale(0.96) translateY(14px);
		filter: blur(6px);
	}
	.mk-grid,
	.mk-haze {
		opacity: 0;
	}
}

.launch-fade-leave-to {
	opacity: 0;

	.mk-content {
		opacity: 0;
		transform: scale(1.04);
		filter: blur(6px);
	}
	.mk-core,
	.mk-grid,
	.mk-haze,
	.mk-ring,
	.mk-rail,
	.mk-corner {
		opacity: 0;
	}
}

@media (prefers-reduced-motion: reduce) {
	.mk-burst,
	.mk-grid,
	.mk-haze,
	.mk-core,
	.mk-logo,
	.mk-logo-shadow,
	.mk-particle,
	.mk-ring-arc,
	.mk-orbit-dot,
	.mk-progress-shine,
	.mk-pill-dot,
	.mk-rail::after {
		animation: none !important;
	}
}
</style>
