<script setup lang="ts">
import { PlayIcon } from '@modrinth/assets'
import { Button, defineMessages, useVIntl } from '@modrinth/ui'
import { ref } from 'vue'

import SplashScreen from '@/components/ui/SplashScreen.vue'

import SplashLoadingControls from './SplashLoadingControls.vue'

const { formatMessage } = useVIntl()

const messages = defineMessages({
	replay: {
		id: 'app.settings.visual.splash.replay',
		defaultMessage: 'Play loading screen preview',
	},
	replayHint: {
		id: 'app.settings.visual.splash.replay-hint',
		defaultMessage:
			'Shows the real loading screen with your current settings for a few seconds. Click anywhere or press Escape to skip it.',
	},
})

const playing = ref(false)

function play() {
	if (playing.value) return
	playing.value = true
}
</script>

<template>
	<div class="splash-player">
		<Button type="outlined" size="sm" color="brand" :disabled="playing" @click="play">
			<PlayIcon class="size-4 shrink-0" />
			{{ formatMessage(messages.replay) }}
		</Button>
		<p class="splash-player__hint">
			{{ formatMessage(messages.replayHint) }}
		</p>

		<Teleport to="body">
			<template v-if="playing">
				<SplashScreen preview @ready="playing = false" />
				<SplashLoadingControls />
			</template>
		</Teleport>
	</div>
</template>

<style scoped lang="scss">
.splash-player {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 0.4rem;
}

.splash-player__hint {
	margin: 0;
	color: var(--color-secondary);
	font-size: 0.76rem;
	line-height: 1.45;
}
</style>
