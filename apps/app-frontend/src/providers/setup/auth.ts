import { type AuthProvider, provideAuth } from '@modrinth/ui'
import { computed, ref } from 'vue'

/**
 * Minekube Launcher has no cloud account. Minecraft accounts are kept locally
 * (Microsoft sign-in or offline accounts), so this provider stays signed out —
 * it only exists because shared UI expects an auth context to be present.
 */
export function setupAuthProvider() {
	const authProvider: AuthProvider = {
		session_token: ref(null),
		user: ref(null),
		isReady: computed(() => true),
		requestSignIn: () => {},
	}

	provideAuth(authProvider)
	return authProvider
}
