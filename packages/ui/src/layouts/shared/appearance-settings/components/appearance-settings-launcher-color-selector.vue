<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { useVIntl } from '#ui/composables/i18n'

import {
	findLauncherGradient,
	isLauncherColorHex,
	LAUNCHER_COLOR_PRESETS,
	LAUNCHER_COLOR_THEME,
	LAUNCHER_GRADIENT_PRESETS,
	launcherGradientCss,
	launcherGradientValue,
	normalizeLauncherColorHex,
} from '../launcher-colors'
import { appearanceSettingsMessages } from '../messages'

const { formatMessage } = useVIntl()

const props = defineProps<{
	modelValue: string
}>()

const emit = defineEmits<{
	'update:modelValue': [value: string]
}>()

const presetLabels: Record<string, { id: string; defaultMessage: string }> = {
	gold: appearanceSettingsMessages.launcherColorGold,
	tangerine: appearanceSettingsMessages.launcherColorTangerine,
	magenta: appearanceSettingsMessages.launcherColorMagenta,
	rose: appearanceSettingsMessages.launcherColorRose,
	violet: appearanceSettingsMessages.launcherColorViolet,
	sapphire: appearanceSettingsMessages.launcherColorSapphire,
	aqua: appearanceSettingsMessages.launcherColorAqua,
	emerald: appearanceSettingsMessages.launcherColorEmerald,
	lime: appearanceSettingsMessages.launcherColorLime,
}

const gradientLabels: Record<string, { id: string; defaultMessage: string }> = {
	sunset: appearanceSettingsMessages.launcherGradientSunset,
	sunrise: appearanceSettingsMessages.launcherGradientSunrise,
	nebula: appearanceSettingsMessages.launcherGradientNebula,
	galaxy: appearanceSettingsMessages.launcherGradientGalaxy,
	lava: appearanceSettingsMessages.launcherGradientLava,
	ocean: appearanceSettingsMessages.launcherGradientOcean,
	aurora: appearanceSettingsMessages.launcherGradientAurora,
	frost: appearanceSettingsMessages.launcherGradientFrost,
	ender: appearanceSettingsMessages.launcherGradientEnder,
}

const selectedHex = computed(() =>
	isLauncherColorHex(props.modelValue) ? normalizeLauncherColorHex(props.modelValue) : null,
)
const selectedGradientId = computed(() => findLauncherGradient(props.modelValue)?.id ?? null)

const isCustomSelected = computed(
	() =>
		selectedHex.value !== null &&
		!LAUNCHER_COLOR_PRESETS.some(
			(preset) => normalizeLauncherColorHex(preset.hex) === selectedHex.value,
		),
)

function labelFor(presetId: string): string {
	const message = presetLabels[presetId]
	return message ? formatMessage(message) : presetId
}

function gradientLabelFor(presetId: string): string {
	const message = gradientLabels[presetId]
	return message ? formatMessage(message) : presetId
}

function select(value: string): void {
	if (value !== props.modelValue) emit('update:modelValue', value)
}

/*
 * Custom color. The native color picker fires `input` for every pixel the
 * pointer moves; recoloring the whole launcher that often made dragging stutter.
 * The swatch follows the pointer instantly from a local value, while the
 * launcher itself is recolored at most every CUSTOM_COMMIT_INTERVAL ms (and
 * exactly once more when the picker settles).
 */
const CUSTOM_COMMIT_INTERVAL = 90
const customDraft = ref<string | null>(null)
const customHex = computed(() => customDraft.value ?? selectedHex.value ?? '#fc0060')

/** The custom swatch names its current color instead of a separate label. */
const customTooltip = computed(() => {
	const label = formatMessage(appearanceSettingsMessages.launcherColorCustom)
	return isCustomSelected.value ? `${label} · ${customHex.value.toUpperCase()}` : label
})
let pendingCustom: string | null = null
let commitTimer: ReturnType<typeof setTimeout> | undefined
let lastCommit = 0

function commitCustom(): void {
	commitTimer = undefined
	if (pendingCustom === null) return
	lastCommit = performance.now()
	select(pendingCustom)
	pendingCustom = null
}

function onCustomInput(event: Event): void {
	const value = (event.target as HTMLInputElement).value
	if (!isLauncherColorHex(value)) return
	const hex = normalizeLauncherColorHex(value)
	customDraft.value = hex
	pendingCustom = hex
	if (commitTimer !== undefined) return
	const wait = Math.max(0, CUSTOM_COMMIT_INTERVAL - (performance.now() - lastCommit))
	commitTimer = setTimeout(commitCustom, wait)
}

function onCustomChange(event: Event): void {
	onCustomInput(event)
	clearTimeout(commitTimer)
	commitCustom()
}

watch(
	() => props.modelValue,
	() => {
		if (pendingCustom === null) customDraft.value = null
	},
)

onBeforeUnmount(() => {
	clearTimeout(commitTimer)
	commitCustom()
})
</script>

<template>
	<div class="launcher-color-picker">
		<div
			class="color-row"
			role="group"
			:aria-label="formatMessage(appearanceSettingsMessages.launcherColorSolids)"
		>
			<button
				v-tooltip="formatMessage(appearanceSettingsMessages.launcherColorTheme)"
				type="button"
				class="color-swatch"
				:class="{ selected: modelValue === LAUNCHER_COLOR_THEME }"
				:aria-label="formatMessage(appearanceSettingsMessages.launcherColorTheme)"
				:aria-pressed="modelValue === LAUNCHER_COLOR_THEME"
				@click="select(LAUNCHER_COLOR_THEME)"
			>
				<span class="swatch-face theme-face" aria-hidden="true"></span>
			</button>

			<button
				v-for="preset in LAUNCHER_COLOR_PRESETS"
				:key="preset.id"
				v-tooltip="labelFor(preset.id)"
				type="button"
				class="color-swatch"
				:class="{ selected: selectedHex === normalizeLauncherColorHex(preset.hex) }"
				:aria-label="labelFor(preset.id)"
				:aria-pressed="selectedHex === normalizeLauncherColorHex(preset.hex)"
				@click="select(normalizeLauncherColorHex(preset.hex))"
			>
				<span class="swatch-face" :style="{ background: preset.hex }" aria-hidden="true"></span>
			</button>

			<label v-tooltip="customTooltip" class="color-swatch" :class="{ selected: isCustomSelected }">
				<span class="swatch-face custom-face" :style="{ background: customHex }" aria-hidden="true">
					<input
						type="color"
						class="custom-input"
						:value="customHex"
						:aria-label="formatMessage(appearanceSettingsMessages.launcherColorCustom)"
						@input="onCustomInput"
						@change="onCustomChange"
					/>
				</span>
			</label>
		</div>

		<div
			class="color-row"
			role="group"
			:aria-label="formatMessage(appearanceSettingsMessages.launcherColorGradients)"
		>
			<button
				v-for="(preset, index) in LAUNCHER_GRADIENT_PRESETS"
				:key="preset.id"
				v-tooltip="gradientLabelFor(preset.id)"
				type="button"
				class="color-swatch"
				:style="index === 0 ? { gridColumnStart: 2 } : undefined"
				:class="{ selected: selectedGradientId === preset.id }"
				:aria-label="gradientLabelFor(preset.id)"
				:aria-pressed="selectedGradientId === preset.id"
				@click="select(launcherGradientValue(preset.id))"
			>
				<span
					class="swatch-face gradient-face"
					:style="{ backgroundImage: launcherGradientCss(preset) }"
					aria-hidden="true"
				></span>
			</button>
		</div>
	</div>
</template>

<style lang="scss" scoped>
/* One grid for both rows, so every gradient sits exactly under a solid
   color: the first row is Theme, nine colors and Custom; the gradients start
   under the first color. */
.launcher-color-picker {
	display: grid;
	grid-template-columns: repeat(11, 2.35rem);
	gap: var(--gap-md);
	align-items: center;
	justify-content: start;
}

.color-row {
	display: contents;
}

/* A soft sheen that drifts across gradient swatches on hover. */
.gradient-face::after {
	content: '';
	position: absolute;
	inset: 0;
	background: linear-gradient(
		120deg,
		transparent 35%,
		rgba(255, 255, 255, 0.35) 50%,
		transparent 65%
	);
	transform: translateX(-120%);
	transition: transform 0.45s ease;

	.color-swatch:hover & {
		transform: translateX(120%);
	}
}

.color-swatch {
	display: block;
	width: 2.35rem;
	height: 2.35rem;
	appearance: none;
	border: none;
	background: transparent;
	padding: 0;
	cursor: pointer;
	border-radius: var(--radius-max, 999px);

	&:focus-visible {
		outline: 2px solid var(--color-focus-ring);
		outline-offset: 2px;
	}
}

.swatch-face {
	display: block;
	width: 2.35rem;
	height: 2.35rem;
	border-radius: var(--radius-max, 999px);
	border: 2px solid var(--color-divider);
	box-shadow:
		inset 0 -3px 6px rgba(0, 0, 0, 0.22),
		inset 0 2px 3px rgba(255, 255, 255, 0.28);
	transition:
		transform 0.12s ease-in-out,
		border-color 0.12s ease-in-out,
		box-shadow 0.12s ease-in-out;
	position: relative;
	overflow: hidden;

	.color-swatch:hover & {
		transform: scale(1.08);
	}

	.color-swatch.selected & {
		border-color: var(--color-contrast);
		box-shadow:
			0 0 0 2px var(--color-brand),
			inset 0 -3px 6px rgba(0, 0, 0, 0.22),
			inset 0 2px 3px rgba(255, 255, 255, 0.28);
	}
}

.theme-face {
	background: conic-gradient(
		from 210deg,
		#fcc000,
		#ff6a00,
		#fc0060,
		#8b5cf6,
		#2b7fff,
		#00d7c7,
		#1bd96a,
		#fcc000
	);
}

.custom-face {
	cursor: pointer;
}

.custom-input {
	position: absolute;
	inset: 0;
	opacity: 0;
	width: 100%;
	height: 100%;
	border: none;
	padding: 0;
	cursor: pointer;
}
</style>
