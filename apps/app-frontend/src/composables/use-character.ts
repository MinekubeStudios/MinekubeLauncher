import type { HeldItemIcon, SkinPreviewEmote } from '@modrinth/ui'
import { ref } from 'vue'

import { characterReactionsActive } from './use-visual.ts'

// Minekube Launcher — the sidebar character's reaction bus.
//
// Anything in the launcher can make the little player react without knowing
// where it is rendered or whether it exists at all: if nobody is signed in, or
// reactions are switched off, these calls are simply no-ops.
//
// Props rather than method calls, because the renderer is an async component
// and may not be mounted yet when a reaction fires.

const emoteName = ref<SkinPreviewEmote | null>(null)
const emoteToken = ref(0)
const heldItem = ref<HeldItemIcon | null>(null)
const roamToken = ref(0)

/** Item the character keeps carrying, e.g. the gear while settings are open. */
let persistentItem: HeldItemIcon | null = null
let flashTimer: ReturnType<typeof setTimeout> | undefined

/**
 * Little set pieces: an emote plus the prop that belongs with it, held for as
 * long as the emote runs. Durations mirror the emote definitions in
 * `skin-preview-emotes.ts`.
 */
export type CharacterScene = 'reading' | 'mining' | 'resting' | 'sleepy' | 'showOff'

const SCENES: Record<
	CharacterScene,
	{ emote: SkinPreviewEmote; item?: HeldItemIcon; durationMs: number }
> = {
	reading: { emote: 'read', item: 'book', durationMs: 11_000 },
	mining: { emote: 'mine', item: 'pickaxe', durationMs: 2800 },
	resting: { emote: 'sit', durationMs: 7000 },
	sleepy: { emote: 'doze', durationMs: 6500 },
	showOff: { emote: 'present', item: 'gem', durationMs: 2400 },
}

/** Plays a one-shot emote, cross-fading whatever is currently running. */
export function playCharacterEmote(name: SkinPreviewEmote): void {
	if (!characterReactionsActive.value) return
	emoteName.value = name
	emoteToken.value++
}

/** Plays an emote together with the prop that belongs to it. */
export function playCharacterScene(name: CharacterScene): number {
	const scene = SCENES[name]
	if (!scene) return 0
	playCharacterEmote(scene.emote)
	if (scene.item) flashCharacterItem(scene.item, scene.durationMs)
	return scene.durationMs
}

/** Sends the character wandering to a new spot along its strip. */
export function roamCharacter(): void {
	if (!characterReactionsActive.value) return
	roamToken.value++
}

/** Gives the character something to carry until it is cleared again. */
export function setCharacterItem(icon: HeldItemIcon | null): void {
	persistentItem = icon
	if (!characterReactionsActive.value) return
	if (flashTimer) return
	heldItem.value = icon
}

/** Shows an item briefly, then returns to whatever was being carried. */
export function flashCharacterItem(icon: HeldItemIcon, durationMs = 1600): void {
	if (!characterReactionsActive.value) return
	heldItem.value = icon
	if (flashTimer) clearTimeout(flashTimer)
	flashTimer = setTimeout(() => {
		flashTimer = undefined
		heldItem.value = persistentItem
	}, durationMs)
}

/** Reaction pairs used for settings toggles, so the mapping lives in one place. */
export function reactToToggle(enabled: boolean): void {
	playCharacterEmote(enabled ? 'jump' : 'shake')
	flashCharacterItem(enabled ? 'check' : 'cross', 1400)
}

export function clearCharacterReactions(): void {
	if (flashTimer) clearTimeout(flashTimer)
	flashTimer = undefined
	persistentItem = null
	heldItem.value = null
	emoteName.value = null
}

export function useCharacterState() {
	return { emoteName, emoteToken, heldItem, roamToken }
}
