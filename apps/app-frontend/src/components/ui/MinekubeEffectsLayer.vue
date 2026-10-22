<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { backgroundPaused } from '@/composables/use-performance.ts'
import { effectsActive, type EffectStyle, effectStyle } from '@/composables/use-visual.ts'

/**
 * Minekube ambient effects.
 *
 * One fixed canvas behind the pointer layer draws the selected scene. The
 * engine is built to stay invisible in the profiler:
 *   - every particle is a pre-rendered sprite placed with a single
 *     `setTransform` + `drawImage` (no per-particle save/restore, paths,
 *     gradients or shadow blur),
 *   - the canvas is composited normally: no `mix-blend-mode`, which would make
 *     the browser re-blend the whole window behind it on every frame,
 *   - drawing is capped at 60 frames per second and the device pixel ratio at
 *     1.5 — the sprites are soft light, extra pixels add nothing,
 *   - the particle budget adapts: when frames start arriving late the scene
 *     thins itself out, and it recovers once there is headroom again,
 *   - nothing runs while the effects are off, the window is hidden or
 *     background activity is paused.
 */

type SpriteShape = 'cube' | 'spark' | 'flake' | 'glow' | 'bloom' | 'star'
type Motion = 'rise' | 'fall' | 'wander' | 'drift' | 'orbit'
type Range = readonly [number, number]

interface Scene {
	colors: readonly string[]
	shape: SpriteShape
	/** Screen area per particle in px²; smaller is denser. */
	area: number
	max: number
	motion: Motion
	/** Main travel speed in px/s along the scene's motion. */
	speed: Range
	/** Sideways sway amplitude in px. */
	sway: Range
	size: Range
	spin: Range
	alpha: Range
	/** 0 = steady light, 1 = full twinkle. */
	twinkle: number
	/** Horizontal stretch of each sprite (ribbons for the aurora). */
	stretch: number
	composite: GlobalCompositeOperation
	opacity: number
	lightning?: boolean
	core?: string
}

interface Particle {
	x: number
	y: number
	z: number
	vx: number
	vy: number
	size: number
	rotation: number
	spin: number
	alpha: number
	phase: number
	frequency: number
	sway: number
	angle: number
	radius: number
	sprite: HTMLCanvasElement
}

interface Point {
	x: number
	y: number
}

const SCENES: Record<EffectStyle, Scene> = {
	cubes: {
		colors: ['#ffe866', '#fcc000', '#ff8a2a', '#fc0060'],
		shape: 'cube',
		area: 32000,
		max: 60,
		motion: 'rise',
		speed: [8, 22],
		sway: [6, 22],
		size: [12, 30],
		spin: [-0.3, 0.3],
		alpha: [0.35, 0.8],
		twinkle: 0.05,
		stretch: 1,
		composite: 'source-over',
		opacity: 0.5,
	},
	embers: {
		colors: ['#fff1b8', '#ffc24a', '#ff6a1f', '#fc0060'],
		shape: 'spark',
		area: 17000,
		max: 95,
		motion: 'rise',
		speed: [26, 70],
		sway: [8, 26],
		size: [6, 16],
		spin: [0, 0],
		alpha: [0.45, 0.95],
		twinkle: 0.55,
		stretch: 1,
		composite: 'lighter',
		opacity: 0.55,
	},
	snow: {
		colors: ['#ffffff', '#eef7ff', '#c7e4ff'],
		shape: 'flake',
		area: 19000,
		max: 95,
		motion: 'fall',
		speed: [12, 34],
		sway: [12, 38],
		size: [6, 16],
		spin: [-0.25, 0.25],
		alpha: [0.4, 0.9],
		twinkle: 0.08,
		stretch: 1,
		composite: 'source-over',
		opacity: 0.6,
	},
	fireflies: {
		colors: ['#fff27a', '#dcf54a', '#fff7c2', '#a8f26e'],
		shape: 'glow',
		area: 38000,
		max: 44,
		motion: 'wander',
		speed: [10, 26],
		sway: [0, 0],
		size: [10, 22],
		spin: [0, 0],
		alpha: [0.5, 1],
		twinkle: 0.85,
		stretch: 1,
		composite: 'lighter',
		opacity: 0.6,
	},
	aurora: {
		colors: ['#fc0060', '#ff8a2a', '#ffe866', '#7a5cff', '#4de2ff'],
		shape: 'bloom',
		area: 160000,
		max: 12,
		motion: 'drift',
		speed: [6, 16],
		sway: [30, 80],
		size: [260, 520],
		spin: [0, 0],
		alpha: [0.18, 0.34],
		twinkle: 0.25,
		stretch: 2.4,
		composite: 'lighter',
		opacity: 0.5,
	},
	galaxy: {
		colors: ['#ffffff', '#ddd8ff', '#9ce2ff', '#ffbfe0', '#ffe8a3'],
		shape: 'star',
		area: 11000,
		max: 150,
		motion: 'orbit',
		speed: [0.05, 0.2],
		sway: [0, 0],
		size: [3, 11],
		spin: [-0.15, 0.15],
		alpha: [0.35, 1],
		twinkle: 0.7,
		stretch: 1,
		composite: 'lighter',
		opacity: 0.62,
		core: '#8b6cff',
	},
	lightning: {
		colors: ['#b3eeff', '#79d0ff', '#e0f8ff', '#8fb0ff'],
		shape: 'spark',
		area: 34000,
		max: 50,
		motion: 'rise',
		speed: [6, 22],
		sway: [4, 20],
		size: [6, 14],
		spin: [0, 0],
		alpha: [0.35, 0.85],
		twinkle: 0.8,
		stretch: 1,
		composite: 'lighter',
		opacity: 0.55,
		lightning: true,
	},
}

const SPRITE_SIZE = 64
const BLOOM_SPRITE_SIZE = 128
const MAX_DPR = 1.5
const MIN_FRAME_MS = 1000 / 60 - 1
const MAX_STEP_S = 0.05
const PARALLAX_X = 16
const PARALLAX_Y = 10

const canvasRef = ref<HTMLCanvasElement | null>(null)
const visibleScene = ref<EffectStyle>(effectStyle.value)
const fading = ref(false)
const scene = computed(() => SCENES[visibleScene.value] ?? SCENES.cubes)

let context: CanvasRenderingContext2D | null = null
let sprites: HTMLCanvasElement[] = []
let coreSprite: HTMLCanvasElement | null = null
let particles: Particle[] = []
let frameHandle = 0
let lastFrame = 0
let width = 0
let height = 0
let dpr = 1
let elapsed = 0
let budget = 1
let slowFrames = 0
let fastFrames = 0
let pointerX = 0
let pointerY = 0
let parallaxX = 0
let parallaxY = 0
let resizeQueued = false
let fadeTimer: ReturnType<typeof setTimeout> | undefined

let boltCooldown = 1.2
let boltAge = 1
let boltDuration = 0.4
let bolt: Point[] = []
let boltBranches: Point[][] = []

function between([min, max]: Range): number {
	return min + Math.random() * (max - min)
}

function withAlpha(hex: string, alpha: number): string {
	const value = Number.parseInt(hex.slice(1), 16)
	return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
}

function createCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
	const canvas = document.createElement('canvas')
	canvas.width = size
	canvas.height = size
	return [canvas, canvas.getContext('2d')]
}

function softGlow(ctx: CanvasRenderingContext2D, size: number, color: string, core: number): void {
	const center = size / 2
	const gradient = ctx.createRadialGradient(center, center, 0, center, center, center)
	gradient.addColorStop(0, withAlpha(color, 0.95))
	gradient.addColorStop(core, withAlpha(color, 0.35))
	gradient.addColorStop(1, withAlpha(color, 0))
	ctx.fillStyle = gradient
	ctx.fillRect(0, 0, size, size)
}

function drawCube(ctx: CanvasRenderingContext2D, size: number, color: string): void {
	const c = size / 2
	const u = size * 0.22
	const halo = ctx.createRadialGradient(c, c, 0, c, c, c)
	halo.addColorStop(0, withAlpha(color, 0.32))
	halo.addColorStop(1, withAlpha(color, 0))
	ctx.fillStyle = halo
	ctx.fillRect(0, 0, size, size)

	const faces: [string, Point[]][] = [
		[
			'#fff3c4',
			[
				{ x: c, y: c - u },
				{ x: c + u, y: c - u / 2 },
				{ x: c, y: c },
				{ x: c - u, y: c - u / 2 },
			],
		],
		[
			color,
			[
				{ x: c - u, y: c - u / 2 },
				{ x: c, y: c },
				{ x: c, y: c + u * 1.15 },
				{ x: c - u, y: c + u * 0.65 },
			],
		],
		[
			withAlpha(color, 0.72),
			[
				{ x: c + u, y: c - u / 2 },
				{ x: c, y: c },
				{ x: c, y: c + u * 1.15 },
				{ x: c + u, y: c + u * 0.65 },
			],
		],
	]
	ctx.lineJoin = 'round'
	ctx.lineWidth = 1.2
	ctx.strokeStyle = 'rgba(255, 240, 200, 0.7)'
	for (const [fill, points] of faces) {
		ctx.beginPath()
		points.forEach((point, index) =>
			index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y),
		)
		ctx.closePath()
		ctx.fillStyle = fill
		ctx.fill()
		ctx.stroke()
	}
}

function drawFlake(ctx: CanvasRenderingContext2D, size: number, color: string): void {
	const c = size / 2
	softGlow(ctx, size, color, 0.18)
	ctx.strokeStyle = withAlpha(color, 0.85)
	ctx.lineWidth = size * 0.035
	ctx.lineCap = 'round'
	for (let arm = 0; arm < 6; arm++) {
		const angle = (Math.PI / 3) * arm
		const reach = size * 0.3
		const cos = Math.cos(angle)
		const sin = Math.sin(angle)
		ctx.beginPath()
		ctx.moveTo(c, c)
		ctx.lineTo(c + cos * reach, c + sin * reach)
		const branch = reach * 0.55
		for (const side of [-1, 1]) {
			const branchAngle = angle + side * 0.6
			ctx.moveTo(c + cos * branch, c + sin * branch)
			ctx.lineTo(
				c + cos * branch + Math.cos(branchAngle) * reach * 0.3,
				c + sin * branch + Math.sin(branchAngle) * reach * 0.3,
			)
		}
		ctx.stroke()
	}
}

function drawStar(ctx: CanvasRenderingContext2D, size: number, color: string): void {
	const c = size / 2
	softGlow(ctx, size, color, 0.12)
	ctx.fillStyle = withAlpha('#ffffff', 0.95)
	ctx.beginPath()
	for (let point = 0; point < 8; point++) {
		const radius = point % 2 === 0 ? size * 0.34 : size * 0.06
		const angle = -Math.PI / 2 + (Math.PI * point) / 4
		const x = c + Math.cos(angle) * radius
		const y = c + Math.sin(angle) * radius
		if (point === 0) ctx.moveTo(x, y)
		else ctx.lineTo(x, y)
	}
	ctx.closePath()
	ctx.fill()
}

function buildSprite(color: string, shape: SpriteShape): HTMLCanvasElement {
	const size = shape === 'bloom' ? BLOOM_SPRITE_SIZE : SPRITE_SIZE
	const [canvas, ctx] = createCanvas(size)
	if (!ctx) return canvas
	switch (shape) {
		case 'cube':
			drawCube(ctx, size, color)
			break
		case 'flake':
			drawFlake(ctx, size, color)
			break
		case 'star':
			drawStar(ctx, size, color)
			break
		case 'spark':
			softGlow(ctx, size, color, 0.16)
			break
		case 'glow':
			softGlow(ctx, size, color, 0.28)
			break
		case 'bloom': {
			const c = size / 2
			const gradient = ctx.createRadialGradient(c, c, 0, c, c, c)
			gradient.addColorStop(0, withAlpha(color, 0.6))
			gradient.addColorStop(0.45, withAlpha(color, 0.22))
			gradient.addColorStop(1, withAlpha(color, 0))
			ctx.fillStyle = gradient
			ctx.fillRect(0, 0, size, size)
			break
		}
	}
	return canvas
}

function buildCoreSprite(color: string): HTMLCanvasElement {
	const [canvas, ctx] = createCanvas(BLOOM_SPRITE_SIZE)
	if (!ctx) return canvas
	const c = BLOOM_SPRITE_SIZE / 2
	const gradient = ctx.createRadialGradient(c, c, 0, c, c, c)
	gradient.addColorStop(0, 'rgba(255, 248, 235, 0.55)')
	gradient.addColorStop(0.18, withAlpha(color, 0.32))
	gradient.addColorStop(1, withAlpha(color, 0))
	ctx.fillStyle = gradient
	ctx.fillRect(0, 0, BLOOM_SPRITE_SIZE, BLOOM_SPRITE_SIZE)
	return canvas
}

function prepareScene(): void {
	const current = scene.value
	sprites = current.colors.map((color) => buildSprite(color, current.shape))
	coreSprite = current.core ? buildCoreSprite(current.core) : null
	particles = []
	bolt = []
	boltBranches = []
	boltAge = 1
	boltCooldown = 1.2
	fillParticles(true)
}

function spawn(particle: Particle | null, anywhere: boolean): Particle {
	const current = scene.value
	const z = Math.random()
	const depthScale = 0.55 + z * 0.75
	const size = between(current.size) * depthScale
	const margin = size * current.stretch
	const speed = between(current.speed) * (0.6 + z * 0.6)
	const next: Particle = particle ?? ({} as Particle)
	next.z = z
	next.size = size
	next.rotation = Math.random() * Math.PI * 2
	next.spin = between(current.spin)
	next.alpha = between(current.alpha) * (0.45 + z * 0.55)
	next.phase = Math.random() * Math.PI * 2
	next.frequency = 0.6 + Math.random() * 1.6
	next.sway = between(current.sway)
	next.sprite = sprites[Math.floor(Math.random() * sprites.length)]
	next.vx = 0
	next.vy = speed

	switch (current.motion) {
		case 'rise':
			next.x = Math.random() * width
			next.y = anywhere ? Math.random() * height : height + margin
			break
		case 'fall':
			next.x = Math.random() * width
			next.y = anywhere ? Math.random() * height : -margin
			break
		case 'wander': {
			const heading = Math.random() * Math.PI * 2
			next.x = Math.random() * width
			next.y = Math.random() * height
			next.vx = Math.cos(heading) * speed
			next.vy = Math.sin(heading) * speed
			break
		}
		case 'drift':
			next.vx = speed * (Math.random() < 0.5 ? -1 : 1)
			next.x = anywhere ? Math.random() * width : next.vx > 0 ? -margin : width + margin
			next.y = height * (0.08 + Math.random() * 0.5)
			break
		case 'orbit':
			next.angle = Math.random() * Math.PI * 2
			next.radius = Math.sqrt(Math.random()) * Math.min(width * 0.5, height * 0.62)
			next.vx = speed * (1.25 - next.radius / Math.max(1, width)) * (Math.random() < 0.15 ? -1 : 1)
			next.x = 0
			next.y = 0
			break
	}
	return next
}

function wantedCount(): number {
	const current = scene.value
	const byArea = (width * height) / current.area
	return Math.max(6, Math.round(Math.min(current.max, byArea) * budget))
}

function fillParticles(anywhere: boolean): void {
	const wanted = wantedCount()
	if (particles.length > wanted) particles.length = wanted
	while (particles.length < wanted) particles.push(spawn(null, anywhere))
}

function resize(): void {
	resizeQueued = false
	const canvas = canvasRef.value
	if (!canvas) return
	dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
	width = window.innerWidth
	height = window.innerHeight
	canvas.width = Math.max(1, Math.floor(width * dpr))
	canvas.height = Math.max(1, Math.floor(height * dpr))
	context = canvas.getContext('2d', { alpha: true })
	if (sprites.length > 0) fillParticles(true)
}

function queueResize(): void {
	if (resizeQueued) return
	resizeQueued = true
	requestAnimationFrame(resize)
}

function onPointerMove(event: PointerEvent): void {
	pointerX = width > 0 ? (event.clientX / width) * 2 - 1 : 0
	pointerY = height > 0 ? (event.clientY / height) * 2 - 1 : 0
}

function boltPath(start: Point, end: Point, segments: number, spread: number): Point[] {
	const points = [start]
	for (let index = 1; index < segments; index++) {
		const progress = index / segments
		const envelope = Math.sin(progress * Math.PI)
		points.push({
			x: start.x + (end.x - start.x) * progress + (Math.random() - 0.5) * spread * envelope,
			y: start.y + (end.y - start.y) * progress,
		})
	}
	points.push(end)
	return points
}

function strikeBolt(): void {
	const start = { x: width * (0.1 + Math.random() * 0.8), y: -10 }
	const end = {
		x: start.x + (Math.random() - 0.5) * Math.min(width * 0.4, 360),
		y: height * (0.3 + Math.random() * 0.5),
	}
	bolt = boltPath(start, end, 12, Math.min(width * 0.08, 70))
	boltBranches = []
	const branches = 2 + Math.floor(Math.random() * 3)
	for (let index = 0; index < branches; index++) {
		const origin = bolt[2 + Math.floor(Math.random() * (bolt.length - 4))]
		const branchEnd = {
			x: origin.x + (Math.random() - 0.5) * Math.min(width * 0.22, 200),
			y: origin.y + height * (0.08 + Math.random() * 0.16),
		}
		boltBranches.push(boltPath(origin, branchEnd, 5, Math.min(width * 0.03, 30)))
	}
	boltAge = 0
	boltDuration = 0.32 + Math.random() * 0.2
	boltCooldown = 2.6 + Math.random() * 3.4
}

function strokePath(
	ctx: CanvasRenderingContext2D,
	points: Point[],
	lineWidth: number,
	color: string,
) {
	ctx.beginPath()
	ctx.moveTo(points[0].x, points[0].y)
	for (let index = 1; index < points.length; index++) ctx.lineTo(points[index].x, points[index].y)
	ctx.lineWidth = lineWidth
	ctx.strokeStyle = color
	ctx.stroke()
}

/** Glow is layered strokes instead of `shadowBlur`, which is very expensive. */
function drawLightning(ctx: CanvasRenderingContext2D, step: number): void {
	boltCooldown -= step
	if (boltAge >= boltDuration && boltCooldown <= 0) strikeBolt()
	if (boltAge >= boltDuration || bolt.length === 0) return
	boltAge += step
	const fade = Math.max(0, 1 - boltAge / boltDuration)
	const flicker = Math.random() < 0.14 ? 0.4 : 1

	ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
	ctx.globalAlpha = 1
	ctx.fillStyle = `rgba(120, 195, 255, ${fade * 0.05})`
	ctx.fillRect(0, 0, width, height)
	ctx.globalAlpha = fade * flicker
	ctx.lineCap = 'round'
	ctx.lineJoin = 'round'
	for (const branch of boltBranches) {
		strokePath(ctx, branch, 7, 'rgba(80, 175, 255, 0.18)')
		strokePath(ctx, branch, 1.4, 'rgba(232, 249, 255, 0.85)')
	}
	strokePath(ctx, bolt, 16, 'rgba(70, 160, 255, 0.14)')
	strokePath(ctx, bolt, 6, 'rgba(110, 195, 255, 0.4)')
	strokePath(ctx, bolt, 2, 'rgba(246, 253, 255, 0.98)')
}

function advance(particle: Particle, step: number): boolean {
	const current = scene.value
	switch (current.motion) {
		case 'rise':
			particle.y -= particle.vy * step
			return particle.y < -particle.size * 2
		case 'fall':
			particle.y += particle.vy * step
			return particle.y > height + particle.size * 2
		case 'wander': {
			const speed = Math.hypot(particle.vx, particle.vy) || 1
			const turn = (Math.random() - 0.5) * 2.4 * step
			const heading = Math.atan2(particle.vy, particle.vx) + turn
			particle.vx = Math.cos(heading) * speed
			particle.vy = Math.sin(heading) * speed
			particle.x += particle.vx * step
			particle.y += particle.vy * step
			if (particle.x < -30) particle.x = width + 30
			else if (particle.x > width + 30) particle.x = -30
			if (particle.y < -30) particle.y = height + 30
			else if (particle.y > height + 30) particle.y = -30
			return false
		}
		case 'drift': {
			particle.x += particle.vx * step
			const reach = particle.size * current.stretch
			return particle.vx > 0 ? particle.x > width + reach : particle.x < -reach
		}
		case 'orbit':
			particle.angle += particle.vx * step
			return false
	}
}

function render(timestamp: number): void {
	frameHandle = requestAnimationFrame(render)
	const ctx = context
	if (!ctx) return
	if (lastFrame !== 0 && timestamp - lastFrame < MIN_FRAME_MS) return

	const deltaMs = lastFrame === 0 ? 16 : timestamp - lastFrame
	lastFrame = timestamp
	adaptBudget(deltaMs)
	const step = Math.min(deltaMs / 1000, MAX_STEP_S)
	elapsed += step
	const current = scene.value

	parallaxX += (pointerX - parallaxX) * Math.min(1, step * 3)
	parallaxY += (pointerY - parallaxY) * Math.min(1, step * 3)

	ctx.setTransform(1, 0, 0, 1, 0, 0)
	ctx.globalCompositeOperation = 'source-over'
	ctx.globalAlpha = 1
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
	ctx.globalCompositeOperation = current.composite

	const centerX = width / 2 - parallaxX * PARALLAX_X * 0.5
	const centerY = height * 0.46 - parallaxY * PARALLAX_Y * 0.5
	if (coreSprite) {
		const pulse = 1 + Math.sin(elapsed * 0.6) * 0.04
		const coreSize = Math.min(width, height) * 0.9 * pulse
		const scale = (coreSize / BLOOM_SPRITE_SIZE) * dpr
		ctx.globalAlpha = 0.7
		ctx.setTransform(scale * 1.5, 0, 0, scale * 0.75, centerX * dpr, centerY * dpr)
		ctx.drawImage(coreSprite, -BLOOM_SPRITE_SIZE / 2, -BLOOM_SPRITE_SIZE / 2)
	}

	for (const particle of particles) {
		particle.phase += step * particle.frequency
		particle.rotation += particle.spin * step
		if (advance(particle, step)) {
			spawn(particle, false)
			continue
		}

		let x: number
		let y: number
		if (current.motion === 'orbit') {
			x = centerX + Math.cos(particle.angle) * particle.radius
			y = centerY + Math.sin(particle.angle) * particle.radius * 0.5
		} else {
			x = particle.x + Math.sin(particle.phase) * particle.sway
			y = particle.y + (current.motion === 'drift' ? Math.sin(particle.phase * 0.5) * 18 : 0)
		}
		x -= parallaxX * PARALLAX_X * particle.z
		y -= parallaxY * PARALLAX_Y * particle.z

		const twinkle = 1 - current.twinkle * (0.5 + 0.5 * Math.sin(particle.phase * 2.6))
		const alpha = particle.alpha * twinkle
		if (alpha <= 0.01) continue

		const spriteSize = particle.sprite.width
		const scale = (particle.size / spriteSize) * dpr
		const scaleX = scale * current.stretch
		ctx.globalAlpha = alpha
		if (particle.spin === 0) {
			ctx.setTransform(scaleX, 0, 0, scale, x * dpr, y * dpr)
		} else {
			const cos = Math.cos(particle.rotation)
			const sin = Math.sin(particle.rotation)
			ctx.setTransform(scaleX * cos, scaleX * sin, -scale * sin, scale * cos, x * dpr, y * dpr)
		}
		ctx.drawImage(particle.sprite, -spriteSize / 2, -spriteSize / 2)
	}

	if (current.lightning) drawLightning(ctx, step)
	ctx.globalAlpha = 1
	ctx.globalCompositeOperation = 'source-over'
}

/**
 * Thins the scene out when frames arrive late (a busy GPU, a weak laptop) and
 * slowly restores it once rendering is comfortably on time again.
 */
function adaptBudget(deltaMs: number): void {
	if (deltaMs > 26) {
		fastFrames = 0
		if (++slowFrames >= 45 && budget > 0.4) {
			slowFrames = 0
			budget = Math.max(0.4, budget * 0.8)
			fillParticles(false)
		}
	} else if (deltaMs < 19) {
		slowFrames = Math.max(0, slowFrames - 1)
		if (++fastFrames >= 300 && budget < 1) {
			fastFrames = 0
			budget = Math.min(1, budget + 0.1)
			fillParticles(false)
		}
	}
}

function shouldRun(): boolean {
	return effectsActive.value && !backgroundPaused.value && !document.hidden
}

function start(): void {
	if (frameHandle !== 0 || !shouldRun()) return
	resize()
	if (sprites.length === 0) prepareScene()
	lastFrame = 0
	frameHandle = requestAnimationFrame(render)
}

function stop(): void {
	if (frameHandle !== 0) cancelAnimationFrame(frameHandle)
	frameHandle = 0
	lastFrame = 0
	context?.setTransform(1, 0, 0, 1, 0, 0)
	context?.clearRect(0, 0, context.canvas.width, context.canvas.height)
}

function sync(): void {
	if (shouldRun()) start()
	else stop()
}

/** Scenes swap behind a short crossfade instead of popping. */
watch(effectStyle, (next) => {
	if (next === visibleScene.value) return
	if (fadeTimer) clearTimeout(fadeTimer)
	if (frameHandle === 0) {
		visibleScene.value = next
		sprites = []
		return
	}
	fading.value = true
	fadeTimer = setTimeout(() => {
		fadeTimer = undefined
		visibleScene.value = effectStyle.value
		prepareScene()
		fading.value = false
	}, 260)
})

watch([effectsActive, backgroundPaused], sync)

onMounted(() => {
	window.addEventListener('resize', queueResize, { passive: true })
	window.addEventListener('pointermove', onPointerMove, { passive: true })
	document.addEventListener('visibilitychange', sync)
	sync()
})

onBeforeUnmount(() => {
	stop()
	if (fadeTimer) clearTimeout(fadeTimer)
	window.removeEventListener('resize', queueResize)
	window.removeEventListener('pointermove', onPointerMove)
	document.removeEventListener('visibilitychange', sync)
})
</script>

<template>
	<canvas
		v-show="effectsActive"
		ref="canvasRef"
		class="minekube-effects-layer"
		:style="{ opacity: fading ? 0 : scene.opacity }"
		aria-hidden="true"
	/>
</template>

<style scoped>
.minekube-effects-layer {
	position: fixed;
	inset: 0;
	width: 100vw;
	height: 100vh;
	z-index: 3;
	pointer-events: none;
	transition: opacity 260ms ease;
}
</style>
