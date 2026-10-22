/**
 * Procedural emotes for the skin preview.
 *
 * The player model ships only `idle`, `idle_sub_1..3` and `interact` as baked
 * clips, so every expressive pose here is generated in code and applied as an
 * additive offset on top of whatever the animation mixer produced. Each entry
 * returns joint rotations in radians for a normalised time `t` in [0, 1]; the
 * pose layer scales the whole thing by a blend envelope, so an emote can start
 * and stop mid-idle without popping.
 *
 * Joint conventions, derived from the glTF node hierarchy:
 *   - An arm hangs along its local -Y. A positive Z rotation on `Right_Arm`
 *     swings the hand away from the torso; the left arm mirrors it, so its
 *     outward direction is negative Z.
 *   - A positive X rotation on an arm swings it forward, towards the viewer.
 *   - On the head, +X looks up, +Y turns towards the viewer's right, +Z tilts.
 *   - `lift` is a vertical offset on the `Orbit` node, which no clip animates,
 *     so hops and bounces are safe to write there directly.
 */

export type SkinPreviewEmote =
	| 'wave'
	| 'nod'
	| 'shake'
	| 'cheer'
	| 'shrug'
	| 'think'
	| 'point'
	| 'jump'
	| 'dance'
	| 'facepalm'
	| 'present'
	| 'backflip'
	| 'barrelRoll'
	| 'pirouette'
	| 'sit'
	| 'read'
	| 'doze'
	| 'clap'
	| 'stretch'
	| 'kick'
	| 'mine'
	| 'peek'
	| 'laugh'
	| 'tumble'

export type EmoteJoint = [number, number, number]

export interface EmotePose {
	head?: EmoteJoint
	body?: EmoteJoint
	rightArm?: EmoteJoint
	leftArm?: EmoteJoint
	rightLeg?: EmoteJoint
	leftLeg?: EmoteJoint
	/**
	 * Whole-body rotation on the Orbit node. Nothing clamps it, so a full
	 * somersault is just `[-TAU, 0, 0]` over the length of the emote.
	 */
	spin?: EmoteJoint
	/** Vertical offset on the Orbit node, in model units. */
	lift?: number
	/** Horizontal offset on the Orbit node, in model units. */
	slide?: number
	/** How much cursor tracking still shows through, 0..1. Defaults to 0.35. */
	gaze?: number
}

export interface EmoteDefinition {
	duration: number
	/** Fraction of the duration spent blending in. */
	blendIn: number
	/** Fraction of the duration spent blending out. */
	blendOut: number
	pose: (t: number, elapsed: number) => EmotePose
}

const TAU = Math.PI * 2

function bounce(t: number, times: number): number {
	return 0.5 - 0.5 * Math.cos(TAU * t * times)
}

function clamp01(value: number): number {
	return Math.max(0, Math.min(1, value))
}

function easeInOutCubic(t: number): number {
	return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

/**
 * A complete revolution that lands back on exactly zero.
 *
 * The pose layer scales every value by a blend envelope, so a rotation left
 * sitting at a full turn would be faded from TAU back to 0 as the emote ends —
 * which renders as a second, much faster flip. Returning 0 once the turn is
 * complete avoids that: TAU and 0 are the same orientation, so the swap is
 * invisible, and there is nothing left for the envelope to unwind.
 */
function fullTurn(progress: number, direction = 1): number {
	if (progress >= 1) return 0
	return direction * TAU * easeInOutCubic(progress)
}

export const EMOTES: Record<SkinPreviewEmote, EmoteDefinition> = {
	/** Greeting: right arm up beside the head, oscillating. */
	wave: {
		duration: 1.95,
		blendIn: 0.16,
		blendOut: 0.22,
		pose: (_t, elapsed) => ({
			rightArm: [0.34, 0, 2.48 + Math.sin(elapsed * 9.5) * 0.27],
			head: [0.06, 0, -0.07],
			gaze: 0.15,
		}),
	},

	/** Agreement: two quick nods, with a little shoulder settle. */
	nod: {
		duration: 1,
		blendIn: 0.18,
		blendOut: 0.28,
		pose: (t) => ({
			head: [-0.3 * bounce(t, 2), 0, 0],
			body: [0.05 * bounce(t, 2), 0, 0],
			gaze: 0.6,
		}),
	},

	/** Disagreement: head turns side to side, shoulders drop slightly. */
	shake: {
		duration: 1.05,
		blendIn: 0.16,
		blendOut: 0.26,
		pose: (t) => ({
			head: [-0.05, Math.sin(TAU * t * 2.5) * 0.36, 0],
			rightArm: [0, 0, 0.16],
			leftArm: [0, 0, -0.16],
			gaze: 0.35,
		}),
	},

	/** Celebration: both arms up, three small hops, head tipped back. */
	cheer: {
		duration: 1.5,
		blendIn: 0.14,
		blendOut: 0.22,
		pose: (t) => {
			const hop = Math.abs(Math.sin(Math.PI * t * 3))
			return {
				rightArm: [0.15, 0, 2.85 + Math.sin(t * 22) * 0.14],
				leftArm: [0.15, 0, -2.85 - Math.sin(t * 22) * 0.14],
				head: [0.16, 0, 0],
				lift: hop * 0.11,
				rightLeg: [-0.18 * hop, 0, 0],
				leftLeg: [-0.18 * hop, 0, 0],
				gaze: 0.2,
			}
		},
	},

	/** "No idea": arms out to the sides, palms up, head tipped over. */
	shrug: {
		duration: 1.45,
		blendIn: 0.22,
		blendOut: 0.26,
		pose: (t) => {
			const hold = Math.min(1, t * 3.5)
			return {
				rightArm: [0.45 * hold, 0, 1.3 * hold],
				leftArm: [0.45 * hold, 0, -1.3 * hold],
				head: [-0.08, 0, 0.2 * hold],
				lift: 0.035 * hold,
				gaze: 0.5,
			}
		},
	},

	/** Pondering: hand up near the chin, slow head tilt and drift. */
	think: {
		duration: 2.2,
		blendIn: 0.18,
		blendOut: 0.22,
		pose: (_t, elapsed) => ({
			rightArm: [0.95, -0.35, 2.72],
			head: [-0.12, -0.16 + Math.sin(elapsed * 1.6) * 0.12, 0.22],
			body: [0, -0.08, 0],
			gaze: 0.2,
		}),
	},

	/** Draws attention: right arm extended forward at the viewer, small stab. */
	point: {
		duration: 1.25,
		blendIn: 0.2,
		blendOut: 0.25,
		pose: (t) => ({
			rightArm: [1.45 + bounce(t, 2) * 0.18, 0, 0.28],
			body: [0, 0.1, 0],
			head: [0.04, 0, 0],
			gaze: 0.45,
		}),
	},

	/** A single excited hop with the legs tucked. */
	jump: {
		duration: 0.95,
		blendIn: 0.1,
		blendOut: 0.18,
		pose: (t) => {
			const arc = Math.sin(Math.PI * Math.min(1, t * 1.15))
			return {
				lift: arc * 0.3,
				rightArm: [0, 0, 0.7 * arc],
				leftArm: [0, 0, -0.7 * arc],
				rightLeg: [0.5 * arc, 0, 0],
				leftLeg: [0.5 * arc, 0, 0],
				head: [0.1 * arc, 0, 0],
				gaze: 0.3,
			}
		},
	},

	/** Idle amusement: hips sway, arms swing in counterpoint. */
	dance: {
		duration: 3.1,
		blendIn: 0.14,
		blendOut: 0.2,
		pose: (_t, elapsed) => {
			const sway = Math.sin(elapsed * 5.2)
			const counter = Math.sin(elapsed * 5.2 + Math.PI / 2)
			return {
				body: [0, sway * 0.22, sway * 0.12],
				head: [0.04, sway * 0.16, -sway * 0.14],
				rightArm: [counter * 0.5, 0, 1.15 + counter * 0.35],
				leftArm: [-counter * 0.5, 0, -1.15 + counter * 0.35],
				rightLeg: [counter * 0.16, 0, 0],
				leftLeg: [-counter * 0.16, 0, 0],
				lift: Math.abs(sway) * 0.045,
				gaze: 0.15,
			}
		},
	},

	/** Exasperation: hand to the face, head and shoulders sag. */
	facepalm: {
		duration: 1.9,
		blendIn: 0.16,
		blendOut: 0.25,
		pose: (t) => {
			const hold = Math.min(1, t * 4)
			return {
				rightArm: [1.2 * hold, -0.5 * hold, 2.55 * hold],
				head: [-0.34 * hold, 0, 0],
				body: [0.12 * hold, 0, 0],
				lift: -0.03 * hold,
				gaze: 0.1,
			}
		},
	},

	/**
	 * Shows off whatever is in the hand: the arm lifts the item into view,
	 * gives it a little shake, then settles into a relaxed carrying pose.
	 */
	present: {
		duration: 2.4,
		blendIn: 0.1,
		blendOut: 0.3,
		pose: (t, elapsed) => {
			const lift = Math.min(1, t * 5)
			const settle = Math.max(0, Math.min(1, (t - 0.45) / 0.35))
			// Lands on the same angles as `carryPose`, so showing the item off and
			// then carrying it around reads as one continuous motion.
			const raise = 2.2 * lift - 1.65 * settle
			return {
				rightArm: [
					0.55 * lift + 0.42 * settle,
					-0.2 * lift,
					raise + Math.sin(elapsed * 11) * 0.16 * (1 - settle),
				],
				head: [-0.1 * lift + 0.06 * settle, -0.12 * lift, 0.08 * lift],
				gaze: 0.25 + 0.4 * settle,
			}
		},
	},

	/**
	 * A full backward somersault. The Orbit node is not touched by any clip, so
	 * the whole character can be rotated through a complete turn there — the
	 * pivot sits at the waist, which is roughly where a real one turns.
	 */
	backflip: {
		duration: 1.45,
		blendIn: 0.06,
		blendOut: 0.08,
		pose: (t) => {
			const crouch = t < 0.16 ? t / 0.16 : 0
			const air = clamp01((t - 0.14) / 0.72)
			const land = clamp01((t - 0.86) / 0.14)
			const tuck = Math.sin(Math.PI * air)
			return {
				spin: [fullTurn(air, -1), 0, 0],
				lift: Math.sin(Math.PI * air) * 0.75 - crouch * 0.18 - land * 0.12,
				rightArm: [-0.4 - 1.8 * tuck, 0, 0.5 * tuck],
				leftArm: [-0.4 - 1.8 * tuck, 0, -0.5 * tuck],
				rightLeg: [1.7 * tuck + crouch * 0.4 + land * 0.5, 0, 0],
				leftLeg: [1.7 * tuck + crouch * 0.4 + land * 0.5, 0, 0],
				head: [0.2 * tuck, 0, 0],
				gaze: 0,
			}
		},
	},

	/** Sideways barrel roll, arms pinned in. */
	barrelRoll: {
		duration: 1.25,
		blendIn: 0.06,
		blendOut: 0.1,
		pose: (t) => {
			const air = clamp01(t / 0.9)
			const tuck = Math.sin(Math.PI * air)
			return {
				spin: [0, 0, fullTurn(air)],
				lift: Math.sin(Math.PI * air) * 0.5,
				rightArm: [0, 0, 0.25 + 0.9 * tuck],
				leftArm: [0, 0, -0.25 - 0.9 * tuck],
				rightLeg: [1.1 * tuck, 0, 0],
				leftLeg: [1.1 * tuck, 0, 0],
				gaze: 0,
			}
		},
	},

	/** A quick pirouette on the spot, arms out for balance. */
	pirouette: {
		duration: 1.15,
		blendIn: 0.1,
		blendOut: 0.14,
		pose: (t) => {
			const turnProgress = clamp01(t / 0.88)
			const reach = Math.sin(Math.PI * turnProgress)
			return {
				spin: [0, fullTurn(turnProgress), 0],
				rightArm: [0, 0, 1.35 * reach],
				leftArm: [0, 0, -1.35 * reach],
				lift: reach * 0.08,
				head: [0.06 * reach, 0, 0],
				gaze: 0,
			}
		},
	},

	/** Sits down on the spot and stays there for a while. */
	sit: {
		duration: 7,
		blendIn: 0.09,
		blendOut: 0.12,
		pose: (t, elapsed) => {
			const down = clamp01(t * 7)
			const breathe = Math.sin(elapsed * 1.5) * 0.03
			return {
				lift: -0.44 * down,
				rightLeg: [1.48 * down, 0.07 * down, 0],
				leftLeg: [1.48 * down, -0.07 * down, 0],
				rightArm: [-0.55 * down, 0, 0.3 * down],
				leftArm: [-0.55 * down, 0, -0.3 * down],
				body: [0.12 * down + breathe, 0, 0],
				head: [-0.08 * down, 0, 0],
				gaze: 0.85,
			}
		},
	},

	/**
	 * Sits down with a book and reads it, turning a page now and then. Pair it
	 * with the `book` prop, which the reading hand will be holding.
	 */
	read: {
		duration: 11,
		blendIn: 0.06,
		blendOut: 0.09,
		pose: (t, elapsed) => {
			const down = clamp01(t * 9)
			// A page turn every few seconds: a short flick of the far hand.
			const pageCycle = (elapsed % 3.4) / 3.4
			const turn = pageCycle < 0.12 ? Math.sin((pageCycle / 0.12) * Math.PI) : 0
			return {
				lift: -0.44 * down,
				rightLeg: [1.48 * down, 0.07 * down, 0],
				leftLeg: [1.48 * down, -0.07 * down, 0],
				rightArm: [1.25 * down, -0.3 * down, 0.42 * down],
				leftArm: [1.25 * down - 0.5 * turn, 0.3 * down, -0.42 * down - 0.35 * turn],
				body: [0.16 * down, 0, 0],
				head: [-0.42 * down, -0.05 * down, 0.04 * down],
				gaze: 0.08,
			}
		},
	},

	/** Nods off standing up, then jerks awake. Repeats for as long as it runs. */
	doze: {
		duration: 6.5,
		blendIn: 0.08,
		blendOut: 0.12,
		pose: (_t, elapsed) => {
			const cycle = (elapsed % 2.8) / 2.8
			// Slow droop, then a sharp snap back up at the end of each cycle.
			const droop = cycle < 0.82 ? cycle / 0.82 : 1 - (cycle - 0.82) / 0.18
			const sway = Math.sin(elapsed * 0.9) * 0.08
			return {
				head: [-0.55 * droop, sway, 0.18 * droop],
				body: [0.16 * droop, sway * 0.5, 0],
				rightArm: [0, 0, 0.08],
				leftArm: [0, 0, -0.08],
				lift: -0.05 * droop,
				gaze: 0,
			}
		},
	},

	/** Applause: hands meet in front, four claps. */
	clap: {
		duration: 1.8,
		blendIn: 0.12,
		blendOut: 0.2,
		pose: (t) => {
			const beat = Math.abs(Math.sin(Math.PI * t * 4))
			return {
				rightArm: [1.5, -0.55 - 0.22 * beat, 0.85],
				leftArm: [1.5, 0.55 + 0.22 * beat, -0.85],
				head: [0.08, 0, 0],
				lift: beat * 0.03,
				gaze: 0.55,
			}
		},
	},

	/** A long luxurious stretch, arms overhead, leaning back. */
	stretch: {
		duration: 2.6,
		blendIn: 0.16,
		blendOut: 0.24,
		pose: (t) => {
			const reach = Math.sin(Math.PI * clamp01(t / 0.85)) ** 0.7
			return {
				rightArm: [-0.35 * reach, 0, 2.95 * reach],
				leftArm: [-0.35 * reach, 0, -2.95 * reach],
				body: [-0.24 * reach, 0, 0],
				head: [0.3 * reach, 0, 0],
				lift: reach * 0.06,
				rightLeg: [-0.1 * reach, 0, 0],
				leftLeg: [-0.1 * reach, 0, 0],
				gaze: 0.1,
			}
		},
	},

	/** A playful kick, with a counterweight lean. */
	kick: {
		duration: 1,
		blendIn: 0.14,
		blendOut: 0.2,
		pose: (t) => {
			const swing = Math.sin(Math.PI * clamp01(t / 0.8))
			return {
				rightLeg: [1.75 * swing, 0, 0],
				leftLeg: [-0.2 * swing, 0, 0],
				body: [-0.16 * swing, 0, 0],
				rightArm: [-0.5 * swing, 0, 0.35 * swing],
				leftArm: [0.6 * swing, 0, -0.3 * swing],
				lift: swing * 0.04,
				gaze: 0.4,
			}
		},
	},

	/** Swings a pickaxe. Pair it with the `pickaxe` prop. */
	mine: {
		duration: 2.8,
		blendIn: 0.1,
		blendOut: 0.16,
		pose: (t, elapsed) => {
			// Fast chop down, slow lift back up — the shape of a real swing.
			const cycle = (elapsed % 0.85) / 0.85
			const chop = cycle < 0.3 ? cycle / 0.3 : 1 - (cycle - 0.3) / 0.7
			const raise = 2.35 - 1.5 * chop
			return {
				rightArm: [0.5 + 0.9 * chop, -0.25, raise],
				leftArm: [0.3 + 0.5 * chop, 0.2, -0.45],
				body: [0.12 * chop, -0.1, 0],
				head: [-0.18 * chop, 0, 0],
				lift: -0.04 * chop,
				gaze: 0.1,
			}
		},
	},

	/** Leans right over to one side, curious. */
	peek: {
		duration: 1.7,
		blendIn: 0.2,
		blendOut: 0.24,
		pose: (t) => {
			const lean = Math.sin(Math.PI * clamp01(t / 0.85))
			return {
				spin: [0, 0, 0.34 * lean],
				slide: 0.12 * lean,
				head: [0.06, 0, -0.26 * lean],
				rightArm: [0, 0, 0.3 * lean],
				leftArm: [0, 0, -0.55 * lean],
				rightLeg: [0, 0, 0.1 * lean],
				gaze: 0.8,
			}
		},
	},

	/** Belly laugh: head back, shoulders bouncing. */
	laugh: {
		duration: 1.9,
		blendIn: 0.14,
		blendOut: 0.2,
		pose: (_t, elapsed) => {
			const shake = Math.sin(elapsed * 14)
			return {
				head: [0.34 + shake * 0.07, 0, 0],
				body: [-0.16 + shake * 0.05, 0, 0],
				rightArm: [1.25, -0.5, 0.5],
				leftArm: [1.25, 0.5, -0.5],
				lift: Math.abs(shake) * 0.035,
				gaze: 0.3,
			}
		},
	},

	/** Trips, spins over and pops back up grinning. Rare on purpose. */
	tumble: {
		duration: 2,
		blendIn: 0.05,
		blendOut: 0.08,
		pose: (t) => {
			const fall = clamp01(t / 0.3)
			const roll = clamp01((t - 0.22) / 0.5)
			const recover = clamp01((t - 0.74) / 0.26)
			return {
				spin: [fullTurn(roll, -1), 0, 0.5 * fall * (1 - roll)],
				lift: -0.35 * fall * (1 - roll) + Math.sin(Math.PI * roll) * 0.3 + recover * 0.12,
				rightArm: [-1.4 * roll + 1.2 * fall * (1 - roll), 0, 0.6 * roll + 1.1 * recover],
				leftArm: [-1.4 * roll + 1.2 * fall * (1 - roll), 0, -0.6 * roll - 1.1 * recover],
				rightLeg: [1.6 * roll, 0, 0],
				leftLeg: [1.6 * roll, 0, 0],
				head: [-0.3 * fall * (1 - roll) + 0.25 * recover, 0, 0],
				gaze: 0,
			}
		},
	},
}

/** Relaxed pose used while the character simply carries an item around. */
export function carryPose(elapsed: number): EmotePose {
	return {
		rightArm: [0.97 + Math.sin(elapsed * 1.4) * 0.05, -0.18, 0.55 + Math.sin(elapsed * 1.1) * 0.04],
		gaze: 1,
	}
}
