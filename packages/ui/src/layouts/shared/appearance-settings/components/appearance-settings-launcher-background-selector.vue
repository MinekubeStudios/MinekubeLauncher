<script setup lang="ts">
import { CheckIcon, EyeIcon, ImageIcon, PlusIcon, SparklesIcon, TrashIcon } from '@modrinth/assets'
import { computed } from 'vue'

import Toggle from '#ui/components/base/Toggle.vue'
import { type MessageDescriptor, useVIntl } from '#ui/composables/i18n'

import {
	LAUNCHER_BACKGROUND_MODES,
	LAUNCHER_BACKGROUND_NONE,
	type LauncherBackgroundMode,
	type LauncherBackgroundOption,
} from '../launcher-background'
import { appearanceSettingsMessages as messages } from '../messages'

const { formatMessage } = useVIntl()

const props = withDefaults(
	defineProps<{
		modelValue: string
		mode: string
		transparent?: boolean
		options: readonly LauncherBackgroundOption[]
		importing?: boolean
	}>(),
	{
		transparent: false,
		importing: false,
	},
)

const emit = defineEmits<{
	'update:modelValue': [value: string]
	'update:mode': [value: LauncherBackgroundMode]
	'update:transparent': [value: boolean]
	import: []
	remove: [id: string]
}>()

const modeMessages: Record<
	LauncherBackgroundMode,
	{ label: MessageDescriptor; description: MessageDescriptor }
> = {
	blur: {
		label: messages.launcherBackgroundBlur,
		description: messages.launcherBackgroundBlurDescription,
	},
	sharp: {
		label: messages.launcherBackgroundSharp,
		description: messages.launcherBackgroundSharpDescription,
	},
}

const wallpaperSelected = computed(() => props.modelValue !== LAUNCHER_BACKGROUND_NONE)

function modeLabel(mode: LauncherBackgroundMode): string {
	return formatMessage(modeMessages[mode].label)
}

function modeDescription(mode: LauncherBackgroundMode): string {
	return formatMessage(modeMessages[mode].description)
}

function selectWallpaper(id: string): void {
	emit('update:modelValue', id)
}

function selectMode(mode: LauncherBackgroundMode): void {
	emit('update:mode', mode)
}
</script>

<template>
	<div class="launcher-background-picker">
		<div class="wallpaper-grid">
			<button
				type="button"
				class="wallpaper-tile is-default"
				:class="{ selected: !wallpaperSelected }"
				:aria-pressed="!wallpaperSelected"
				@click="selectWallpaper(LAUNCHER_BACKGROUND_NONE)"
			>
				<span class="tile-preview is-empty" aria-hidden="true"></span>
				<span class="tile-label">{{ formatMessage(messages.launcherBackgroundNone) }}</span>
				<span v-if="!wallpaperSelected" class="tile-check" aria-hidden="true">
					<CheckIcon />
				</span>
			</button>

			<div v-for="option in options" :key="option.id" class="wallpaper-tile-wrap">
				<button
					type="button"
					class="wallpaper-tile"
					:class="{ selected: modelValue === option.id }"
					:aria-pressed="modelValue === option.id"
					:title="option.label"
					@click="selectWallpaper(option.id)"
				>
					<span
						v-if="option.previewUrl"
						class="tile-preview"
						:style="{ backgroundImage: `url(${option.previewUrl})` }"
						aria-hidden="true"
					></span>
					<span v-else class="tile-preview is-empty" aria-hidden="true">
						<ImageIcon />
					</span>
					<span class="tile-label">{{ option.label }}</span>
					<span v-if="modelValue === option.id" class="tile-check" aria-hidden="true">
						<CheckIcon />
					</span>
				</button>
				<button
					v-if="option.custom"
					v-tooltip="formatMessage(messages.launcherBackgroundRemove)"
					type="button"
					class="tile-remove"
					:aria-label="formatMessage(messages.launcherBackgroundRemove)"
					@click.stop="emit('remove', option.id)"
				>
					<TrashIcon />
				</button>
			</div>

			<button
				type="button"
				class="wallpaper-tile is-import"
				:disabled="importing"
				@click="emit('import')"
			>
				<span class="tile-preview is-import" aria-hidden="true">
					<PlusIcon />
				</span>
				<span class="tile-label">
					{{
						importing
							? formatMessage(messages.launcherBackgroundImporting)
							: formatMessage(messages.launcherBackgroundImport)
					}}
				</span>
			</button>
		</div>

		<p class="import-hint">{{ formatMessage(messages.launcherBackgroundImportHint) }}</p>

		<div v-if="wallpaperSelected" class="background-mode">
			<div class="mode-heading">
				<h3 class="m-0 text-base font-semibold text-contrast">
					{{ formatMessage(messages.launcherBackgroundModeTitle) }}
				</h3>
				<p class="m-0 mt-1 text-sm text-secondary">
					{{ formatMessage(messages.launcherBackgroundModeDescription) }}
				</p>
			</div>

			<div
				class="mode-options"
				role="radiogroup"
				:aria-label="formatMessage(messages.launcherBackgroundModeTitle)"
			>
				<button
					v-for="modeOption in LAUNCHER_BACKGROUND_MODES"
					:key="modeOption"
					type="button"
					role="radio"
					:aria-checked="mode === modeOption"
					class="mode-option"
					:class="{ selected: mode === modeOption }"
					@click="selectMode(modeOption)"
				>
					<span class="mode-swatch" aria-hidden="true">
						<span class="mode-art" :class="`is-${modeOption}`"></span>
						<SparklesIcon v-if="modeOption === 'blur'" class="mode-icon" />
						<EyeIcon v-else class="mode-icon" />
					</span>
					<span class="mode-copy">
						<span class="mode-label">{{ modeLabel(modeOption) }}</span>
						<span class="mode-description">{{ modeDescription(modeOption) }}</span>
					</span>
				</button>
			</div>

			<div class="transparent-row">
				<div class="transparent-copy">
					<span id="launcher-background-transparent-label" class="transparent-title">
						{{ formatMessage(messages.launcherBackgroundTransparentTitle) }}
					</span>
					<span class="transparent-description">
						{{ formatMessage(messages.launcherBackgroundTransparentDescription) }}
					</span>
				</div>
				<Toggle
					:model-value="transparent"
					aria-labelledby="launcher-background-transparent-label"
					@update:model-value="emit('update:transparent', !!$event)"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.transparent-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	margin-top: 0.75rem;
	padding: 0.875rem 1rem;
	border: 1px solid var(--color-divider);
	border-radius: var(--radius-lg, 0.75rem);
	background: var(--color-bg);
}

.transparent-copy {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
	min-width: 0;
}

.transparent-title {
	font-size: 0.95rem;
	font-weight: 700;
	color: var(--color-contrast);
}

.transparent-description {
	font-size: 0.85rem;
	line-height: 1.4;
	color: var(--color-secondary);
}

.wallpaper-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 0.75rem;
}

.wallpaper-tile-wrap {
	position: relative;
	display: flex;
	min-width: 0;
}

.wallpaper-tile {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: var(--gap-xs);
	width: 100%;
	min-width: 0;
	padding: 0.42rem;
	border: 1px solid var(--color-divider);
	border-radius: var(--radius-lg);
	background: linear-gradient(145deg, var(--surface-3), var(--surface-1));
	color: var(--color-contrast);
	cursor: pointer;
	text-align: left;
	transition:
		border-color 220ms ease,
		box-shadow 260ms ease,
		transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1),
		background-color 220ms ease;

	&:hover {
		transform: translateY(-3px) perspective(700px) rotateX(1deg);
		border-color: var(--color-brand);
		box-shadow: 0 0.75rem 1.7rem rgba(0, 0, 0, 0.25);
	}

	&:focus-visible {
		outline: 2px solid var(--color-focus-ring);
		outline-offset: 3px;
	}

	&.selected {
		border-color: var(--color-brand);
		box-shadow:
			0 0 0 1px var(--color-brand),
			0 0.7rem 1.55rem rgba(0, 0, 0, 0.18);
	}
}

.tile-preview {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	aspect-ratio: 16 / 10;
	width: 100%;
	overflow: hidden;
	border-radius: calc(var(--radius-md) + 1px);
	background-color: var(--surface-3);
	background-position: center;
	background-size: cover;
	background-repeat: no-repeat;
	color: var(--color-secondary);
	transform: translateZ(0);
	transition:
		filter 280ms ease,
		transform 480ms cubic-bezier(0.2, 0.8, 0.2, 1);

	&::before,
	&::after {
		position: absolute;
		inset: 0;
		pointer-events: none;
		content: '';
	}

	&::before {
		background:
			radial-gradient(ellipse at 78% 12%, rgba(255, 255, 255, 0.22), transparent 38%),
			linear-gradient(145deg, rgba(13, 13, 24, 0.02), rgba(13, 13, 24, 0.28));
		opacity: 0.75;
	}

	&::after {
		background: linear-gradient(0deg, rgba(8, 8, 14, 0.62), transparent 57%);
	}

	:deep(svg) {
		position: relative;
		z-index: 1;
		width: 1.35rem;
		height: 1.35rem;
	}

	&.is-empty {
		border: 1px dashed var(--color-divider);
		background-image: repeating-linear-gradient(
			45deg,
			rgba(127, 127, 127, 0.18) 0 6px,
			transparent 6px 12px
		);
	}

	&.is-import {
		border: 1px dashed var(--color-brand);
		background: var(--color-brand-highlight);
		color: var(--color-brand);

		&::before,
		&::after {
			display: none;
		}
	}

	.wallpaper-tile:hover & {
		filter: saturate(1.2) brightness(1.08);
		transform: scale(1.025);
	}
}

.tile-label {
	position: relative;
	z-index: 1;
	overflow: hidden;
	padding: 0.08rem 0.2rem 0.1rem;
	font-size: 0.82rem;
	font-weight: 700;
	line-height: 1.2;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.tile-check {
	position: absolute;
	top: 0.68rem;
	left: 0.68rem;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1.15rem;
	height: 1.15rem;
	border-radius: var(--radius-max, 999px);
	background: var(--color-brand);
	color: var(--color-accent-contrast);

	:deep(svg) {
		width: 0.8rem;
		height: 0.8rem;
	}
}

.tile-remove {
	position: absolute;
	top: 0.62rem;
	right: 0.62rem;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1.5rem;
	height: 1.5rem;
	padding: 0;
	border: 1px solid rgba(255, 255, 255, 0.3);
	border-radius: var(--radius-max, 999px);
	background: rgba(12, 12, 18, 0.86);
	color: rgba(255, 255, 255, 0.86);
	cursor: pointer;
	opacity: 0;
	transition:
		opacity 180ms ease,
		color 180ms ease,
		background-color 180ms ease,
		transform 180ms ease;

	:deep(svg) {
		width: 0.85rem;
		height: 0.85rem;
	}

	.wallpaper-tile-wrap:hover &,
	&:focus-visible {
		opacity: 1;
	}

	&:hover {
		transform: scale(1.08);
		background: rgba(12, 12, 18, 0.96);
		color: var(--color-red, #ff4d4d);
	}
}

.wallpaper-tile.is-import {
	justify-content: center;
	border-style: dashed;
	text-align: center;
	align-items: center;

	&:disabled {
		cursor: progress;
		opacity: 0.7;
	}
}

.import-hint {
	margin: var(--gap-sm) 0 0;
	font-size: 0.8rem;
	color: var(--color-secondary);
}

.background-mode {
	margin-top: var(--gap-lg);
	padding-top: var(--gap-md);
	border-top: 1px dashed var(--color-divider);
}

.mode-options {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
	gap: var(--gap-md);
	margin-top: var(--gap-md);
}

.mode-option {
	display: flex;
	align-items: center;
	gap: var(--gap-md);
	padding: var(--gap-md);
	border: 1px solid var(--color-divider);
	border-radius: var(--radius-lg);
	background: linear-gradient(145deg, var(--surface-3), var(--surface-1));
	color: var(--color-contrast);
	cursor: pointer;
	text-align: left;
	transition:
		transform 220ms ease,
		border-color 220ms ease,
		box-shadow 220ms ease;

	&:hover {
		transform: translateY(-2px);
		border-color: var(--color-brand);
		box-shadow: 0 0.6rem 1.3rem rgba(0, 0, 0, 0.16);
	}

	&:focus-visible {
		outline: 2px solid var(--color-focus-ring);
		outline-offset: 2px;
	}

	&.selected {
		border-color: var(--color-brand);
		box-shadow:
			0 0 0 1px var(--color-brand),
			0 0.6rem 1.3rem rgba(0, 0, 0, 0.12);
	}
}

.mode-swatch {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: 2.6rem;
	height: 2.6rem;
	overflow: hidden;
	border: 1px solid rgba(255, 255, 255, 0.16);
	border-radius: var(--radius-md);
	color: rgba(0, 0, 0, 0.55);
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, 0.22),
		0 0.35rem 0.75rem rgba(0, 0, 0, 0.2);
	perspective: 180px;
}

.mode-art {
	position: absolute;
	inset: -20%;
	background: linear-gradient(135deg, #fc0060 0%, #fc9c00 55%, #fcc000 100%);
	transform: translateZ(-8px) scale(1.08);
	transition:
		filter 260ms ease,
		transform 500ms ease;

	&.is-blur {
		filter: blur(6px) saturate(1.1);
	}

	&.is-sharp {
		background-image:
			linear-gradient(rgba(0, 0, 0, 0.16) 1px, transparent 1px),
			linear-gradient(90deg, rgba(0, 0, 0, 0.16) 1px, transparent 1px),
			linear-gradient(135deg, #fc0060 0%, #fc9c00 55%, #fcc000 100%);
		background-size:
			12px 12px,
			12px 12px,
			100% 100%;
	}

	.mode-option:hover & {
		transform: translateZ(5px) scale(1.16) rotate(-3deg);
	}
}

.mode-icon {
	position: relative;
	width: 1.1rem;
	height: 1.1rem;
	filter: drop-shadow(0 1px 1px rgba(255, 255, 255, 0.4));
}

.mode-copy {
	display: flex;
	flex-direction: column;
	gap: 0.15rem;
	min-width: 0;
}

.mode-label {
	font-weight: 600;
}

.mode-description {
	font-size: 0.8rem;
	line-height: 1.35;
	color: var(--color-secondary);
}

@media (prefers-reduced-motion: reduce) {
	.wallpaper-tile,
	.tile-preview,
	.tile-remove,
	.mode-option,
	.mode-art {
		transition: none !important;
	}

	.wallpaper-tile:hover,
	.tile-preview,
	.mode-art {
		transform: none !important;
	}
}
</style>
