<script setup lang="ts">
import { type SkinPreviewEmote, SkinPreviewRenderer } from '@modrinth/ui'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import {
	type CharacterScene,
	playCharacterEmote,
	playCharacterScene,
	reactToToggle,
	roamCharacter,
	useCharacterState,
} from '@/composables/use-character.ts'
import { backgroundPaused } from '@/composables/use-performance.ts'
import { characterReactionsActive, sidebarCharacterActive } from '@/composables/use-visual.ts'
import { DEFAULT_USER_CHANGED_EVENT, get_default_user } from '@/helpers/auth'
import {
	type Cape,
	get_available_capes,
	get_available_skins,
	get_normalized_skin_texture,
	type Skin,
	SKIN_EQUIPPED_EVENT,
} from '@/helpers/skins'

/**
 * Minekube Launcher — the 3D companion in the bottom right corner.
 *
 * Nothing is rendered while nobody is signed in, so the WebGL context only
 * exists while there is a player to show. Once an account signs in its own skin
 * appears, waves, and from then on a small behaviour director decides what it
 * does: answering what you do in the launcher first, and only filling quiet
 * moments with something of its own.
 *
 * The director runs on one timer. It never interrupts a running set piece,
 * never repeats itself back to back, keeps still while you are busy clicking
 * around, gets drowsier late at night and stops completely while the window is
 * hidden or background activity is paused.
 */

interface Behaviour {
	emote?: SkinPreviewEmote
	scene?: CharacterScene
	/** How long the behaviour occupies the character, in milliseconds. */
	duration: number
	weight: number
	calm?: boolean
}

const REPERTOIRE: Behaviour[] = [
	{ emote: 'peek', duration: 1700, weight: 6, calm: true },
	{ emote: 'stretch', duration: 2600, weight: 5, calm: true },
	{ emote: 'think', duration: 2200, weight: 5, calm: true },
	{ emote: 'nod', duration: 1000, weight: 3, calm: true },
	{ emote: 'shrug', duration: 1500, weight: 3 },
	{ emote: 'dance', duration: 3100, weight: 4 },
	{ emote: 'laugh', duration: 1900, weight: 3 },
	{ emote: 'clap', duration: 1800, weight: 2 },
	{ emote: 'kick', duration: 1000, weight: 2 },
	{ emote: 'jump', duration: 1000, weight: 3 },
	{ emote: 'pirouette', duration: 1200, weight: 2 },
	{ emote: 'barrelRoll', duration: 1300, weight: 1 },
	{ emote: 'backflip', duration: 1500, weight: 1 },
	{ emote: 'tumble', duration: 2000, weight: 1 },
	{ scene: 'resting', duration: 7000, weight: 2, calm: true },
	{ scene: 'reading', duration: 11_000, weight: 2, calm: true },
	{ scene: 'sleepy', duration: 6500, weight: 1, calm: true },
	{ scene: 'mining', duration: 2800, weight: 2 },
]

/** Quiet time between two behaviours of its own. */
const IDLE_GAP_MS: readonly [number, number] = [8000, 18_000]
/** Pointer or keyboard activity this recent counts as "you are busy". */
const USER_BUSY_MS = 2500
/** How many recent behaviours are never picked again straight away. */
const RECENT_MEMORY = 4
const ROAM_CHANCE = 0.45
/**
 * Loading the equipped skin asks Mojang for the fresh profile, so returning to
 * the window only refreshes a skin older than this.
 */
const FOCUS_SKIN_REFRESH_MS = 60_000

const ROUTE_REACTIONS: {
	match: (path: string) => boolean
	emote?: SkinPreviewEmote
	scene?: CharacterScene
}[] = [
	{ match: (path) => path === '/', emote: 'wave' },
	{ match: (path) => path.startsWith('/skins'), scene: 'showOff' },
	{ match: (path) => path.startsWith('/browse'), emote: 'point' },
	{ match: (path) => path.startsWith('/project'), scene: 'reading' },
	{ match: (path) => path.startsWith('/instance'), scene: 'mining' },
	{ match: (path) => path.startsWith('/screenshots'), emote: 'cheer' },
]

const route = useRoute()
const { emoteName, emoteToken, heldItem, roamToken } = useCharacterState()

const currentUserId = ref<string | undefined>(undefined)
const equippedSkin = ref<Skin | null>(null)
const skinTexture = ref('')
const capes = ref<Cape[]>([])

const capeTexture = computed(() => {
	const capeId = equippedSkin.value?.cape_id
	return capeId ? capes.value.find((cape) => cape.id === capeId)?.texture : undefined
})

const isVisible = computed(
	() => sidebarCharacterActive.value && !!currentUserId.value && !!skinTexture.value,
)

const directorEnabled = computed(
	() => isVisible.value && characterReactionsActive.value && !backgroundPaused.value,
)

let textureRequest = 0
let lastSkinLoad = 0
let checkingAccount = false
let checkAgain = false

async function loadSkin(): Promise<void> {
	const request = ++textureRequest
	lastSkinLoad = Date.now()
	try {
		const skins = await get_available_skins()
		if (request !== textureRequest) return
		const equipped = skins.find((skin) => skin.is_equipped) ?? null
		equippedSkin.value = equipped
		if (!equipped?.texture) {
			skinTexture.value = ''
			capes.value = []
			return
		}
		const texture = await get_normalized_skin_texture(equipped).catch(() =>
			equipped.texture.startsWith('data:image/') ? equipped.texture : '',
		)
		if (request !== textureRequest) return
		skinTexture.value = texture
	} catch {
		if (request !== textureRequest) return
		equippedSkin.value = null
		skinTexture.value = ''
		return
	}

	try {
		const available = await get_available_capes()
		if (request === textureRequest) capes.value = available
	} catch {
		if (request === textureRequest) capes.value = []
	}
}

function clearAccount(): void {
	textureRequest++
	currentUserId.value = undefined
	equippedSkin.value = null
	skinTexture.value = ''
	capes.value = []
}

async function checkAccount(): Promise<void> {
	if (backgroundPaused.value) return
	if (checkingAccount) {
		checkAgain = true
		return
	}
	checkingAccount = true
	try {
		do {
			checkAgain = false
			const defaultId = await get_default_user()
			if (!defaultId) {
				if (currentUserId.value) clearAccount()
				continue
			}
			if (defaultId === currentUserId.value) continue
			currentUserId.value = defaultId as string
			await loadSkin()
		} while (checkAgain && !backgroundPaused.value)
	} catch {
		clearAccount()
	} finally {
		checkingAccount = false
	}
}

function refreshSkin(): void {
	if (currentUserId.value) void loadSkin()
}

function onDefaultUserChanged(): void {
	void checkAccount()
}

function onWindowFocus(): void {
	void checkAccount()
	if (Date.now() - lastSkinLoad >= FOCUS_SKIN_REFRESH_MS) refreshSkin()
}

let directorTimer: ReturnType<typeof setTimeout> | undefined
let busyUntil = 0
let lastUserActivity = 0
const recent: Behaviour[] = []

function between([min, max]: readonly [number, number]): number {
	return min + Math.random() * (max - min)
}

function isNightTime(): boolean {
	const hour = new Date().getHours()
	return hour >= 23 || hour < 6
}

function pickBehaviour(): Behaviour {
	const night = isNightTime()
	const candidates = REPERTOIRE.filter((behaviour) => !recent.includes(behaviour))
	const weights = candidates.map(
		(behaviour) => behaviour.weight * (night ? (behaviour.calm ? 2.5 : 0.4) : 1),
	)
	let roll = Math.random() * weights.reduce((sum, weight) => sum + weight, 0)
	for (let index = 0; index < candidates.length; index++) {
		roll -= weights[index]
		if (roll <= 0) return candidates[index]
	}
	return candidates[0] ?? REPERTOIRE[0]
}

function perform(behaviour: Behaviour): void {
	if (behaviour.scene) playCharacterScene(behaviour.scene)
	else if (behaviour.emote) playCharacterEmote(behaviour.emote)
	busyUntil = Date.now() + behaviour.duration
	recent.push(behaviour)
	if (recent.length > RECENT_MEMORY) recent.shift()
}

function scheduleDirector(delay: number): void {
	if (directorTimer) clearTimeout(directorTimer)
	directorTimer = undefined
	if (!directorEnabled.value) return
	directorTimer = setTimeout(directorTick, delay)
}

function directorTick(): void {
	directorTimer = undefined
	if (!directorEnabled.value || document.hidden) return
	const now = Date.now()
	const waitForSetPiece = busyUntil - now
	if (waitForSetPiece > 0) {
		scheduleDirector(waitForSetPiece + 600)
		return
	}
	const userBusyFor = lastUserActivity + USER_BUSY_MS - now
	if (userBusyFor > 0) {
		scheduleDirector(userBusyFor + 800)
		return
	}
	perform(pickBehaviour())
	if (Math.random() < ROAM_CHANCE) {
		setTimeout(() => {
			if (directorEnabled.value && Date.now() >= busyUntil) roamCharacter()
		}, 400)
	}
	scheduleDirector(Math.max(0, busyUntil - Date.now()) + between(IDLE_GAP_MS))
}

/** A reaction to the user always wins over the director's own ideas. */
function react(reaction: { emote?: SkinPreviewEmote; scene?: CharacterScene }): void {
	const duration = reaction.scene ? playCharacterScene(reaction.scene) : 1800
	if (!reaction.scene && reaction.emote) playCharacterEmote(reaction.emote)
	busyUntil = Date.now() + duration
	scheduleDirector(duration + between(IDLE_GAP_MS))
}

function onUserActivity(): void {
	lastUserActivity = Date.now()
}

/**
 * Every launcher switch is a `button[role="switch"]`, so one capturing listener
 * covers all of them. The click fires before the model updates, which is why
 * the new state is the negation of what `aria-checked` says right now.
 */
function onDocumentClick(event: MouseEvent): void {
	onUserActivity()
	if (!characterReactionsActive.value || !isVisible.value) return
	const target = event.target
	if (!(target instanceof Element)) return
	const toggle = target.closest('button[role="switch"]')
	if (!toggle || toggle.hasAttribute('disabled')) return
	reactToToggle(toggle.getAttribute('aria-checked') !== 'true')
	busyUntil = Date.now() + 1400
	scheduleDirector(3000 + between(IDLE_GAP_MS))
}

function onVisibilityChange(): void {
	if (!document.hidden) {
		scheduleDirector(between(IDLE_GAP_MS))
		return
	}
	if (directorTimer) clearTimeout(directorTimer)
	directorTimer = undefined
}

watch(
	() => route.path,
	(path, previous) => {
		if (!isVisible.value || !characterReactionsActive.value || path === previous) return
		const reaction = ROUTE_REACTIONS.find((entry) => entry.match(path))
		if (reaction) react(reaction)
		if (Math.random() < 0.5) roamCharacter()
	},
)

watch(sidebarCharacterActive, (active) => {
	if (active && currentUserId.value) void loadSkin()
})

watch(directorEnabled, (enabled) => scheduleDirector(enabled ? between(IDLE_GAP_MS) : 0), {
	immediate: true,
})

watch(backgroundPaused, (paused) => {
	if (!paused) void checkAccount()
})

onMounted(() => {
	void checkAccount()
	window.addEventListener(DEFAULT_USER_CHANGED_EVENT, onDefaultUserChanged)
	window.addEventListener(SKIN_EQUIPPED_EVENT, refreshSkin)
	window.addEventListener('focus', onWindowFocus)
	window.addEventListener('keydown', onUserActivity, { passive: true })
	window.addEventListener('wheel', onUserActivity, { passive: true })
	document.addEventListener('click', onDocumentClick, true)
	document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
	if (directorTimer) clearTimeout(directorTimer)
	directorTimer = undefined
	window.removeEventListener(DEFAULT_USER_CHANGED_EVENT, onDefaultUserChanged)
	window.removeEventListener(SKIN_EQUIPPED_EVENT, refreshSkin)
	window.removeEventListener('focus', onWindowFocus)
	window.removeEventListener('keydown', onUserActivity)
	window.removeEventListener('wheel', onUserActivity)
	document.removeEventListener('click', onDocumentClick, true)
	document.removeEventListener('visibilitychange', onVisibilityChange)
	textureRequest++
})
</script>

<template>
	<Teleport to="body">
		<Transition name="sidebar-character">
			<div v-if="isVisible" class="minekube-character" aria-hidden="true">
				<SkinPreviewRenderer
					:texture-src="skinTexture"
					:ears-texture-src="equippedSkin?.texture"
					:cape-src="capeTexture"
					:variant="equippedSkin?.variant"
					:initial-rotation="Math.PI / 10"
					framing="modal"
					:fit-padding="{ top: 0.23, right: 0.06, bottom: 0.17, left: 0.06 }"
					:pixel-ratio="1.5"
					:emote="emoteName"
					:emote-token="emoteToken"
					:held-item="heldItem"
					:roam-token="roamToken"
					look-at-cursor
					free-movement
					greet-on-ready
					hide-controls-hint
					:interactive="false"
				/>
			</div>
		</Transition>
	</Teleport>
</template>

<style scoped>
/*
 * Sits above the launcher itself but just below the modal stack (which starts
 * at z-index 100): dialogs no longer blur their backdrop, so there is nothing to
 * escape from, and a dialog must never be covered by the character. Toasts,
 * menus and tooltips stay above it as well.
 */
.minekube-character {
	position: fixed;
	right: 0;
	bottom: 0;
	width: 300px;
	/*
	 * Tall enough that the whole repertoire fits inside the box: a somersault
	 * needs headroom above the standing pose, and sitting down needs room below
	 * it, so both margins are part of the framing rather than an afterthought.
	 */
	height: 340px;
	z-index: 90;
	pointer-events: none;
	overflow: hidden;
	mask-image: linear-gradient(to bottom, transparent 0%, black 7%, black 100%);
	-webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 7%, black 100%);
}

.sidebar-character-enter-active {
	transition:
		opacity 0.5s var(--mk-ease-out, ease-out),
		transform 0.5s var(--mk-ease-out, ease-out);
}

.sidebar-character-leave-active {
	transition:
		opacity 0.25s ease-in,
		transform 0.25s ease-in;
}

.sidebar-character-enter-from,
.sidebar-character-leave-to {
	opacity: 0;
	transform: translateY(28px);
}

html.no-animations .sidebar-character-enter-active,
html.no-animations .sidebar-character-leave-active {
	transition: none;
}

@media (prefers-reduced-motion: reduce) {
	.sidebar-character-enter-active,
	.sidebar-character-leave-active {
		transition: none;
	}
}
</style>
