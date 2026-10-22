<template>
	<button
		:id="id"
		type="button"
		role="switch"
		:aria-checked="!!modelValue"
		:disabled="disabled"
		class="mk-toggle"
		:class="{ 'is-on': modelValue, 'is-small': small }"
		@click="toggle"
	>
		<span class="mk-toggle__thumb" aria-hidden="true" />
	</button>
</template>

<script setup lang="ts">
const props = defineProps<{
	id?: string
	disabled?: boolean
	small?: boolean
}>()

const modelValue = defineModel<boolean>()

function toggle() {
	if (!props.disabled) {
		modelValue.value = !modelValue.value
	}
}
</script>

<style scoped>
/*
 * The thumb never changes size: growing it on hover by animating width,
 * height and margin forced a relayout on every frame and, mixed with the
 * slide, made the switch wobble and flicker. Hover, press and the slide are
 * one composited `transform`; the track only cross-fades its colour.
 */
.mk-toggle {
	--toggle-width: 48px;
	--toggle-height: 24px;
	--toggle-thumb: 16px;
	--toggle-travel: calc(var(--toggle-width) - var(--toggle-thumb) - 10px);
	--toggle-x: 0px;
	--toggle-scale: 1;

	position: relative;
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	box-sizing: border-box;
	width: var(--toggle-width) !important;
	height: var(--toggle-height);
	margin: 0;
	padding: 0 4px;
	border: 1px solid var(--surface-5, var(--color-divider));
	border-radius: 999px;
	background-color: var(--color-button-bg);
	cursor: pointer;
	touch-action: manipulation;
	scale: none !important;
	translate: none !important;
	transition:
		background-color var(--mk-dur-fast, 140ms) ease,
		border-color var(--mk-dur-fast, 140ms) ease,
		box-shadow var(--mk-dur-base, 200ms) ease !important;
	-webkit-tap-highlight-color: transparent;
}

.mk-toggle.is-small {
	--toggle-width: 40px;
	--toggle-height: 20px;
	--toggle-thumb: 12px;
}

.mk-toggle.is-on {
	--toggle-x: var(--toggle-travel);
	border-color: transparent;
	background-color: var(--color-brand);
}

.mk-toggle:hover:not(:disabled) {
	--toggle-scale: 1.12;
}

.mk-toggle:active:not(:disabled) {
	--toggle-scale: 0.86;
}

.mk-toggle:disabled {
	cursor: not-allowed;
	opacity: 0.5;
}

.mk-toggle__thumb {
	display: block;
	width: var(--toggle-thumb);
	height: var(--toggle-thumb);
	border-radius: 50%;
	background-color: var(--color-secondary);
	transform: translateX(var(--toggle-x)) scale(var(--toggle-scale));
	transition:
		transform var(--mk-dur-base, 200ms) var(--mk-ease-standard, cubic-bezier(0.2, 0.8, 0.2, 1)),
		background-color var(--mk-dur-fast, 140ms) ease !important;
	will-change: transform;
}

.mk-toggle.is-on .mk-toggle__thumb {
	background-color: rgba(0, 0, 0, 0.88);
}
</style>
