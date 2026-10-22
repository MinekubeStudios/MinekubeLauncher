<script setup lang="ts">
import { RadioButtonCheckedIcon, RadioButtonIcon } from '@modrinth/assets'
import { computed } from 'vue'

import { ICON_THEME_IDS, IconThemeGlyph, type IconThemeId } from '#ui/components/brand'
import { useVIntl } from '#ui/composables/i18n'

import { appearanceSettingsMessages } from '../messages'

const { formatMessage } = useVIntl()

const props = defineProps<{
	modelValue: string
	options: readonly string[]
}>()

const emit = defineEmits<{
	'update:modelValue': [value: string]
}>()

const previewIcons = ['play', 'compass', 'plus', 'settings']

const labels: Record<string, { id: string; defaultMessage: string }> = {
	outline: appearanceSettingsMessages.iconThemeOutline,
	colorful: appearanceSettingsMessages.iconThemeColorful,
	emoji: appearanceSettingsMessages.iconThemeEmoji,
	minecraft: appearanceSettingsMessages.iconThemeMinecraft,
	neon: appearanceSettingsMessages.iconThemeNeon,
	candy: appearanceSettingsMessages.iconThemeCandy,
	arcade: appearanceSettingsMessages.iconThemeArcade,
	pixel: appearanceSettingsMessages.iconThemePixel,
}

function labelFor(option: string) {
	const message = labels[option]
	return message ? formatMessage(message) : option
}

function asIconTheme(option: string): IconThemeId {
	if ((ICON_THEME_IDS as readonly string[]).includes(option)) {
		return option as IconThemeId
	}
	return 'outline'
}

const selected = computed(() => props.modelValue)
</script>

<template>
	<div class="icon-theme-options">
		<button
			v-for="option in options"
			:key="option"
			type="button"
			class="icon-theme-option"
			:class="{ selected: selected === option }"
			:data-icon-preview="option"
			@click="emit('update:modelValue', option)"
		>
			<span class="icon-row" aria-hidden="true">
				<IconThemeGlyph
					v-for="icon in previewIcons"
					:key="icon"
					:name="icon"
					:theme="asIconTheme(option)"
				/>
			</span>
			<span class="label">
				<RadioButtonCheckedIcon v-if="selected === option" class="radio" />
				<RadioButtonIcon v-else class="radio" />
				<span>{{ labelFor(option) }}</span>
			</span>
		</button>
	</div>
</template>

<style lang="scss" scoped>
.icon-theme-options {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
	gap: var(--gap-md);
}

.icon-theme-option {
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

	&.selected {
		border-color: var(--color-brand);
		box-shadow: 0 0 0 1px var(--color-brand);
	}

	&[data-icon-preview='outline'] .icon-row {
		background: var(--surface-3);
	}

	&[data-icon-preview='colorful'] .icon-row {
		background: linear-gradient(135deg, #fff3d6 0%, #ffe3ef 45%, #dff7ff 100%);
	}

	&[data-icon-preview='emoji'] .icon-row {
		background: linear-gradient(135deg, #fff7d1 0%, #ffe9f0 100%);
	}

	&[data-icon-preview='minecraft'] .icon-row {
		background-color: #6fbe44;
		background-image:
			linear-gradient(rgba(0, 0, 0, 0.16) 1px, transparent 1px),
			linear-gradient(90deg, rgba(0, 0, 0, 0.16) 1px, transparent 1px);
		background-size: 10px 10px;
	}

	&[data-icon-preview='neon'] .icon-row {
		background: radial-gradient(circle at 50% 120%, #201436 0%, #09090d 70%);
	}

	&[data-icon-preview='candy'] .icon-row {
		background: linear-gradient(135deg, #ffd6e8 0%, #d6f7ff 55%, #fff3c9 100%);
	}

	&[data-icon-preview='arcade'] .icon-row {
		background: linear-gradient(180deg, #2b1b4e 0%, #170d2e 100%);
	}

	&[data-icon-preview='pixel'] .icon-row {
		background-color: #101018;
		background-image:
			linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
		background-size: 8px 8px;
	}

	&[data-icon-preview='neon'] .icon-row,
	&[data-icon-preview='arcade'] .icon-row,
	&[data-icon-preview='pixel'] .icon-row,
	&[data-icon-preview='minecraft'] .icon-row {
		:deep(.themed-icon-emoji) {
			filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.4));
		}
	}
}

.icon-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	min-height: 3.25rem;
	padding: 0.55rem 0.7rem;
	border-radius: var(--radius-md);
	background: var(--surface-3);
	color: var(--color-contrast);

	:deep(svg) {
		width: 1.35rem;
		height: 1.35rem;
	}

	:deep(.themed-icon-emoji) {
		width: 1.35rem;
		height: 1.35rem;
		font-size: 1.15rem;
	}
}

.label {
	display: flex;
	align-items: center;
	gap: var(--gap-xs);
	font-weight: 600;
}

.radio {
	width: 1.1rem;
	height: 1.1rem;
	flex-shrink: 0;
	color: var(--color-brand);
}
</style>
