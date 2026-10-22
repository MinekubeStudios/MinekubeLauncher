<script setup lang="ts">
import { RadioButtonCheckedIcon, RadioButtonIcon } from '@modrinth/assets'
import { computed } from 'vue'

import { useVIntl } from '#ui/composables/i18n'

import { appearanceSettingsMessages } from '../messages'
import {
	SPECIAL_BUTTON_STYLE_DEFAULT,
	SPECIAL_BUTTON_STYLE_NOTES,
	type SpecialButtonStyleId,
} from '../special-buttons'

const { formatMessage } = useVIntl()

const props = defineProps<{
	modelValue: string
	options: readonly string[]
}>()

const emit = defineEmits<{
	'update:modelValue': [value: string]
}>()

const labels: Record<string, { id: string; defaultMessage: string }> = {
	minekube: appearanceSettingsMessages.specialButtonsMinekube,
	modrinth: appearanceSettingsMessages.specialButtonsModrinth,
	glass: appearanceSettingsMessages.specialButtonsGlass,
	neon: appearanceSettingsMessages.specialButtonsNeon,
	chrome: appearanceSettingsMessages.specialButtonsChrome,
	arcade: appearanceSettingsMessages.specialButtonsArcade,
	aurora: appearanceSettingsMessages.specialButtonsAurora,
	minimal: appearanceSettingsMessages.specialButtonsMinimal,
}

const hints: Record<string, { id: string; defaultMessage: string }> = {
	minekube: appearanceSettingsMessages.specialButtonsMinekubeHint,
	modrinth: appearanceSettingsMessages.specialButtonsModrinthHint,
	glass: appearanceSettingsMessages.specialButtonsGlassHint,
	neon: appearanceSettingsMessages.specialButtonsNeonHint,
	chrome: appearanceSettingsMessages.specialButtonsChromeHint,
	arcade: appearanceSettingsMessages.specialButtonsArcadeHint,
	aurora: appearanceSettingsMessages.specialButtonsAuroraHint,
	minimal: appearanceSettingsMessages.specialButtonsMinimalHint,
}

function labelFor(option: string) {
	const message = labels[option]
	return message ? formatMessage(message) : option
}

function hintFor(option: string) {
	const message = hints[option]
	return message
		? formatMessage(message)
		: (SPECIAL_BUTTON_STYLE_NOTES[option as SpecialButtonStyleId] ?? '')
}

const selected = computed(() => props.modelValue)
const previewOption = (option: string) => option || SPECIAL_BUTTON_STYLE_DEFAULT
</script>

<template>
	<div class="special-style-options">
		<button
			v-for="option in options"
			:key="option"
			type="button"
			class="special-style-option"
			:class="{ selected: selected === option }"
			:data-special-preview="previewOption(option)"
			:aria-pressed="selected === option"
			@click="emit('update:modelValue', option)"
		>
			<span class="special-style-stage" aria-hidden="true">
				<!-- A real Play button in the real style: what you see here is
				     exactly what the launcher will render. Click it to feel the
				     press pulse and the sparks before committing to the style. -->
				<span class="mk-play-cta sb-preview-button">
					<svg viewBox="0 0 24 24" class="sb-preview-icon" fill="currentColor">
						<path
							d="M8 5.14v13.72a1 1 0 0 0 1.53.85l10.5-6.86a1 1 0 0 0 0-1.7L9.53 4.3A1 1 0 0 0 8 5.14z"
						/>
					</svg>
					<span class="sb-preview-label">{{
						formatMessage(appearanceSettingsMessages.specialButtonsPreview)
					}}</span>
				</span>
				<span class="mk-play-icon sb-preview-orb">
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path
							d="M8 5.14v13.72a1 1 0 0 0 1.53.85l10.5-6.86a1 1 0 0 0 0-1.7L9.53 4.3A1 1 0 0 0 8 5.14z"
						/>
					</svg>
				</span>
			</span>
			<span class="label">
				<RadioButtonCheckedIcon v-if="selected === option" class="radio" />
				<RadioButtonIcon v-else class="radio" />
				<span class="label-text">
					<span class="label-name">{{ labelFor(option) }}</span>
					<span class="label-hint">{{ hintFor(option) }}</span>
				</span>
			</span>
		</button>
	</div>
</template>

<style lang="scss" scoped>
.special-style-options {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(11.5rem, 1fr));
	gap: var(--gap-md);
}

.special-style-option {
	display: flex;
	flex-direction: column;
	gap: var(--gap-sm);
	padding: var(--gap-md);
	border: 1px solid var(--color-divider);
	border-radius: var(--radius-lg);
	background: var(--color-raised-bg);
	color: var(--color-contrast);
	cursor: pointer;
	text-align: left;
	transition:
		border-color 200ms cubic-bezier(0.32, 0.72, 0, 1),
		box-shadow 220ms cubic-bezier(0.16, 1, 0.3, 1),
		transform 220ms cubic-bezier(0.34, 1.26, 0.64, 1);

	&:hover {
		transform: translateY(-2px);
	}

	&.selected {
		border-color: var(--color-brand);
		box-shadow:
			0 0 0 1px var(--color-brand),
			0 10px 24px -14px var(--color-brand-shadow);
	}
}

.special-style-stage {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 5.75rem;
	border-radius: var(--radius-md);
	padding: 0.9rem 0.75rem;
	overflow: hidden;
	background:
		radial-gradient(120% 120% at 50% 0%, rgba(255, 255, 255, 0.06), transparent 70%),
		var(--surface-3);

	/* Preview scale — closer to the stage than the style's own block, so it
	   wins by inheritance without fighting any specificity. */
	--sb-min-h: 2.3rem;
	--sb-pad: 0 0.95rem;
	--sb-size: 0.68rem;
	--sb-tracking: 0.09em;
	--sb-icon-radius: 10px;
}

.sb-preview-button {
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
	pointer-events: auto;
}

.sb-preview-icon {
	width: 0.95rem;
	height: 0.95rem;
	flex-shrink: 0;
}

.sb-preview-label {
	line-height: 1;
}

.sb-preview-orb {
	position: absolute !important;
	right: 0.7rem;
	bottom: 0.55rem;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 1.6rem;
	height: 1.6rem;

	svg {
		width: 0.8rem;
		height: 0.8rem;
	}
}

.label {
	display: flex;
	align-items: flex-start;
	gap: var(--gap-xs);
	font-weight: 600;
}

.label-text {
	display: flex;
	flex-direction: column;
	line-height: 1.25;
}

.label-name {
	font-weight: 700;
}

.label-hint {
	font-size: 0.75rem;
	font-weight: 500;
	opacity: 0.7;
}

.radio {
	width: 1.1rem;
	height: 1.1rem;
	flex-shrink: 0;
	color: var(--color-brand);
	margin-top: 0.1rem;
}

@media (prefers-reduced-motion: reduce) {
	.special-style-option,
	.special-style-option:hover {
		transform: none;
	}
}
</style>
