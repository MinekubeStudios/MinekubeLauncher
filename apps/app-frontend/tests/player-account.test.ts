import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
	ensurePlayerAccount,
	type PlayerAccount,
	type PlayerAccountApi,
} from '../src/helpers/player-account.ts'

function createAuth(existing: PlayerAccount[] = [], defaultUser?: string) {
	const accounts = [...existing]
	const created: string[] = []
	const selected: string[] = []
	const auth: PlayerAccountApi = {
		users: async () => accounts,
		loginLocal: async (username) => {
			created.push(username)
			const account = {
				profile: { id: 'new-player', name: username },
				account_type: 'local' as const,
			}
			accounts.push(account)
			return account
		},
		getDefaultUser: async () => defaultUser,
		setDefaultUser: async (id) => {
			defaultUser = id
			selected.push(id)
		},
	}
	return { auth, created, selected }
}

test('creates Player once on an empty installation and selects it as the default', async () => {
	const { auth, created, selected } = createAuth()
	await ensurePlayerAccount(auth)
	await ensurePlayerAccount(auth)
	assert.deepEqual(created, ['Player'])
	assert.deepEqual(selected, ['new-player'])
})

test('reuses an existing local Player case-insensitively even if another account matches first', async () => {
	const { auth, created, selected } = createAuth([
		{ profile: { id: 'ms-player', name: 'Player' }, account_type: 'microsoft' },
		{ profile: { id: 'local-player', name: 'pLaYeR' }, account_type: 'local' },
	])
	await ensurePlayerAccount(auth)
	assert.deepEqual(created, [])
	assert.deepEqual(selected, ['local-player'])
})

test('keeps the current account when it already exists and never duplicates Player', async () => {
	const { auth, created, selected } = createAuth(
		[{ profile: { id: 'existing-player', name: 'PLAYER' }, account_type: 'local' }],
		'microsoft-default',
	)
	await ensurePlayerAccount(auth)
	assert.deepEqual(created, [])
	assert.deepEqual(selected, [])
})

test('does not create a duplicate when an existing Microsoft account uses the name Player', async () => {
	const { auth, created, selected } = createAuth([
		{ profile: { id: 'ms-player', name: 'Player' }, account_type: 'microsoft' },
	])
	await ensurePlayerAccount(auth)
	assert.deepEqual(created, [])
	assert.deepEqual(selected, ['ms-player'])
})
