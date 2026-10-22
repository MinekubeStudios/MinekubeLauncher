import { useQueryClient } from '@tanstack/vue-query'

import type { InstallJobSnapshot } from '@/generated/app-events/InstallJobSnapshot'
import type { InstancePayload } from '@/generated/app-events/InstancePayload'
import { syncedPackKeys } from '@/helpers/synced-packs'
import { instanceKeys, instanceListQueryOptions } from '@/pages/instance/query-options'
import type { AppEvents } from '@/providers/app-events'

import { useAppEvent } from './use-app-event'

const INSTANCE_METADATA_EVENTS = new Set<InstancePayload['event']>([
	'created',
	'synced',
	'edited',
	'removed',
])

const FINISHED_JOB_STATUSES = new Set<InstallJobSnapshot['status']>([
	'succeeded',
	'failed',
	'interrupted',
	'canceled',
])

export function useInstanceMetadataRefresh(events: AppEvents) {
	const queryClient = useQueryClient()
	let refreshQueued = false
	let packsRefreshQueued = false
	let refreshPromise: Promise<void> | undefined

	function queueRefresh() {
		refreshQueued = true
		if (!refreshPromise) {
			refreshPromise = Promise.resolve().then(async () => {
				try {
					do {
						refreshQueued = false
						const refreshPacks = packsRefreshQueued
						packsRefreshQueued = false
						const joinedExistingRequest =
							queryClient.isFetching({ queryKey: instanceKeys.list(), exact: true }) > 0
						const instances = await queryClient.fetchQuery({
							...instanceListQueryOptions(),
							staleTime: 0,
						})

						for (const instance of instances) {
							queryClient.setQueryData(instanceKeys.detail(instance.id), instance)
						}
						if (refreshPacks) {
							await queryClient.invalidateQueries({ queryKey: syncedPackKeys.all })
						}

						if (joinedExistingRequest) {
							refreshQueued = true
						}
					} while (refreshQueued)
				} finally {
					refreshPromise = undefined
				}
			})
		}

		return refreshPromise
	}

	useAppEvent(
		'instance',
		(event) => {
			if (event.event === 'synced') {
				packsRefreshQueued = true
			}
			if (INSTANCE_METADATA_EVENTS.has(event.event)) return queueRefresh()
		},
		events,
	)
	useAppEvent('instance_groups_changed', queueRefresh, events)
	// When an install job ends, the instance's install stage has changed; the
	// library must not keep showing it as installing (greyed-out actions).
	useAppEvent(
		'install_job',
		(job) => {
			if (job.instance_id && FINISHED_JOB_STATUSES.has(job.status)) return queueRefresh()
		},
		events,
	)
}
