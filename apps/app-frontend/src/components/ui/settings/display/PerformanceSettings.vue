<script setup lang="ts">
import { CheckIcon, GaugeIcon, TrashIcon } from '@modrinth/assets'
import { Button, defineMessages, Toggle, useVIntl } from '@modrinth/ui'
import { computed, onBeforeUnmount, ref } from 'vue'

import {
	freeMemory,
	SKIN_RENDER_QUALITIES,
	skinPixelRatio,
	type SkinRenderQuality,
	usePerformanceSettings,
} from '@/composables/use-performance.ts'
import { launcherIcon } from '@/helpers/launcher-icons'

const { formatMessage } = useVIntl()

const FastIcon = launcherIcon('performance')
const QualityIcon = launcherIcon('quality')
const PauseSectionIcon = launcherIcon('pause')
const MemoryIcon = launcherIcon('memory')
const { fastLoading, skinRenderQuality, pauseWhenHidden } = usePerformanceSettings()

const memoryFreed = ref(false)
let freedTimer: ReturnType<typeof setTimeout> | undefined

function onFreeMemory(): void {
	freeMemory()
	memoryFreed.value = true
	if (freedTimer) clearTimeout(freedTimer)
	freedTimer = setTimeout(() => {
		memoryFreed.value = false
	}, 2500)
}

onBeforeUnmount(() => {
	if (freedTimer) clearTimeout(freedTimer)
})

const messages = defineMessages({
	heroEyebrow: {
		id: 'app.settings.performance.hero.eyebrow',
		defaultMessage: 'Minekube performance',
	},
	heroTitle: {
		id: 'app.settings.performance.hero.title',
		defaultMessage: 'Fast, light and quiet',
	},
	heroDescription: {
		id: 'app.settings.performance.hero.description',
		defaultMessage:
			'Decide how the launcher spends memory, graphics power and background time. Every switch takes effect immediately.',
	},
	fastLoadingTitle: {
		id: 'app.settings.performance.fast-loading.title',
		defaultMessage: 'Fast loading',
	},
	fastLoadingDescription: {
		id: 'app.settings.performance.fast-loading.description',
		defaultMessage:
			'Makes navigating the launcher feel much faster. Loaded data is kept fresh for several minutes instead of being refetched every time, cached results live far longer, the launcher stops reloading everything when the window regains focus, and pages you have already visited stay in memory so going back to them is instant.',
	},
	fastLoadingTradeoffTitle: {
		id: 'app.settings.performance.fast-loading.tradeoff-title',
		defaultMessage: 'What it costs',
	},
	fastLoadingTradeoff: {
		id: 'app.settings.performance.fast-loading.tradeoff',
		defaultMessage:
			'It uses more RAM (visited pages and cached data stay loaded) and content such as mod lists can be up to a few minutes out of date until you refresh. It does not speed up starting the launcher or launching Minecraft itself — those are handled outside the interface.',
	},
	qualityTitle: {
		id: 'app.settings.performance.skin-quality.title',
		defaultMessage: 'Skin render quality',
	},
	qualityDescription: {
		id: 'app.settings.performance.skin-quality.description',
		defaultMessage:
			'How sharply the 3D skin preview is rendered in the Skin selector and the skin editor. Higher settings render the model at several times the screen resolution and scale it back down (supersampling), which makes even single skin pixels crisp — at the cost of GPU work while a preview is on screen.',
	},
	qualityBalanced: {
		id: 'app.settings.performance.skin-quality.balanced',
		defaultMessage: 'Balanced',
	},
	qualityHigh: {
		id: 'app.settings.performance.skin-quality.high',
		defaultMessage: 'High',
	},
	qualityUltra: {
		id: 'app.settings.performance.skin-quality.ultra',
		defaultMessage: 'Ultra',
	},
	qualityUltraStatic: {
		id: 'app.settings.performance.skin-quality.ultra-static',
		defaultMessage: 'Ultra 4x (still)',
	},
	qualityStaticNote: {
		id: 'app.settings.performance.skin-quality.static-note',
		defaultMessage:
			'Ultra 4x draws 16x the pixels, so instead of redrawing that every frame the preview switches to on-demand rendering: a frame is produced only when something changes — while you drag to rotate, or when the skin or cape changes. You get the sharpest possible model for almost no continuous GPU load; in exchange the idle sway animation holds still.',
	},
	qualityCurrent: {
		id: 'app.settings.performance.skin-quality.current',
		defaultMessage: 'Currently rendering at {ratio}x resolution.',
	},
	pauseTitle: {
		id: 'app.settings.performance.pause-hidden.title',
		defaultMessage: 'Pause background activity',
	},
	pauseDescription: {
		id: 'app.settings.performance.pause-hidden.description',
		defaultMessage:
			'While the launcher window is minimised or hidden, stop the timers that poll for running instances and pause the particle effects. Nothing you can see is affected, and everything resumes the moment you come back.',
	},
	freeMemoryTitle: {
		id: 'app.settings.performance.free-memory.title',
		defaultMessage: 'Free up memory',
	},
	freeMemoryDescription: {
		id: 'app.settings.performance.free-memory.description',
		defaultMessage:
			'Immediately drops everything the launcher has cached from the network — mod lists, search results, project pages. The memory is released right away and anything still on screen loads again when needed.',
	},
	freeMemoryButton: {
		id: 'app.settings.performance.free-memory.button',
		defaultMessage: 'Free memory now',
	},
	freeMemoryDone: {
		id: 'app.settings.performance.free-memory.done',
		defaultMessage: 'Cache cleared.',
	},
})

const qualityLabels: Record<SkinRenderQuality, keyof typeof messages> = {
	balanced: 'qualityBalanced',
	high: 'qualityHigh',
	ultra: 'qualityUltra',
	'ultra-static': 'qualityUltraStatic',
}

const qualityOptions = computed(() =>
	SKIN_RENDER_QUALITIES.map((value) => ({
		value,
		label: formatMessage(messages[qualityLabels[value]]),
	})),
)
</script>

<template>
	<div class="studio">
		<section class="studio-hero">
			<div class="studio-hero__copy">
				<p class="studio-eyebrow">
					<GaugeIcon aria-hidden="true" />
					{{ formatMessage(messages.heroEyebrow) }}
				</p>
				<h2 class="studio-hero__title">{{ formatMessage(messages.heroTitle) }}</h2>
				<p class="studio-hero__text">{{ formatMessage(messages.heroDescription) }}</p>
			</div>
			<div class="perf-meter" aria-hidden="true">
				<span class="perf-meter__arc"></span>
				<span class="perf-meter__needle"></span>
			</div>
		</section>

		<section class="studio-section">
			<div class="studio-section__head">
				<div class="studio-section__lead">
					<span class="studio-badge" aria-hidden="true"><FastIcon /></span>
					<div>
						<h3 class="studio-section__title">{{ formatMessage(messages.fastLoadingTitle) }}</h3>
						<p class="studio-section__text">{{ formatMessage(messages.fastLoadingDescription) }}</p>
					</div>
				</div>
				<div class="studio-section__control">
					<Toggle id="minekube-fast-loading" v-model="fastLoading" />
				</div>
			</div>
			<div class="studio-section__body">
				<p class="studio-note m-0">
					<strong>{{ formatMessage(messages.fastLoadingTradeoffTitle) }}</strong>
					{{ formatMessage(messages.fastLoadingTradeoff) }}
				</p>
			</div>
		</section>

		<section class="studio-section">
			<div class="studio-section__head">
				<div class="studio-section__lead">
					<span class="studio-badge" aria-hidden="true"><QualityIcon /></span>
					<div>
						<h3 class="studio-section__title">{{ formatMessage(messages.qualityTitle) }}</h3>
						<p class="studio-section__text">{{ formatMessage(messages.qualityDescription) }}</p>
					</div>
				</div>
			</div>
			<div class="studio-section__body">
				<div
					class="studio-segmented"
					role="radiogroup"
					:aria-label="formatMessage(messages.qualityTitle)"
				>
					<button
						v-for="option in qualityOptions"
						:key="option.value"
						type="button"
						role="radio"
						class="studio-segment"
						:class="{ 'is-selected': skinRenderQuality === option.value }"
						:aria-checked="skinRenderQuality === option.value"
						@click="skinRenderQuality = option.value"
					>
						{{ option.label }}
					</button>
				</div>
				<p class="studio-subtext m-0">
					{{ formatMessage(messages.qualityCurrent, { ratio: skinPixelRatio.toFixed(1) }) }}
				</p>
				<p v-if="skinRenderQuality === 'ultra-static'" class="studio-note m-0">
					{{ formatMessage(messages.qualityStaticNote) }}
				</p>
			</div>
		</section>

		<section class="studio-section">
			<div class="studio-section__head">
				<div class="studio-section__lead">
					<span class="studio-badge" aria-hidden="true"><PauseSectionIcon /></span>
					<div>
						<h3 class="studio-section__title">{{ formatMessage(messages.pauseTitle) }}</h3>
						<p class="studio-section__text">{{ formatMessage(messages.pauseDescription) }}</p>
					</div>
				</div>
				<div class="studio-section__control">
					<Toggle id="minekube-pause-hidden" v-model="pauseWhenHidden" />
				</div>
			</div>
		</section>

		<section class="studio-section">
			<div class="studio-section__head">
				<div class="studio-section__lead">
					<span class="studio-badge" aria-hidden="true"><MemoryIcon /></span>
					<div>
						<h3 class="studio-section__title">{{ formatMessage(messages.freeMemoryTitle) }}</h3>
						<p class="studio-section__text">{{ formatMessage(messages.freeMemoryDescription) }}</p>
					</div>
				</div>
			</div>
			<div class="studio-section__body">
				<div class="flex flex-wrap items-center gap-3">
					<Button @click="onFreeMemory">
						<TrashIcon aria-hidden="true" />
						{{ formatMessage(messages.freeMemoryButton) }}
					</Button>
					<Transition name="fade">
						<span v-if="memoryFreed" class="perf-done" role="status">
							<CheckIcon aria-hidden="true" />
							{{ formatMessage(messages.freeMemoryDone) }}
						</span>
					</Transition>
				</div>
			</div>
		</section>
	</div>
</template>

<style lang="scss" scoped>
@import './studio.scss';

.perf-meter {
	position: relative;
	flex: 0 0 7.5rem;
	height: 4rem;
	overflow: hidden;
}

.perf-meter__arc {
	position: absolute;
	inset: 0 0 -3.5rem;
	border-radius: 50%;
	background: conic-gradient(from 270deg, #fc0060, #fc6000 25%, #fcc000 50%, transparent 50%);
	-webkit-mask: radial-gradient(circle, transparent 54%, #000 55%);
	mask: radial-gradient(circle, transparent 54%, #000 55%);
	opacity: 0.85;
}

.perf-meter__needle {
	position: absolute;
	bottom: 0;
	left: 50%;
	width: 3px;
	height: 3.3rem;
	margin-left: -1.5px;
	border-radius: 3px;
	background: var(--color-contrast);
	transform-origin: 50% 100%;
	animation: perf-needle 4.5s var(--mk-ease-standard) infinite alternate;
}

@keyframes perf-needle {
	from {
		transform: rotate(-55deg);
	}
	to {
		transform: rotate(62deg);
	}
}

.perf-done {
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
	color: var(--color-brand);
	font-size: 0.85rem;
	font-weight: 700;

	:deep(svg) {
		width: 1rem;
		height: 1rem;
	}
}

@media (max-width: 720px) {
	.perf-meter {
		display: none;
	}
}
</style>
