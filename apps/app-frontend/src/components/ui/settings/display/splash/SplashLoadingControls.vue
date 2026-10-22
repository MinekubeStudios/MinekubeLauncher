<script setup lang="ts">
import { MaximizeIcon, MinimizeIcon, RestoreIcon, XIcon } from '@modrinth/assets'
import { IconButton } from '@modrinth/ui'
import { ref } from 'vue'

const props = withDefaults(
	defineProps<{
		maximized?: boolean
		/** `overlay` sits in the real window corner, `inline` lives inside a preview stage. */
		variant?: 'overlay' | 'inline'
	}>(),
	{
		maximized: false,
		variant: 'overlay',
	},
)

const emit = defineEmits<{
	minimize: []
	'toggle-maximize': []
	close: []
}>()

const element = ref<HTMLElement | null>(null)
defineExpose({ element })
</script>

<template>
	<section
		ref="element"
		class="splash-controls"
		:class="
			props.variant === 'overlay'
				? 'pointer-events-auto fixed top-0 right-0 z-[10001] h-12 rounded-bl-2xl px-1.5'
				: 'absolute top-0 right-0 z-10 h-12 origin-top-right scale-[0.62] rounded-bl-xl px-1.5'
		"
		data-tauri-drag-region-exclude
	>
		<IconButton
			type="quiet"
			label="Minimize window"
			class="relative expanded-button"
			@click="emit('minimize')"
		>
			<MinimizeIcon />
		</IconButton>
		<IconButton
			type="quiet"
			label="Toggle maximize window"
			class="relative expanded-button"
			@click="emit('toggle-maximize')"
		>
			<RestoreIcon v-if="props.maximized" />
			<MaximizeIcon v-else />
		</IconButton>
		<IconButton
			type="quiet"
			label="Close window"
			class="relative expanded-button close-button"
			@click="emit('close')"
		>
			<XIcon />
		</IconButton>
	</section>
</template>

<style scoped lang="scss">
.splash-controls {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	color: var(--color-contrast);
}

.expanded-button::before {
	inset: -9px -6px;
	content: '';
	position: absolute;
}

.expanded-button.close-button::before {
	inset: -9px -9px -9px -6px;
}
</style>
