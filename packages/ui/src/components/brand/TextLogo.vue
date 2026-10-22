<template>
	<img :src="MinekubeStudiosLogo" alt="Minekube Studios" draggable="false" :class="{ animate }" />
</template>

<script setup>
import { MinekubeStudiosLogo } from '@modrinth/assets'

defineProps({
	animate: {
		type: Boolean,
		default: false,
	},
})
</script>

<style lang="scss" scoped>
img {
	object-fit: contain;
}

.animate {
	animation: logo-pulse 2.4s ease-in-out infinite;
}

@keyframes logo-pulse {
	0%,
	100% {
		transform: scale(1);
	}
	50% {
		transform: scale(1.03);
	}
}
</style>
