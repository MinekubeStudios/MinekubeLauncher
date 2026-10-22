import { computed, ref } from 'vue'

// Operations that are not install jobs but still belong in the download
// manager — exporting an instance for example. They are registered here so
// any component can report "something is happening right now" without having
// to know anything about the download manager itself.

export interface ExternalOperation {
	id: string
	title: string
	text: string
	iconUrl: string | null
}

const operations = ref(new Map<string, ExternalOperation>())

export const externalOperations = computed(() => Array.from(operations.value.values()))

export function beginExternalOperation(operation: ExternalOperation): void {
	operations.value.set(operation.id, operation)
}

export function endExternalOperation(id: string): void {
	operations.value.delete(id)
}
