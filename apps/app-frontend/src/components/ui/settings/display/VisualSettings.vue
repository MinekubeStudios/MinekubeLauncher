<script setup lang="ts">
import { CheckIcon, PlayIcon, SparklesIcon } from '@modrinth/assets'
import { defineMessages, SettingsDisclosure, Toggle, useVIntl } from '@modrinth/ui'
import { computed, ref } from 'vue'

import SplashSettings from '@/components/ui/settings/display/splash/SplashSettings.vue'
import {
	ANIMATION_STYLES,
	type AnimationStyle,
	EFFECT_STYLES,
	INTERFACE_GLOWS,
	type InterfaceGlow,
	useVisualSettings,
} from '@/composables/use-visual.ts'
import { useEffectStyleLabels } from '@/composables/use-visual-style-labels.ts'
import { launcherIcon } from '@/helpers/launcher-icons'

const { formatMessage } = useVIntl()
const {
	animationsEnabled,
	enhancedAnimations,
	enhancedEffects,
	animationStyle,
	effectStyle,
	sidebarCharacter,
	characterReactions,
	interfaceGlow,
	galaxyOutline,
} = useVisualSettings()

const messages = defineMessages({
	glowKicker: {
		id: 'app.settings.visual.kicker.interface-glow',
		defaultMessage: '05 · Interface glow',
	},
	glowTitle: { id: 'app.settings.visual.glow.title', defaultMessage: 'Glow on text and controls' },
	glowDescription: {
		id: 'app.settings.visual.glow.description',
		defaultMessage:
			'Lights up headings, labels, buttons and switches with a soft Minekube glow. It is static light, so it costs nothing while the launcher runs.',
	},
	glowOff: { id: 'app.settings.visual.glow.off', defaultMessage: 'Off' },
	glowGold: { id: 'app.settings.visual.glow.gold', defaultMessage: 'Gold' },
	glowMagenta: { id: 'app.settings.visual.glow.magenta', defaultMessage: 'Magenta' },
	galaxyTitle: { id: 'app.settings.visual.glow.galaxy-title', defaultMessage: 'Galaxy outline' },
	galaxyDescription: {
		id: 'app.settings.visual.glow.galaxy-description',
		defaultMessage:
			'Wraps every button and switch in a slowly turning ring of galaxy colours. Works with or without the glow and holds still when animations are off.',
	},
	studioEyebrow: {
		id: 'app.settings.visual.studio.eyebrow',
		defaultMessage: 'Minekube visual studio',
	},
	studioTitle: {
		id: 'app.settings.visual.studio.title',
		defaultMessage: 'A launcher that feels alive',
	},
	studioDescription: {
		id: 'app.settings.visual.studio.description',
		defaultMessage:
			'Shape the atmosphere with fluid motion, dimensional light and crisp, readable surfaces. Your choices preview instantly and stay in sync across the launcher.',
	},
	motionFoundationKicker: {
		id: 'app.settings.visual.kicker.motion-foundation',
		defaultMessage: '01 · Motion foundation',
	},
	motionSystemKicker: {
		id: 'app.settings.visual.kicker.motion-system',
		defaultMessage: '02 · Motion system',
	},
	ambientEffectsKicker: {
		id: 'app.settings.visual.kicker.ambient-effects',
		defaultMessage: '03 · Ambient effects',
	},
	companionKicker: {
		id: 'app.settings.visual.kicker.3d-companion',
		defaultMessage: '04 · 3D companion',
	},
	animationsTitle: {
		id: 'app.settings.visual.animations.title',
		defaultMessage: 'Launcher animations',
	},
	previewMark: {
		id: 'app.settings.visual.style.preview-mark',
		defaultMessage: 'MINEKUBE · WORLD SELECTED',
	},
	animationsDescription: {
		id: 'app.settings.visual.animations.description',
		defaultMessage:
			'Enable or disable all animations and transitions in the launcher. Turning them off can help on very weak hardware.',
	},
	enhancedTitle: {
		id: 'app.settings.visual.enhanced.title',
		defaultMessage: 'Enhanced Optimized Animations',
	},
	enhancedDescription: {
		id: 'app.settings.visual.enhanced.description',
		defaultMessage:
			'One motion system for the whole launcher: page changes, dialogs, menus, hover and press feedback all share the same timing, built only from smooth, GPU-friendly movement.',
	},
	styleTitle: {
		id: 'app.settings.visual.style.title',
		defaultMessage: 'Motion profile',
	},
	styleDescription: {
		id: 'app.settings.visual.style.description',
		defaultMessage:
			'Choose the character of the launcher’s movement. Every profile updates the live preview and shared interface transitions.',
	},
	styleSmooth: { id: 'app.settings.visual.style.smooth', defaultMessage: 'Smooth' },
	styleSmoothDesc: {
		id: 'app.settings.visual.style.smooth-desc',
		defaultMessage: 'Silky, balanced motion with gentle depth and a soft landing.',
	},
	stylePlayful: { id: 'app.settings.visual.style.playful', defaultMessage: 'Playful' },
	stylePlayfulDesc: {
		id: 'app.settings.visual.style.playful-desc',
		defaultMessage: 'Springy feedback, lively icons and satisfying little rebounds.',
	},
	styleSnappy: { id: 'app.settings.visual.style.snappy', defaultMessage: 'Snappy' },
	styleSnappyDesc: {
		id: 'app.settings.visual.style.snappy-desc',
		defaultMessage: 'Quick, precise transitions that get out of your way.',
	},
	styleCinematic: { id: 'app.settings.visual.style.cinematic', defaultMessage: 'Cinematic' },
	styleCinematicDesc: {
		id: 'app.settings.visual.style.cinematic-desc',
		defaultMessage: 'Dramatic entrances with layered depth and a gentle glow.',
	},
	styleArcade: { id: 'app.settings.visual.style.arcade', defaultMessage: 'Arcade' },
	styleArcadeDesc: {
		id: 'app.settings.visual.style.arcade-desc',
		defaultMessage: 'Bold, blocky steps inspired by the worlds you play.',
	},
	previewLabel: {
		id: 'app.settings.visual.style.preview-label',
		defaultMessage: 'Live motion preview',
	},
	previewButton: { id: 'app.settings.visual.style.preview-button', defaultMessage: 'Play' },
	previewCard: {
		id: 'app.settings.visual.style.preview-card',
		defaultMessage: 'A world of your own',
	},
	effectStyleTitle: {
		id: 'app.settings.visual.effect-style.title',
		defaultMessage: 'Choose your atmosphere',
	},
	effectStyleDescription: {
		id: 'app.settings.visual.effect-style.description',
		defaultMessage:
			'Every effect is drawn in a lightweight canvas layer with depth, soft lighting and carefully limited particle counts. Select a scene to preview it across the launcher.',
	},
	selected: {
		id: 'app.settings.visual.option.selected',
		defaultMessage: 'Selected',
	},
	characterTitle: {
		id: 'app.settings.visual.character.title',
		defaultMessage: 'Sidebar player character (Beta)',
	},
	characterDescription: {
		id: 'app.settings.visual.character.description',
		defaultMessage:
			'Shows your own Minecraft character in the bottom right corner once you are signed in. It waves hello, follows your mouse pointer with its whole body and wanders around its corner. Nothing is shown while no account is signed in.',
	},
	reactionsTitle: {
		id: 'app.settings.visual.character.reactions-title',
		defaultMessage: 'Let the character react to you',
	},
	reactionsDescription: {
		id: 'app.settings.visual.character.reactions-description',
		defaultMessage:
			'The character answers what you do: it carries a gear while this window is open, hops with a tick when you switch something on and shakes its head when you switch it off, cheers when a game launches and reads along on project pages. In quiet moments it has a repertoire of its own, keeps still while you are busy and gets sleepy late at night.',
	},
	characterCostTitle: {
		id: 'app.settings.visual.character.cost-title',
		defaultMessage: 'What it costs',
	},
	characterCost: {
		id: 'app.settings.visual.character.cost',
		defaultMessage:
			'It is a real 3D view, so a small WebGL canvas keeps drawing while the launcher is visible. It is rendered small at a modest resolution and stops completely while the window is hidden. On a weak GPU it is the first thing worth turning off.',
	},
	effectsTitle: {
		id: 'app.settings.visual.effects.title',
		defaultMessage: 'Enhanced Optimized Effects',
	},
	advancedAnimationsTitle: {
		id: 'app.settings.visual.advanced-animations.title',
		defaultMessage: 'Advanced animations options',
	},
	advancedAnimationsDescription: {
		id: 'app.settings.visual.advanced-animations.description',
		defaultMessage:
			'Full control over the animated loading screen: the wordmark and how it moves, the progress indicator, the starfield and nebulae around it, the particles drifting in the background and the timing of the whole sequence.',
	},
	effectsDescription: {
		id: 'app.settings.visual.effects.description',
		defaultMessage:
			'An animated atmosphere behind every screen. The scene is drawn on one lightweight canvas that thins itself out on slower hardware, never covers text and pauses whenever the launcher is hidden.',
	},
})

const effectLabels = useEffectStyleLabels()

const MotionIcon = launcherIcon('motion')
const SystemIcon = launcherIcon('performance')
const EffectsIcon = launcherIcon('visual')
const CompanionIcon = launcherIcon('profile')

const styleMessages: Record<
	AnimationStyle,
	{ name: keyof typeof messages; desc: keyof typeof messages }
> = {
	smooth: { name: 'styleSmooth', desc: 'styleSmoothDesc' },
	playful: { name: 'stylePlayful', desc: 'stylePlayfulDesc' },
	snappy: { name: 'styleSnappy', desc: 'styleSnappyDesc' },
	cinematic: { name: 'styleCinematic', desc: 'styleCinematicDesc' },
	arcade: { name: 'styleArcade', desc: 'styleArcadeDesc' },
}

/** Mirrors the profile tokens in `global.scss`, so each tile previews its own feel. */
const styleDemo: Record<AnimationStyle, { ease: string; duration: string }> = {
	smooth: { ease: 'cubic-bezier(0.25, 0.8, 0.25, 1)', duration: '1.1s' },
	playful: { ease: 'cubic-bezier(0.34, 1.5, 0.6, 1)', duration: '1.2s' },
	snappy: { ease: 'cubic-bezier(0.2, 0, 0, 1)', duration: '0.7s' },
	cinematic: { ease: 'cubic-bezier(0.16, 1, 0.3, 1)', duration: '1.6s' },
	arcade: { ease: 'steps(5, end)', duration: '1s' },
}

const styleOptions = computed(() =>
	ANIMATION_STYLES.map((value) => ({
		value,
		name: formatMessage(messages[styleMessages[value].name]),
		description: formatMessage(messages[styleMessages[value].desc]),
		demo: { '--demo-ease': styleDemo[value].ease, '--demo-duration': styleDemo[value].duration },
	})),
)

const effectOptions = computed(() =>
	EFFECT_STYLES.map((value) => ({
		value,
		name: effectLabels.name(value),
		description: effectLabels.description(value),
	})),
)

const motionOn = computed(() => animationsEnabled.value && enhancedAnimations.value)
const effectsOn = computed(() => animationsEnabled.value && enhancedEffects.value)
const companionOn = computed(() => animationsEnabled.value && sidebarCharacter.value)

const glowLabels: Record<InterfaceGlow, keyof typeof messages> = {
	off: 'glowOff',
	gold: 'glowGold',
	magenta: 'glowMagenta',
}

const glowOptions = computed(() =>
	INTERFACE_GLOWS.map((value) => ({ value, label: formatMessage(messages[glowLabels[value]]) })),
)

const GlowIcon = launcherIcon('glow')

const PARTICLES = [0, 1, 2, 3, 4, 5, 6, 7]
const advancedAnimationsExpanded = ref(false)
</script>

<template>
	<div class="studio">
		<section class="studio-hero">
			<div class="studio-hero__copy">
				<p class="studio-eyebrow">
					<SparklesIcon aria-hidden="true" />
					{{ formatMessage(messages.studioEyebrow) }}
				</p>
				<h2 class="studio-hero__title">{{ formatMessage(messages.studioTitle) }}</h2>
				<p class="studio-hero__text">{{ formatMessage(messages.studioDescription) }}</p>
			</div>
			<div class="studio-hero__art" aria-hidden="true">
				<span class="hero-cube hero-cube--back"></span>
				<span class="hero-cube hero-cube--mid"></span>
				<span class="hero-cube hero-cube--front"></span>
			</div>
		</section>

		<section class="studio-section">
			<div class="studio-section__head">
				<div class="studio-section__lead">
					<span class="studio-badge" aria-hidden="true"><MotionIcon /></span>
					<div>
						<p class="studio-kicker">{{ formatMessage(messages.motionFoundationKicker) }}</p>
						<h3 class="studio-section__title">{{ formatMessage(messages.animationsTitle) }}</h3>
						<p class="studio-section__text">{{ formatMessage(messages.animationsDescription) }}</p>
					</div>
				</div>
				<div class="studio-section__control">
					<Toggle id="minekube-animations-enabled" v-model="animationsEnabled" />
				</div>
			</div>
		</section>

		<section class="studio-section" :class="{ 'is-disabled': !animationsEnabled }">
			<div class="studio-section__head">
				<div class="studio-section__lead">
					<span class="studio-badge" aria-hidden="true"><SystemIcon /></span>
					<div>
						<p class="studio-kicker">{{ formatMessage(messages.motionSystemKicker) }}</p>
						<h3 class="studio-section__title">{{ formatMessage(messages.enhancedTitle) }}</h3>
						<p class="studio-section__text">{{ formatMessage(messages.enhancedDescription) }}</p>
					</div>
				</div>
				<div class="studio-section__control">
					<Toggle
						id="minekube-enhanced-animations"
						v-model="enhancedAnimations"
						:disabled="!animationsEnabled"
					/>
				</div>
			</div>
			<template v-if="motionOn">
				<div class="studio-divider"></div>
				<div class="studio-section__body pt-4">
					<div>
						<h4 class="studio-subhead">{{ formatMessage(messages.styleTitle) }}</h4>
						<p class="studio-subtext">{{ formatMessage(messages.styleDescription) }}</p>
					</div>
					<div
						class="studio-grid"
						role="radiogroup"
						:aria-label="formatMessage(messages.styleTitle)"
					>
						<button
							v-for="option in styleOptions"
							:key="option.value"
							type="button"
							role="radio"
							class="studio-choice"
							:class="{ 'is-selected': animationStyle === option.value }"
							:aria-checked="animationStyle === option.value"
							@click="animationStyle = option.value"
						>
							<span class="studio-choice__art motion-art" :style="option.demo" aria-hidden="true">
								<span class="motion-art__rail"></span>
								<span class="motion-art__block"></span>
							</span>
							<span v-if="animationStyle === option.value" class="studio-choice__check">
								<CheckIcon aria-hidden="true" />{{ formatMessage(messages.selected) }}
							</span>
							<span class="studio-choice__name">{{ option.name }}</span>
							<span class="studio-choice__desc">{{ option.description }}</span>
						</button>
					</div>
					<div class="live-preview" aria-hidden="true">
						<span class="live-preview__label">{{ formatMessage(messages.previewLabel) }}</span>
						<div :key="animationStyle" class="live-preview__stage">
							<div class="live-preview__card">
								<span class="live-preview__mark">{{ formatMessage(messages.previewMark) }}</span>
								<strong>{{ formatMessage(messages.previewCard) }}</strong>
								<span class="live-preview__bar"></span>
							</div>
							<span class="live-preview__button">
								<PlayIcon />
								{{ formatMessage(messages.previewButton) }}
							</span>
						</div>
					</div>
				</div>
			</template>
		</section>

		<section class="studio-section" :class="{ 'is-disabled': !animationsEnabled }">
			<div class="studio-section__head">
				<div class="studio-section__lead">
					<span class="studio-badge" aria-hidden="true"><EffectsIcon /></span>
					<div>
						<p class="studio-kicker">{{ formatMessage(messages.ambientEffectsKicker) }}</p>
						<h3 class="studio-section__title">{{ formatMessage(messages.effectsTitle) }}</h3>
						<p class="studio-section__text">{{ formatMessage(messages.effectsDescription) }}</p>
					</div>
				</div>
				<div class="studio-section__control">
					<Toggle
						id="minekube-enhanced-effects"
						v-model="enhancedEffects"
						:disabled="!animationsEnabled"
					/>
				</div>
			</div>
			<template v-if="effectsOn">
				<div class="studio-divider"></div>
				<div class="studio-section__body pt-4">
					<div>
						<h4 class="studio-subhead">{{ formatMessage(messages.effectStyleTitle) }}</h4>
						<p class="studio-subtext">{{ formatMessage(messages.effectStyleDescription) }}</p>
					</div>
					<div
						class="studio-grid"
						role="radiogroup"
						:aria-label="formatMessage(messages.effectStyleTitle)"
					>
						<button
							v-for="option in effectOptions"
							:key="option.value"
							type="button"
							role="radio"
							class="studio-choice"
							:class="{ 'is-selected': effectStyle === option.value }"
							:aria-checked="effectStyle === option.value"
							@click="effectStyle = option.value"
						>
							<span
								class="studio-choice__art scene-art"
								:data-scene="option.value"
								aria-hidden="true"
							>
								<span
									v-for="particle in PARTICLES"
									:key="particle"
									class="scene-art__particle"
									:style="{ '--i': particle }"
								></span>
								<svg
									v-if="option.value === 'lightning'"
									class="scene-art__bolt"
									viewBox="0 0 40 68"
									fill="none"
								>
									<path d="M24 0 L12 28 L22 30 L8 68 L30 24 L19 22 L28 0 Z" />
								</svg>
							</span>
							<span v-if="effectStyle === option.value" class="studio-choice__check">
								<CheckIcon aria-hidden="true" />{{ formatMessage(messages.selected) }}
							</span>
							<span class="studio-choice__name">{{ option.name }}</span>
							<span class="studio-choice__desc">{{ option.description }}</span>
						</button>
					</div>
				</div>
			</template>
		</section>

		<section class="studio-section" :class="{ 'is-disabled': !animationsEnabled }">
			<div class="studio-section__head">
				<div class="studio-section__lead">
					<span class="studio-badge" aria-hidden="true"><CompanionIcon /></span>
					<div>
						<p class="studio-kicker">{{ formatMessage(messages.companionKicker) }}</p>
						<h3 class="studio-section__title">{{ formatMessage(messages.characterTitle) }}</h3>
						<p class="studio-section__text">{{ formatMessage(messages.characterDescription) }}</p>
					</div>
				</div>
				<div class="studio-section__control">
					<Toggle
						id="minekube-sidebar-character"
						v-model="sidebarCharacter"
						:disabled="!animationsEnabled"
					/>
				</div>
			</div>
			<template v-if="companionOn">
				<div class="studio-divider"></div>
				<div class="studio-section__body pt-4">
					<div class="studio-row">
						<div>
							<h4 class="studio-subhead">{{ formatMessage(messages.reactionsTitle) }}</h4>
							<p class="studio-subtext">{{ formatMessage(messages.reactionsDescription) }}</p>
						</div>
						<Toggle id="minekube-character-reactions" v-model="characterReactions" />
					</div>
					<p class="studio-note m-0">
						<strong>{{ formatMessage(messages.characterCostTitle) }}</strong>
						{{ formatMessage(messages.characterCost) }}
					</p>
				</div>
			</template>
		</section>

		<section class="studio-section">
			<div class="studio-section__head">
				<div class="studio-section__lead">
					<span class="studio-badge" aria-hidden="true"><GlowIcon /></span>
					<div>
						<p class="studio-kicker">{{ formatMessage(messages.glowKicker) }}</p>
						<h3 class="studio-section__title">{{ formatMessage(messages.glowTitle) }}</h3>
						<p class="studio-section__text">{{ formatMessage(messages.glowDescription) }}</p>
					</div>
				</div>
			</div>
			<div class="studio-section__body">
				<div class="glow-picker">
					<div
						class="studio-segmented"
						role="radiogroup"
						:aria-label="formatMessage(messages.glowTitle)"
					>
						<button
							v-for="option in glowOptions"
							:key="option.value"
							type="button"
							role="radio"
							class="studio-segment"
							:class="{ 'is-selected': interfaceGlow === option.value }"
							:aria-checked="interfaceGlow === option.value"
							@click="interfaceGlow = option.value"
						>
							<span class="glow-swatch" :data-glow="option.value" aria-hidden="true"></span>
							{{ option.label }}
						</button>
					</div>
				</div>
				<div class="studio-row">
					<div>
						<h4 class="studio-subhead">{{ formatMessage(messages.galaxyTitle) }}</h4>
						<p class="studio-subtext">{{ formatMessage(messages.galaxyDescription) }}</p>
					</div>
					<Toggle id="minekube-galaxy-outline" v-model="galaxyOutline" />
				</div>
			</div>
		</section>

		<SettingsDisclosure
			v-model="advancedAnimationsExpanded"
			class="mt-1"
			:title="formatMessage(messages.advancedAnimationsTitle)"
			:description="formatMessage(messages.advancedAnimationsDescription)"
		>
			<SplashSettings />
		</SettingsDisclosure>
	</div>
</template>

<style lang="scss" scoped>
@import './studio.scss';

.studio-hero__art {
	position: relative;
	flex: 0 0 8.5rem;
	height: 6.5rem;
}

.hero-cube {
	position: absolute;
	width: 2.6rem;
	height: 2.6rem;
	border-radius: 0.55rem;
	background: linear-gradient(140deg, #ffe866, #fcc000 40%, #fc6000 75%, #fc0060);
	box-shadow:
		inset 0 2px 0 rgba(255, 255, 255, 0.45),
		inset 0 -4px 0 rgba(72, 0, 0, 0.35);
	animation: hero-float 5.6s ease-in-out infinite;

	&--back {
		top: 0.2rem;
		left: 4.8rem;
		width: 1.8rem;
		height: 1.8rem;
		opacity: 0.55;
		animation-delay: -1.8s;
	}

	&--mid {
		top: 2.9rem;
		left: 0.6rem;
		width: 2.1rem;
		height: 2.1rem;
		opacity: 0.8;
		animation-delay: -3.4s;
	}

	&--front {
		top: 1.5rem;
		left: 2.9rem;
		width: 3rem;
		height: 3rem;
	}
}

.glow-swatch {
	display: inline-block;
	width: 0.7rem;
	height: 0.7rem;
	margin-right: 0.35rem;
	border-radius: 50%;
	vertical-align: -0.05rem;
	background: var(--color-divider);

	&[data-glow='gold'] {
		background: #fcc000;
		box-shadow: 0 0 8px rgba(252, 192, 0, 0.8);
	}

	&[data-glow='magenta'] {
		background: #fc0060;
		box-shadow: 0 0 8px rgba(252, 0, 96, 0.8);
	}
}

@keyframes hero-float {
	0%,
	100% {
		transform: translateY(0) rotate(-6deg);
	}
	50% {
		transform: translateY(-0.55rem) rotate(6deg);
	}
}

.motion-art__rail {
	position: absolute;
	right: 1rem;
	bottom: 1.15rem;
	left: 1rem;
	height: 2px;
	border-radius: 2px;
	background: rgba(255, 255, 255, 0.14);
}

.motion-art__block {
	position: absolute;
	bottom: 1.4rem;
	left: 1rem;
	width: 1.2rem;
	height: 1.2rem;
	border-radius: 0.3rem;
	background: linear-gradient(140deg, #ffe866, #fc6000 60%, #fc0060);
	box-shadow: 0 0 14px rgba(252, 140, 0, 0.45);
	animation: motion-travel var(--demo-duration) var(--demo-ease) infinite alternate;
	animation-play-state: paused;
}

.studio-choice:is(:hover, .is-selected) .motion-art__block {
	animation-play-state: running;
}

@keyframes motion-travel {
	from {
		transform: translateX(0) rotate(0deg);
	}
	to {
		transform: translateX(calc(7.4rem - 1.2rem)) rotate(90deg);
	}
}

.live-preview {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.live-preview__label {
	color: var(--color-secondary);
	font-size: 0.72rem;
	font-weight: 800;
	letter-spacing: 0.1em;
	text-transform: uppercase;
}

.live-preview__stage {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	padding: 1rem 1.1rem;
	overflow: hidden;
	border: 1px solid var(--color-divider);
	border-radius: 0.85rem;
	background:
		radial-gradient(80% 140% at 0% 100%, rgba(252, 192, 0, 0.12), transparent 60%), var(--color-bg);
}

.live-preview__card {
	display: flex;
	flex-direction: column;
	gap: 0.3rem;
	min-width: 0;
	padding: 0.75rem 0.9rem;
	border: 1px solid var(--color-divider);
	border-radius: 0.7rem;
	background: var(--color-raised-bg);
	animation: preview-enter calc(var(--mk-dur-slow) * 1.4) var(--mk-ease-out) both;

	strong {
		color: var(--color-contrast);
		font-size: 0.95rem;
	}
}

.live-preview__mark {
	color: var(--color-brand);
	font-size: 0.62rem;
	font-weight: 800;
	letter-spacing: 0.12em;
}

.live-preview__bar {
	width: 7rem;
	height: 0.3rem;
	border-radius: 999px;
	background: linear-gradient(90deg, #fcc000, #fc0060);
	transform-origin: left center;
	animation: preview-bar calc(var(--mk-dur-slow) * 3) var(--mk-ease-out) both;
	animation-delay: var(--mk-dur-fast);
}

.live-preview__button {
	display: inline-flex;
	flex: 0 0 auto;
	align-items: center;
	gap: 0.4rem;
	padding: 0.55rem 1rem;
	border-radius: 0.65rem;
	background: linear-gradient(140deg, #fcc000, #fc6000);
	color: #2a0008;
	font-size: 0.85rem;
	font-weight: 800;
	animation: preview-enter calc(var(--mk-dur-slow) * 1.4) var(--mk-ease-out) both;
	animation-delay: var(--mk-dur-fast);

	:deep(svg) {
		width: 0.9rem;
		height: 0.9rem;
	}
}

@keyframes preview-enter {
	from {
		opacity: 0;
		transform: translateY(var(--mk-rise, 10px)) scale(var(--mk-pop, 0.97));
	}
	to {
		opacity: 1;
		transform: none;
	}
}

@keyframes preview-bar {
	from {
		transform: scaleX(0);
	}
	to {
		transform: scaleX(1);
	}
}

.scene-art__particle {
	--x: calc(8% + var(--i) * 12%);
	position: absolute;
	top: 0;
	left: var(--x);
	width: 0.4rem;
	height: 0.4rem;
	border-radius: 50%;
	background: #ffd25a;
	box-shadow: 0 0 8px currentColor;
	color: #ffb000;
	opacity: 0;
	animation: scene-rise 2.8s linear infinite;
	animation-delay: calc(var(--i) * -0.37s);
	animation-play-state: paused;
}

.studio-choice:is(:hover, .is-selected) .scene-art__particle,
.studio-choice:is(:hover, .is-selected) .scene-art__bolt {
	animation-play-state: running;
}

.scene-art[data-scene='cubes'] .scene-art__particle {
	width: 0.55rem;
	height: 0.55rem;
	border-radius: 0.12rem;
	background: linear-gradient(140deg, #ffe866, #fc6000 60%, #fc0060);
	color: #fc8c00;
	animation-duration: 3.6s;
}

.scene-art[data-scene='embers'] .scene-art__particle {
	width: 0.28rem;
	height: 0.28rem;
	background: #ffcf6a;
	color: #ff5a1f;
	animation-name: scene-rise, scene-flicker;
	animation-duration: 1.9s, 0.5s;
}

.scene-art[data-scene='snow'] {
	background: linear-gradient(160deg, #18202e, #101522);
}

.scene-art[data-scene='snow'] .scene-art__particle {
	background: #ffffff;
	color: #cfe8ff;
	animation-name: scene-fall;
	animation-duration: 3.4s;
}

.scene-art[data-scene='fireflies'] {
	background: linear-gradient(160deg, #10180f, #0d1210);
}

.scene-art[data-scene='fireflies'] .scene-art__particle {
	top: calc(14% + var(--i) * 9%);
	background: #f3ff8a;
	color: #d6f54a;
	animation-name: scene-glow;
	animation-duration: 2.4s;
}

.scene-art[data-scene='aurora'] {
	background: linear-gradient(160deg, #0d1022, #12091a);
}

.scene-art[data-scene='aurora'] .scene-art__particle {
	top: 18%;
	left: -40%;
	width: 140%;
	height: 1.6rem;
	border-radius: 50%;
	background: linear-gradient(90deg, transparent, #4de2ff, #7a5cff, #fc0060, transparent);
	box-shadow: none;
	opacity: 0.35;
	animation-name: scene-aurora;
	animation-duration: 6s;
}

.scene-art[data-scene='aurora'] .scene-art__particle:nth-child(n + 3) {
	display: none;
}

.scene-art[data-scene='aurora'] .scene-art__particle:nth-child(2) {
	top: 42%;
	background: linear-gradient(90deg, transparent, #ffe866, #ff8a2a, #fc0060, transparent);
	animation-direction: reverse;
}

.scene-art[data-scene='galaxy'] {
	background:
		radial-gradient(50% 60% at 50% 50%, rgba(139, 108, 255, 0.45), transparent 70%),
		linear-gradient(160deg, #0c0a1c, #120a1e);
}

.scene-art[data-scene='galaxy'] .scene-art__particle {
	top: 50%;
	left: 50%;
	width: 0.25rem;
	height: 0.25rem;
	margin: -0.125rem;
	background: #ffffff;
	color: #c9bfff;
	opacity: 0.9;
	transform-origin: 0 0;
	animation-name: scene-orbit;
	animation-duration: calc(4s + var(--i) * 0.7s);
}

.scene-art[data-scene='lightning'] {
	background: linear-gradient(160deg, #0b1424, #0a0f1c);
}

.scene-art[data-scene='lightning'] .scene-art__particle {
	background: #bdf0ff;
	color: #6ecbff;
	animation-duration: 3.2s;
}

.scene-art__bolt {
	position: absolute;
	top: 0.2rem;
	left: 44%;
	width: 1.4rem;
	height: 3.8rem;
	fill: #e6f8ff;
	filter: drop-shadow(0 0 4px #6ecbff);
	opacity: 0;
	animation: scene-bolt 2.6s linear infinite;
	animation-play-state: paused;
}

@keyframes scene-rise {
	0% {
		opacity: 0;
		transform: translateY(4.6rem);
	}
	15%,
	80% {
		opacity: 0.95;
	}
	100% {
		opacity: 0;
		transform: translateY(-0.6rem) rotate(120deg);
	}
}

@keyframes scene-fall {
	0% {
		opacity: 0;
		transform: translate(0, -0.6rem);
	}
	15%,
	80% {
		opacity: 0.95;
	}
	100% {
		opacity: 0;
		transform: translate(0.6rem, 4.6rem);
	}
}

@keyframes scene-flicker {
	50% {
		filter: brightness(1.6);
	}
}

@keyframes scene-glow {
	0%,
	100% {
		opacity: 0.1;
		transform: translate(0, 0);
	}
	50% {
		opacity: 1;
		transform: translate(0.4rem, -0.3rem);
	}
}

@keyframes scene-aurora {
	0%,
	100% {
		transform: translateX(-8%) scaleY(0.8);
	}
	50% {
		transform: translateX(8%) scaleY(1.2);
	}
}

@keyframes scene-orbit {
	from {
		transform: rotate(0deg) translateX(calc(0.9rem + var(--i) * 0.42rem)) scaleY(0.6);
	}
	to {
		transform: rotate(360deg) translateX(calc(0.9rem + var(--i) * 0.42rem)) scaleY(0.6);
	}
}

@keyframes scene-bolt {
	0%,
	70%,
	100% {
		opacity: 0;
	}
	72%,
	78% {
		opacity: 1;
	}
	75% {
		opacity: 0.3;
	}
}
</style>
