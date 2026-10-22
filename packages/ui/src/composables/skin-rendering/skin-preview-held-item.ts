import * as THREE from 'three'
import { markRaw } from 'vue'

/**
 * The little pixel-art props the preview character can hold.
 *
 * Each icon is generated as a 16x16 bitmap so it matches the chunky look of the
 * skin itself instead of clashing with it, then uploaded as a nearest-filtered
 * texture. Shading is derived from the shape: any lit pixel touching the
 * outside becomes the outline, pixels in the upper left get the highlight, the
 * rest get the body colour. That keeps every icon consistent without hand
 * authoring six separate sprite sheets.
 */

export type HeldItemIcon =
	| 'gear'
	| 'heart'
	| 'cross'
	| 'check'
	| 'sparkle'
	| 'gem'
	| 'book'
	| 'pickaxe'

type IconPalette = {
	/** Border, body, highlight. */
	outline: string
	body: string
	highlight: string
}

const ICON_SIZE = 16
const ICON_CENTRE = ICON_SIZE / 2

const PALETTES: Record<HeldItemIcon, IconPalette> = {
	gear: { outline: '#2b2f38', body: '#9aa3b2', highlight: '#dfe5ef' },
	heart: { outline: '#7a0033', body: '#fc0060', highlight: '#ff85b3' },
	cross: { outline: '#6b1414', body: '#e5484d', highlight: '#ff9a9d' },
	check: { outline: '#10451f', body: '#1bd96a', highlight: '#8df5b5' },
	sparkle: { outline: '#8a6b00', body: '#fce424', highlight: '#fff8c4' },
	gem: { outline: '#0b4b52', body: '#2fd4e0', highlight: '#b3f5fa' },
	book: { outline: '#3a2410', body: '#b5651d', highlight: '#f2e4c8' },
	pickaxe: { outline: '#2b2f38', body: '#7d8697', highlight: '#dde4ef' },
}

type ShapeTest = (dx: number, dy: number) => boolean

function distanceToSegment(
	px: number,
	py: number,
	ax: number,
	ay: number,
	bx: number,
	by: number,
): number {
	const vx = bx - ax
	const vy = by - ay
	const wx = px - ax
	const wy = py - ay
	const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy)))
	return Math.hypot(px - (ax + t * vx), py - (ay + t * vy))
}

const SHAPES: Record<HeldItemIcon, ShapeTest> = {
	gear: (dx, dy) => {
		const radius = Math.hypot(dx, dy)
		const angle = Math.atan2(dy, dx) + Math.PI / 8
		const limit = Math.cos(8 * angle) > 0 ? 7.3 : 5.1
		return radius >= 2.1 && radius <= limit
	},
	heart: (dx, dy) => {
		if (Math.hypot(dx + 2.7, dy + 2.1) <= 3.5) return true
		if (Math.hypot(dx - 2.7, dy + 2.1) <= 3.5) return true
		if (dy >= -2.1 && dy <= 6.6) return Math.abs(dx) <= (5.9 * (6.6 - dy)) / 8.7
		return false
	},
	cross: (dx, dy) =>
		Math.max(Math.abs(dx), Math.abs(dy)) <= 6 &&
		(Math.abs(dx + dy) < 2.8 || Math.abs(dx - dy) < 2.8),
	check: (dx, dy) =>
		distanceToSegment(dx, dy, -4.6, 0.4, -1.4, 3.8) < 1.7 ||
		distanceToSegment(dx, dy, -1.4, 3.8, 4.8, -4.2) < 1.7,
	sparkle: (dx, dy) => Math.abs(dx) ** 0.62 + Math.abs(dy) ** 0.62 <= 7.2 ** 0.62,
	gem: (dx, dy) => Math.abs(dx) / 5.6 + Math.abs(dy) / 7 <= 1,
	book: (dx, dy) => Math.abs(dx) <= 5.6 && Math.abs(dy) <= 6.6,
	pickaxe: (dx, dy) => {
		if (distanceToSegment(dx, dy, 2, -2, -2.8, 6.4) < 1.95) return true
		const headRadius = Math.hypot(dx, dy + 7.2)
		return headRadius >= 4.3 && headRadius <= 7 && dy <= -1.2
	},
}

/**
 * Optional second pass: pixels inside the shape that should take the outline
 * colour anyway, for details a silhouette alone cannot carry — the spine of a
 * book, say.
 */
const DETAILS: Partial<Record<HeldItemIcon, ShapeTest>> = {
	book: (dx) => dx >= -2.8 && dx <= -1.2,
}

function drawIcon(icon: HeldItemIcon): HTMLCanvasElement {
	const canvas = document.createElement('canvas')
	canvas.width = ICON_SIZE
	canvas.height = ICON_SIZE

	const context = canvas.getContext('2d')
	if (!context) return canvas

	const shape = SHAPES[icon]
	const detail = DETAILS[icon]
	const palette = PALETTES[icon]

	const inside = (x: number, y: number) =>
		x >= 0 &&
		y >= 0 &&
		x < ICON_SIZE &&
		y < ICON_SIZE &&
		shape(x + 0.5 - ICON_CENTRE, y + 0.5 - ICON_CENTRE)

	for (let y = 0; y < ICON_SIZE; y++) {
		for (let x = 0; x < ICON_SIZE; x++) {
			if (!inside(x, y)) continue

			const isEdge =
				!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)
			const dx = x + 0.5 - ICON_CENTRE
			const dy = y + 0.5 - ICON_CENTRE

			context.fillStyle =
				isEdge || detail?.(dx, dy)
					? palette.outline
					: dx + dy < -2
						? palette.highlight
						: palette.body
			context.fillRect(x, y, 1, 1)
		}
	}

	return canvas
}

const textureCache = new Map<HeldItemIcon, THREE.CanvasTexture>()

function iconTexture(icon: HeldItemIcon): THREE.CanvasTexture {
	const cached = textureCache.get(icon)
	if (cached) return cached

	const texture = new THREE.CanvasTexture(drawIcon(icon))
	texture.magFilter = THREE.NearestFilter
	texture.minFilter = THREE.NearestFilter
	texture.generateMipmaps = false
	texture.colorSpace = THREE.SRGBColorSpace
	textureCache.set(icon, texture)
	return texture
}

/** Side length of the held prop, in model units (the head is 0.5 across). */
export const HELD_ITEM_SIZE = 0.42

/**
 * Offset of the prop from the arm's own origin, i.e. roughly where the hand is.
 * The arm mesh runs from y = +0.125 at the shoulder down to y = -0.625, so this
 * sits just past the fist.
 */
export const HELD_ITEM_HAND_OFFSET = new THREE.Vector3(0.06, -0.72, 0.04)

export function createHeldItemMesh(): THREE.Mesh {
	const geometry = new THREE.PlaneGeometry(HELD_ITEM_SIZE, HELD_ITEM_SIZE)
	const material = new THREE.MeshBasicMaterial({
		transparent: true,
		alphaTest: 0.5,
		side: THREE.DoubleSide,
		toneMapped: false,
	})

	const mesh = new THREE.Mesh(geometry, material)
	mesh.name = 'MinekubeHeldItem'
	mesh.visible = false
	mesh.matrixAutoUpdate = false
	mesh.frustumCulled = false
	return markRaw(mesh)
}

export function setHeldItemIcon(mesh: THREE.Mesh, icon: HeldItemIcon): void {
	const material = mesh.material as THREE.MeshBasicMaterial
	material.map = iconTexture(icon)
	material.needsUpdate = true
}

export function disposeHeldItemMesh(mesh: THREE.Mesh | null): void {
	if (!mesh) return
	mesh.geometry.dispose()
	const material = mesh.material as THREE.MeshBasicMaterial
	// The textures are shared through the module cache, so only the material
	// belongs to this instance.
	material.dispose()
}
