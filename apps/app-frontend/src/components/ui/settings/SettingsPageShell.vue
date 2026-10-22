<script setup lang="ts">
import type { Component } from 'vue'

/**
 * Gives a settings page the same frame as Profile and Privacy: a hero with
 * the page's icon, title and a short introduction, and the page's own
 * controls inside one card underneath. The controls themselves are unchanged.
 */
defineProps<{
	icon?: Component
	eyebrow: string
	title: string
	text: string
}>()
</script>

<template>
	<div class="studio settings-shell">
		<section class="studio-hero">
			<div class="studio-hero__copy">
				<p class="studio-eyebrow">
					<component :is="icon" v-if="icon" />
					{{ eyebrow }}
				</p>
				<h2 class="studio-hero__title">{{ title }}</h2>
				<p class="studio-hero__text">{{ text }}</p>
			</div>
		</section>
		<section class="studio-section settings-shell__card">
			<slot />
		</section>
	</div>
</template>

<style lang="scss" scoped>
@import './display/studio.scss';

.settings-shell__card {
	padding: 0.25rem 1.15rem 1.15rem;
}

/* The pages inside were written for a bare background; inside the card their
   first heading should not push down, and their section titles read as card
   headings. */
.settings-shell__card :deep(> :first-child),
.settings-shell__card :deep(> :first-child > section:first-of-type) {
	margin-top: 0.85rem;
}

.settings-shell__card :deep(h2) {
	letter-spacing: -0.01em;
}

.settings-shell__card :deep(section + section) {
	border-color: var(--color-divider);
}
</style>
