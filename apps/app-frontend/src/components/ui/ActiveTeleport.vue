<template>
	<Teleport v-if="active" :to="to">
		<slot />
	</Teleport>
</template>

<script setup lang="ts">
import { onActivated, onDeactivated, ref } from 'vue'

/**
 * A teleport that only renders its content while the page that owns it is the
 * active route view.
 *
 * Pages are kept mounted when "Fast loading" is enabled (KeepAlive), and Vue
 * leaves the DOM of a `<Teleport>` in its target when a cached page is
 * deactivated. Without this wrapper the sidebar of the last visited project
 * stayed behind on every other page.
 */
defineProps<{
	to: string
}>()

const active = ref(true)

onActivated(() => {
	active.value = true
})

onDeactivated(() => {
	active.value = false
})
</script>
