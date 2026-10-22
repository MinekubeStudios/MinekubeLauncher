<script setup lang="ts">
import { CheckIcon, RefreshCwIcon } from '@modrinth/assets'
import { Button, defineMessages, Slider, Toggle, useVIntl } from '@modrinth/ui'
import { computed } from 'vue'

import {
	resetSplashScreenPrefs,
	SPLASH_LOGO_ANIMATIONS,
	SPLASH_PREFS_LIMITS,
	SPLASH_PROGRESS_STYLES,
	type SplashLogoAnimation,
	type SplashProgressStyle,
	useSplashScreen,
} from '@/composables/use-splash-screen.ts'
import { effectStyle } from '@/composables/use-visual.ts'
import { useEffectStyleLabels } from '@/composables/use-visual-style-labels.ts'

import SplashPreviewPlayer from './SplashPreviewPlayer.vue'
import SplashPreviewStage from './SplashPreviewStage.vue'

const { formatMessage } = useVIntl()
const splash = useSplashScreen()
const effectLabels = useEffectStyleLabels()

const messages = defineMessages({
	groupLogo: {
		id: 'app.settings.visual.splash.group.logo',
		defaultMessage: 'Loading screen logo',
	},
	groupProgress: {
		id: 'app.settings.visual.splash.group.progress',
		defaultMessage: 'Progress indicator',
	},
	groupBackground: {
		id: 'app.settings.visual.splash.group.background',
		defaultMessage: 'Background scene',
	},
	groupTiming: {
		id: 'app.settings.visual.splash.group.timing',
		defaultMessage: 'Timing and motion',
	},
	groupPreview: {
		id: 'app.settings.visual.splash.group.preview',
		defaultMessage: 'Preview',
	},
	previewHint: {
		id: 'app.settings.visual.splash.preview-hint',
		defaultMessage: 'Everything below is drawn live, exactly as the launcher will show it.',
	},
	logoSize: {
		id: 'app.settings.visual.splash.logo-size',
		defaultMessage: 'Logo size',
	},
	logoSizeHint: {
		id: 'app.settings.visual.splash.logo-size-hint',
		defaultMessage: 'Scales the wordmark and the glow behind it.',
	},
	logoAnimation: {
		id: 'app.settings.visual.splash.logo-animation',
		defaultMessage: 'Logo animation',
	},
	logoAnimationHint: {
		id: 'app.settings.visual.splash.logo-animation-hint',
		defaultMessage: 'How the Minekube wordmark moves while the launcher loads.',
	},
	logoIntensity: {
		id: 'app.settings.visual.splash.logo-intensity',
		defaultMessage: 'Animation intensity',
	},
	logoIntensityHint: {
		id: 'app.settings.visual.splash.logo-intensity-hint',
		defaultMessage: 'How far the wordmark travels and how strongly it reacts.',
	},
	logoGlow: {
		id: 'app.settings.visual.splash.logo-glow',
		defaultMessage: 'Glow',
	},
	logoGlowHint: {
		id: 'app.settings.visual.splash.logo-glow-hint',
		defaultMessage: 'The halo and the light that surrounds the wordmark.',
	},
	animNone: { id: 'app.settings.visual.splash.logo-animation.none', defaultMessage: 'None' },
	animNoneHint: {
		id: 'app.settings.visual.splash.logo-animation.none-hint',
		defaultMessage: 'The wordmark stays perfectly still.',
	},
	animFloat: { id: 'app.settings.visual.splash.logo-animation.float', defaultMessage: 'Float' },
	animFloatHint: {
		id: 'app.settings.visual.splash.logo-animation.float-hint',
		defaultMessage: 'The wordmark drifts gently up and down.',
	},
	animBreathe: {
		id: 'app.settings.visual.splash.logo-animation.breathe',
		defaultMessage: 'Breathe',
	},
	animBreatheHint: {
		id: 'app.settings.visual.splash.logo-animation.breathe-hint',
		defaultMessage: 'The wordmark slowly swells and settles again.',
	},
	animPulse: { id: 'app.settings.visual.splash.logo-animation.pulse', defaultMessage: 'Pulse' },
	animPulseHint: {
		id: 'app.settings.visual.splash.logo-animation.pulse-hint',
		defaultMessage: 'The wordmark softly pulses with light.',
	},
	animTilt: { id: 'app.settings.visual.splash.logo-animation.tilt', defaultMessage: 'Tilt' },
	animTiltHint: {
		id: 'app.settings.visual.splash.logo-animation.tilt-hint',
		defaultMessage: 'The wordmark turns slowly in three dimensions.',
	},
	animShimmer: {
		id: 'app.settings.visual.splash.logo-animation.shimmer',
		defaultMessage: 'Shimmer',
	},
	animShimmerHint: {
		id: 'app.settings.visual.splash.logo-animation.shimmer-hint',
		defaultMessage: 'A band of light sweeps across the wordmark.',
	},
	progressStyle: {
		id: 'app.settings.visual.splash.progress-style',
		defaultMessage: 'Indicator style',
	},
	progressStyleHint: {
		id: 'app.settings.visual.splash.progress-style-hint',
		defaultMessage: 'How loading progress is drawn underneath the logo.',
	},
	progressHeight: {
		id: 'app.settings.visual.splash.progress-height',
		defaultMessage: 'Indicator thickness',
	},
	progressWidth: {
		id: 'app.settings.visual.splash.progress-width',
		defaultMessage: 'Indicator width',
	},
	styleBar: { id: 'app.settings.visual.splash.style.bar', defaultMessage: 'Bar' },
	styleBarHint: {
		id: 'app.settings.visual.splash.style.bar-hint',
		defaultMessage: 'A glowing gradient bar with a travelling shine.',
	},
	styleSegments: { id: 'app.settings.visual.splash.style.segments', defaultMessage: 'Segments' },
	styleSegmentsHint: {
		id: 'app.settings.visual.splash.style.segments-hint',
		defaultMessage: 'Blocky Minecraft-style chunks that light up one by one.',
	},
	styleRing: { id: 'app.settings.visual.splash.style.ring', defaultMessage: 'Ring' },
	styleRingHint: {
		id: 'app.settings.visual.splash.style.ring-hint',
		defaultMessage: 'A circular dial with the exact percentage in the middle.',
	},
	styleDots: { id: 'app.settings.visual.splash.style.dots', defaultMessage: 'Dots' },
	styleDotsHint: {
		id: 'app.settings.visual.splash.style.dots-hint',
		defaultMessage: 'A quiet row of lights that fill up as work completes.',
	},
	styleMinimal: { id: 'app.settings.visual.splash.style.minimal', defaultMessage: 'Minimal' },
	styleMinimalHint: {
		id: 'app.settings.visual.splash.style.minimal-hint',
		defaultMessage: 'A hairline that grows across the middle of the screen.',
	},
	starDensity: {
		id: 'app.settings.visual.splash.star-density',
		defaultMessage: 'Starfield density',
	},
	starSpeed: {
		id: 'app.settings.visual.splash.star-speed',
		defaultMessage: 'Starfield speed',
	},
	nebulaIntensity: {
		id: 'app.settings.visual.splash.nebula-intensity',
		defaultMessage: 'Nebula intensity',
	},
	gridFloor: {
		id: 'app.settings.visual.splash.grid-floor',
		defaultMessage: 'Perspective grid floor',
	},
	gridFloorHint: {
		id: 'app.settings.visual.splash.grid-floor-hint',
		defaultMessage: 'The retro floor grid stretching out below the logo.',
	},
	gridIntensity: {
		id: 'app.settings.visual.splash.grid-intensity',
		defaultMessage: 'Grid brightness',
	},
	backgroundEffects: {
		id: 'app.settings.visual.splash.background-effects',
		defaultMessage: 'Background particles',
	},
	backgroundEffectsHint: {
		id: 'app.settings.visual.splash.background-effects-hint',
		defaultMessage:
			'Drift the particle effect you picked in Visual behind the loading screen, so both share one atmosphere.',
	},
	backgroundEffectUsing: {
		id: 'app.settings.visual.splash.background-effects-using',
		defaultMessage: 'The background uses the “{style}” effect from Visual.',
	},
	backgroundEffectOff: {
		id: 'app.settings.visual.splash.background-effects-off',
		defaultMessage: 'The background only shows the starfield and the nebulae.',
	},
	animationSpeed: {
		id: 'app.settings.visual.splash.animation-speed',
		defaultMessage: 'Animation speed',
	},
	animationSpeedHint: {
		id: 'app.settings.visual.splash.animation-speed-hint',
		defaultMessage:
			'Multiplies every loading screen animation, from the drifting nebulae to the shine.',
	},
	minDisplay: {
		id: 'app.settings.visual.splash.min-display',
		defaultMessage: 'Minimum display time',
	},
	minDisplayHint: {
		id: 'app.settings.visual.splash.min-display-hint',
		defaultMessage:
			'Keeps the loading screen up for at least this long so it never just flashes by.',
	},
	fadeOut: {
		id: 'app.settings.visual.splash.fade-out',
		defaultMessage: 'Fade-out duration',
	},
	showLoadingMessage: {
		id: 'app.settings.visual.splash.show-message',
		defaultMessage: 'Show loading status text',
	},
	showLoadingMessageHint: {
		id: 'app.settings.visual.splash.show-message-hint',
		defaultMessage: 'Prints what the launcher is doing right now under the indicator.',
	},
	selected: { id: 'app.settings.visual.option.selected', defaultMessage: 'Selected' },
	reset: {
		id: 'app.settings.visual.splash.reset',
		defaultMessage: 'Reset loading screen',
	},
})

const progressLabels: Record<SplashProgressStyle, { name: () => string; hint: () => string }> = {
	bar: {
		name: () => formatMessage(messages.styleBar),
		hint: () => formatMessage(messages.styleBarHint),
	},
	segments: {
		name: () => formatMessage(messages.styleSegments),
		hint: () => formatMessage(messages.styleSegmentsHint),
	},
	ring: {
		name: () => formatMessage(messages.styleRing),
		hint: () => formatMessage(messages.styleRingHint),
	},
	dots: {
		name: () => formatMessage(messages.styleDots),
		hint: () => formatMessage(messages.styleDotsHint),
	},
	minimal: {
		name: () => formatMessage(messages.styleMinimal),
		hint: () => formatMessage(messages.styleMinimalHint),
	},
}

const logoAnimationLabels: Record<SplashLogoAnimation, { name: () => string; hint: () => string }> =
	{
		none: {
			name: () => formatMessage(messages.animNone),
			hint: () => formatMessage(messages.animNoneHint),
		},
		float: {
			name: () => formatMessage(messages.animFloat),
			hint: () => formatMessage(messages.animFloatHint),
		},
		breathe: {
			name: () => formatMessage(messages.animBreathe),
			hint: () => formatMessage(messages.animBreatheHint),
		},
		pulse: {
			name: () => formatMessage(messages.animPulse),
			hint: () => formatMessage(messages.animPulseHint),
		},
		tilt: {
			name: () => formatMessage(messages.animTilt),
			hint: () => formatMessage(messages.animTiltHint),
		},
		shimmer: {
			name: () => formatMessage(messages.animShimmer),
			hint: () => formatMessage(messages.animShimmerHint),
		},
	}

const selectedProgressHint = computed(() => progressLabels[splash.progressStyle].hint())
const selectedLogoAnimationHint = computed(() => logoAnimationLabels[splash.logoAnimation].hint())
const backgroundEffectHint = computed(() =>
	splash.backgroundEffects
		? formatMessage(messages.backgroundEffectUsing, {
				style: effectLabels.name(effectStyle.value),
			})
		: formatMessage(messages.backgroundEffectOff),
)
</script>

<template>
	<div class="splash-settings">
		<div class="splash-group">
			<div class="splash-group__heading">
				<h3>{{ formatMessage(messages.groupPreview) }}</h3>
				<p>{{ formatMessage(messages.previewHint) }}</p>
			</div>
			<SplashPreviewStage />
			<div class="splash-preview-actions">
				<SplashPreviewPlayer />
				<Button type="outlined" size="sm" @click="resetSplashScreenPrefs">
					<RefreshCwIcon class="size-4 shrink-0" />
					{{ formatMessage(messages.reset) }}
				</Button>
			</div>
		</div>

		<div class="splash-group">
			<div class="splash-group__heading">
				<h3>{{ formatMessage(messages.groupLogo) }}</h3>
			</div>
			<div class="splash-row">
				<div class="splash-row__copy">
					<span class="splash-row__title">{{ formatMessage(messages.logoSize) }}</span>
					<span class="splash-row__hint">{{ formatMessage(messages.logoSizeHint) }}</span>
				</div>
				<Slider
					v-model="splash.logoScale"
					class="splash-slider"
					:min="SPLASH_PREFS_LIMITS.logoScale.min"
					:max="SPLASH_PREFS_LIMITS.logoScale.max"
					:step="SPLASH_PREFS_LIMITS.logoScale.step"
					unit="%"
					:aria-label="formatMessage(messages.logoSize)"
				/>
			</div>
			<div class="splash-subgroup">
				<div class="splash-subgroup__heading">
					<span class="splash-row__title">
						{{ formatMessage(messages.logoAnimation) }}
					</span>
					<span class="splash-row__hint">
						{{ formatMessage(messages.logoAnimationHint) }}
					</span>
				</div>
				<div class="splash-choices">
					<button
						v-for="animation in SPLASH_LOGO_ANIMATIONS"
						:key="animation"
						type="button"
						class="splash-choice splash-choice--logo"
						:class="{ 'is-selected': splash.logoAnimation === animation }"
						:aria-pressed="splash.logoAnimation === animation"
						@click="splash.logoAnimation = animation"
					>
						<span class="splash-choice__art" :data-logo="animation" aria-hidden="true">
							<span class="splash-choice__glyph"></span>
						</span>
						<span class="splash-choice__name">
							{{ logoAnimationLabels[animation].name() }}
						</span>
						<span v-if="splash.logoAnimation === animation" class="splash-choice__check">
							<CheckIcon aria-hidden="true" />
							{{ formatMessage(messages.selected) }}
						</span>
					</button>
				</div>
				<p class="splash-group__note">{{ selectedLogoAnimationHint }}</p>
			</div>
			<div class="splash-row">
				<div class="splash-row__copy">
					<span class="splash-row__title">
						{{ formatMessage(messages.logoIntensity) }}
					</span>
					<span class="splash-row__hint">
						{{ formatMessage(messages.logoIntensityHint) }}
					</span>
				</div>
				<Slider
					v-model="splash.logoIntensity"
					class="splash-slider"
					:min="SPLASH_PREFS_LIMITS.logoIntensity.min"
					:max="SPLASH_PREFS_LIMITS.logoIntensity.max"
					:step="SPLASH_PREFS_LIMITS.logoIntensity.step"
					unit="%"
					:aria-label="formatMessage(messages.logoIntensity)"
				/>
			</div>
			<div class="splash-row">
				<div class="splash-row__copy">
					<span class="splash-row__title">{{ formatMessage(messages.logoGlow) }}</span>
					<span class="splash-row__hint">{{ formatMessage(messages.logoGlowHint) }}</span>
				</div>
				<Slider
					v-model="splash.logoGlow"
					class="splash-slider"
					:min="SPLASH_PREFS_LIMITS.logoGlow.min"
					:max="SPLASH_PREFS_LIMITS.logoGlow.max"
					:step="SPLASH_PREFS_LIMITS.logoGlow.step"
					unit="%"
					:aria-label="formatMessage(messages.logoGlow)"
				/>
			</div>
		</div>

		<div class="splash-group">
			<div class="splash-group__heading">
				<h3>{{ formatMessage(messages.groupProgress) }}</h3>
				<p>{{ formatMessage(messages.progressStyleHint) }}</p>
			</div>
			<div class="splash-choices">
				<button
					v-for="style in SPLASH_PROGRESS_STYLES"
					:key="style"
					type="button"
					class="splash-choice"
					:class="{ 'is-selected': splash.progressStyle === style }"
					:aria-pressed="splash.progressStyle === style"
					@click="splash.progressStyle = style"
				>
					<span class="splash-choice__art" :data-style="style" aria-hidden="true"></span>
					<span class="splash-choice__name">{{ progressLabels[style].name() }}</span>
					<span v-if="splash.progressStyle === style" class="splash-choice__check">
						<CheckIcon aria-hidden="true" />
						{{ formatMessage(messages.selected) }}
					</span>
				</button>
			</div>
			<p class="splash-group__note">{{ selectedProgressHint }}</p>
			<div class="splash-row">
				<div class="splash-row__copy">
					<span class="splash-row__title">
						{{ formatMessage(messages.progressHeight) }}
					</span>
				</div>
				<Slider
					v-model="splash.progressHeight"
					class="splash-slider"
					:min="SPLASH_PREFS_LIMITS.progressHeight.min"
					:max="SPLASH_PREFS_LIMITS.progressHeight.max"
					:step="SPLASH_PREFS_LIMITS.progressHeight.step"
					unit="px"
					:aria-label="formatMessage(messages.progressHeight)"
				/>
			</div>
			<div class="splash-row">
				<div class="splash-row__copy">
					<span class="splash-row__title">
						{{ formatMessage(messages.progressWidth) }}
					</span>
				</div>
				<Slider
					v-model="splash.progressWidth"
					class="splash-slider"
					:min="SPLASH_PREFS_LIMITS.progressWidth.min"
					:max="SPLASH_PREFS_LIMITS.progressWidth.max"
					:step="SPLASH_PREFS_LIMITS.progressWidth.step"
					unit="%"
					:aria-label="formatMessage(messages.progressWidth)"
				/>
			</div>
		</div>

		<div class="splash-group">
			<div class="splash-group__heading">
				<h3>{{ formatMessage(messages.groupBackground) }}</h3>
			</div>
			<div class="splash-row">
				<div class="splash-row__copy">
					<span class="splash-row__title">
						{{ formatMessage(messages.starDensity) }}
					</span>
				</div>
				<Slider
					v-model="splash.starDensity"
					class="splash-slider"
					:min="SPLASH_PREFS_LIMITS.starDensity.min"
					:max="SPLASH_PREFS_LIMITS.starDensity.max"
					:step="SPLASH_PREFS_LIMITS.starDensity.step"
					unit="%"
					:aria-label="formatMessage(messages.starDensity)"
				/>
			</div>
			<div class="splash-row">
				<div class="splash-row__copy">
					<span class="splash-row__title">{{ formatMessage(messages.starSpeed) }}</span>
				</div>
				<Slider
					v-model="splash.starSpeed"
					class="splash-slider"
					:min="SPLASH_PREFS_LIMITS.starSpeed.min"
					:max="SPLASH_PREFS_LIMITS.starSpeed.max"
					:step="SPLASH_PREFS_LIMITS.starSpeed.step"
					unit="%"
					:aria-label="formatMessage(messages.starSpeed)"
				/>
			</div>
			<div class="splash-row">
				<div class="splash-row__copy">
					<span class="splash-row__title">
						{{ formatMessage(messages.nebulaIntensity) }}
					</span>
				</div>
				<Slider
					v-model="splash.nebulaIntensity"
					class="splash-slider"
					:min="SPLASH_PREFS_LIMITS.nebulaIntensity.min"
					:max="SPLASH_PREFS_LIMITS.nebulaIntensity.max"
					:step="SPLASH_PREFS_LIMITS.nebulaIntensity.step"
					unit="%"
					:aria-label="formatMessage(messages.nebulaIntensity)"
				/>
			</div>
			<div class="splash-row">
				<div class="splash-row__copy">
					<span class="splash-row__title">{{ formatMessage(messages.gridFloor) }}</span>
					<span class="splash-row__hint">{{ formatMessage(messages.gridFloorHint) }}</span>
				</div>
				<Toggle id="splash-grid-floor" v-model="splash.gridFloor" />
			</div>
			<div class="splash-row">
				<div class="splash-row__copy">
					<span class="splash-row__title">
						{{ formatMessage(messages.gridIntensity) }}
					</span>
				</div>
				<Slider
					v-model="splash.gridIntensity"
					class="splash-slider"
					:disabled="!splash.gridFloor"
					:min="SPLASH_PREFS_LIMITS.gridIntensity.min"
					:max="SPLASH_PREFS_LIMITS.gridIntensity.max"
					:step="SPLASH_PREFS_LIMITS.gridIntensity.step"
					unit="%"
					:aria-label="formatMessage(messages.gridIntensity)"
				/>
			</div>
			<div class="splash-row">
				<div class="splash-row__copy">
					<span class="splash-row__title">
						{{ formatMessage(messages.backgroundEffects) }}
					</span>
					<span class="splash-row__hint">
						{{ formatMessage(messages.backgroundEffectsHint) }}
					</span>
				</div>
				<Toggle id="splash-background-effects" v-model="splash.backgroundEffects" />
			</div>
			<p class="splash-group__note">{{ backgroundEffectHint }}</p>
		</div>

		<div class="splash-group">
			<div class="splash-group__heading">
				<h3>{{ formatMessage(messages.groupTiming) }}</h3>
			</div>
			<div class="splash-row">
				<div class="splash-row__copy">
					<span class="splash-row__title">
						{{ formatMessage(messages.animationSpeed) }}
					</span>
					<span class="splash-row__hint">
						{{ formatMessage(messages.animationSpeedHint) }}
					</span>
				</div>
				<Slider
					v-model="splash.animationSpeed"
					class="splash-slider"
					:min="SPLASH_PREFS_LIMITS.animationSpeed.min"
					:max="SPLASH_PREFS_LIMITS.animationSpeed.max"
					:step="SPLASH_PREFS_LIMITS.animationSpeed.step"
					unit="%"
					:aria-label="formatMessage(messages.animationSpeed)"
				/>
			</div>
			<div class="splash-row">
				<div class="splash-row__copy">
					<span class="splash-row__title">
						{{ formatMessage(messages.minDisplay) }}
					</span>
					<span class="splash-row__hint">{{ formatMessage(messages.minDisplayHint) }}</span>
				</div>
				<Slider
					v-model="splash.minDisplayMs"
					class="splash-slider"
					:min="SPLASH_PREFS_LIMITS.minDisplayMs.min"
					:max="SPLASH_PREFS_LIMITS.minDisplayMs.max"
					:step="SPLASH_PREFS_LIMITS.minDisplayMs.step"
					unit="ms"
					:aria-label="formatMessage(messages.minDisplay)"
				/>
			</div>
			<div class="splash-row">
				<div class="splash-row__copy">
					<span class="splash-row__title">{{ formatMessage(messages.fadeOut) }}</span>
				</div>
				<Slider
					v-model="splash.fadeOutMs"
					class="splash-slider"
					:min="SPLASH_PREFS_LIMITS.fadeOutMs.min"
					:max="SPLASH_PREFS_LIMITS.fadeOutMs.max"
					:step="SPLASH_PREFS_LIMITS.fadeOutMs.step"
					unit="ms"
					:aria-label="formatMessage(messages.fadeOut)"
				/>
			</div>
			<div class="splash-row">
				<div class="splash-row__copy">
					<span class="splash-row__title">
						{{ formatMessage(messages.showLoadingMessage) }}
					</span>
					<span class="splash-row__hint">
						{{ formatMessage(messages.showLoadingMessageHint) }}
					</span>
				</div>
				<Toggle id="splash-loading-message" v-model="splash.showLoadingMessage" />
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
.splash-settings {
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
}

.splash-group {
	display: flex;
	flex-direction: column;
	gap: 0.7rem;
}

.splash-group__heading h3 {
	margin: 0;
	color: var(--color-contrast);
	font-size: 0.95rem;
	font-weight: 750;
}

.splash-group__heading p {
	margin: 0.25rem 0 0;
	color: var(--color-secondary);
	font-size: 0.8rem;
	line-height: 1.45;
}

.splash-group__note {
	margin: 0;
	color: var(--color-secondary);
	font-size: 0.78rem;
	line-height: 1.45;
}

.splash-subgroup {
	display: flex;
	flex-direction: column;
	gap: 0.6rem;
	padding: 0.85rem 0.95rem;
	border: 1px solid var(--color-divider);
	border-radius: var(--radius-lg);
	background: color-mix(in srgb, var(--color-raised-bg) 70%, transparent);
}

.splash-subgroup__heading {
	display: flex;
	flex-direction: column;
	gap: 0.15rem;
}

.splash-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1.25rem;
}

.splash-row__copy {
	display: flex;
	min-width: 0;
	flex-direction: column;
	gap: 0.15rem;
}

.splash-row__title {
	color: var(--color-contrast);
	font-size: 0.85rem;
	font-weight: 650;
}

.splash-row__hint {
	color: var(--color-secondary);
	font-size: 0.76rem;
	line-height: 1.4;
}

.splash-slider {
	max-width: 20rem;
	flex: 1 1 auto;
}

.splash-choices {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(min(100%, 8.5rem), 1fr));
	gap: 0.6rem;
}

.splash-choice {
	position: relative;
	display: flex;
	min-width: 0;
	flex-direction: column;
	gap: 0.5rem;
	padding: 0.55rem;
	border: 1px solid var(--color-divider);
	border-radius: var(--radius-lg);
	background: color-mix(in srgb, var(--color-raised-bg) 90%, transparent);
	color: var(--color-contrast);
	cursor: pointer;
	text-align: left;
	transition:
		transform 200ms ease,
		border-color 200ms ease,
		box-shadow 200ms ease;
}

.splash-choice:hover {
	border-color: color-mix(in srgb, var(--color-brand) 70%, var(--color-divider));
	transform: translateY(-1px);
}

.splash-choice:focus-visible {
	outline: 2px solid var(--color-focus-ring);
	outline-offset: 2px;
}

.splash-choice.is-selected {
	border-color: var(--color-brand);
	box-shadow: 0 0 0 1px var(--color-brand);
}

.splash-choice__art {
	position: relative;
	display: block;
	width: 100%;
	height: 3.1rem;
	overflow: hidden;
	border-radius: var(--radius-md);
	background:
		radial-gradient(ellipse at 50% 120%, rgba(252, 96, 0, 0.24), transparent 62%),
		linear-gradient(130deg, #171521, #17111e 55%, #101521);
}

.splash-choice__art::after {
	position: absolute;
	right: 18%;
	bottom: 22%;
	left: 18%;
	height: 0.3rem;
	content: '';
}

.splash-choice__art[data-style='bar']::after {
	border-radius: 999px;
	background: linear-gradient(90deg, #fcc000, #ff8a2a 45%, #fc0060);
	box-shadow: 0 0 8px rgba(252, 192, 0, 0.8);
}

.splash-choice__art[data-style='segments']::after {
	background: repeating-linear-gradient(90deg, #fcc000 0 0.42rem, transparent 0.42rem 0.55rem);
	box-shadow: 0 0 8px rgba(252, 192, 0, 0.55);
}

.splash-choice__art[data-style='ring']::after {
	right: auto;
	left: 50%;
	width: 1.6rem;
	height: 1.6rem;
	border-radius: 50%;
	background: conic-gradient(#fcc000 0 65%, rgba(72, 0, 16, 0.7) 65%);
	mask: radial-gradient(circle, transparent 0 55%, #000 57%);
	-webkit-mask: radial-gradient(circle, transparent 0 55%, #000 57%);
	transform: translateX(-50%);
}

.splash-choice__art[data-style='dots']::after {
	right: auto;
	left: 50%;
	width: 1.9rem;
	height: 0.3rem;
	background: radial-gradient(circle, #fcc000 0 32%, transparent 34%) 0 0 / 0.42rem 0.3rem repeat-x;
	transform: translateX(-50%);
}

.splash-choice__art[data-style='minimal']::after {
	right: 26%;
	left: 26%;
	height: 2px;
	border-radius: 999px;
	background: linear-gradient(90deg, #fcc000, #fc0060);
}

.splash-choice__art[data-logo] {
	display: grid;
	place-items: center;
}

.splash-choice__glyph {
	display: block;
	width: 2.6rem;
	height: 0.62rem;
	border-radius: 999px;
	background: linear-gradient(90deg, #ffe866, #fcc000 45%, #fc0060);
	box-shadow: 0 0 10px rgba(252, 192, 0, 0.6);
	transform-origin: center;
}

.splash-choice__art[data-logo='none'] .splash-choice__glyph {
	animation: none;
}

.splash-choice__art[data-logo='float'] .splash-choice__glyph {
	animation: choice-float 2.4s ease-in-out infinite;
}

.splash-choice__art[data-logo='breathe'] .splash-choice__glyph {
	animation: choice-breathe 2.2s ease-in-out infinite;
}

.splash-choice__art[data-logo='pulse'] .splash-choice__glyph {
	animation: choice-pulse 1.8s ease-in-out infinite;
}

.splash-choice__art[data-logo='tilt'] .splash-choice__glyph {
	animation: choice-tilt 3.2s ease-in-out infinite;
}

.splash-choice__art[data-logo='shimmer'] .splash-choice__glyph {
	animation: choice-float 3s ease-in-out infinite;
	background: linear-gradient(
		90deg,
		#ffe866 0%,
		#fcc000 35%,
		#ffffff 50%,
		#fc0060 65%,
		#ffe866 100%
	);
	background-size: 200% 100%;
}

.splash-choice__name {
	color: var(--color-contrast);
	font-size: 0.82rem;
	font-weight: 700;
}

.splash-choice__check {
	position: absolute;
	top: 0.6rem;
	right: 0.6rem;
	display: inline-flex;
	align-items: center;
	gap: 0.2rem;
	padding: 0.15rem 0.35rem;
	border-radius: 999px;
	background: rgba(20, 15, 23, 0.8);
	color: #ffe0a0;
	font-size: 0.6rem;
	font-weight: 750;

	:deep(svg) {
		width: 0.7rem;
		height: 0.7rem;
	}
}

.splash-preview-actions {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	gap: 1.25rem;
}

@keyframes choice-float {
	0%,
	100% {
		transform: translateY(0);
	}
	50% {
		transform: translateY(-0.28rem);
	}
}

@keyframes choice-breathe {
	0%,
	100% {
		transform: scale(1);
	}
	50% {
		transform: scale(1.12);
	}
}

@keyframes choice-pulse {
	0%,
	100% {
		opacity: 0.7;
		transform: scale(0.96);
	}
	50% {
		opacity: 1;
		transform: scale(1.04);
	}
}

@keyframes choice-tilt {
	0%,
	100% {
		transform: perspective(400px) rotateX(6deg) rotateY(-8deg);
	}
	50% {
		transform: perspective(400px) rotateX(-6deg) rotateY(10deg);
	}
}

@media (max-width: 700px) {
	.splash-row {
		flex-direction: column;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.splash-slider {
		width: 100%;
		max-width: none;
	}
}

@media (prefers-reduced-motion: reduce) {
	.splash-choice__glyph {
		animation: none !important;
	}
}
</style>
