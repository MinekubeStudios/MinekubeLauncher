// Special buttons runtime — the interactive layer behind the Play / Stop
// buttons and the small Play orbs.
//
// Design rules this file follows, because the previous implementation got
// them wrong:
//
//   * NOTHING is injected into the buttons. Every effect is either CSS
//     (driven by the variables in `special-buttons.scss`) or drawn on one
//     shared, body-level canvas. Vue's patching can therefore never fight
//     an effect element, and no button can be left with orphaned nodes.
//   * ONE animation frame loop for every button on screen, and it stops
//     completely when there is nothing to draw — an offscreen or hidden
//     button costs nothing.
//   * Sprites are pre-rendered once per colour into small offscreen
//     canvases and then blitted with `drawImage`. The old code built a
//     radial gradient per particle per frame, which is the single most
//     expensive thing you can do in a 2D canvas loop.
//   * Colours come from the active style's CSS variables, so a style owns
//     its own sparks without any JavaScript change.

type Glow = {
	primary: string
	secondary: string
	tertiary: string
	density: number
}

type Particle = {
	x: number
	y: number
	vx: number
	vy: number
	life: number
	maxLife: number
	size: number
	sprite: HTMLCanvasElement
	spin: number
}

type Ring = {
	x: number
	y: number
	life: number
	maxLife: number
	radius: number
	growth: number
	width: number
	color: string
}

type Registered = {
	el: HTMLElement
	group: HTMLElement | null
	visible: boolean
	hovering: boolean
	pointerX: number
	pointerY: number
	lastAmbient: number
	glow: Glow | null
}

type Sprite = { canvas: HTMLCanvasElement; size: number }

const SPRITE_CACHE = new Map<string, Sprite>()
const SPRITE_SIZE = 48

const registry = new Map<HTMLElement, Registered>()
const particles: Particle[] = []
const rings: Ring[] = []

const MAX_PARTICLES = 320

let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let frameHandle: number | null = null
let observer: MutationObserver | null = null
let resizeObserver: ResizeObserver | null = null
let probe: HTMLElement | null = null
let lastFrame = 0
const observerTargets = new Map<HTMLElement, () => void>()
let intersectionObserver: IntersectionObserver | null = null
let themeObserver: MutationObserver | null = null
const pendingRoots = new Set<ParentNode>()
let pruneScheduled = false
let flushHandle: number | null = null

// ---------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------

function rand(min: number, max: number): number {
	return Math.random() * (max - min) + min
}

/**
 * A decorative layer must never be able to break a button. Every entry point
 * that touches the canvas or the computed style goes through one of the
 * guards below, so a webview without 2D canvas support degrades to the pure
 * CSS half of the effect instead of throwing inside a click handler.
 */
function get2d(element: HTMLCanvasElement): CanvasRenderingContext2D | null {
	try {
		return element.getContext('2d')
	} catch {
		return null
	}
}

function safeCompute<T>(callback: () => T, fallback: T): T {
	try {
		return callback()
	} catch {
		return fallback
	}
}

function animationsEnabled(): boolean {
	if (typeof document === 'undefined') return false
	if (document.documentElement.classList.contains('no-animations')) return false
	return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * Resolves a `--sb-*` custom property to a concrete colour. Values that
 * already are literal colours are used as-is; values built from `var()`
 * are resolved through a probe element that inherits the document's own
 * style variables, and anything unresolvable falls back to the button's
 * computed background, which the browser has already resolved for us.
 */
function resolveColor(el: HTMLElement, name: string, fallback: string): string {
	if (typeof getComputedStyle !== 'function') return fallback
	const computed = getComputedStyle(el)
	const raw = computed.getPropertyValue(name).trim()
	if (raw && !raw.includes('var(')) return raw

	const background = computed.backgroundColor
	const base = background && background !== 'rgba(0, 0, 0, 0)' ? background : ''

	if (!raw) return base || fallback

	if (!probe) {
		probe = document.createElement('div')
		probe.setAttribute('aria-hidden', 'true')
		probe.style.cssText =
			'position:fixed;left:-9999px;top:0;width:1px;height:1px;pointer-events:none;opacity:0;'
		document.body.appendChild(probe)
	}

	probe.style.setProperty('--sb-probe', raw)
	probe.style.color = 'var(--sb-probe)'

	const resolved = getComputedStyle(probe).color
	probe.style.removeProperty('--sb-probe')
	return resolved || base || fallback
}

function readGlow(el: HTMLElement): Glow | null {
	if (!animationsEnabled()) return null

	const density = safeCompute(
		() =>
			Number.parseInt(getComputedStyle(el).getPropertyValue('--sb-particles').trim() || '0', 10),
		0,
	)
	if (!Number.isFinite(density) || density <= 0) return null

	return {
		primary: resolveColor(el, '--sb-glow', '#fcc000'),
		secondary: resolveColor(el, '--sb-glow-2', '#fc0060'),
		tertiary: resolveColor(el, '--sb-glow-3', '#ffffff'),
		density: Math.min(density, 60),
	}
}

/** Glow colours for the click pulse, which every style gets. */
function readPulse(el: HTMLElement): Glow {
	return {
		primary: resolveColor(el, '--sb-glow', '#fcc000'),
		secondary: resolveColor(el, '--sb-glow-2', '#fc0060'),
		tertiary: resolveColor(el, '--sb-glow-3', '#ffffff'),
		density: 0,
	}
}

function spriteFor(color: string): Sprite {
	const cached = SPRITE_CACHE.get(color)
	if (cached) return cached

	const size = SPRITE_SIZE
	const offscreen = document.createElement('canvas')
	offscreen.width = size
	offscreen.height = size
	const offCtx = get2d(offscreen)
	if (offCtx) {
		const half = size / 2
		const gradient = offCtx.createRadialGradient(half, half, 0, half, half, half)
		gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
		gradient.addColorStop(0.18, color)
		gradient.addColorStop(0.55, withAlpha(color, 0.35))
		gradient.addColorStop(1, withAlpha(color, 0))
		offCtx.fillStyle = gradient
		offCtx.beginPath()
		offCtx.arc(half, half, half, 0, Math.PI * 2)
		offCtx.fill()
	}

	const sprite = { canvas: offscreen, size }
	SPRITE_CACHE.set(color, sprite)
	return sprite
}

/**
 * `color` may be any CSS colour the browser produced for us, so the alpha
 * has to be applied in a way that works for hex, rgb() and named colours.
 * Painting into a cached tinted sprite keeps this off the hot path.
 */
function withAlpha(color: string, alpha: number): string {
	const hex = color.trim()
	if (hex.startsWith('#')) {
		const value = hex.slice(1)
		const full =
			value.length === 3
				? value
						.split('')
						.map((char) => char + char)
						.join('')
				: value
		const numeric = Number.parseInt(full.slice(0, 6), 16)
		if (!Number.isNaN(numeric)) {
			return `rgba(${(numeric >> 16) & 255}, ${(numeric >> 8) & 255}, ${numeric & 255}, ${alpha})`
		}
	}
	const match = hex.match(/rgba?\(([^)]+)\)/)
	if (match) {
		const [r, g, b] = match[1].split(',').map((part) => Number.parseFloat(part))
		return `rgba(${r || 255}, ${g || 255}, ${b || 255}, ${alpha})`
	}
	return `rgba(255, 255, 255, ${alpha})`
}

// ---------------------------------------------------------------------
//  Canvas
// ---------------------------------------------------------------------

function ensureCanvas(): CanvasRenderingContext2D | null {
	if (ctx && canvas) return ctx
	if (typeof document === 'undefined') return null

	canvas = document.createElement('canvas')
	canvas.className = 'sb-canvas'
	canvas.setAttribute('aria-hidden', 'true')
	document.body.appendChild(canvas)
	ctx = get2d(canvas)
	sizeCanvas()
	return ctx
}

function sizeCanvas(): void {
	if (!canvas) return
	const ratio = Math.min(window.devicePixelRatio || 1, 2)
	canvas.width = Math.floor(window.innerWidth * ratio)
	canvas.height = Math.floor(window.innerHeight * ratio)
	canvas.style.width = `${window.innerWidth}px`
	canvas.style.height = `${window.innerHeight}px`
	ctx?.setTransform(ratio, 0, 0, ratio, 0, 0)
}

function rectOf(entry: Registered): DOMRect {
	return (entry.group ?? entry.el).getBoundingClientRect()
}

// ---------------------------------------------------------------------
//  Spawning
// ---------------------------------------------------------------------

function spawnAmbient(entry: Registered): void {
	const glow = entry.glow
	if (!glow || particles.length > MAX_PARTICLES) return

	const rect = rectOf(entry)
	const colors = [glow.primary, glow.secondary, glow.tertiary]
	const count = Math.max(1, Math.round(glow.density / 10))

	for (let i = 0; i < count; i++) {
		// Spawn just outside the silhouette, drifting inwards, so sparks
		// read as an aura around the button instead of noise behind it.
		const edge = Math.floor(Math.random() * 4)
		const spread = 26
		let x = rect.left + rand(-spread, rect.width + spread)
		let y = rect.top + rand(-spread, rect.height + spread)
		if (edge === 0) y = rect.top - spread
		else if (edge === 1) x = rect.right + spread
		else if (edge === 2) y = rect.bottom + spread
		else x = rect.left - spread

		const targetX = rect.left + rect.width / 2
		const targetY = rect.top + rect.height / 2
		const dx = targetX - x
		const dy = targetY - y
		const distance = Math.hypot(dx, dy) || 1
		const speed = rand(0.06, 0.24)

		particles.push({
			x,
			y,
			vx: (dx / distance) * speed + rand(-0.08, 0.08),
			vy: (dy / distance) * speed + rand(-0.08, 0.08),
			life: 0,
			maxLife: rand(90, 190),
			size: rand(3, 9),
			sprite: spriteFor(colors[Math.floor(Math.random() * colors.length)]).canvas,
			spin: rand(-1, 1),
		})
	}
}

function spawnBurst(el: HTMLElement, glow: Glow, x: number, y: number, scale = 1): void {
	if (particles.length > MAX_PARTICLES) return

	const colors = [glow.primary, glow.secondary, glow.tertiary]
	const count = Math.round(rand(18, 30) * scale)

	for (let i = 0; i < count; i++) {
		const angle = Math.random() * Math.PI * 2
		const speed = rand(1.2, 6.4) * scale
		particles.push({
			x,
			y,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed - rand(0.2, 1.1),
			life: 0,
			maxLife: rand(40, 86),
			size: rand(3, 11) * scale,
			sprite: spriteFor(colors[Math.floor(Math.random() * colors.length)]).canvas,
			spin: rand(-2, 2),
		})
	}

	rings.push({
		x,
		y,
		life: 0,
		maxLife: 46,
		radius: Math.min(18, Math.max(6, (el.offsetWidth || 120) / 9)),
		growth: 3.4 * scale,
		width: 3 * scale,
		color: glow.primary,
	})
}

// ---------------------------------------------------------------------
//  Drawing
// ---------------------------------------------------------------------

function frame(now: number): void {
	const context = ensureCanvas()
	if (!context) return

	const delta = Math.min(now - lastFrame || 16, 34) / 16.667
	lastFrame = now
	const width = window.innerWidth
	const height = window.innerHeight

	context.clearRect(0, 0, width, height)
	context.globalCompositeOperation = 'lighter'

	for (const entry of registry.values()) {
		if (!entry.hovering || !entry.visible || !entry.glow) continue
		if (now - entry.lastAmbient < 46) continue
		entry.lastAmbient = now
		spawnAmbient(entry)
	}

	for (let i = particles.length - 1; i >= 0; i--) {
		const particle = particles[i]
		particle.life += delta
		particle.x += particle.vx * delta
		particle.y += particle.vy * delta
		particle.vx *= 0.988
		particle.vy *= 0.988
		particle.vy -= 0.012 * delta

		if (particle.life >= particle.maxLife) {
			particles.splice(i, 1)
			continue
		}

		const progress = particle.life / particle.maxLife
		const alpha = Math.sin(progress * Math.PI) * 0.9
		const size = particle.size * (1 + progress * 0.6)
		context.globalAlpha = Math.max(0, Math.min(1, alpha))
		context.drawImage(particle.sprite, particle.x - size, particle.y - size, size * 2, size * 2)
	}

	for (let i = rings.length - 1; i >= 0; i--) {
		const ring = rings[i]
		ring.life += delta
		ring.radius += ring.growth * delta
		if (ring.life >= ring.maxLife) {
			rings.splice(i, 1)
			continue
		}

		const progress = ring.life / ring.maxLife
		context.globalAlpha = Math.max(0, 1 - progress) * 0.85
		context.strokeStyle = ring.color
		context.lineWidth = Math.max(0.5, ring.width * (1 - progress))
		context.beginPath()
		context.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2)
		context.stroke()
	}

	context.globalAlpha = 1
	context.globalCompositeOperation = 'source-over'

	if (canvas) canvas.classList.toggle('sb-canvas--live', particles.length > 0 || rings.length > 0)

	if (particles.length > 0 || rings.length > 0) {
		frameHandle = requestAnimationFrame(frame)
	} else {
		frameHandle = null
		if (canvas) canvas.classList.remove('sb-canvas--live')
	}
}

function wake(): void {
	if (frameHandle !== null) return
	if (document.visibilityState !== 'visible') return
	lastFrame = performance.now()
	frameHandle = requestAnimationFrame(frame)
}

// ---------------------------------------------------------------------
//  Interaction
// ---------------------------------------------------------------------

function clearTilt(el: HTMLElement): void {
	el.style.removeProperty('--sb-tilt-x')
	el.style.removeProperty('--sb-tilt-y')
	el.style.removeProperty('--sb-mx')
	el.style.removeProperty('--sb-my')
}

function handlePointerMove(
	el: HTMLElement,
	maxTilt: number,
	rect: DOMRect,
	clientX: number,
	clientY: number,
): void {
	if (!rect.width || !rect.height) return
	const px = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
	const py = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height))
	el.style.setProperty('--sb-tilt-y', `${((px - 0.5) * 2 * maxTilt).toFixed(2)}deg`)
	el.style.setProperty('--sb-tilt-x', `${((0.5 - py) * 2 * maxTilt * 0.7).toFixed(2)}deg`)
	el.style.setProperty('--sb-mx', `${(px * 100).toFixed(1)}%`)
	el.style.setProperty('--sb-my', `${(py * 100).toFixed(1)}%`)
}

function press(
	el: HTMLElement,
	group: HTMLElement,
	point: { clientX: number; clientY: number },
): void {
	if (!animationsEnabled()) return
	if (el.matches(':disabled, [aria-disabled="true"]')) return

	const glow = readPulse(el)

	el.classList.remove('sb-pressed')
	// Reading a layout property restarts the animation reliably, which is
	// what makes rapid clicking feel responsive instead of ignored.
	void el.offsetWidth
	el.classList.add('sb-pressed')
	window.setTimeout(() => el.classList.remove('sb-pressed'), 680)

	try {
		const rect = group.getBoundingClientRect()
		const x = point.clientX || rect.left + rect.width / 2
		const y = point.clientY || rect.top + rect.height / 2

		spawnBurst(el, glow, x, y, 1)
		rings.push({
			x,
			y,
			life: 0,
			maxLife: 60,
			radius: 4,
			growth: 2.1,
			width: 2,
			color: glow.secondary,
		})
		wake()
	} catch {
		// The pulse class above already answered the click; sparks are a bonus.
	}
}

function register(el: HTMLElement): void {
	if (registry.has(el)) return

	const group = (el.closest('.mk-play-cta[role="group"]') as HTMLElement | null) ?? el
	// The glow is resolved lazily on hover. Resolving it here forced a style
	// recalculation per button while a whole grid of cards was mounting.
	const entry: Registered = {
		el,
		group,
		visible: true,
		hovering: false,
		pointerX: 0,
		pointerY: 0,
		lastAmbient: 0,
		glow: null,
	}
	registry.set(el, entry)

	const maxTilt = () => {
		const value = Number.parseFloat(getComputedStyle(el).getPropertyValue('--sb-tilt').trim())
		return Number.isFinite(value) ? value : 0
	}

	// Pointer moves arrive far more often than frames (high-rate mice report
	// up to 1000 times a second). The tilt and the element's box are read once
	// on enter, and the style is written at most once per frame, so moving the
	// cursor never forces extra style or layout work.
	let tilt = 0
	let rect: DOMRect | null = null
	let moveFrame = 0
	let lastX = 0
	let lastY = 0
	const cancelMove = () => {
		if (moveFrame) cancelAnimationFrame(moveFrame)
		moveFrame = 0
	}
	const onEnter = () => {
		entry.hovering = true
		entry.glow = readGlow(el)
		tilt = maxTilt()
		rect = tilt > 0 ? el.getBoundingClientRect() : null
		if (tilt > 0) window.addEventListener('scroll', onScroll, { passive: true, capture: true })
		wake()
	}
	const onLeave = () => {
		entry.hovering = false
		cancelMove()
		rect = null
		window.removeEventListener('scroll', onScroll, { capture: true })
		clearTilt(el)
	}
	const onMove = (event: PointerEvent) => {
		if (tilt <= 0 || !animationsEnabled()) return
		lastX = event.clientX
		lastY = event.clientY
		if (moveFrame) return
		moveFrame = requestAnimationFrame(() => {
			moveFrame = 0
			if (!entry.hovering) return
			rect ??= el.getBoundingClientRect()
			handlePointerMove(el, tilt, rect, lastX, lastY)
		})
	}
	// The box moves when the page scrolls under a still cursor.
	const onScroll = () => {
		rect = null
	}
	const onDown = (event: PointerEvent) => {
		if (event.button !== 0) return
		press(el, group, event)
	}

	el.addEventListener('pointerenter', onEnter)
	el.addEventListener('pointerleave', onLeave)
	el.addEventListener('pointermove', onMove)
	el.addEventListener('pointerdown', onDown)

	observerTargets.set(el, () => {
		cancelMove()
		window.removeEventListener('scroll', onScroll, { capture: true })
		el.removeEventListener('pointerenter', onEnter)
		el.removeEventListener('pointerleave', onLeave)
		el.removeEventListener('pointermove', onMove)
		el.removeEventListener('pointerdown', onDown)
		intersectionObserver?.unobserve(el)
		resizeObserver?.unobserve(el)
		clearTilt(el)
		el.classList.remove('sb-pressed')
	})

	intersectionObserver?.observe(el)
	resizeObserver?.observe(el)
}

function unregister(el: HTMLElement): void {
	observerTargets.get(el)?.()
	observerTargets.delete(el)
	registry.delete(el)
}

const SELECTOR = '.mk-play-cta, .mk-stop-cta, .mk-play-icon, .mk-stop-icon'

function scan(root: ParentNode): void {
	root.querySelectorAll<HTMLElement>(SELECTOR).forEach(register)
}

/**
 * Adds are collected and flushed once per frame. A busy screen (a
 * virtualised list, a filtering grid) can mutate the DOM dozens of times per
 * frame, and running a `querySelectorAll` for each of those is exactly how a
 * background animation ends up stuttering the interface it decorates.
 */
function scheduleFlush(): void {
	if (flushHandle !== null) return
	flushHandle = requestAnimationFrame(() => {
		flushHandle = null
		const roots = Array.from(pendingRoots)
		pendingRoots.clear()
		for (const node of roots) {
			if ((node as Node).isConnected !== false) scan(node)
		}
		if (pruneScheduled || roots.length > 0) {
			pruneScheduled = false
			registry.forEach((_entry, element) => {
				if (!element.isConnected) unregister(element)
			})
		}
	})
}

function scheduleScan(root: ParentNode): void {
	pendingRoots.add(root)
	scheduleFlush()
}

/**
 * Removed buttons only need to be dropped from the registry, which is a walk
 * over the registry itself. Re-scanning the whole document for every removal
 * ran a document-wide query each frame on screens that constantly replace
 * nodes (live logs, progress bars, virtualised lists).
 */
function schedulePrune(): void {
	pruneScheduled = true
	scheduleFlush()
}

/** A style or theme change invalidates every cached glow; it is re-read on hover. */
function invalidateGlows(): void {
	registry.forEach((entry, element) => {
		entry.glow = entry.hovering ? readGlow(element) : null
		clearTilt(element)
	})
}

// ---------------------------------------------------------------------
//  Public API
// ---------------------------------------------------------------------

/** Registers every special button in the document and keeps watching. */
export function mountSpecialButtons(root: ParentNode = document): void {
	if (typeof window === 'undefined' || typeof document === 'undefined') return
	if (document.body.dataset.specialButtonsMounted === 'true') return
	document.body.dataset.specialButtonsMounted = 'true'

	resizeObserver = new ResizeObserver(() => {
		if (particles.length) wake()
	})

	intersectionObserver = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				const registered = registry.get(entry.target as HTMLElement)
				if (registered) registered.visible = entry.isIntersecting
			}
		},
		{ rootMargin: '120px' },
	)

	scan(root)

	if (!observer) {
		observer = new MutationObserver((mutations) => {
			let removed = false
			for (const mutation of mutations) {
				mutation.addedNodes.forEach((node) => {
					if (!(node instanceof HTMLElement)) return
					if (node.matches(SELECTOR)) register(node)
					if (node.firstElementChild) scheduleScan(node)
				})
				for (const node of mutation.removedNodes) {
					if (!(node instanceof HTMLElement)) continue
					removed = true
					if (registry.has(node)) unregister(node)
				}
			}
			if (removed) schedulePrune()
		})
		observer.observe(document.body, { childList: true, subtree: true })
	}

	// One shared observer for style and theme changes, instead of one per button.
	if (!themeObserver) {
		themeObserver = new MutationObserver(invalidateGlows)
		themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-special-buttons', 'class', 'data-theme', 'style'],
		})
	}

	window.addEventListener('resize', () => {
		sizeCanvas()
		registry.forEach((_entry, element) => clearTilt(element))
	})

	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') wake()
	})
}

/** Fires the pulse manually — used when the launcher launches a game. */
export function pulseSpecialButton(target: HTMLElement | string): void {
	const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target
	if (!el) return
	const rect = el.getBoundingClientRect()
	press(el, el, {
		clientX: rect.left + rect.width / 2,
		clientY: rect.top + rect.height / 2,
	})
}

/** Re-reads the per-style glow colours; call after the style changes. */
export function refreshSpecialButtons(): void {
	registry.forEach((entry, element) => {
		entry.glow = readGlow(element)
		clearTilt(element)
	})
}
