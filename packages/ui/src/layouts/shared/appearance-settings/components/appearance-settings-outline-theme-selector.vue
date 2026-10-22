<script setup lang="ts">
import { RadioButtonCheckedIcon, RadioButtonIcon } from '@modrinth/assets'
import { computed } from 'vue'

import { useVIntl } from '#ui/composables/i18n'

import { OUTLINE_THEME_IDS, type OutlineThemeId } from '../launcher-colors'
import { appearanceSettingsMessages } from '../messages'

const { formatMessage } = useVIntl()

const props = defineProps<{
	modelValue: string
	options: readonly string[]
}>()

const emit = defineEmits<{
	'update:modelValue': [value: string]
}>()

const labels: Record<string, { id: string; defaultMessage: string }> = {
	none: appearanceSettingsMessages.outlineThemeNone,
	glow: appearanceSettingsMessages.outlineThemeGlow,
	rgb: appearanceSettingsMessages.outlineThemeRgb,
	neon: appearanceSettingsMessages.outlineThemeNeon,
	aurora: appearanceSettingsMessages.outlineThemeAurora,
}

function labelFor(option: string) {
	const message = labels[option]
	return message ? formatMessage(message) : option
}

function asOutlineTheme(option: string): OutlineThemeId {
	if ((OUTLINE_THEME_IDS as readonly string[]).includes(option)) {
		return option as OutlineThemeId
	}
	return 'none'
}

const selected = computed(() => props.modelValue)
</script>

<template>
	<div class="outline-theme-options">
		<button
			v-for="option in options"
			:key="option"
			type="button"
			class="outline-theme-option"
			:class="{ selected: selected === option }"
			:data-outline-preview="asOutlineTheme(option)"
			@click="emit('update:modelValue', option)"
		>
			<span class="window-preview" aria-hidden="true">
				<span class="window-frame">
					<span class="window-titlebar">
						<span class="window-dot"></span>
						<span class="window-dot"></span>
						<span class="window-dot"></span>
					</span>
					<span class="window-body">
						<span class="window-line"></span>
						<span class="window-line short"></span>
					</span>
				</span>
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
.outline-theme-options {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
	gap: var(--gap-md);
}

.outline-theme-option {
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
}

.window-preview {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 4.25rem;
	border-radius: var(--radius-md);
	background: var(--surface-3);
	padding: 0.65rem;
}

.window-frame {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 2.9rem;
	border-radius: 0.45rem;
	background: var(--surface-4);
	overflow: hidden;
	position: relative;
	padding: 2px;

	[data-outline-preview='none'] & {
		box-shadow: inset 0 0 0 1px var(--color-divider);
	}

	[data-outline-preview='glow'] & {
		box-shadow:
			inset 0 0 0 2px var(--color-brand),
			inset 0 0 14px -2px var(--color-brand),
			0 0 10px -1px var(--color-brand-shadow);
	}

	[data-outline-preview='rgb'] & {
		background:
			linear-gradient(var(--surface-4), var(--surface-4)) padding-box,
			linear-gradient(
					120deg,
					#ff004c,
					#ff8a00,
					#ffe600,
					#3dff8f,
					#00e0ff,
					#4d5dff,
					#c400ff,
					#ff004c
				)
				border-box;
		background-size:
			100% 100%,
			300% 300%;
		border: 2px solid transparent;
		animation: outline-preview-rgb 3.5s linear infinite;
	}

	[data-outline-preview='neon'] & {
		box-shadow:
			inset 0 0 0 2px var(--color-brand),
			inset 0 0 12px -1px var(--color-brand),
			0 0 12px -1px var(--color-brand-shadow);
		animation: outline-preview-neon 1.8s ease-in-out infinite;
	}

	[data-outline-preview='aurora'] & {
		background:
			linear-gradient(var(--surface-4), var(--surface-4)) padding-box,
			linear-gradient(120deg, #00ffd0, #3d8bff, #b06bff, #ff4d94, #00ffd0) border-box;
		background-size:
			100% 100%,
			280% 280%;
		border: 2px solid transparent;
		animation: outline-preview-aurora 4.5s ease-in-out infinite;
		filter: drop-shadow(0 0 6px rgba(176, 107, 255, 0.55));
	}
}

.window-titlebar {
	display: flex;
	align-items: center;
	gap: 0.22rem;
	padding: 0.22rem 0.35rem;
}

.window-dot {
	width: 0.34rem;
	height: 0.34rem;
	border-radius: 999px;
	background: var(--color-divider);

	&:nth-child(1) {
		background: #ff5f57;
	}
	&:nth-child(2) {
		background: #febc2e;
	}
	&:nth-child(3) {
		background: #28c840;
	}
}

.window-body {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
	padding: 0.1rem 0.4rem;
}

.window-line {
	display: block;
	height: 0.28rem;
	width: 70%;
	border-radius: 999px;
	background: var(--color-divider);

	&.short {
		width: 45%;
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

@keyframes outline-preview-rgb {
	0% {
		background-position:
			0 0,
			0% 50%;
	}
	100% {
		background-position:
			0 0,
			300% 50%;
	}
}

@keyframes outline-preview-aurora {
	0% {
		background-position:
			0 0,
			0% 50%;
	}
	50% {
		background-position:
			0 0,
			100% 50%;
	}
	100% {
		background-position:
			0 0,
			0% 50%;
	}
}

@keyframes outline-preview-neon {
	0%,
	100% {
		box-shadow:
			inset 0 0 0 2px var(--color-brand),
			inset 0 0 12px -1px var(--color-brand),
			0 0 12px -1px var(--color-brand-shadow);
	}
	50% {
		box-shadow:
			inset 0 0 0 2px var(--color-brand),
			inset 0 0 20px 0 var(--color-brand),
			0 0 18px 2px var(--color-brand-shadow);
	}
}

@media (prefers-reduced-motion: reduce) {
	.window-frame {
		animation: none !important;
	}
}
</style>
