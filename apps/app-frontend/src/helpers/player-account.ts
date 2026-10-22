export interface PlayerAccount {
	profile: { id: string; name: string }
	account_type?: 'local' | 'microsoft'
}

export interface PlayerAccountApi {
	users(): Promise<PlayerAccount[]>
	loginLocal(username: string): Promise<PlayerAccount>
	getDefaultUser(): Promise<string | undefined>
	setDefaultUser(id: string): Promise<void>
}

/** Create the optional local Player account only when no account with that name exists. */
export async function ensurePlayerAccount(api: PlayerAccountApi): Promise<void> {
	const matches = (await api.users()).filter(
		(account) => account.profile.name.toLowerCase() === 'player',
	)
	const account =
		matches.find((candidate) => candidate.account_type === 'local') ??
		matches[0] ??
		(await api.loginLocal('Player'))

	if (!(await api.getDefaultUser())) await api.setDefaultUser(account.profile.id)
}
