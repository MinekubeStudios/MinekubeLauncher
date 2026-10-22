/** Stable across launcher updates: the tour is introductory, not release notes. */
export const WELCOME_STORAGE_KEY = 'minekube:welcome-completed'

type WelcomeStorage = Pick<Storage, 'getItem' | 'setItem'>

export function createWelcomeState(getStorage: () => WelcomeStorage) {
	let completed = false
	try {
		completed = getStorage().getItem(WELCOME_STORAGE_KEY) === '1'
	} catch {
		// A restricted webview must not prevent the launcher from opening.
	}

	return {
		isCompleted: () => completed,
		complete(): boolean {
			completed = true
			try {
				getStorage().setItem(WELCOME_STORAGE_KEY, '1')
				return true
			} catch {
				return false
			}
		},
	}
}
