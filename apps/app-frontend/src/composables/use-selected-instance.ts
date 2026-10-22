import { ref, watch } from 'vue'

import type { GameInstance } from '@/helpers/types'

const STORAGE_KEY = 'minekube-selected-instance-id'

function readStoredInstanceId(): string | null {
	if (typeof window === 'undefined') return null
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY)
		return raw && raw.trim().length > 0 ? raw : null
	} catch {
		return null
	}
}

function writeStoredInstanceId(id: string | null): void {
	if (typeof window === 'undefined') return
	try {
		if (id) {
			window.localStorage.setItem(STORAGE_KEY, id)
		} else {
			window.localStorage.removeItem(STORAGE_KEY)
		}
	} catch {
		/* ignore storage errors */
	}
}

export const selectedInstanceId = ref<string | null>(readStoredInstanceId())
export const activeLibraryInstanceKey = ref<string | null>(null)

watch(selectedInstanceId, (id) => {
	writeStoredInstanceId(id)
})

export function parseLibraryInstanceSelectionKey(
	key: string | null | undefined,
): { groupId: string; instanceId: string } | null {
	if (!key) return null
	try {
		const parsed = JSON.parse(key)
		if (
			Array.isArray(parsed) &&
			parsed.length === 2 &&
			typeof parsed[0] === 'string' &&
			typeof parsed[1] === 'string'
		) {
			return { groupId: parsed[0], instanceId: parsed[1] }
		}
	} catch {
		/* ignore invalid key */
	}
	return null
}

// Keep selectedInstanceId in sync whenever activeLibraryInstanceKey is updated directly.
watch(activeLibraryInstanceKey, (key) => {
	const parsed = parseLibraryInstanceSelectionKey(key)
	if (parsed?.instanceId && selectedInstanceId.value !== parsed.instanceId) {
		selectedInstanceId.value = parsed.instanceId
	}
})

export function selectInstance(instanceId: string | null, groupId?: string | null): void {
	selectedInstanceId.value = instanceId
	if (!instanceId) {
		activeLibraryInstanceKey.value = null
		return
	}
	if (groupId) {
		activeLibraryInstanceKey.value = JSON.stringify([groupId, instanceId])
		return
	}
	const currentParsed = parseLibraryInstanceSelectionKey(activeLibraryInstanceKey.value)
	if (currentParsed && currentParsed.instanceId !== instanceId) {
		activeLibraryInstanceKey.value = null
	}
}

export function getDefaultInstance<
	T extends { id: string; last_played?: string | null; created?: string | null },
>(instances: T[]): T | null {
	if (instances.length === 0) return null
	const sorted = [...instances].sort((a, b) => {
		const aTime = a.last_played ? new Date(a.last_played).getTime() : 0
		const bTime = b.last_played ? new Date(b.last_played).getTime() : 0
		if (bTime !== aTime) return bTime - aTime
		const aCreated = a.created ? new Date(a.created).getTime() : 0
		const bCreated = b.created ? new Date(b.created).getTime() : 0
		return bCreated - aCreated
	})
	return sorted[0] ?? instances[0] ?? null
}

export function resolveSelectedInstance<
	T extends { id: string; path?: string; last_played?: string | null; created?: string | null },
>(instances: T[], routeInstanceId?: string | null): T | null {
	if (instances.length === 0) return null

	if (routeInstanceId) {
		const routeMatch = instances.find(
			(i) => i.id === routeInstanceId || (i.path && i.path === routeInstanceId),
		)
		if (routeMatch) {
			if (selectedInstanceId.value !== routeMatch.id) {
				selectedInstanceId.value = routeMatch.id
			}
			return routeMatch
		}
	}

	const currentId = selectedInstanceId.value
	if (currentId) {
		const match = instances.find((i) => i.id === currentId || (i.path && i.path === currentId))
		if (match) return match
	}

	const fallback = getDefaultInstance(instances)
	if (fallback && selectedInstanceId.value !== fallback.id) {
		selectedInstanceId.value = fallback.id
	}
	return fallback
}

export type SelectedInstanceHelper = {
	selectedInstanceId: typeof selectedInstanceId
	activeLibraryInstanceKey: typeof activeLibraryInstanceKey
	selectInstance: typeof selectInstance
	resolveSelectedInstance: <T extends GameInstance>(
		instances: T[],
		routeInstanceId?: string | null,
	) => T | null
}
