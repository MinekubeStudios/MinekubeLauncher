<script setup lang="ts">
import {
	ArrowLeftIcon,
	BlocksIcon,
	CheckIcon,
	CubeIcon,
	GlobeIcon,
	ImportIcon,
	PaintbrushIcon,
	RightArrowIcon,
	SparklesIcon,
	UserIcon,
} from '@modrinth/assets'
import { Button, languageCoverage, LanguageSettingsSelector, LOCALES, useVIntl } from '@modrinth/ui'
import { useDocumentVisibility, usePreferredReducedMotion } from '@vueuse/core'
import { computed, nextTick, onMounted, ref } from 'vue'

import launcherIcon from '@/assets/minekube-launcher-icon.png'
import { useVisualSettings } from '@/composables/use-visual'
import { get, set } from '@/helpers/settings'
import { setLocale } from '@/i18n.config'

import { welcomeMessages as m } from './messages'

const props = defineProps<{ version?: string; finishing?: boolean }>()
const emit = defineEmits<{ finish: [createPlayer: boolean] }>()
const { formatMessage: t, locale } = useVIntl()
const { animationsEnabled } = useVisualSettings()
const reducedMotion = usePreferredReducedMotion()
const visibility = useDocumentVisibility()
const motionOff = computed(() => !animationsEnabled.value || reducedMotion.value === 'reduce')
const step = ref(0)
const direction = ref<'forward' | 'backward'>('forward')
const heading = ref<HTMLElement>()
const scrollArea = ref<HTMLElement>()
const selectedLocale = ref(locale.value)
const savingLanguage = ref(false)
const languageError = ref(false)
const createPlayer = ref(false)

const steps = [
	{ label: m.languageLabel, icon: GlobeIcon },
	{ label: m.overviewLabel, icon: SparklesIcon },
]
const features = [
	{ icon: CubeIcon, title: m.instancesTitle, text: m.instancesDescription },
	{ icon: BlocksIcon, title: m.contentTitle, text: m.contentDescription },
	{ icon: PaintbrushIcon, title: m.personalTitle, text: m.personalDescription },
	{ icon: ImportIcon, title: m.importTitle, text: m.importDescription },
]

function goTo(index: number) {
	if (index < 0 || index >= steps.length || index === step.value || savingLanguage.value) return
	direction.value = index > step.value ? 'forward' : 'backward'
	step.value = index
}

async function changeLocale(requestedLocale: string) {
	if (requestedLocale === locale.value || savingLanguage.value) return
	selectedLocale.value = requestedLocale

	savingLanguage.value = true
	languageError.value = false
	const previousLocale = locale.value
	try {
		const settings = await get()
		await setLocale(requestedLocale)
		await set({ ...settings, locale: requestedLocale })
	} catch {
		await setLocale(previousLocale).catch(() => {})
		selectedLocale.value = locale.value
		languageError.value = true
	} finally {
		savingLanguage.value = false
	}
}

function focusHeading() {
	if (scrollArea.value) scrollArea.value.scrollTop = 0
	heading.value?.focus({ preventScroll: true })
}

function handleKeydown(event: KeyboardEvent) {
	if (event.key === 'Tab') return
	event.stopPropagation()
	if (event.key === 'Escape') event.preventDefault()
}

onMounted(() => nextTick(focusHeading))
</script>

<template>
	<div
		class="welcome-tour"
		:class="{ 'motion-off': motionOff, 'motion-paused': visibility === 'hidden' }"
		@keydown="handleKeydown"
	>
		<header class="tour-header" data-tauri-drag-region>
			<div class="tour-brand">
				<img :src="launcherIcon" alt="" width="38" height="38" />
				<div><strong>MINEKUBE</strong><span>LAUNCHER</span></div>
			</div>
			<span class="version-badge">{{
				props.version ? t(m.version, { version: props.version }) : t(m.versionUnknown)
			}}</span>
		</header>

		<div class="tour-body">
			<aside class="tour-aside">
				<div class="artwork" aria-hidden="true">
					<div class="art-grid" />
					<div class="orbit orbit-one" />
					<div class="orbit orbit-two" />
					<img class="hero-icon" :src="launcherIcon" alt="" draggable="false" />
					<span v-for="n in 6" :key="n" class="spark" :style="{ '--n': n }" />
				</div>
				<nav :aria-label="t(m.navigation)" class="step-nav">
					<button
						v-for="(item, index) in steps"
						:key="item.label.id"
						type="button"
						class="step-button"
						:class="{ active: step === index, visited: step > index }"
						:aria-current="step === index ? 'step' : undefined"
						:disabled="savingLanguage || props.finishing"
						@click="goTo(index)"
					>
						<span class="step-number">
							<CheckIcon v-if="step > index" aria-hidden="true" />
							<span v-else>{{ String(index + 1).padStart(2, '0') }}</span>
						</span>
						<span>{{ t(item.label) }}</span>
						<RightArrowIcon v-if="step === index" class="step-arrow" aria-hidden="true" />
					</button>
				</nav>
				<p class="aside-note">MINEKUBE STUDIOS <span>·</span> GPL-3.0</p>
			</aside>

			<div class="tour-main">
				<div ref="scrollArea" class="tour-scroll">
					<Transition :name="direction" mode="out-in" @after-enter="focusHeading">
						<section v-if="step === 0" key="language" class="step-content">
							<p class="eyebrow"><GlobeIcon aria-hidden="true" />{{ t(m.languageLabel) }}</p>
							<h1 ref="heading" tabindex="-1">{{ t(m.languageTitle) }}</h1>
							<p class="step-description">{{ t(m.languageDescription) }}</p>
							<div class="language-panel">
								<LanguageSettingsSelector
									product="app"
									:current-locale="selectedLocale"
									:locales="LOCALES"
									:on-locale-change="changeLocale"
									:is-changing="savingLanguage"
									:coverage-by-locale="languageCoverage.app"
								/>
								<p v-if="languageError" class="language-error" role="alert">
									{{ t(m.languageError) }}
								</p>
							</div>
						</section>
						<section v-else key="overview" class="step-content">
							<p class="eyebrow"><SparklesIcon aria-hidden="true" />{{ t(m.overviewLabel) }}</p>
							<h1 ref="heading" tabindex="-1">{{ t(m.overviewTitle) }}</h1>
							<p class="step-description">{{ t(m.overviewDescription) }}</p>
							<div class="feature-grid">
								<article v-for="item in features" :key="item.title.id" class="info-card">
									<component :is="item.icon" class="card-icon" aria-hidden="true" />
									<div>
										<h2>{{ t(item.title) }}</h2>
										<p>{{ t(item.text) }}</p>
									</div>
								</article>
							</div>
							<label class="player-option">
								<input
									v-model="createPlayer"
									type="checkbox"
									role="switch"
									:disabled="props.finishing"
								/>
								<span class="player-switch" aria-hidden="true" />
								<span class="player-copy">
									<strong
										><UserIcon aria-hidden="true" />{{ t(m.playerTitle) }}
										<span class="player-optional">{{ t(m.playerOptional) }}</span></strong
									>
									<span>{{ t(m.playerDescription) }}</span>
								</span>
							</label>
							<p class="player-note">{{ t(m.playerNote) }}</p>
						</section>
					</Transition>
				</div>
				<footer class="tour-footer">
					<div class="progress-track" aria-hidden="true">
						<span :style="{ width: `${((step + 1) / steps.length) * 100}%` }" />
					</div>
					<div class="footer-controls">
						<button
							v-if="step > 0"
							type="button"
							class="back-button"
							:disabled="props.finishing"
							@click="goTo(step - 1)"
						>
							<ArrowLeftIcon aria-hidden="true" />{{ t(m.back) }}
						</button>
						<span class="step-count" aria-live="polite">{{
							t(m.progress, { current: step + 1, total: steps.length })
						}}</span>
						<Button
							type="colored"
							color="brand"
							size="lg"
							class="primary-button"
							:disabled="savingLanguage || props.finishing"
							@click="step === 0 ? goTo(1) : emit('finish', createPlayer)"
						>
							{{ t(step === 0 ? m.next : m.finish) }}<RightArrowIcon aria-hidden="true" />
						</Button>
					</div>
				</footer>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
.welcome-tour {
	--tour-accent: var(--color-brand);
	--tour-muted: var(--color-secondary);
	--tour-line: var(--brand-gradient-border, var(--surface-5));
	display: flex;
	flex-direction: column;
	height: min(690px, calc(100vh - 112px));
	overflow: hidden;
	border-radius: var(--radius-xl);
	background: var(--color-bg);
	color: var(--color-contrast);

	button,
	select {
		font: inherit;
	}

	button {
		cursor: pointer;
	}

	button:disabled,
	select:disabled {
		cursor: wait;
		opacity: 0.6;
	}

	:focus-visible {
		outline: 2px solid var(--color-focus-ring, var(--color-brand));
		outline-offset: 3px;
	}

	h1,
	h2,
	p {
		margin: 0;
	}

	h1 {
		font-size: clamp(28px, 3vw, 38px);
		font-weight: 750;
		letter-spacing: -0.035em;
		line-height: 1.16;
		outline: none;
	}
}

.tour-header {
	display: flex;
	align-items: center;
	gap: 20px;
	padding: 17px 28px;
	border-bottom: 1px solid var(--tour-line);
}

.tour-brand {
	display: flex;
	align-items: center;
	gap: 10px;

	img {
		object-fit: contain;
	}

	strong,
	span {
		display: block;
		line-height: 1.25;
	}

	strong {
		font-size: 14px;
		letter-spacing: 0.14em;
	}

	span {
		color: var(--tour-muted);
		font-size: 9px;
		letter-spacing: 0.32em;
	}
}

.version-badge {
	margin-left: auto;
	padding: 5px 10px;
	border: 1px solid var(--tour-line);
	border-radius: var(--radius-md);
	background: var(--surface-3);
	color: var(--tour-muted);
	font-size: 11px;
}

.tour-body {
	display: grid;
	flex: 1;
	min-height: 0;
	grid-template-columns: 275px minmax(0, 1fr);
}

.tour-aside {
	display: flex;
	min-height: 0;
	flex-direction: column;
	border-right: 1px solid var(--tour-line);
	background: var(--brand-gradient-strong-bg), var(--surface-3);
}

.artwork {
	position: relative;
	min-height: 230px;
	overflow: hidden;
}

.art-grid {
	position: absolute;
	inset: 0;
	background:
		linear-gradient(color-mix(in srgb, var(--tour-accent) 9%, transparent) 1px, transparent 1px),
		linear-gradient(
			90deg,
			color-mix(in srgb, var(--tour-accent) 9%, transparent) 1px,
			transparent 1px
		);
	background-size: 36px 36px;
	mask-image: radial-gradient(ellipse, #000, transparent 75%);
}

.hero-icon {
	position: absolute;
	top: 50%;
	left: 50%;
	width: 132px;
	height: 132px;
	object-fit: contain;
	filter: drop-shadow(0 0 26px color-mix(in srgb, var(--tour-accent) 35%, transparent));
	transform: translate(-50%, -50%);
	animation: welcome-float 6s ease-in-out infinite;
}

.orbit {
	position: absolute;
	top: 50%;
	left: 50%;
	width: 230px;
	height: 108px;
	border: 1px solid color-mix(in srgb, var(--tour-accent) 25%, transparent);
	border-radius: 50%;
	transform: translate(-50%, -50%) rotate(-32deg);
}

.orbit-two {
	width: 255px;
	height: 125px;
	border-style: dashed;
	opacity: 0.5;
	transform: translate(-50%, -50%) rotate(38deg);
}

.spark {
	position: absolute;
	left: calc(10% + var(--n) * 12%);
	top: calc(12% + var(--n) * 11%);
	width: 3px;
	height: 3px;
	background: var(--tour-accent);
	animation: welcome-twinkle 5s ease-in-out infinite;
	animation-delay: calc(var(--n) * -0.8s);
}

.step-nav {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 8px 22px;
}

.step-button {
	display: flex;
	min-height: 46px;
	align-items: center;
	gap: 12px;
	padding: 8px 12px;
	border: 1px solid transparent;
	border-radius: var(--radius-lg);
	background: transparent;
	color: var(--tour-muted);
	font-size: 13px;
	text-align: left;
	transition:
		background-color 180ms ease,
		border-color 180ms ease,
		color 180ms ease;

	&:hover {
		background: var(--surface-4);
		color: var(--color-contrast);
	}

	&.active {
		border-color: var(--tour-line);
		background: linear-gradient(110deg, var(--color-brand-highlight), transparent);
		color: var(--tour-accent);
	}

	&.visited .step-number {
		color: var(--tour-accent);
	}
}

.step-number {
	display: grid;
	width: 27px;
	height: 27px;
	flex-shrink: 0;
	place-items: center;
	border: 1px solid var(--tour-line);
	border-radius: 8px;
	font-size: 11px;
	font-weight: 700;

	svg {
		width: 15px;
		height: 15px;
	}
}

.step-arrow {
	width: 15px;
	height: 15px;
	margin-left: auto;
}

.aside-note {
	margin: auto 0 0 !important;
	padding: 20px 28px;
	color: var(--tour-muted);
	font-size: 10px;
	letter-spacing: 0.1em;

	span {
		padding: 0 4px;
	}
}

.tour-main {
	display: flex;
	min-width: 0;
	min-height: 0;
	flex-direction: column;
}

.tour-scroll {
	flex: 1;
	overflow: auto;
	overscroll-behavior: contain;
}

.step-content {
	max-width: 740px;
	padding: 44px 48px 40px;
}

.eyebrow {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 17px !important;
	color: var(--tour-accent);
	font-size: 11px;
	font-weight: 800;
	letter-spacing: 0.13em;
	text-transform: uppercase;

	svg {
		width: 16px;
		height: 16px;
	}
}

.step-description {
	max-width: 550px;
	margin-top: 15px !important;
	color: var(--tour-muted);
	font-size: 15px;
	line-height: 1.6;
}

.language-panel {
	max-width: 560px;
	max-height: min(26rem, 52vh);
	margin-top: 32px;
	padding: 18px 20px 20px;
	overflow-y: auto;
	border: 1px solid var(--tour-line);
	border-radius: var(--radius-xl);
	background: var(--surface-2);
	overscroll-behavior: contain;
}

.player-optional {
	color: var(--tour-muted);
	font-weight: 600;
}

.player-note {
	margin-top: 14px !important;
	color: var(--tour-muted);
	font-size: 12px;
	line-height: 1.5;
}

.language-error {
	margin-top: 12px !important;
	color: var(--color-red, #e45c69);
	font-size: 12px;
}

.feature-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 12px;
	margin-top: 25px;
}

.info-card {
	display: flex;
	gap: 12px;
	padding: 15px;
	border: 1px solid var(--tour-line);
	border-radius: var(--radius-lg);
	background: var(--surface-2);

	.card-icon {
		width: 19px;
		height: 19px;
		flex-shrink: 0;
		color: var(--tour-accent);
	}

	h2 {
		margin-bottom: 5px;
		font-size: 13px;
		font-weight: 750;
	}

	p {
		color: var(--tour-muted);
		font-size: 11px;
		line-height: 1.5;
	}
}

.player-option {
	display: flex;
	align-items: flex-start;
	gap: 14px;
	margin-top: 20px;
	padding: 16px;
	border: 1px solid var(--tour-line);
	border-radius: var(--radius-lg);
	background: var(--color-brand-highlight);
	cursor: pointer;

	input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
	}

	input:focus-visible + .player-switch {
		outline: 2px solid var(--tour-accent);
		outline-offset: 3px;
	}

	input:checked + .player-switch {
		background: var(--tour-accent);
	}

	input:checked + .player-switch::after {
		transform: translateX(18px);
	}
}

.player-switch {
	position: relative;
	width: 42px;
	height: 24px;
	flex-shrink: 0;
	border-radius: 20px;
	background: var(--surface-5);
	transition: background-color 200ms ease;

	&::after {
		position: absolute;
		top: 3px;
		left: 3px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: white;
		box-shadow: 0 1px 3px rgb(0 0 0 / 20%);
		content: '';
		transition: transform 200ms ease;
	}
}

.player-copy {
	display: flex;
	flex-direction: column;
	gap: 5px;
	color: var(--tour-muted);
	font-size: 12px;
	line-height: 1.5;

	strong {
		display: flex;
		align-items: center;
		gap: 7px;
		color: var(--color-contrast);
		font-size: 13px;
	}

	svg {
		width: 16px;
		height: 16px;
		color: var(--tour-accent);
	}
}

.player-note {
	margin-left: 16px !important;
}

.tour-footer {
	border-top: 1px solid var(--tour-line);
}

.progress-track {
	height: 2px;
	background: var(--surface-3);

	span {
		display: block;
		height: 100%;
		background: var(--tour-accent);
		transition: width 250ms ease;
	}
}

.footer-controls {
	display: flex;
	min-height: 78px;
	align-items: center;
	gap: 16px;
	padding: 16px 30px;
}

.back-button {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 0;
	border: 0;
	background: transparent;
	color: var(--tour-muted);
	font-size: 13px;

	&:hover {
		color: var(--color-contrast);
	}

	svg {
		width: 16px;
		height: 16px;
	}
}

.step-count {
	margin-left: auto;
	color: var(--tour-muted);
	font-size: 12px;
}

.primary-button svg {
	width: 17px;
	height: 17px;
	margin-left: 8px;
}

.forward-enter-active,
.forward-leave-active,
.backward-enter-active,
.backward-leave-active {
	transition:
		opacity 180ms ease,
		transform 180ms ease;
}

.forward-enter-from,
.backward-leave-to {
	opacity: 0;
	transform: translateX(12px);
}

.forward-leave-to,
.backward-enter-from {
	opacity: 0;
	transform: translateX(-12px);
}

.motion-off *,
.motion-off *::before,
.motion-off *::after {
	animation: none !important;
	transition: none !important;
}

.motion-paused * {
	animation-play-state: paused !important;
}

@keyframes welcome-float {
	50% {
		transform: translate(-50%, -54%);
	}
}

@keyframes welcome-twinkle {
	0%,
	100% {
		opacity: 0.3;
	}
	50% {
		opacity: 0.9;
	}
}

@media (max-width: 760px) {
	.tour-body {
		grid-template-columns: minmax(0, 1fr);
	}
	.tour-aside {
		display: none;
	}
	.step-content {
		padding: 28px 24px;
	}
	.feature-grid {
		grid-template-columns: minmax(0, 1fr);
	}
}

@media (prefers-reduced-motion: reduce) {
	.welcome-tour *,
	.welcome-tour *::before,
	.welcome-tour *::after {
		animation: none !important;
		transition: none !important;
	}
}
</style>
