import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createWelcomeState, WELCOME_STORAGE_KEY } from '../src/helpers/welcome-state.ts'

test('a fresh installation remains incomplete until explicitly dismissed', () => {
	const data = new Map<string, string>()
	const storage = {
		getItem: (key: string) => data.get(key) ?? null,
		setItem: (key: string, value: string) => {
			data.set(key, value)
		},
	}
	const firstRun = createWelcomeState(() => storage)
	assert.equal(firstRun.isCompleted(), false)
	assert.equal(data.size, 0)
	assert.equal(firstRun.complete(), true)
	assert.equal(data.get(WELCOME_STORAGE_KEY), '1')
	assert.equal(firstRun.isCompleted(), true)
	assert.equal(createWelcomeState(() => storage).isCompleted(), true)
})

test('an interrupted tour or corrupt marker does not count as completed', () => {
	for (const value of [null, '', 'false', '{invalid', '0']) {
		assert.equal(
			createWelcomeState(() => ({ getItem: () => value, setItem() {} })).isCompleted(),
			false,
		)
	}
})

test('unavailable storage is non-blocking and completion lasts for this session', () => {
	const state = createWelcomeState(() => {
		throw new Error('Storage denied')
	})
	assert.equal(state.isCompleted(), false)
	assert.equal(state.complete(), false)
	assert.equal(state.isCompleted(), true)
})

test('a failed write is reported without repeating the tour in the same session', () => {
	const state = createWelcomeState(() => ({
		getItem: () => null,
		setItem: () => {
			throw new Error('Quota exceeded')
		},
	}))
	assert.equal(state.complete(), false)
	assert.equal(state.isCompleted(), true)
})
