import { invoke } from '@tauri-apps/api/core'

/**
 * Minekube Shield mod scanner — the interface side.
 *
 * Before an instance starts, its mods are checked for known malware. The
 * scanner only warns: when it finds something, the player sees what and why,
 * and decides whether to launch anyway.
 */

export type ScanSeverity = 'suspicious' | 'danger'
export type ScanReason =
	| 'known_malware'
	| 'credential_theft'
	| 'reads_credentials'
	| 'exfiltration_channel'
	| 'hidden_commands'
	| 'embedded_executable'

export interface ScanFinding {
	file_name: string
	severity: ScanSeverity
	reasons: ScanReason[]
}

type Prompt = (findings: ScanFinding[], instanceId: string) => Promise<boolean>

let prompt: Prompt | null = null

/** Registered by the warning dialog once it is mounted. */
export function registerModScanPrompt(handler: Prompt | null): void {
	prompt = handler
}

export async function scanInstanceMods(instanceId: string): Promise<ScanFinding[]> {
	return await invoke<ScanFinding[]>('plugin:settings|shield_scan_mods', { instanceId })
}

/**
 * Resolves `true` when the launch may go ahead: nothing was found, or the
 * player chose to launch anyway. A scan that fails never blocks the game.
 */
export async function confirmModsBeforeLaunch(instanceId: string): Promise<boolean> {
	let findings: ScanFinding[]
	try {
		findings = await scanInstanceMods(instanceId)
	} catch (error) {
		console.warn('Mod scan failed', error)
		return true
	}
	if (findings.length === 0 || !prompt) return true
	return await prompt(findings, instanceId)
}
