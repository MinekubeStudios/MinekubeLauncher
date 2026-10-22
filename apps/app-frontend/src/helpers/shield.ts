import { AbstractFeature, type RequestContext } from '@modrinth/api-client'
import { invoke } from '@tauri-apps/api/core'

import { users } from '@/helpers/auth'

/**
 * Minekube Shield — the interface side.
 *
 * The launcher core blocks trackers for its own connections. The interface
 * talks to a few web APIs itself (browsing content, log insights), so every one
 * of those requests is checked with the core first: the same blocklist and the
 * same strict mode apply. Nothing about the requests is recorded.
 */

export interface LogCleanupReport {
	files_removed: number
	bytes_freed: number
}

/** Days after which game logs and crash reports are deleted; 0 keeps them. */
export const LOG_RETENTION_CHOICES = [0, 7, 30, 90] as const
export type LogRetention = (typeof LOG_RETENTION_CHOICES)[number]
const LOG_RETENTION_KEY = 'minekube:shield:log-retention'
const DEFAULT_LOG_RETENTION: LogRetention = 30

export function getLogRetention(): LogRetention {
	try {
		const stored = Number(localStorage.getItem(LOG_RETENTION_KEY))
		if ((LOG_RETENTION_CHOICES as readonly number[]).includes(stored)) {
			return stored as LogRetention
		}
	} catch {
		// storage unavailable
	}
	return DEFAULT_LOG_RETENTION
}

export function setLogRetention(days: LogRetention): void {
	try {
		localStorage.setItem(LOG_RETENTION_KEY, String(days))
	} catch {
		// storage unavailable: the choice applies for this session only
	}
}

export async function cleanLogs(olderThanDays: number | null): Promise<LogCleanupReport> {
	return await invoke<LogCleanupReport>('plugin:settings|shield_clean_logs', { olderThanDays })
}

/** Deletes logs older than the chosen retention. Runs once after startup. */
export async function applyLogRetention(): Promise<void> {
	const days = getLogRetention()
	if (days === 0) return
	try {
		await cleanLogs(days)
	} catch (error) {
		console.warn('Log clean-up failed', error)
	}
}

async function shieldAllows(url: string): Promise<boolean> {
	try {
		return await invoke<boolean>('plugin:settings|shield_check', { url })
	} catch {
		// The check itself failing must never break the interface.
		return true
	}
}

export class ShieldBlockedError extends Error {
	constructor(host: string) {
		super(`${host} is blocked by Minekube Shield`)
		this.name = 'ShieldBlockedError'
	}
}

/** API-client feature that runs every interface request past the shield. */
export class ShieldFeature extends AbstractFeature {
	async execute<T>(next: () => Promise<T>, context: RequestContext): Promise<T> {
		if (!(await shieldAllows(context.url))) {
			let host = context.url
			try {
				host = new URL(context.url).host
			} catch {
				// keep the raw value
			}
			throw new ShieldBlockedError(host)
		}
		return next()
	}
}

const IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)(?::\d{1,5})?\b/g
const UUID = /\b[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}\b/gi
const JWT = /\beyJ[\w-]{6,}\.[\w-]{6,}\.[\w-]{6,}\b/g
const EMAIL = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g
const TOKEN_ARG = /(--(?:accessToken|session|clientId|xuid)\s+)\S+/gi
const TOKEN_FIELD = /((?:access_?token|session(?:_?id)?|token)["']?\s*[:=]\s*["']?)[^\s"',;]+/gi
const WINDOWS_HOME = /([A-Za-z]:[\\/]+(?:Users|Documents and Settings)[\\/]+)[^\\/\s"']+/gi
const UNIX_HOME = /(\/(?:home|Users)\/)[^/\s"']+/g
const SETTING_USER = /(Setting user:\s*)\S+/gi

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function knownPlayerNames(): Promise<string[]> {
	try {
		const accounts = (await users()) as { profile?: { name?: string } }[]
		return accounts
			.map((account) => account.profile?.name?.trim() ?? '')
			.filter((name) => name.length >= 3)
	} catch {
		return []
	}
}

/**
 * Hides personal details in a log before it leaves the computer: IP
 * addresses, the player's names, account UUIDs, sign-in tokens, e-mail
 * addresses and the Windows/macOS/Linux user folder name in paths. The log
 * stays fully readable for troubleshooting.
 */
export async function anonymizeLog(text: string): Promise<string> {
	let result = text
		.replace(JWT, '<token>')
		.replace(TOKEN_ARG, '$1<token>')
		.replace(TOKEN_FIELD, '$1<token>')
		.replace(SETTING_USER, '$1<player>')
		.replace(WINDOWS_HOME, '$1<user>')
		.replace(UNIX_HOME, '$1<user>')
		.replace(EMAIL, '<email>')
		.replace(UUID, '<uuid>')
		.replace(IPV4, (match) => (match.startsWith('127.') ? match : '<ip>'))

	for (const name of await knownPlayerNames()) {
		result = result.replace(new RegExp(`\\b${escapeRegex(name)}\\b`, 'g'), '<player>')
	}
	return result
}
