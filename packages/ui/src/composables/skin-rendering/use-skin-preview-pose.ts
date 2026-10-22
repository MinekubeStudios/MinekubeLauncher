import { useRenderLoop } from '@tresjs/core'
import * as THREE from 'three'
import {
	type ComputedRef,
	onBeforeUnmount,
	onUnmounted,
	type Ref,
	ref,
	shallowRef,
	watch,
} from 'vue'

import {
	carryPose,
	type EmoteDefinition,
	type EmoteJoint,
	type EmotePose,
	EMOTES,
	type SkinPreviewEmote,
} from './skin-preview-emotes'
import {
	createHeldItemMesh,
	disposeHeldItemMesh,
	HELD_ITEM_HAND_OFFSET,
	type HeldItemIcon,
	setHeldItemIcon,
} from './skin-preview-held-item'

type MaybeReadonlyRef<T> = Ref<T> | ComputedRef<T>

/**
 * Additive pose layer for the skin preview: cursor tracking with the whole
 * body, procedural emotes, free roaming and a prop the character can carry.
 *
 * The glTF clips animate `Head`, `Body` and both limbs on every frame, so these
 * offsets cannot simply be written into the nodes — the mixer would overwrite
 * them. Instead each tracked node is post-multiplied by an offset quaternion
 * right after the mixer has run, which composes the offset in the node's own
 * local space. `written` remembers what was left on the node last frame so the
 * offset is rebuilt from the mixer's value rather than compounding on itself,
 * even in a frame where the mixer produced nothing.
 *
 * Two nodes are exempt because no clip touches them, and they are what gives
 * the character its unrestricted movement:
 *   - `Orbit` carries whole-body rotation (somersaults, barrel rolls,
 *     pirouettes) and the position offset it roams with.
 *   - the model group's own Y rotation is driven straight from the cursor, so
 *     the character turns its shoulders rather than just craning its neck.
 */

/** How far the neck alone will turn before the shoulders start to follow. */
const NECK_YAW = 0.78

/** Hard stop for the neck, past which only the body can carry the turn. */
const NECK_YAW_LIMIT = 0.9
const NECK_PITCH_LIMIT = 0.62

/** How eagerly the body picks up whatever the neck cannot reach. */
const BODY_FOLLOW = 1.25

/** Total turn is capped a little past a profile view, for a lively silhouette. */
const MAX_TOTAL_YAW = 2

/**
 * Virtual depth, in pixels, at which the character stands behind the screen.
 * Turning it into a real angle this way means the cursor's own position decides
 * the turn — far to the side genuinely reaches a profile, close to it barely
 * moves — instead of a linear guess that overshoots at the edges.
 */
const VIEW_DEPTH = 620

/** Seconds in which the head covers ~63% of the distance to a new target. */
const HEAD_SMOOTHING = 0.12

/** The body is deliberately much lazier, so the head always leads the turn. */
const BODY_SMOOTHING = 0.42

/** Seconds a superseded emote gets to fade out underneath its replacement. */
const EMOTE_CROSSFADE = 0.22

/** Seconds the carried prop takes to pop in and out. */
const ITEM_POP_SECONDS = 0.3

/** Most emotes leave a little gaze showing; this is the fallback share. */
const DEFAULT_EMOTE_GAZE = 0.35

/** Half-width of the strip the character roams, in model units. */
const ROAM_LIMIT = 0.85

/** Roaming speed, in model units per second. */
const ROAM_SPEED = 0.62

/** Below this speed the walk cycle stops and the character just stands. */
const WALK_THRESHOLD = 0.02

interface TrackedNode {
	node: THREE.Object3D
	base: THREE.Quaternion
	written: THREE.Quaternion
}

interface ActiveEmote {
	definition: EmoteDefinition
	elapsed: number
	/** Drops from 1 to 0 when a newer emote takes over. */
	fade: number
	fadingOut: boolean
}

function trackNode(root: THREE.Object3D, name: string): TrackedNode | null {
	const node = root.getObjectByName(name)
	if (!node) return null
	return {
		node,
		base: node.quaternion.clone(),
		written: node.quaternion.clone(),
	}
}

function applyOffset(
	tracked: TrackedNode | null,
	euler: THREE.Euler,
	scratch: THREE.Quaternion,
): void {
	if (!tracked) return
	if (!tracked.node.quaternion.equals(tracked.written)) {
		tracked.base.copy(tracked.node.quaternion)
	}
	scratch.setFromEuler(euler)
	tracked.node.quaternion.copy(tracked.base).multiply(scratch)
	tracked.written.copy(tracked.node.quaternion)
}

function clamp(value: number, limit: number): number {
	return Math.max(-limit, Math.min(limit, value))
}

function clamp01(value: number): number {
	return Math.max(0, Math.min(1, value))
}

/** Wraps an angle into (-PI, PI] so a turned model never spins the head. */
function wrapAngle(angle: number): number {
	const wrapped = (angle + Math.PI) % (Math.PI * 2)
	return (wrapped < 0 ? wrapped + Math.PI * 2 : wrapped) - Math.PI
}

function easeInOut(t: number): number {
	return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
}

/** Slight overshoot, so a prop pops into the hand instead of fading in. */
function easeOutBack(t: number): number {
	const c = 1.9
	return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2
}

function envelope(t: number, blendIn: number, blendOut: number): number {
	if (t <= 0 || t >= 1) return 0
	const rise = blendIn > 0 ? Math.min(1, t / blendIn) : 1
	const fall = blendOut > 0 ? Math.min(1, (1 - t) / blendOut) : 1
	return easeInOut(Math.min(rise, fall))
}

interface PoseAccumulator {
	head: [number, number, number]
	body: [number, number, number]
	rightArm: [number, number, number]
	leftArm: [number, number, number]
	rightLeg: [number, number, number]
	leftLeg: [number, number, number]
	spin: [number, number, number]
	lift: number
	slide: number
}

function createAccumulator(): PoseAccumulator {
	return {
		head: [0, 0, 0],
		body: [0, 0, 0],
		rightArm: [0, 0, 0],
		leftArm: [0, 0, 0],
		rightLeg: [0, 0, 0],
		leftLeg: [0, 0, 0],
		spin: [0, 0, 0],
		lift: 0,
		slide: 0,
	}
}

function resetAccumulator(target: PoseAccumulator): void {
	for (const joint of [
		target.head,
		target.body,
		target.rightArm,
		target.leftArm,
		target.rightLeg,
		target.leftLeg,
		target.spin,
	]) {
		joint[0] = 0
		joint[1] = 0
		joint[2] = 0
	}
	target.lift = 0
	target.slide = 0
}

function addJoint(
	target: [number, number, number],
	source: EmoteJoint | undefined,
	weight: number,
): void {
	if (!source) return
	target[0] += source[0] * weight
	target[1] += source[1] * weight
	target[2] += source[2] * weight
}

function addPose(target: PoseAccumulator, pose: EmotePose, weight: number): void {
	addJoint(target.head, pose.head, weight)
	addJoint(target.body, pose.body, weight)
	addJoint(target.rightArm, pose.rightArm, weight)
	addJoint(target.leftArm, pose.leftArm, weight)
	addJoint(target.rightLeg, pose.rightLeg, weight)
	addJoint(target.leftLeg, pose.leftLeg, weight)
	addJoint(target.spin, pose.spin, weight)
	target.lift += (pose.lift ?? 0) * weight
	target.slide += (pose.slide ?? 0) * weight
}

export function useSkinPreviewPose({
	scene,
	containerElement,
	enabled,
	modelRotation,
	freeMovement,
	headAnchor = 0.32,
}: {
	scene: Ref<THREE.Object3D | null>
	containerElement: MaybeReadonlyRef<HTMLElement | null>
	enabled: MaybeReadonlyRef<boolean | undefined>
	/** Written to when `freeMovement` is on, so the whole body turns. */
	modelRotation: Ref<number>
	/** Allows turning the torso, roaming and idle weight shifts. */
	freeMovement: MaybeReadonlyRef<boolean | undefined>
	headAnchor?: number
}) {
	const head = shallowRef<TrackedNode | null>(null)
	const body = shallowRef<TrackedNode | null>(null)
	const rightArm = shallowRef<TrackedNode | null>(null)
	const leftArm = shallowRef<TrackedNode | null>(null)
	const rightLeg = shallowRef<TrackedNode | null>(null)
	const leftLeg = shallowRef<TrackedNode | null>(null)
	const orbit = shallowRef<THREE.Object3D | null>(null)
	const orbitBase = new THREE.Vector3()

	const heldItemMesh = shallowRef<THREE.Mesh | null>(null)
	const currentEmote = ref<SkinPreviewEmote | null>(null)
	const heldIcon = ref<HeldItemIcon | null>(null)
	const isRoaming = ref(false)

	const clock = new THREE.Clock()
	const euler = new THREE.Euler()
	const scratchQuaternion = new THREE.Quaternion()
	const itemQuaternion = new THREE.Quaternion()
	const itemPosition = new THREE.Vector3()
	const itemScale = new THREE.Vector3()
	const itemWorld = new THREE.Matrix4()
	const parentInverse = new THREE.Matrix4()
	const roamOffset = new THREE.Vector3()
	const upAxis = new THREE.Vector3(0, 1, 0)
	const accumulator = createAccumulator()

	let active: ActiveEmote[] = []
	let pointerX: number | null = null
	let pointerY: number | null = null
	let headYaw = 0
	let headPitch = 0
	let bodyYaw = 0
	let restRotation: number | null = null
	let restOffset = 0
	let itemWeight = 0
	let elapsedTotal = 0

	let roamX = 0
	let roamTarget = 0
	let roamVelocity = 0
	let walkPhase = 0

	function onPointerMove(event: PointerEvent): void {
		pointerX = event.clientX
		pointerY = event.clientY
	}

	function onPointerGone(): void {
		pointerX = null
		pointerY = null
	}

	function resolveNodes(root: THREE.Object3D | null): void {
		head.value = root ? trackNode(root, 'Head') : null
		body.value = root ? trackNode(root, 'Body') : null
		rightArm.value = root ? trackNode(root, 'Right_Arm') : null
		leftArm.value = root ? trackNode(root, 'Left_Arm') : null
		rightLeg.value = root ? trackNode(root, 'Right_Leg') : null
		leftLeg.value = root ? trackNode(root, 'Left_Leg') : null

		const orbitNode = root?.getObjectByName('Orbit') ?? null
		orbit.value = orbitNode
		if (orbitNode) orbitBase.copy(orbitNode.position)
	}

	/** Queues an emote, cross-fading whatever is already playing. */
	function playEmote(name: SkinPreviewEmote): void {
		const definition = EMOTES[name]
		if (!definition) return

		for (const entry of active) {
			entry.fadingOut = true
		}
		active = active.filter((entry) => entry.fade > 0.05).slice(-1)
		active.push({ definition, elapsed: 0, fade: 1, fadingOut: false })
		currentEmote.value = name
	}

	/** Backwards-compatible alias for the greeting. */
	function playWave(): void {
		playEmote('wave')
	}

	/** Stops whatever is playing and returns to the idle stance. */
	function stopEmotes(): void {
		for (const entry of active) {
			entry.fadingOut = true
		}
	}

	function setHeldItem(icon: HeldItemIcon | null): void {
		if (heldIcon.value === icon) return
		heldIcon.value = icon
		if (!icon) return

		if (!heldItemMesh.value) {
			heldItemMesh.value = createHeldItemMesh()
		}
		setHeldItemIcon(heldItemMesh.value, icon)
	}

	/**
	 * Sends the character somewhere else along its strip. Without a target it
	 * picks one at random, always far enough away to be worth walking to.
	 */
	function roam(target?: number): void {
		if (freeMovement.value !== true) return

		// Sitting down, reading or dozing are grounded set pieces; sliding along
		// the floor part way through one would give the game away.
		const busy = active.some((entry) => entry.definition.duration > 3 && !entry.fadingOut)
		if (busy) return

		if (target !== undefined) {
			roamTarget = clamp(target, ROAM_LIMIT)
			return
		}

		let next = (Math.random() * 2 - 1) * ROAM_LIMIT
		if (Math.abs(next - roamX) < 0.3) next = -next
		roamTarget = clamp(next, ROAM_LIMIT)
	}

	/** Angles, in radians, the character would need to look straight at the cursor. */
	function cursorAngles(): { yaw: number; pitch: number } {
		const element = containerElement.value
		if (!element || pointerX === null || pointerY === null) {
			return { yaw: 0, pitch: 0 }
		}

		const rect = element.getBoundingClientRect()
		if (rect.width === 0 || rect.height === 0) return { yaw: 0, pitch: 0 }

		const anchorX = rect.left + rect.width / 2
		const anchorY = rect.top + rect.height * headAnchor

		const dx = pointerX - anchorX
		const dy = pointerY - anchorY

		const yaw = clamp(Math.atan2(dx, VIEW_DEPTH) * 1.15, MAX_TOTAL_YAW)
		const pitch = clamp(Math.atan2(-dy, Math.hypot(dx, VIEW_DEPTH)), NECK_PITCH_LIMIT)

		return { yaw, pitch }
	}

	/** Builds the combined emote/carry pose and reports how much gaze survives. */
	function accumulatePose(delta: number): number {
		resetAccumulator(accumulator)

		let totalWeight = 0
		let gazeShare = 0

		for (const entry of active) {
			entry.elapsed += delta
			if (entry.fadingOut) {
				entry.fade = Math.max(0, entry.fade - delta / EMOTE_CROSSFADE)
			}

			const t = entry.elapsed / entry.definition.duration
			const weight = envelope(t, entry.definition.blendIn, entry.definition.blendOut) * entry.fade
			if (weight <= 0) continue

			const pose = entry.definition.pose(clamp01(t), entry.elapsed)
			addPose(accumulator, pose, weight)
			gazeShare += (pose.gaze ?? DEFAULT_EMOTE_GAZE) * weight
			totalWeight += weight
		}

		active = active.filter((entry) => entry.fade > 0 && entry.elapsed < entry.definition.duration)
		if (active.length === 0) currentEmote.value = null

		totalWeight = Math.min(1, totalWeight)

		const itemTarget = heldIcon.value ? 1 : 0
		const itemStep = delta / ITEM_POP_SECONDS
		itemWeight =
			itemTarget > itemWeight
				? Math.min(itemTarget, itemWeight + itemStep)
				: Math.max(itemTarget, itemWeight - itemStep)

		// The relaxed carrying pose only fills whatever an emote is not using, so
		// a full-strength emote takes the arm over completely instead of adding to
		// it and bending the shoulder through the torso.
		if (itemWeight > 0) {
			const carryWeight = itemWeight * (1 - totalWeight)
			if (carryWeight > 0) {
				const pose = carryPose(elapsedTotal)
				addPose(accumulator, pose, carryWeight)
				gazeShare += (pose.gaze ?? 1) * carryWeight
				totalWeight = Math.min(1, totalWeight + carryWeight)
			}
		}

		if (freeMovement.value === true) {
			addIdleLife(delta, 1 - totalWeight)
		}

		return clamp01(gazeShare + (1 - totalWeight))
	}

	/**
	 * What keeps the character from looking like a mannequin between emotes:
	 * breathing, a slow shift of weight from one leg to the other, and the walk
	 * cycle while it is moving. All of it is scaled by how much of the pose an
	 * emote is not already using, so it never fights a somersault.
	 */
	function addIdleLife(delta: number, room: number): void {
		// Roaming runs regardless of `room`; only the limb motion is scaled.
		const distance = roamTarget - roamX
		const direction = Math.sign(distance)
		const wantsMove = Math.abs(distance) > 0.012

		roamVelocity = wantsMove
			? direction * Math.min(ROAM_SPEED, Math.abs(distance) * 4.5)
			: roamVelocity * 0.85
		roamX += roamVelocity * delta
		if (!wantsMove && Math.abs(roamVelocity) < 0.005) roamVelocity = 0

		const speed = Math.abs(roamVelocity)
		isRoaming.value = speed > WALK_THRESHOLD
		accumulator.slide += roamX

		if (room <= 0.001) return

		if (speed > WALK_THRESHOLD) {
			// Stride length follows speed, so slowing down shortens the steps
			// instead of stopping mid-air.
			walkPhase += delta * (4.2 + speed * 4)
			const swing = Math.sin(walkPhase) * Math.min(1, speed / ROAM_SPEED) * room
			accumulator.rightLeg[0] += swing * 0.62
			accumulator.leftLeg[0] -= swing * 0.62
			accumulator.rightArm[0] -= swing * 0.45
			accumulator.leftArm[0] += swing * 0.45
			accumulator.lift += Math.abs(Math.sin(walkPhase)) * 0.035 * room
			accumulator.body[2] += Math.sin(walkPhase) * 0.035 * room
			// Leans very slightly into the direction of travel.
			accumulator.body[1] += direction * 0.09 * room
			return
		}

		walkPhase = 0

		const breath = Math.sin(elapsedTotal * 1.35)
		const shift = Math.sin(elapsedTotal * 0.31)
		const sway = Math.sin(elapsedTotal * 0.23 + 1.1)

		accumulator.body[0] += breath * 0.018 * room
		accumulator.body[2] += shift * 0.042 * room
		accumulator.head[2] += -shift * 0.03 * room
		accumulator.head[1] += sway * 0.07 * room
		accumulator.rightArm[2] += shift * 0.055 * room
		accumulator.leftArm[2] += shift * 0.055 * room
		accumulator.rightLeg[0] += shift * 0.035 * room
		accumulator.leftLeg[0] += -shift * 0.035 * room
		accumulator.lift += (Math.abs(shift) - 0.5) * 0.012 * room
	}

	function updateHeldItem(): void {
		const mesh = heldItemMesh.value
		if (!mesh) return

		const arm = rightArm.value?.node
		const parent = mesh.parent
		if (!arm || !parent || itemWeight <= 0.001) {
			mesh.visible = false
			return
		}

		mesh.visible = true

		arm.updateWorldMatrix(true, false)
		parent.updateWorldMatrix(true, false)

		itemPosition.copy(HELD_ITEM_HAND_OFFSET).applyMatrix4(arm.matrixWorld)

		// A gear turns; everything else bobs. Either way the prop keeps facing the
		// camera so it stays readable at sidebar size.
		const spin =
			heldIcon.value === 'gear' ? elapsedTotal * 1.1 : Math.sin(elapsedTotal * 2.4) * 0.22
		euler.set(0, 0, spin, 'XYZ')
		itemQuaternion.setFromEuler(euler)

		const pop = easeOutBack(clamp01(itemWeight))
		itemScale.setScalar(Math.max(0.001, pop))

		itemWorld.compose(itemPosition, itemQuaternion, itemScale)
		parentInverse.copy(parent.matrixWorld).invert()
		mesh.matrix.multiplyMatrices(parentInverse, itemWorld)
		mesh.matrixWorldNeedsUpdate = true
	}

	const { onLoop } = useRenderLoop()
	const loopHandle = onLoop(() => {
		const delta = Math.min(clock.getDelta(), 0.1)
		elapsedTotal += delta

		if (!head.value && !body.value) return
		if (restRotation === null) {
			restRotation = modelRotation.value
			// `initialRotation` deliberately stands the model at a three-quarter
			// angle. Everything below measures the turn from facing the camera, so
			// that built-in offset has to be accounted for or the character would
			// look permanently past you.
			restOffset = wrapAngle(restRotation - Math.PI)
		}

		const gazeScale = accumulatePose(delta)
		const canTurnBody = freeMovement.value === true

		const target = enabled.value === true ? cursorAngles() : { yaw: 0, pitch: 0 }
		const wantedYaw = target.yaw * gazeScale
		const wantedPitch = target.pitch * gazeScale

		// The shoulders only pick up what the neck cannot reach, and they do it
		// slowly — which is what makes it read as a person turning to look rather
		// than a turntable.
		const overflow = Math.sign(wantedYaw) * Math.max(0, Math.abs(wantedYaw) - NECK_YAW)
		const bodyTarget = canTurnBody ? clamp(overflow * BODY_FOLLOW, Math.abs(wantedYaw)) : 0
		bodyYaw += (bodyTarget - bodyYaw) * (1 - Math.exp(-delta / BODY_SMOOTHING))

		const headTarget = clamp(wantedYaw - bodyYaw - restOffset, NECK_YAW_LIMIT)
		const headSmoothing = 1 - Math.exp(-delta / HEAD_SMOOTHING)
		headYaw += (headTarget - headYaw) * headSmoothing
		headPitch += (wantedPitch - headPitch) * headSmoothing

		if (canTurnBody) {
			modelRotation.value = restRotation + bodyYaw
		}

		// 'YXZ' yaws first and then pitches within the turned frame, which is how
		// a neck actually moves — the same order Minecraft uses for head tracking.
		euler.set(
			headPitch + accumulator.head[0],
			headYaw + accumulator.head[1],
			accumulator.head[2],
			'YXZ',
		)
		applyOffset(head.value, euler, scratchQuaternion)

		euler.set(accumulator.body[0], accumulator.body[1], accumulator.body[2], 'YXZ')
		applyOffset(body.value, euler, scratchQuaternion)

		euler.set(accumulator.rightArm[0], accumulator.rightArm[1], accumulator.rightArm[2], 'XYZ')
		applyOffset(rightArm.value, euler, scratchQuaternion)

		euler.set(accumulator.leftArm[0], accumulator.leftArm[1], accumulator.leftArm[2], 'XYZ')
		applyOffset(leftArm.value, euler, scratchQuaternion)

		euler.set(accumulator.rightLeg[0], accumulator.rightLeg[1], accumulator.rightLeg[2], 'XYZ')
		applyOffset(rightLeg.value, euler, scratchQuaternion)

		euler.set(accumulator.leftLeg[0], accumulator.leftLeg[1], accumulator.leftLeg[2], 'XYZ')
		applyOffset(leftLeg.value, euler, scratchQuaternion)

		// No clip animates Orbit, so whole-body rotation and the roaming offset go
		// straight in, with no additive bookkeeping needed.
		const orbitNode = orbit.value
		if (orbitNode) {
			orbitNode.rotation.set(accumulator.spin[0], accumulator.spin[1], accumulator.spin[2], 'XYZ')

			// The offset is wanted in screen space, but Orbit sits inside the turned
			// model group, so it is rotated back out of that turn first — otherwise
			// walking sideways would drift diagonally the moment the body turns.
			roamOffset.set(-accumulator.slide, accumulator.lift, 0)
			roamOffset.applyAxisAngle(upAxis, -(modelRotation.value + Math.PI))
			orbitNode.position.copy(orbitBase).add(roamOffset)
		}

		updateHeldItem()
	})

	if (typeof window !== 'undefined') {
		window.addEventListener('pointermove', onPointerMove, { passive: true })
		window.addEventListener('blur', onPointerGone)
		document.addEventListener('pointerleave', onPointerGone)
	}

	watch(scene, (root) => resolveNodes(root), { immediate: true })

	onBeforeUnmount(() => {
		loopHandle.off()
		if (typeof window !== 'undefined') {
			window.removeEventListener('pointermove', onPointerMove)
			window.removeEventListener('blur', onPointerGone)
			document.removeEventListener('pointerleave', onPointerGone)
		}
	})

	onUnmounted(() => {
		disposeHeldItemMesh(heldItemMesh.value)
		heldItemMesh.value = null
	})

	return {
		currentEmote,
		heldIcon,
		heldItemMesh,
		isRoaming,
		playEmote,
		playWave,
		roam,
		setHeldItem,
		stopEmotes,
	}
}
