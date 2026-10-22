import { provideUserCountry } from '@modrinth/ui'
import { ref } from 'vue'

/**
 * The country used for region-specific formatting. Minekube Shield: it comes
 * from the system language (for example `cs-CZ` → `CZ`) instead of a GeoIP
 * lookup, which would send the player's IP address to a server at startup.
 */
export function setupUserCountryProvider() {
	const region = (navigator.languages?.[0] ?? navigator.language ?? '')
		.split(/[-_]/)
		.find((part, index) => index > 0 && /^[A-Za-z]{2}$/.test(part))
	const country = ref(region ? region.toUpperCase() : 'US')

	return provideUserCountry(country)
}
