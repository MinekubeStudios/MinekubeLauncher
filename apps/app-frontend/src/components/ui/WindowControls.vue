<template>
	<Teleport to="body">
		<SplashLoadingControls
			v-if="showControls"
			ref="controlsEl"
			:maximized="isMaximized"
			@minimize="minimizeWindow"
			@toggle-maximize="toggleMaximizeWindow"
			@close="handleClose"
		/>
	</Teleport>
</template>

<script setup>
import { getCurrentWindow } from '@tauri-apps/api/window'
import { saveWindowState, StateFlags } from '@tauri-apps/plugin-window-state'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import SplashLoadingControls from '@/components/ui/settings/display/splash/SplashLoadingControls.vue'
import { useAppSettings } from '@/composables/use-app-settings.ts'
import { closeMainWindow } from '@/helpers/main-window'
import { get as getSettings } from '@/helpers/settings.ts'
import { getOS } from '@/helpers/utils.js'

const appSettings = useAppSettings()

const nativeDecorations = ref(true)
const isMaximized = ref(false)
const os = ref('')
const controlsEl = ref(null)

const alwaysShowAppControls = computed(() => appSettings.getFeatureFlag('always_show_app_controls'))

const showControls = computed(
	() =>
		alwaysShowAppControls.value ||
		(!nativeDecorations.value && (os.value === 'Windows' || os.value === 'Linux')),
)

function setWindowControlsWidth(width) {
	document.documentElement.style.setProperty('--window-controls-width', `${width}px`)
}

let resizeObserver
let unlistenResize

const savedWindowStateFlags = StateFlags.POSITION | StateFlags.SIZE | StateFlags.MAXIMIZED

watch(
	() => controlsEl.value?.element,
	(el) => {
		resizeObserver?.disconnect()
		resizeObserver = undefined
		if (!el) {
			setWindowControlsWidth(0)
			return
		}

		resizeObserver = new ResizeObserver(() => {
			setWindowControlsWidth(el.getBoundingClientRect().width)
		})
		resizeObserver.observe(el)
		setWindowControlsWidth(el.getBoundingClientRect().width)
	},
)

onMounted(async () => {
	try {
		const [platform, settings, maximized] = await Promise.all([
			getOS(),
			getSettings(),
			getCurrentWindow().isMaximized(),
		])
		os.value = platform
		nativeDecorations.value = settings.native_decorations
		isMaximized.value = maximized

		unlistenResize = await getCurrentWindow().onResized(async () => {
			isMaximized.value = await getCurrentWindow().isMaximized()
		})
	} catch (error) {
		console.error('Failed to initialize window controls', error)
	}
})

onUnmounted(() => {
	unlistenResize?.()
	resizeObserver?.disconnect()
	document.documentElement.style.removeProperty('--window-controls-width')
})

async function minimizeWindow() {
	try {
		await getCurrentWindow().minimize()
	} catch (error) {
		console.error('Failed to minimize the launcher window', error)
	}
}

async function toggleMaximizeWindow() {
	try {
		await getCurrentWindow().toggleMaximize()
		isMaximized.value = await getCurrentWindow().isMaximized()
		await saveWindowState(savedWindowStateFlags)
	} catch (error) {
		console.error('Failed to toggle the launcher window maximized state', error)
	}
}

const handleClose = async () => {
	try {
		await saveWindowState(savedWindowStateFlags)
	} catch (error) {
		console.error('Failed to save launcher window state before closing', error)
	}
	// Hides the window at once, then closes it (see helpers/main-window).
	await closeMainWindow()
}
</script>
