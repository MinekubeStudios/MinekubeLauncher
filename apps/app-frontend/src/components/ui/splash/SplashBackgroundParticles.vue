<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { EffectStyle } from '@/composables/use-visual.ts'

// Background particles for the loading screen. The look is shared with the
// launcher-wide "Enhanced effects" layer: the same style names, the same
// palette, just rendered into a much smaller canvas that only runs while the
// launcher is starting up.

type Shape = 'cube' | 'spark' | 'flake' | 'dot' | 'bloom' | 'star'
type Motion = 'float' | 'galaxy' | 'lightning'

interface StyleConfig {
	colors: string[]
	shape: Shape
	density: number
	maxCount: number
	speed: [number, number]
	size: [number, number]
	sway: [number, number]
	alpha: [number, number]
	twinkle: number
	blend: 'screen' | 'lighter'
	opacity: number
	motion: Motion
}

const STYLE_CONFIGS: Record<EffectStyle, StyleConfig> = {
	cubes: {
		colors: ['#ffe866', '#fcc000', '#ff8a2a', '#fc0060'],
		shape: 'cube',
		density: 46000,
		maxCount: 26,
		speed: [6, 18],
		size: [12, 30],
		sway: [8, 26],
		alpha: [0.2, 0.6],
		twinkle: 0.05,
		blend: 'screen',
		opacity: 0.5,
		motion: 'float',
	},
	embers: {
		colors: ['#ffe79b', '#ffad36', '#ff5a21', '#fc0060'],
		shape: 'spark',
		density: 26000,
		maxCount: 46,
		speed: [22, 58],
		size: [3, 10],
		sway: [10, 30],
		alpha: [0.24, 0.72],
		twinkle: 0.5,
		blend: 'lighter',
		opacity: 0.45,
		motion: 'float',
	},
	snow: {
		colors: ['#ffffff', '#e8f5ff', '#b8ddff'],
		shape: 'flake',
		density: 30000,
		maxCount: 42,
		speed: [-20, -6],
		size: [3, 9],
		sway: [16, 40],
		alpha: [0.24, 0.68],
		twinkle: 0.08,
		blend: 'screen',
		opacity: 0.5,
		motion: 'float',
	},
	fireflies: {
		colors: ['#ffe866', '#d9f542', '#fff3a0', '#9ef26a'],
		shape: 'dot',
		density: 52000,
		maxCount: 22,
		speed: [-4, 8],
		size: [4, 9],
		sway: [22, 56],
		alpha: [0.14, 0.8],
		twinkle: 0.72,
		blend: 'lighter',
		opacity: 0.55,
		motion: 'float',
	},
	aurora: {
		colors: ['#fc0060', '#fc7a00', '#ffe866', '#7a4dff', '#4de2ff'],
		shape: 'bloom',
		density: 240000,
		maxCount: 6,
		speed: [1, 4],
		size: [220, 460],
		sway: [30, 90],
		alpha: [0.06, 0.13],
		twinkle: 0.22,
		blend: 'screen',
		opacity: 0.75,
		motion: 'float',
	},
	galaxy: {
		colors: ['#ffffff', '#d9d5ff', '#94dfff', '#ffb7dc', '#ffe49a'],
		shape: 'star',
		density: 20000,
		maxCount: 70,
		speed: [0, 0],
		size: [1.6, 6],
		sway: [1, 8],
		alpha: [0.2, 0.86],
		twinkle: 0.72,
		blend: 'screen',
		opacity: 0.7,
		motion: 'galaxy',
	},
	lightning: {
		colors: ['#a9eaff', '#6ecbff', '#d5f5ff', '#83a5ff'],
		shape: 'spark',
		density: 48000,
		maxCount: 24,
		speed: [5, 20],
		size: [3, 9],
		sway: [5, 22],
		alpha: [0.16, 0.62],
		twinkle: 0.78,
		blend: 'screen',
		opacity: 0.5,
		motion: 'lightning',
	},
}

interface Particle {
	x: number
	y: number
	depth: number
	depthSpeed: number
	size: number
	speed: number
	sway: number
	phase: number
	rotation: number
	spin: number
	alpha: number
	orbitRadius: number
	orbitAngle: number
	orbitSpeed: number
	sprite: HTMLCanvasElement
}

const props = withDefaults(
	defineProps<{
		effect: EffectStyle | 'none'
		/** Multiplier applied to the particle count. */
		density?: number
		/** Multiplier applied to the particle speed. */
		speed?: number
	}>(),
	{ density: 1, speed: 1 },
)

const canvasRef = ref<HTMLCanvasElement | null>(null)

const MAX_DPR = 1.5

let context: CanvasRenderingContext2D | null = null
let sprites: HTMLCanvasElement[] = []
let particles: Particle[] = []
let frameHandle = 0
let lastFrame = 0
let viewWidth = 0
let viewHeight = 0
let reducedMotion = false
let reducedMotionQuery: MediaQueryList | undefined
let resizeObserver: ResizeObserver | undefined
let lightningCooldown = 1
let lightningAge = 1
let lightningDuration = 0.36
let lightningPoints: [number, number][] = []
let lightningBranches: [number, number][][] = []

function randomBetween(range: [number, number]): number {
	return range[0] + Math.random() * (range[1] - range[0])
}

function activeConfig(): StyleConfig | null {
	if (props.effect === 'none') return null
	return STYLE_CONFIGS[props.effect] ?? null
}

function buildSprite(color: string, shape: Shape): HTMLCanvasElement {
	const size = shape === 'bloom' ? 128 : 64
	const sprite = document.createElement('canvas')
	sprite.width = size
	sprite.height = size
	const ctx = sprite.getContext('2d')
	if (!ctx) return sprite

	const center = size / 2
	const glow = ctx.createRadialGradient(center, center, 0, center, center, center)

	if (shape === 'bloom') {
		glow.addColorStop(0, `${color}88`)
		glow.addColorStop(0.32, `${color}40`)
		glow.addColorStop(1, `${color}00`)
		ctx.fillStyle = glow
		ctx.fillRect(0, 0, size, size)
		return sprite
	}

	glow.addColorStop(0, `${color}b8`)
	glow.addColorStop(shape === 'spark' ? 0.24 : 0.42, `${color}40`)
	glow.addColorStop(1, `${color}00`)
	ctx.fillStyle = glow
	ctx.fillRect(0, 0, size, size)

	if (shape === 'cube') {
		const unit = size * 0.2
		const top = ctx.createLinearGradient(center - unit, center - unit, center + unit, center + unit)
		top.addColorStop(0, '#fff4c6')
		top.addColorStop(1, color)
		const left = ctx.createLinearGradient(center - unit, center, center, center + unit * 2)
		left.addColorStop(0, color)
		left.addColorStop(1, '#741a42')
		const right = ctx.createLinearGradient(center, center, center + unit, center + unit * 2)
		right.addColorStop(0, '#ffab45')
		right.addColorStop(1, '#a6322c')

		ctx.lineJoin = 'round'
		ctx.lineWidth = 1.4
		ctx.strokeStyle = 'rgba(255, 238, 194, 0.75)'

		ctx.fillStyle = top
		ctx.beginPath()
		ctx.moveTo(center - unit, center - unit * 0.5)
		ctx.lineTo(center, center - unit)
		ctx.lineTo(center + unit, center - unit * 0.5)
		ctx.lineTo(center, center)
		ctx.closePath()
		ctx.fill()
		ctx.stroke()

		ctx.fillStyle = left
		ctx.beginPath()
		ctx.moveTo(center - unit, center - unit * 0.5)
		ctx.lineTo(center, center)
		ctx.lineTo(center, center + unit)
		ctx.lineTo(center - unit, center + unit * 0.5)
		ctx.closePath()
		ctx.fill()
		ctx.stroke()

		ctx.fillStyle = right
		ctx.beginPath()
		ctx.moveTo(center + unit, center - unit * 0.5)
		ctx.lineTo(center, center)
		ctx.lineTo(center, center + unit)
		ctx.lineTo(center + unit, center + unit * 0.5)
		ctx.closePath()
		ctx.fill()
		ctx.stroke()
		return sprite
	}

	ctx.globalAlpha = 0.9
	ctx.fillStyle = color

	if (shape === 'flake') {
		ctx.beginPath()
		ctx.arc(center, center, size * 0.075, 0, Math.PI * 2)
		ctx.fill()
		ctx.globalAlpha = 0.6
		ctx.lineWidth = size * 0.03
		ctx.strokeStyle = color
		ctx.lineCap = 'round'
		for (let index = 0; index < 3; index++) {
			const angle = (Math.PI / 3) * index
			const offset = size * 0.24
			ctx.beginPath()
			ctx.moveTo(center - Math.cos(angle) * offset, center - Math.sin(angle) * offset)
			ctx.lineTo(center + Math.cos(angle) * offset, center + Math.sin(angle) * offset)
			ctx.stroke()
		}
	} else if (shape === 'star') {
		ctx.beginPath()
		for (let index = 0; index < 10; index++) {
			const radius = index % 2 === 0 ? size * 0.3 : size * 0.1
			const angle = -Math.PI / 2 + (Math.PI * index) / 5
			const x = center + Math.cos(angle) * radius
			const y = center + Math.sin(angle) * radius
			if (index === 0) ctx.moveTo(x, y)
			else ctx.lineTo(x, y)
		}
		ctx.closePath()
		ctx.fill()
		ctx.globalAlpha = 0.4
		ctx.strokeStyle = '#ffffff'
		ctx.lineWidth = 1
		ctx.stroke()
	} else {
		ctx.beginPath()
		ctx.arc(center, center, size * (shape === 'spark' ? 0.07 : 0.085), 0, Math.PI * 2)
		ctx.fill()
	}

	return sprite
}

function randomParticle(fresh: boolean): Particle {
	const config = activeConfig()!
	const rising = config.speed[0] >= 0
	const offscreen = rising ? viewHeight + Math.random() * 80 : -Math.random() * 80
	const depth = Math.random()
	const orbitAngle = Math.random() * Math.PI * 2
	const orbitRadius = Math.random() * Math.min(viewWidth * 0.49, viewHeight * 0.46)
	const centerX = viewWidth / 2
	const centerY = viewHeight * 0.48
	const initialX =
		config.motion === 'galaxy'
			? centerX + Math.cos(orbitAngle) * orbitRadius
			: Math.random() * viewWidth
	const initialY =
		config.motion === 'galaxy'
			? centerY + Math.sin(orbitAngle) * orbitRadius * 0.54
			: fresh
				? Math.random() * viewHeight
				: offscreen

	return {
		x: initialX,
		y: initialY,
		depth,
		depthSpeed: (Math.random() * 0.026 + 0.006) * (Math.random() < 0.5 ? 1 : -1),
		size: randomBetween(config.size),
		speed: randomBetween(config.speed),
		sway: randomBetween(config.sway),
		phase: Math.random() * Math.PI * 2,
		rotation: Math.random() * Math.PI * 2,
		spin: randomBetween([-0.14, 0.14]),
		alpha: randomBetween(config.alpha),
		orbitRadius,
		orbitAngle,
		orbitSpeed: randomBetween([0.07, 0.24]) * (Math.random() < 0.5 ? -1 : 1),
		sprite: sprites[Math.floor(Math.random() * sprites.length)],
	}
}

function targetParticleCount(): number {
	const config = activeConfig()
	if (!config) return 0
	const byArea = Math.round((viewWidth * viewHeight) / config.density)
	return Math.max(4, Math.min(config.maxCount, byArea) * Math.max(0, props.density))
}

function rebuildSprites(): void {
	const config = activeConfig()
	if (!config) {
		sprites = []
		return
	}
	sprites = config.colors.map((color) => buildSprite(color, config.shape))
}

function resize(): void {
	const canvas = canvasRef.value
	if (!canvas) return
	const parent = canvas.parentElement
	if (!parent) return
	const rect = parent.getBoundingClientRect()
	if (rect.width === 0 || rect.height === 0) return

	const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
	viewWidth = rect.width
	viewHeight = rect.height
	canvas.width = Math.floor(viewWidth * dpr)
	canvas.height = Math.floor(viewHeight * dpr)
	canvas.style.width = `${viewWidth}px`
	canvas.style.height = `${viewHeight}px`

	context = canvas.getContext('2d')
	context?.setTransform(dpr, 0, 0, dpr, 0, 0)

	const wanted = targetParticleCount()
	if (particles.length > wanted) particles.length = wanted
	while (particles.length < wanted) particles.push(randomParticle(true))
}

function createBoltPoints(
	start: [number, number],
	end: [number, number],
	segments: number,
	spread: number,
): [number, number][] {
	const points: [number, number][] = []
	for (let index = 0; index < segments; index++) {
		const progress = index / (segments - 1)
		const envelope = Math.sin(progress * Math.PI)
		points.push([
			start[0] + (end[0] - start[0]) * progress + (Math.random() - 0.5) * spread * envelope,
			start[1] + (end[1] - start[1]) * progress + (Math.random() - 0.5) * spread * envelope,
		])
	}
	return points
}

function startLightning(): void {
	const start: [number, number] = [viewWidth * (0.12 + Math.random() * 0.76), -12]
	const end: [number, number] = [
		viewWidth * (0.12 + Math.random() * 0.76),
		viewHeight * (0.28 + Math.random() * 0.5),
	]
	lightningPoints = createBoltPoints(start, end, 11, Math.min(viewWidth * 0.08, 74))
	lightningBranches = []
	const branchCount = 2 + Math.floor(Math.random() * 3)
	for (let index = 0; index < branchCount; index++) {
		const origin = lightningPoints[2 + Math.floor(Math.random() * (lightningPoints.length - 4))]
		const branchEnd: [number, number] = [
			origin[0] + (Math.random() - 0.5) * Math.min(viewWidth * 0.24, 220),
			origin[1] + Math.min(viewWidth * 0.18, 150) * (0.4 + Math.random() * 0.8),
		]
		lightningBranches.push(createBoltPoints(origin, branchEnd, 5, Math.min(viewWidth * 0.035, 34)))
	}
	lightningDuration = 0.3 + Math.random() * 0.22
	lightningAge = 0
	lightningCooldown = 2.6 + Math.random() * 3.4
}

function strokeBolt(points: [number, number][], width: number, color: string, glow: number): void {
	if (!context) return
	context.beginPath()
	context.moveTo(points[0][0], points[0][1])
	for (let index = 1; index < points.length; index++) {
		context.lineTo(points[index][0], points[index][1])
	}
	context.lineWidth = width
	context.strokeStyle = color
	context.shadowColor = '#7acfff'
	context.shadowBlur = glow
	context.stroke()
}

function renderLightning(seconds: number): void {
	const config = activeConfig()
	if (!context || !config || config.motion !== 'lightning') return

	lightningCooldown -= seconds
	if (lightningAge >= lightningDuration && lightningCooldown <= 0) startLightning()
	if (lightningAge >= lightningDuration) return

	lightningAge += seconds
	const fade = 1 - lightningAge / lightningDuration
	const flicker = Math.random() < 0.12 ? 0.34 : 1

	context.save()
	context.globalCompositeOperation = 'screen'
	context.globalAlpha = fade * flicker
	for (const branch of lightningBranches) {
		strokeBolt(branch, 5, 'rgba(81, 182, 255, 0.48)', 18)
		strokeBolt(branch, 1.5, 'rgba(231, 249, 255, 0.84)', 7)
	}
	strokeBolt(lightningPoints, 8, 'rgba(74, 166, 255, 0.68)', 26)
	strokeBolt(lightningPoints, 2.1, 'rgba(244, 252, 255, 0.96)', 9)
	context.restore()
}

function renderFrame(timestamp: number): void {
	const config = activeConfig()
	if (!context || !config) return
	const delta = lastFrame === 0 ? 16 : Math.min(timestamp - lastFrame, 64)
	lastFrame = timestamp
	const seconds = (delta / 1000) * props.speed

	context.clearRect(0, 0, viewWidth, viewHeight)
	context.globalCompositeOperation = config.blend === 'lighter' ? 'lighter' : 'screen'
	renderLightning(seconds)

	for (const particle of particles) {
		particle.phase += seconds
		particle.rotation += particle.spin * seconds
		particle.depth += particle.depthSpeed * seconds
		if (particle.depth < 0.08 || particle.depth > 0.98) particle.depthSpeed *= -1

		if (config.motion === 'galaxy') {
			particle.orbitAngle += particle.orbitSpeed * seconds
			const depthRadius = particle.orbitRadius * (0.84 + particle.depth * 0.28)
			particle.x = viewWidth / 2 + Math.cos(particle.orbitAngle) * depthRadius
			particle.y = viewHeight * 0.48 + Math.sin(particle.orbitAngle) * depthRadius * 0.54
		} else {
			particle.y -= particle.speed * seconds
		}

		const gone =
			config.motion !== 'galaxy' &&
			(particle.speed > 0
				? particle.y < -particle.size - 20
				: particle.y > viewHeight + particle.size + 20)
		if (gone) {
			Object.assign(particle, randomParticle(false))
			continue
		}

		const twinkle =
			config.twinkle > 0 ? 1 - config.twinkle * (0.5 + 0.5 * Math.sin(particle.phase * 3.2)) : 1
		const depthScale = 0.58 + particle.depth * 0.7
		const projectedX =
			viewWidth / 2 +
			(particle.x - viewWidth / 2) * depthScale +
			Math.sin(particle.phase) * particle.sway
		const projectedY = viewHeight / 2 + (particle.y - viewHeight / 2) * depthScale

		context.save()
		context.globalAlpha = particle.alpha * twinkle * (0.38 + particle.depth * 0.62)
		context.translate(projectedX, projectedY)
		if (particle.spin !== 0) context.rotate(particle.rotation)
		const size = particle.size * depthScale
		context.drawImage(particle.sprite, -size / 2, -size / 2, size, size)
		context.restore()
	}

	context.globalCompositeOperation = 'source-over'
	frameHandle = requestAnimationFrame(renderFrame)
}

function canAnimate(): boolean {
	return activeConfig() !== null && !document.hidden && !reducedMotion
}

function start(): void {
	if (frameHandle !== 0 || !canAnimate()) return
	rebuildSprites()
	resize()
	lastFrame = 0
	frameHandle = requestAnimationFrame(renderFrame)
}

function stop(): void {
	if (frameHandle !== 0) {
		cancelAnimationFrame(frameHandle)
		frameHandle = 0
	}
	lastFrame = 0
	if (context) context.clearRect(0, 0, viewWidth, viewHeight)
}

function syncAnimationState(): void {
	if (canAnimate()) start()
	else stop()
}

function handleMotionPreferenceChange(event: MediaQueryListEvent): void {
	reducedMotion = event.matches
	syncAnimationState()
}

onMounted(() => {
	reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
	reducedMotion = reducedMotionQuery.matches
	if (reducedMotionQuery.addEventListener) {
		reducedMotionQuery.addEventListener('change', handleMotionPreferenceChange)
	} else {
		reducedMotionQuery.addListener(handleMotionPreferenceChange)
	}

	const canvas = canvasRef.value
	if (canvas?.parentElement) {
		resizeObserver = new ResizeObserver(() => {
			resize()
			if (frameHandle === 0) rebuildSprites()
		})
		resizeObserver.observe(canvas.parentElement)
	}
	document.addEventListener('visibilitychange', syncAnimationState)
	syncAnimationState()
})

onBeforeUnmount(() => {
	stop()
	resizeObserver?.disconnect()
	document.removeEventListener('visibilitychange', syncAnimationState)
	if (reducedMotionQuery?.removeEventListener) {
		reducedMotionQuery.removeEventListener('change', handleMotionPreferenceChange)
	} else {
		reducedMotionQuery?.removeListener(handleMotionPreferenceChange)
	}
})

watch(
	() => props.effect,
	() => {
		particles = []
		lightningPoints = []
		lightningBranches = []
		lightningCooldown = 1
		lightningAge = 1
		stop()
		syncAnimationState()
	},
)
</script>

<template>
	<canvas
		v-show="props.effect !== 'none'"
		ref="canvasRef"
		class="splash-background-particles"
		:style="{ opacity: activeConfig()?.opacity ?? 0 }"
		aria-hidden="true"
	/>
</template>

<style scoped>
.splash-background-particles {
	position: absolute;
	inset: 0;
	z-index: 3;
	width: 100%;
	height: 100%;
	pointer-events: none;
	mix-blend-mode: screen;
	transition: opacity 400ms ease;
}
</style>
