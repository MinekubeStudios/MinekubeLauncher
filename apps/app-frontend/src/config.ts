const trimTrailingSlash = (url: string) => url.replace(/\/$/, '')

const labrinthBaseUrl = trimTrailingSlash(
	import.meta.env.MODRINTH_API_BASE_URL || 'https://api.modrinth.com',
)
const archonBaseUrl = trimTrailingSlash(
	import.meta.env.MODRINTH_ARCHON_BASE_URL || 'https://archon.modrinth.com',
)

export const config = {
	labrinthBaseUrl,
	archonBaseUrl,
}
