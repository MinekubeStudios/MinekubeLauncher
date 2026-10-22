<script setup lang="ts">
import { GameIcon, LeftArrowIcon } from '@modrinth/assets'
import { Avatar, ButtonLink, defineMessages, FormattedTag, useVIntl } from '@modrinth/ui'

import { getInstanceIconUrl } from '@/helpers/instance'

const { formatMessage } = useVIntl()
const messages = defineMessages({
	backToHome: {
		id: 'app.instance.navigation.back-to-home',
		defaultMessage: 'Back to Home',
	},
})

type Instance = {
	id: string
	game_version: string
	loader: string
	path: string
	install_stage: string
	icon_path?: string
	name: string
}

defineProps<{
	instance: Instance
}>()

const instanceLink = '/'
</script>

<template>
	<div class="flex justify-between items-center border-0 border-b border-solid border-divider pb-4">
		<router-link :to="instanceLink" tabindex="-1" class="flex flex-col gap-4 text-primary">
			<span class="flex items-center gap-2">
				<Avatar
					:src="getInstanceIconUrl(instance.icon_path)"
					:alt="instance.name"
					size="48px"
					pad-transparent-corners
				/>
				<span class="flex flex-col gap-2">
					<span class="font-extrabold bold text-contrast">
						{{ instance.name }}
					</span>
					<span class="text-secondary flex items-center gap-2 font-semibold">
						<GameIcon class="h-5 w-5 text-secondary" />
						<FormattedTag :tag="instance.loader" enforce-type="loader" />
						{{ instance.game_version }}
					</span>
				</span>
			</span>
		</router-link>
		<ButtonLink :to="instanceLink">
			<LeftArrowIcon /> {{ formatMessage(messages.backToHome) }}
		</ButtonLink>
	</div>
</template>

<style scoped lang="scss"></style>
