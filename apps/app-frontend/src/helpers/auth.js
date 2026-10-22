/**
 * All theseus API calls return serialized values (both return values and errors);
 * So, for example, addDefaultInstance creates a blank instance object, where the Rust struct is serialized,
 *  and deserialized into a usable JS object.
 */
import { invoke } from '@tauri-apps/api/core'

export const DEFAULT_USER_CHANGED_EVENT = 'minekube:default-user-changed'

function notifyDefaultUserChanged() {
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new Event(DEFAULT_USER_CHANGED_EVENT))
	}
}

/**
 * A Minecraft account known to the launcher, as serialized by the Rust core.
 *
 * @typedef {Object} MinecraftCredential
 * @property {{ id: string, name: string }} profile - The player's UUID and username
 * @property {'microsoft' | 'local'} [account_type] - `local` accounts only exist on this device and never talk to Microsoft/Mojang services
 * @property {boolean} [active]
 */

// Example function:
// User goes to auth_url to complete flow, and when completed, authenticate_await_completion() returns the credentials
// export async function authenticate() {
//   const auth_url = await authenticate_begin_flow()
//   console.log(auth_url)
//   await authenticate_await_completion()
// }

/**
 * Check if the authentication servers are reachable, throwing an exception if
 * not reachable.
 */
export async function check_reachable() {
	await invoke('plugin:auth|check_reachable')
}

/**
 * Authenticate a user with Hydra - part 1.
 * This begins the authentication flow quasi-synchronously.
 *
 * @returns {Promise<MinecraftCredential | null>} Credentials, or null if sign-in was cancelled
 */
export async function login() {
	const credentials = await invoke('plugin:auth|login')
	if (credentials) notifyDefaultUserChanged()
	return credentials
}

/**
 * The minimum length of a local account username.
 */
export const LOCAL_USERNAME_MIN_LENGTH = 3

/**
 * The maximum length of a local account username.
 */
export const LOCAL_USERNAME_MAX_LENGTH = 16

/**
 * The characters a local account username may consist of. These are the same
 * rules Mojang enforces for regular player names, so that local players are
 * accepted by any server.
 */
export const LOCAL_USERNAME_PATTERN = /^[A-Za-z0-9_]+$/

/**
 * Checks whether the given username can be used for a local account.
 * The same validation is enforced by the Rust core.
 *
 * @param {string} username
 * @returns {'too-short' | 'too-long' | 'invalid-characters' | null} the validation problem, if any
 */
export function validateLocalUsername(username) {
	const trimmed = (username ?? '').trim()
	if (trimmed.length < LOCAL_USERNAME_MIN_LENGTH) return 'too-short'
	if (trimmed.length > LOCAL_USERNAME_MAX_LENGTH) return 'too-long'
	if (!LOCAL_USERNAME_PATTERN.test(trimmed)) return 'invalid-characters'
	return null
}

/**
 * Creates (or re-activates) a local account with the given username.
 *
 * Local accounts only exist on this device: no window is opened and nothing is
 * ever sent to Microsoft, Xbox Live or Mojang services for them, neither now
 * nor when launching the game.
 *
 * @param {string} username
 * @returns {Promise<MinecraftCredential>} The credentials of the local account
 */
export async function login_local(username) {
	return await invoke('plugin:auth|login_local', { username: username.trim() })
}

/**
 * Whether the given account is a local (offline) account rather than a
 * Microsoft account.
 *
 * @param {{ account_type?: string | null } | null | undefined} account
 * @returns {boolean}
 */
export function isLocalAccount(account) {
	return account?.account_type === 'local'
}

/**
 * Retrieves the default user
 * @returns {Promise<string | undefined>}
 */
export async function get_default_user() {
	return (await invoke('plugin:auth|get_default_user')) ?? undefined
}

/**
 * Updates the default user
 * @param {string} user
 */
export async function set_default_user(user) {
	await invoke('plugin:auth|set_default_user', { user })
	notifyDefaultUserChanged()
}

/**
 * Remove a user account from the database
 * @param {string} user
 */
export async function remove_user(user) {
	await invoke('plugin:auth|remove_user', { user })
	notifyDefaultUserChanged()
}

/**
 * Returns a list of users
 * @returns {Promise<MinecraftCredential[]>}
 */
export async function users() {
	return await invoke('plugin:auth|get_users')
}
