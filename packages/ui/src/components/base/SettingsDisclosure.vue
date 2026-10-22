<script setup lang="ts">
import { ChevronDownIcon } from '@modrinth/assets'
import { computed, useId } from 'vue'

import Collapsible from './Collapsible.vue'

const props = withDefaults(
	defineProps<{
		title: string
		description?: string
		headingLevel?: 2 | 3
		/** How many settings stay hidden while collapsed. Rendered as a small pill. */
		hiddenCount?: number
	}>(),
	{
		headingLevel: 2,
	},
)

/**
 * Whether the section is expanded. Advanced sections must stay folded away by
 * default, so the model defaults to `false` and every caller can rely on the
 * collapsed state without having to opt in.
 */
const expanded = defineModel<boolean>({ default: false })

const headingTag = computed(() => `h${props.headingLevel}`)
const titleId = useId()
const contentId = useId()
</script>

<template>
	<section class="settings-disclosure">
		<div class="settings-disclosure__header">
			<div class="settings-disclosure__copy">
				<component :is="headingTag" :id="titleId" class="settings-disclosure__title">
					{{ title }}
				</component>
				<p v-if="description" class="settings-disclosure__description">
					{{ description }}
				</p>
			</div>
			<span class="settings-disclosure__meta" aria-hidden="true">
				<span v-if="hiddenCount && !expanded" class="settings-disclosure__count">
					{{ hiddenCount }}
				</span>
				<span class="settings-disclosure__chevron" :class="{ 'is-open': expanded }">
					<ChevronDownIcon />
				</span>
			</span>
			<button
				type="button"
				class="settings-disclosure__trigger"
				:aria-expanded="expanded"
				:aria-controls="contentId"
				:aria-labelledby="titleId"
				@click="expanded = !expanded"
			></button>
		</div>

		<Collapsible :collapsed="!expanded">
			<div :id="contentId" class="settings-disclosure__content">
				<slot />
			</div>
		</Collapsible>
	</section>
</template>

<style scoped lang="scss">
.settings-disclosure {
	border: 1px solid var(--color-divider);
	border-radius: var(--radius-lg);
	background: var(--color-raised-bg);
}

.settings-disclosure__header {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	padding: 0.9rem 1.1rem;
}

.settings-disclosure__trigger {
	position: absolute;
	inset: 0;
	border: 0;
	border-radius: inherit;
	background: transparent;
	cursor: pointer;
}

.settings-disclosure__trigger:hover {
	background: color-mix(in srgb, var(--color-brand) 6%, transparent);
}

.settings-disclosure__trigger:focus-visible {
	outline: 2px solid var(--color-focus-ring);
	outline-offset: -2px;
}

.settings-disclosure__copy {
	min-width: 0;
}

.settings-disclosure__title {
	margin: 0;
	color: var(--color-contrast);
	font-size: 1rem;
	font-weight: 700;
	line-height: 1.3;
}

.settings-disclosure__description {
	margin: 0.25rem 0 0;
	color: var(--color-secondary);
	font-size: 0.82rem;
	line-height: 1.45;
}

.settings-disclosure__meta {
	display: flex;
	flex: 0 0 auto;
	align-items: center;
	gap: 0.5rem;
}

.settings-disclosure__count {
	display: grid;
	min-width: 1.35rem;
	height: 1.35rem;
	place-items: center;
	padding: 0 0.35rem;
	border-radius: 999px;
	background: color-mix(in srgb, var(--color-brand) 18%, transparent);
	color: var(--color-contrast);
	font-size: 0.7rem;
	font-weight: 750;
	font-variant-numeric: tabular-nums;
}

.settings-disclosure__chevron {
	display: grid;
	width: 1.6rem;
	height: 1.6rem;
	place-items: center;
	border-radius: var(--radius-md);
	color: var(--color-secondary);
	transition: transform 220ms var(--ease-out-expo, ease);

	svg {
		width: 1.1rem;
		height: 1.1rem;
	}

	&.is-open {
		transform: rotate(180deg);
	}
}

.settings-disclosure__content {
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
	padding: 1.1rem;
}

@media (prefers-reduced-motion: reduce) {
	.settings-disclosure__chevron {
		transition: none;
	}
}
</style>
