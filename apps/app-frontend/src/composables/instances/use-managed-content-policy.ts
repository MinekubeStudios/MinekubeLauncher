import { type ContentActionWarning, type ContentItem, defineMessages, useVIntl } from '@modrinth/ui'
import { computed, type Ref } from 'vue'

import type { GameInstance } from '@/helpers/types'

/**
 * A locked (quarantined) instance refuses content changes: the files it carries
 * are no longer trusted, so editing, deleting or updating them is blocked.
 */
export function useManagedContentPolicy(instance: Ref<GameInstance>) {
	const { formatMessage } = useVIntl()
	const isQuarantined = computed(() => instance.value.quarantined)
	const managedModpackWarning = computed(() => ({
		admonitionHeader: formatMessage(messages.warningHeader),
		changeVersionBody: formatMessage(messages.changeVersionBody),
		unlinkBody: formatMessage(messages.unlinkBody),
	}))

	function isManagedContent(_item: ContentItem) {
		return isQuarantined.value
	}

	function canMutateContent(item: ContentItem) {
		return !isManagedContent(item)
	}

	function canUpdateContent(item: ContentItem) {
		return (
			canMutateContent(item) && !!item.file_path && !!item.has_update && !!item.update_version_id
		)
	}

	function deleteWarning(items: ContentItem[]): ContentActionWarning | null {
		if (!items.some(isManagedContent)) return null
		return {
			admonitionHeader: formatMessage(messages.warningHeader),
			admonitionBody: formatMessage(
				items.length === 1 ? messages.deleteSingleBody : messages.deleteBulkBody,
			),
			actionLabel: formatMessage(
				items.length === 1 ? messages.deleteButton : messages.deleteManyButton,
				{ count: items.length },
			),
		}
	}

	function disableWarning(items: ContentItem[]): ContentActionWarning | null {
		if (!items.some(isManagedContent)) return null
		return {
			admonitionHeader: formatMessage(messages.warningHeader),
			admonitionBody: formatMessage(
				items.length === 1 ? messages.disableSingleBody : messages.disableBulkBody,
			),
			actionLabel: formatMessage(
				items.length === 1 ? messages.disableButton : messages.disableManyButton,
				{ count: items.length },
			),
		}
	}

	return {
		isQuarantined,
		managedModpackWarning,
		isManagedContent,
		canMutateContent,
		canUpdateContent,
		deleteWarning,
		disableWarning,
	}
}

const messages = defineMessages({
	warningHeader: {
		id: 'content.locked-instance.warning-header',
		defaultMessage: 'This instance is locked',
	},
	changeVersionBody: {
		id: 'content.locked-instance.change-version-body',
		defaultMessage: 'Locked instances cannot be changed.',
	},
	unlinkBody: {
		id: 'content.locked-instance.unlink-body',
		defaultMessage: 'Locked instances cannot be unlinked from the content they came from.',
	},
	deleteSingleBody: {
		id: 'content.locked-instance.delete-single-body',
		defaultMessage:
			'This instance is locked, so its content cannot be removed. Delete the whole instance instead.',
	},
	deleteBulkBody: {
		id: 'content.locked-instance.delete-bulk-body',
		defaultMessage:
			'This instance is locked, so none of its content can be removed. Delete the whole instance instead.',
	},
	deleteButton: { id: 'content.locked-instance.delete-button', defaultMessage: 'Delete anyway' },
	deleteManyButton: {
		id: 'content.locked-instance.delete-many-button',
		defaultMessage: 'Delete {count, number} projects anyway',
	},
	disableSingleBody: {
		id: 'content.locked-instance.disable-single-body',
		defaultMessage: 'This instance is locked, so its content cannot be disabled.',
	},
	disableBulkBody: {
		id: 'content.locked-instance.disable-bulk-body',
		defaultMessage: 'This instance is locked, so none of its content can be disabled.',
	},
	disableButton: { id: 'content.locked-instance.disable-button', defaultMessage: 'Disable anyway' },
	disableManyButton: {
		id: 'content.locked-instance.disable-many-button',
		defaultMessage: 'Disable {count, number} projects anyway',
	},
})
