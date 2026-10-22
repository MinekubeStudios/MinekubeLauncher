<script setup lang="ts">
import {
	Button,
	defineMessages,
	injectNotificationManager,
	Input,
	Toggle,
	useVIntl,
} from '@modrinth/ui'
import { computed, onBeforeUnmount, type Ref, ref, watch } from 'vue'

import { edit } from '@/helpers/instance'
import { get } from '@/helpers/settings.ts'

import type { AppSettings } from '../../../../helpers/types'
import { injectInstanceSettings } from './instance-settings-context'

const { handleError } = injectNotificationManager()
const { formatMessage } = useVIntl()
const presets: [number, number][] = [
	[1280, 720],
	[1600, 900],
	[1920, 1080],
]
const { instance } = injectInstanceSettings()

const globalSettings = (await get().catch(handleError)) as AppSettings

const overrideWindowSettings = ref(
	instance.value.game_resolution != null || instance.value.force_fullscreen != null,
)
const resolution: Ref<[number, number]> = ref(
	instance.value.game_resolution ?? (globalSettings.game_resolution.slice() as [number, number]),
)
const fullscreenSetting: Ref<boolean> = ref(
	instance.value.force_fullscreen ?? globalSettings.force_fullscreen,
)

const invalidResolution = computed(
	() =>
		!fullscreenSetting.value &&
		overrideWindowSettings.value &&
		resolution.value.some(
			(value) => !Number.isInteger(Number(value)) || Number(value) < 320 || Number(value) > 16384,
		),
)

watch(overrideWindowSettings, (enabled) => {
	if (!enabled) {
		resolution.value = globalSettings.game_resolution.slice() as [number, number]
		fullscreenSetting.value = globalSettings.force_fullscreen
	}
})

const editInstanceObject = computed(() => {
	if (!overrideWindowSettings.value) {
		return {
			force_fullscreen: null,
			game_resolution: null,
		}
	}
	return {
		force_fullscreen: fullscreenSetting.value,
		game_resolution: fullscreenSetting.value
			? null
			: ([Number(resolution.value[0]), Number(resolution.value[1])] as [number, number]),
	}
})

let windowSaveTimer: ReturnType<typeof setTimeout> | undefined
let windowSaveQueue = Promise.resolve()

function saveWindowSettings() {
	windowSaveTimer = undefined
	if (invalidResolution.value) return
	const instanceId = instance.value.id
	const changes = editInstanceObject.value
	windowSaveQueue = windowSaveQueue.then(() => edit(instanceId, changes).catch(handleError))
}

watch(
	[overrideWindowSettings, resolution, fullscreenSetting],
	() => {
		clearTimeout(windowSaveTimer)
		windowSaveTimer = setTimeout(saveWindowSettings, 300)
	},
	{ deep: true },
)
onBeforeUnmount(() => {
	if (windowSaveTimer) {
		clearTimeout(windowSaveTimer)
		saveWindowSettings()
	}
})

const messages = defineMessages({
	resolutionInvalid: {
		id: 'instance.settings.tabs.window.resolution.invalid',
		defaultMessage: 'Enter a width and height between 320 and 16384 pixels.',
	},
	resolutionPresets: {
		id: 'instance.settings.tabs.window.presets',
		defaultMessage: 'Common window sizes',
	},
	window: {
		id: 'instance.settings.tabs.window',
		defaultMessage: 'Custom window settings',
	},
	customWindowSettings: {
		id: 'instance.settings.tabs.window.custom-window-settings',
		defaultMessage: 'Configure fullscreen and launch resolution separately for this instance.',
	},
	fullscreen: {
		id: 'instance.settings.tabs.window.fullscreen',
		defaultMessage: 'Fullscreen',
	},
	fullscreenDescription: {
		id: 'instance.settings.tabs.window.fullscreen.description',
		defaultMessage: 'Make the game start in full screen when launched (using options.txt).',
	},
	width: {
		id: 'instance.settings.tabs.window.width',
		defaultMessage: 'Width',
	},
	widthDescription: {
		id: 'instance.settings.tabs.window.width.description',
		defaultMessage: 'The width of the game window when launched.',
	},
	enterWidth: {
		id: 'instance.settings.tabs.window.width.enter',
		defaultMessage: 'Enter width...',
	},
	height: {
		id: 'instance.settings.tabs.window.height',
		defaultMessage: 'Height',
	},
	heightDescription: {
		id: 'instance.settings.tabs.window.height.description',
		defaultMessage: 'The height of the game window when launched.',
	},
	enterHeight: {
		id: 'instance.settings.tabs.window.height.enter',
		defaultMessage: 'Enter height...',
	},
})
</script>

<template>
	<div class="flex flex-col">
		<div class="flex items-center justify-between gap-4">
			<div class="flex min-w-0 flex-col gap-1">
				<h2 class="m-0 text-lg font-semibold text-contrast">
					{{ formatMessage(messages.window) }}
				</h2>
				<p class="m-0">{{ formatMessage(messages.customWindowSettings) }}</p>
			</div>
			<Toggle id="override-window-settings" v-model="overrideWindowSettings" />
		</div>
		<div class="flex flex-col gap-6 pt-6" :class="{ 'opacity-50': !overrideWindowSettings }">
			<div class="flex items-center gap-4 justify-between">
				<div class="flex flex-col gap-1">
					<h2 class="m-0 text-lg font-semibold text-contrast">
						{{ formatMessage(messages.fullscreen) }}
					</h2>
					<p class="m-0">
						{{ formatMessage(messages.fullscreenDescription) }}
					</p>
				</div>
				<Toggle id="fullscreen" v-model="fullscreenSetting" :disabled="!overrideWindowSettings" />
			</div>

			<div class="flex flex-wrap items-center gap-2">
				<span class="mr-2 text-secondary">{{ formatMessage(messages.resolutionPresets) }}</span>
				<Button
					v-for="preset in presets"
					:key="preset.join('x')"
					type="outlined"
					size="sm"
					:disabled="!overrideWindowSettings || fullscreenSetting"
					@click="resolution = [...preset]"
				>
					{{ preset[0] }} × {{ preset[1] }}
				</Button>
			</div>
			<p v-if="invalidResolution" role="alert" class="m-0 text-red">
				{{ formatMessage(messages.resolutionInvalid) }}
			</p>
			<div class="flex items-center gap-4 justify-between">
				<div class="flex flex-col gap-1">
					<h2 class="m-0 text-lg font-semibold text-contrast">
						{{ formatMessage(messages.width) }}
					</h2>
					<p class="m-0">
						{{ formatMessage(messages.widthDescription) }}
					</p>
				</div>
				<Input
					id="width"
					v-model="resolution[0]"
					autocomplete="off"
					:disabled="!overrideWindowSettings || fullscreenSetting"
					type="number"
					:placeholder="formatMessage(messages.enterWidth)"
				/>
			</div>

			<div class="flex items-center gap-4 justify-between">
				<div class="flex flex-col gap-1">
					<h2 class="m-0 text-lg font-semibold text-contrast">
						{{ formatMessage(messages.height) }}
					</h2>
					<p class="m-0">
						{{ formatMessage(messages.heightDescription) }}
					</p>
				</div>
				<Input
					id="height"
					v-model="resolution[1]"
					autocomplete="off"
					:disabled="!overrideWindowSettings || fullscreenSetting"
					type="number"
					:placeholder="formatMessage(messages.enterHeight)"
				/>
			</div>
		</div>
	</div>
</template>
