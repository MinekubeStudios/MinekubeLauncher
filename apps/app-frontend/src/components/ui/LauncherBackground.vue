<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { useLauncherBackground } from '@/composables/use-launcher-background.ts'
import { useTheme } from '@/composables/use-theme'

/**
 * The wallpaper behind the whole launcher.
 *
 * Performance matters here more than anywhere: every pixel of the interface is
 * composited on top of this layer. So the layer is completely static — no
 * animation and no CSS `filter`. For the blurred style the image is blurred
 * once, on a small canvas, and that small picture is stretched to the window
 * (a blurred image loses nothing by being stored small). Very large custom
 * images are scaled down to the screen once for the sharp style. Moving the pointer,
 * hovering and scrolling then never make the wallpaper repaint or re-blur.
 */

const background = useLauncherBackground()
const theme = useTheme()

/** Width of the pre-blurred copy; plenty for a soft background. */
const BLURRED_WIDTH = 960
const MAX_CACHED = 4

const preparedCache = new Map<string, string>()
const displayUrl = ref<string | null>(null)
let request = 0

function isObjectUrl(url: string | null): url is string {
	return !!url && url.startsWith('blob:')
}

/** Releases a prepared copy once it is neither cached nor on screen. */
function release(url: string | null): void {
	if (!isObjectUrl(url) || url === displayUrl.value) return
	for (const cached of preparedCache.values()) if (cached === url) return
	URL.revokeObjectURL(url)
}

function remember(key: string, objectUrl: string): void {
	preparedCache.set(key, objectUrl)
	while (preparedCache.size > MAX_CACHED) {
		const oldest = preparedCache.keys().next().value
		if (oldest === undefined) break
		const stale = preparedCache.get(oldest) ?? null
		preparedCache.delete(oldest)
		release(stale)
	}
}

/** Pixels the wallpaper actually needs to look sharp on this screen. */
function sharpTargetWidth(): number {
	const screenWidth = Math.max(window.screen?.width ?? 0, window.innerWidth || 0, 1280)
	return Math.ceil(screenWidth * Math.min(window.devicePixelRatio || 1, 2))
}

/**
 * Returns the picture to show: a small pre-blurred copy for the blurred
 * style, or — for the sharp style — the image downscaled to the screen when
 * it is far larger than the screen (a 6000 px photo costs a lot of memory
 * and makes every repaint behind the interface slower).
 */
async function prepare(url: string, blurPx: number): Promise<string> {
	const key = `${blurPx}|${url}`
	const cached = preparedCache.get(key)
	if (cached) return cached

	const image = new Image()
	image.decoding = 'async'
	image.src = url
	await image.decode()

	const naturalWidth = image.naturalWidth || 1
	const naturalHeight = image.naturalHeight || 1
	const targetWidth = blurPx > 0 ? BLURRED_WIDTH : sharpTargetWidth()
	if (blurPx === 0 && naturalWidth <= targetWidth * 1.25) return url

	const scale = Math.min(1, targetWidth / naturalWidth)
	const width = Math.max(1, Math.round(naturalWidth * scale))
	const height = Math.max(1, Math.round(naturalHeight * scale))

	const canvas = document.createElement('canvas')
	canvas.width = width
	canvas.height = height
	const context = canvas.getContext('2d', { alpha: false })
	if (!context) return url
	context.imageSmoothingQuality = 'high'

	if (blurPx > 0) {
		// The copy is shown stretched to the window, so the radius is scaled to
		// match what the same blur looks like at window size.
		const viewportWidth = Math.max(1, window.innerWidth || width)
		const radius = Math.max(1, blurPx * (width / viewportWidth) * 1.15)
		// Drawn a little larger than the canvas, so the blur has real pixels at
		// the edges instead of fading into a dark rim.
		const bleed = Math.ceil(radius * 2)
		context.filter = `blur(${radius.toFixed(2)}px)`
		context.drawImage(image, -bleed, -bleed, width + bleed * 2, height + bleed * 2)
	} else {
		context.drawImage(image, 0, 0, width, height)
	}

	const blob = await new Promise<Blob | null>((resolve) =>
		canvas.toBlob(resolve, 'image/jpeg', blurPx > 0 ? 0.88 : 0.92),
	)
	canvas.width = 0
	canvas.height = 0
	if (!blob) return url
	const objectUrl = URL.createObjectURL(blob)
	remember(key, objectUrl)
	return objectUrl
}

function show(url: string | null): void {
	const previous = displayUrl.value
	displayUrl.value = url
	if (previous !== url) release(previous)
}

watch(
	() => [background.activeUrl, background.activeMode, theme.advancedRendering] as const,
	async ([url, mode, advanced]) => {
		const current = ++request
		if (!url) {
			show(null)
			return
		}
		const blurPx = mode === 'blur' ? (advanced ? 7 : 4) : 0
		try {
			const prepared = await prepare(url, blurPx)
			if (current === request) show(prepared)
		} catch {
			// If the image cannot be prepared, it is shown as it is.
			if (current === request) show(url)
		}
	},
	{ immediate: true },
)

onBeforeUnmount(() => {
	request++
	const urls = [...preparedCache.values(), displayUrl.value]
	preparedCache.clear()
	displayUrl.value = null
	for (const url of new Set(urls)) if (isObjectUrl(url)) URL.revokeObjectURL(url)
})

const imageStyle = computed(() =>
	displayUrl.value ? { backgroundImage: `url("${displayUrl.value}")` } : undefined,
)
</script>

<template>
	<div v-if="displayUrl" class="launcher-background" aria-hidden="true">
		<div class="launcher-background__image" :style="imageStyle"></div>
		<div class="launcher-background__scrim"></div>
	</div>
</template>

<style scoped>
.launcher-background {
	position: fixed;
	inset: 0;
	z-index: 0;
	overflow: hidden;
	pointer-events: none;
	background: var(--color-bg);
	/* Its own isolated, static layer: nothing inside ever changes on hover. */
	contain: strict;
	isolation: isolate;
	/* Promoted to its own GPU layer once, so repaints of the interface above
	   (hover, focus, scrolling) never re-draw the wallpaper. */
	transform: translateZ(0);
	backface-visibility: hidden;
}

.launcher-background__image {
	position: absolute;
	inset: 0;
	background-position: center;
	background-repeat: no-repeat;
	background-size: cover;
}

.launcher-background__scrim {
	position: absolute;
	inset: 0;
	background:
		linear-gradient(90deg, rgba(0, 0, 0, 0.12), transparent 34%),
		linear-gradient(0deg, rgba(0, 0, 0, 0.12), transparent 60%),
		var(--launcher-background-scrim, rgba(0, 0, 0, 0.08));
}
</style>
