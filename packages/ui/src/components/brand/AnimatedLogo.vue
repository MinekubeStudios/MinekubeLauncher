<template>
	<div class="minekube-loader" data-brand-logo="true">
		<img
			:src="MinekubeMark"
			alt=""
			aria-hidden="true"
			draggable="false"
			class="logo-spin"
			data-brand-logo="true"
		/>
	</div>
</template>

<script setup>
// Kept as AnimatedLogo for API compatibility. Spins the Minekube app logo.
import { MinekubeMark } from '@modrinth/assets'
</script>

<style lang="scss" scoped>
.minekube-loader {
	display: inline-flex;
	aspect-ratio: 1 / 1;
}

.logo-spin {
	width: 100%;
	height: 100%;
	object-fit: contain;
	transform-origin: center;
	animation: minekube-spin 2.4s cubic-bezier(0.65, 0, 0.35, 1) infinite;
}

@keyframes minekube-spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}
</style>
