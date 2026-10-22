import { defineMessages, type MessageDescriptor } from '@modrinth/ui'

/** A link inside a translated step; its text is translated too. */
export interface MinecraftAuthErrorLink {
	href: string
	label: MessageDescriptor
}

export interface MinecraftAuthErrorStep {
	message: MessageDescriptor
	/** Placeholders in the message, filled with links. */
	links?: Record<string, MinecraftAuthErrorLink>
}

export interface MinecraftAuthError {
	errorCode?: string
	errorMatchers?: string[]
	matches?: (message: string) => boolean
	whatHappened: MessageDescriptor
	stepsToFix: MinecraftAuthErrorStep[]
}

export const minecraftAuthErrorMessages = defineMessages({
	refreshTokenWhatHappened: {
		id: 'app.auth-error.refresh-token.what-happened',
		defaultMessage:
			'Your saved Microsoft sign-in token has expired or was revoked, so Minekube Launcher cannot refresh your Minecraft session.',
	},
	refreshTokenStep1: {
		id: 'app.auth-error.refresh-token.step-1',
		defaultMessage: 'Sign out of the affected Minecraft account in Minekube Launcher',
	},
	refreshTokenStep2: {
		id: 'app.auth-error.refresh-token.step-2',
		defaultMessage: 'Sign in to the account again',
	},
	refreshTokenStep3: {
		id: 'app.auth-error.refresh-token.step-3',
		defaultMessage: 'Once the new sign-in finishes, try launching Minecraft again',
	},
	clockWhatHappened: {
		id: 'app.auth-error.clock.what-happened',
		defaultMessage:
			'Xbox services rejected the first sign-in response. This is most often caused by your system clock or time zone being out of sync.',
	},
	clockStep1: {
		id: 'app.auth-error.clock.step-1',
		defaultMessage: 'Open your system date and time settings',
	},
	clockStep2: {
		id: 'app.auth-error.clock.step-2',
		defaultMessage: 'Turn on automatic time zone and automatic time, if available',
	},
	clockStep3: {
		id: 'app.auth-error.clock.step-3',
		defaultMessage: 'Use the sync option in your system settings to synchronize the clock',
	},
	clockStep4: {
		id: 'app.auth-error.clock.step-4',
		defaultMessage: 'Restart Minekube Launcher',
	},
	clockStep5: {
		id: 'app.auth-error.clock.step-5',
		defaultMessage: 'Try signing in again',
	},
	rateLimitWhatHappened: {
		id: 'app.auth-error.rate-limit.what-happened',
		defaultMessage:
			'Microsoft or Minecraft temporarily blocked the sign-in request because there were too many recent attempts.',
	},
	rateLimitStep1: {
		id: 'app.auth-error.rate-limit.step-1',
		defaultMessage: 'Wait about an hour before trying again',
	},
	rateLimitStep2: {
		id: 'app.auth-error.rate-limit.step-2',
		defaultMessage: 'Restart Minekube Launcher after waiting',
	},
	rateLimitStep3: {
		id: 'app.auth-error.rate-limit.step-3',
		defaultMessage: 'Try signing in once more',
	},
	rateLimitStep4: {
		id: 'app.auth-error.rate-limit.step-4',
		defaultMessage:
			'If the same message appears, wait longer before retrying so the temporary limit can clear',
	},
	serverErrorWhatHappened: {
		id: 'app.auth-error.server-error.what-happened',
		defaultMessage:
			"Minecraft's authentication service is returning a server error, so Minekube Launcher cannot finish signing you in right now.",
	},
	serverErrorStep1: {
		id: 'app.auth-error.server-error.step-1',
		defaultMessage: 'Wait a few minutes and try signing in again',
	},
	serverErrorStep2: {
		id: 'app.auth-error.server-error.step-2',
		defaultMessage: 'Check {xboxStatus} for current service issues',
	},
	serverErrorStep3: {
		id: 'app.auth-error.server-error.step-3',
		defaultMessage:
			'Try signing in with the {officialLauncher} to confirm whether Minecraft sign-in is also affected there',
	},
	serverErrorStep4: {
		id: 'app.auth-error.server-error.step-4',
		defaultMessage:
			'If the service is healthy and this keeps happening, contact support with the debug information below',
	},
	profileWhatHappened: {
		id: 'app.auth-error.profile.what-happened',
		defaultMessage:
			'Minecraft services could not return a Java Edition profile for this account. This most often happens when the game was purchased recently, the Java profile has not finished being created, or the wrong Microsoft account is being used.',
	},
	profileStep1: {
		id: 'app.auth-error.profile.step-1',
		defaultMessage: 'Sign in with the {officialLauncher}',
	},
	profileStep2: {
		id: 'app.auth-error.profile.step-2',
		defaultMessage: 'Launch Minecraft: Java Edition once from the official launcher',
	},
	profileStep3: {
		id: 'app.auth-error.profile.step-3',
		defaultMessage: 'Wait up to an hour if the purchase or profile setup was recent',
	},
	profileStep4: {
		id: 'app.auth-error.profile.step-4',
		defaultMessage:
			'Make sure you are using the Microsoft account that owns Minecraft. See {rightAccount} for help',
	},
	profileStep5: {
		id: 'app.auth-error.profile.step-5',
		defaultMessage: 'Try signing in to Minekube Launcher again',
	},
	networkWhatHappened: {
		id: 'app.auth-error.network.what-happened',
		defaultMessage:
			'Minekube Launcher could not connect to a Microsoft, Xbox, or Minecraft service needed for sign-in. This is usually caused by a local network, DNS, proxy, firewall, hosts file, VPN, or antivirus issue.',
	},
	networkStep1: {
		id: 'app.auth-error.network.step-1',
		defaultMessage: 'Restart Minekube Launcher and try signing in again',
	},
	networkStep2: {
		id: 'app.auth-error.network.step-2',
		defaultMessage: 'Check that your internet connection is working',
	},
	networkStep3: {
		id: 'app.auth-error.network.step-3',
		defaultMessage:
			'Allow Minekube Launcher through your firewall, antivirus, proxy, VPN, and hosts file rules',
	},
	networkStep4: {
		id: 'app.auth-error.network.step-4',
		defaultMessage:
			'Try a different network or temporarily disable VPN/proxy software if you use one',
	},
	networkStep5: {
		id: 'app.auth-error.network.step-5',
		defaultMessage:
			'If routing or DNS is the issue, a service like Cloudflare WARP can sometimes help',
	},
	ukAgeWhatHappened: {
		id: 'app.auth-error.uk-age.what-happened',
		defaultMessage:
			'Your Minecraft/Xbox Live account requires age verification to comply with UK regulations. You must complete this before signing in.',
	},
	ukAgeStep1: {
		id: 'app.auth-error.uk-age.step-1',
		defaultMessage: 'Go to the {minecraftLogin} page and sign in',
	},
	ukAgeStep2: {
		id: 'app.auth-error.uk-age.step-2',
		defaultMessage: 'Follow the instructions to verify your age',
	},
	ukAgeStep3: {
		id: 'app.auth-error.uk-age.step-3',
		defaultMessage: 'Once verified, try signing in again',
	},
	ukAgeStep4: {
		id: 'app.auth-error.uk-age.step-4',
		defaultMessage: 'For additional help, visit {ukAge}',
	},
	noProfileWhatHappened: {
		id: 'app.auth-error.no-profile.what-happened',
		defaultMessage: "This account doesn't have an Xbox profile set up or doesn't own Minecraft.",
	},
	noProfileStep1: {
		id: 'app.auth-error.no-profile.step-1',
		defaultMessage: 'Make sure Minecraft is purchased on this account',
	},
	noProfileStep2: {
		id: 'app.auth-error.no-profile.step-2',
		defaultMessage: 'Visit {minecraftLogin} and sign in',
	},
	noProfileStep3: {
		id: 'app.auth-error.no-profile.step-3',
		defaultMessage: 'Complete Xbox profile setup if prompted',
	},
	noProfileStep4: {
		id: 'app.auth-error.no-profile.step-4',
		defaultMessage: 'Once finished, try signing in again',
	},
	regionWhatHappened: {
		id: 'app.auth-error.region.what-happened',
		defaultMessage: "Xbox Live isn't available in your region, so sign-in is blocked.",
	},
	regionStep1: {
		id: 'app.auth-error.region.step-1',
		defaultMessage: 'Xbox services must be supported in your country before you can sign in',
	},
	regionStep2: {
		id: 'app.auth-error.region.step-2',
		defaultMessage: 'Check {xboxRegions} for supported regions',
	},
	koreaWhatHappened: {
		id: 'app.auth-error.korea.what-happened',
		defaultMessage: 'This account requires adult verification under South Korean regulations.',
	},
	koreaStep1: {
		id: 'app.auth-error.korea.step-1',
		defaultMessage: 'Visit {xbox} and sign in',
	},
	koreaStep2: {
		id: 'app.auth-error.korea.step-2',
		defaultMessage: 'Complete the identity verification process',
	},
	koreaStep3: {
		id: 'app.auth-error.korea.step-3',
		defaultMessage: 'Once finished, try signing in again',
	},
	underageWhatHappened: {
		id: 'app.auth-error.underage.what-happened',
		defaultMessage: 'This account is underage and not linked to a Microsoft family group.',
	},
	underageStep1: {
		id: 'app.auth-error.underage.step-1',
		defaultMessage: 'Review the {familyGuide}',
	},
	underageStep2: {
		id: 'app.auth-error.underage.step-2',
		defaultMessage: 'Join or create a family group as instructed',
	},
	underageStep3: {
		id: 'app.auth-error.underage.step-3',
		defaultMessage: 'Once finished, try signing in again',
	},
	suspendedWhatHappened: {
		id: 'app.auth-error.suspended.what-happened',
		defaultMessage: 'This account was suspended for violating Xbox Community Standards.',
	},
	suspendedStep1: {
		id: 'app.auth-error.suspended.step-1',
		defaultMessage: 'Visit {xboxSupport} and review the enforcement details',
	},
	suspendedStep2: {
		id: 'app.auth-error.suspended.step-2',
		defaultMessage: 'Submit an appeal if one is available',
	},
	restrictedWhatHappened: {
		id: 'app.auth-error.restricted.what-happened',
		defaultMessage: "This account is restricted and doesn't have permission to play online.",
	},
	restrictedStep1: {
		id: 'app.auth-error.restricted.step-1',
		defaultMessage: 'Have a guardian sign in to {msFamily}',
	},
	restrictedStep2: {
		id: 'app.auth-error.restricted.step-2',
		defaultMessage: 'Update online play permissions',
	},
	restrictedStep3: {
		id: 'app.auth-error.restricted.step-3',
		defaultMessage: 'Once finished, try signing in again',
	},
	termsWhatHappened: {
		id: 'app.auth-error.terms.what-happened',
		defaultMessage: "This account hasn't accepted Xbox's Terms of Service.",
	},
	termsStep1: {
		id: 'app.auth-error.terms.step-1',
		defaultMessage: 'Visit {xbox} and sign in',
	},
	termsStep2: {
		id: 'app.auth-error.terms.step-2',
		defaultMessage: 'Accept the Terms if prompted',
	},
	termsStep3: {
		id: 'app.auth-error.terms.step-3',
		defaultMessage: 'Once finished, try signing in again',
	},
	xstsWhatHappened: {
		id: 'app.auth-error.xsts.what-happened',
		defaultMessage:
			'Xbox services rejected the request to authorize this account for Minecraft services, but did not return a specific account restriction that Minekube Launcher recognizes.',
	},
	xstsStep1: {
		id: 'app.auth-error.xsts.step-1',
		defaultMessage: 'Sign in with the {officialLauncher}',
	},
	xstsStep2: {
		id: 'app.auth-error.xsts.step-2',
		defaultMessage: 'Complete any prompts shown by Microsoft, Xbox, or Minecraft',
	},
	xstsStep3: {
		id: 'app.auth-error.xsts.step-3',
		defaultMessage: 'Try signing in to Minekube Launcher again',
	},
	xstsStep4: {
		id: 'app.auth-error.xsts.step-4',
		defaultMessage:
			'If the official launcher also fails, follow the error shown there or contact Xbox Support',
	},
	linkOfficialLauncher: {
		id: 'app.auth-error.link.officialLauncher',
		defaultMessage: 'official Minecraft Launcher',
	},
	linkMinecraftLogin: {
		id: 'app.auth-error.link.minecraftLogin',
		defaultMessage: 'Minecraft Login',
	},
	linkXboxStatus: {
		id: 'app.auth-error.link.xboxStatus',
		defaultMessage: 'Xbox Status',
	},
	linkRightAccount: {
		id: 'app.auth-error.link.rightAccount',
		defaultMessage: 'Minecraft Help Center',
	},
	linkUkAge: {
		id: 'app.auth-error.link.ukAge',
		defaultMessage: 'UK age verification on Xbox',
	},
	linkXboxRegions: {
		id: 'app.auth-error.link.xboxRegions',
		defaultMessage: 'Xbox Availability',
	},
	linkXbox: {
		id: 'app.auth-error.link.xbox',
		defaultMessage: 'Xbox',
	},
	linkFamilyGuide: {
		id: 'app.auth-error.link.familyGuide',
		defaultMessage: 'Family Setup Guide',
	},
	linkXboxSupport: {
		id: 'app.auth-error.link.xboxSupport',
		defaultMessage: 'Xbox Support',
	},
	linkMsFamily: {
		id: 'app.auth-error.link.msFamily',
		defaultMessage: 'Microsoft Family',
	},
	modalTitle: {
		id: 'app.auth-error.modal.title',
		defaultMessage: 'Sign in Failed',
	},
	modalWarning: {
		id: 'app.auth-error.modal.warning',
		defaultMessage:
			"We couldn't sign you into your Microsoft account. This may be due to account restrictions or regional limitations.",
	},
	modalWhatHappenedTitle: {
		id: 'app.auth-error.modal.what-happened-title',
		defaultMessage: 'What we think happened',
	},
	modalHowToFixTitle: {
		id: 'app.auth-error.modal.how-to-fix-title',
		defaultMessage: 'How to fix it',
	},
	modalUnknownTitle: {
		id: 'app.auth-error.modal.unknown-title',
		defaultMessage: 'Unknown error',
	},
	modalUnknownBody: {
		id: 'app.auth-error.modal.unknown-body',
		defaultMessage:
			"We don't recognize this error and can't recommend specific steps to resolve it.",
	},
	modalUnknownHint: {
		id: 'app.auth-error.modal.unknown-hint',
		defaultMessage:
			'Try visiting {minecraftLogin} and signing in, as it may prompt you with the necessary steps. You can also contact support and we can look into it further.',
	},
	modalContactSupport: {
		id: 'app.auth-error.modal.contact-support',
		defaultMessage: 'Contact support',
	},
	modalSignInAgain: {
		id: 'app.auth-error.modal.sign-in-again',
		defaultMessage: 'Sign in again',
	},
	modalDebugTitle: {
		id: 'app.auth-error.modal.debug-title',
		defaultMessage: 'Debug information',
	},
	modalCopyDebug: {
		id: 'app.auth-error.modal.copy-debug',
		defaultMessage: 'Copy debug info',
	},
	modalNoMessage: {
		id: 'app.auth-error.modal.no-message',
		defaultMessage: 'No error message.',
	},
})

const m = minecraftAuthErrorMessages

export const authErrorLinks = {
	officialLauncher: {
		href: 'https://www.minecraft.net/en-us/download',
		label: m.linkOfficialLauncher,
	},
	minecraftLogin: { href: 'https://www.minecraft.net/en-us/login', label: m.linkMinecraftLogin },
	xboxStatus: { href: 'https://support.xbox.com/xbox-live-status', label: m.linkXboxStatus },
	rightAccount: {
		href: 'https://help.minecraft.net',
		label: m.linkRightAccount,
	},
	ukAge: {
		href: 'https://support.xbox.com/en-GB/help/family-online-safety/online-safety/UK-age-verification',
		label: m.linkUkAge,
	},
	xboxRegions: { href: 'https://www.xbox.com/en-US/regions', label: m.linkXboxRegions },
	xbox: { href: 'https://www.xbox.com', label: m.linkXbox },
	familyGuide: {
		href: 'https://help.minecraft.net/hc/en-us/articles/4408968616077',
		label: m.linkFamilyGuide,
	},
	xboxSupport: { href: 'https://support.xbox.com', label: m.linkXboxSupport },
	msFamily: { href: 'https://account.microsoft.com/family/', label: m.linkMsFamily },
} satisfies Record<string, MinecraftAuthErrorLink>

export const minecraftAuthErrors: MinecraftAuthError[] = [
	{
		errorMatchers: ['Failed to deserialize response to JSON during step RefreshOAuthToken:'],
		whatHappened: m.refreshTokenWhatHappened,
		stepsToFix: [
			{ message: m.refreshTokenStep1 },
			{ message: m.refreshTokenStep2 },
			{ message: m.refreshTokenStep3 },
		],
	},
	{
		errorMatchers: ['Failed to deserialize response to JSON during step SisuAuthenticate:'],
		whatHappened: m.clockWhatHappened,
		stepsToFix: [
			{ message: m.clockStep1 },
			{ message: m.clockStep2 },
			{ message: m.clockStep3 },
			{ message: m.clockStep4 },
			{ message: m.clockStep5 },
		],
	},
	{
		matches: (message) =>
			message.includes('Failed to deserialize response to JSON during step MinecraftToken:') &&
			message.includes('429 Too Many Requests'),
		whatHappened: m.rateLimitWhatHappened,
		stepsToFix: [
			{ message: m.rateLimitStep1 },
			{ message: m.rateLimitStep2 },
			{ message: m.rateLimitStep3 },
			{ message: m.rateLimitStep4 },
		],
	},
	{
		matches: (message) =>
			message.includes('Failed to deserialize response to JSON during step MinecraftToken:') &&
			/Status Code: 5\d\d/.test(message),
		whatHappened: m.serverErrorWhatHappened,
		stepsToFix: [
			{ message: m.serverErrorStep1 },
			{ message: m.serverErrorStep2, links: { xboxStatus: authErrorLinks.xboxStatus } },
			{ message: m.serverErrorStep3, links: { officialLauncher: authErrorLinks.officialLauncher } },
			{ message: m.serverErrorStep4 },
		],
	},
	{
		errorMatchers: ['Failed to fetch player profile'],
		whatHappened: m.profileWhatHappened,
		stepsToFix: [
			{ message: m.profileStep1, links: { officialLauncher: authErrorLinks.officialLauncher } },
			{ message: m.profileStep2 },
			{ message: m.profileStep3 },
			{ message: m.profileStep4, links: { rightAccount: authErrorLinks.rightAccount } },
			{ message: m.profileStep5 },
		],
	},
	{
		matches: (message) =>
			message.includes('error sending request for url (') &&
			[
				'minecraft.net',
				'minecraftservices.com',
				'mojang.com',
				'xbox.com',
				'xboxlive.com',
				'live.com',
			].some((domain) => message.includes(domain)),
		whatHappened: m.networkWhatHappened,
		stepsToFix: [
			{ message: m.networkStep1 },
			{ message: m.networkStep2 },
			{ message: m.networkStep3 },
			{ message: m.networkStep4 },
			{ message: m.networkStep5 },
		],
	},
	{
		errorCode: '2148916222',
		whatHappened: m.ukAgeWhatHappened,
		stepsToFix: [
			{ message: m.ukAgeStep1, links: { minecraftLogin: authErrorLinks.minecraftLogin } },
			{ message: m.ukAgeStep2 },
			{ message: m.ukAgeStep3 },
			{ message: m.ukAgeStep4, links: { ukAge: authErrorLinks.ukAge } },
		],
	},
	{
		errorCode: '2148916233',
		whatHappened: m.noProfileWhatHappened,
		stepsToFix: [
			{ message: m.noProfileStep1 },
			{ message: m.noProfileStep2, links: { minecraftLogin: authErrorLinks.minecraftLogin } },
			{ message: m.noProfileStep3 },
			{ message: m.noProfileStep4 },
		],
	},
	{
		errorCode: '2148916235',
		whatHappened: m.regionWhatHappened,
		stepsToFix: [
			{ message: m.regionStep1 },
			{ message: m.regionStep2, links: { xboxRegions: authErrorLinks.xboxRegions } },
		],
	},
	{
		errorCode: '2148916236',
		whatHappened: m.koreaWhatHappened,
		stepsToFix: [
			{ message: m.koreaStep1, links: { xbox: authErrorLinks.xbox } },
			{ message: m.koreaStep2 },
			{ message: m.koreaStep3 },
		],
	},
	{
		errorCode: '2148916237',
		whatHappened: m.koreaWhatHappened,
		stepsToFix: [
			{ message: m.koreaStep1, links: { xbox: authErrorLinks.xbox } },
			{ message: m.koreaStep2 },
			{ message: m.koreaStep3 },
		],
	},
	{
		errorCode: '2148916238',
		whatHappened: m.underageWhatHappened,
		stepsToFix: [
			{ message: m.underageStep1, links: { familyGuide: authErrorLinks.familyGuide } },
			{ message: m.underageStep2 },
			{ message: m.underageStep3 },
		],
	},
	{
		errorCode: '2148916227',
		whatHappened: m.suspendedWhatHappened,
		stepsToFix: [
			{ message: m.suspendedStep1, links: { xboxSupport: authErrorLinks.xboxSupport } },
			{ message: m.suspendedStep2 },
		],
	},
	{
		errorCode: '2148916229',
		whatHappened: m.restrictedWhatHappened,
		stepsToFix: [
			{ message: m.restrictedStep1, links: { msFamily: authErrorLinks.msFamily } },
			{ message: m.restrictedStep2 },
			{ message: m.restrictedStep3 },
		],
	},
	{
		errorCode: '2148916234',
		whatHappened: m.termsWhatHappened,
		stepsToFix: [
			{ message: m.termsStep1, links: { xbox: authErrorLinks.xbox } },
			{ message: m.termsStep2 },
			{ message: m.termsStep3 },
		],
	},
	{
		errorMatchers: ['Failed to deserialize response to JSON during step XstsAuthorize:'],
		whatHappened: m.xstsWhatHappened,
		stepsToFix: [
			{ message: m.xstsStep1, links: { officialLauncher: authErrorLinks.officialLauncher } },
			{ message: m.xstsStep2 },
			{ message: m.xstsStep3 },
			{ message: m.xstsStep4 },
		],
	},
]

export function findMinecraftAuthError(message: string): MinecraftAuthError | null {
	return (
		minecraftAuthErrors.find((error) => {
			if (error.errorCode && message.includes(error.errorCode)) {
				return true
			}

			if (error.errorMatchers?.some((matcher) => message.includes(matcher))) {
				return true
			}

			return error.matches?.(message) ?? false
		}) ?? null
	)
}
