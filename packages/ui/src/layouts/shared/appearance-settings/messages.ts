import { defineMessages } from '#ui/composables'

export const appearanceSettingsMessages = defineMessages({
	colorThemeTitle: {
		id: 'settings.display.theme.title',
		defaultMessage: 'Launcher theme',
	},
	colorThemeDescription: {
		id: 'settings.display.theme.description',
		defaultMessage: 'Choose the look of Minekube Launcher. Your system theme is used by default.',
	},
	followSystemTitle: {
		id: 'settings.display.theme.follow-system.title',
		defaultMessage: 'Follow system appearance',
	},
	followSystemDescription: {
		id: 'settings.display.theme.follow-system.description',
		defaultMessage: 'Automatically switch between Light and Dark with your device.',
	},
	otherSpecialThemesTitle: {
		id: 'settings.display.theme.other-special.title',
		defaultMessage: 'Other Special theme',
	},
	otherSpecialThemesDescription: {
		id: 'settings.display.theme.other-special.description',
		defaultMessage: 'Distinctive looks for a more personal launcher.',
	},
	iconThemeTitle: {
		id: 'settings.display.icon-theme.title',
		defaultMessage: 'Icons theme',
	},
	iconThemeDescription: {
		id: 'settings.display.icon-theme.description',
		defaultMessage: 'Pick an icon style for navigation and controls.',
	},
	iconThemeOutline: {
		id: 'settings.display.icon-theme.outline',
		defaultMessage: 'Classic',
	},
	iconThemeColorful: {
		id: 'settings.display.icon-theme.colorful',
		defaultMessage: 'Colorful',
	},
	iconThemeEmoji: {
		id: 'settings.display.icon-theme.emoji',
		defaultMessage: 'Emoji',
	},
	iconThemeMinecraft: {
		id: 'settings.display.icon-theme.minecraft',
		defaultMessage: 'Minecraft',
	},
	iconThemeNeon: {
		id: 'settings.display.icon-theme.neon',
		defaultMessage: 'Neon',
	},
	iconThemeCandy: {
		id: 'settings.display.icon-theme.candy',
		defaultMessage: 'Candy',
	},
	iconThemeArcade: {
		id: 'settings.display.icon-theme.arcade',
		defaultMessage: 'Arcade',
	},
	iconThemePixel: {
		id: 'settings.display.icon-theme.pixel',
		defaultMessage: 'Retro Pixel',
	},
	launcherColorTitle: {
		id: 'settings.display.launcher-color.title',
		defaultMessage: 'Launcher color',
	},
	launcherColorDescription: {
		id: 'settings.display.launcher-color.description',
		defaultMessage:
			'Pick the accent color used by buttons, highlights and the loading bar across the launcher.',
	},
	launcherColorTheme: {
		id: 'settings.display.launcher-color.theme',
		defaultMessage: 'Theme colors',
	},
	launcherColorCustom: {
		id: 'settings.display.launcher-color.custom',
		defaultMessage: 'Custom',
	},
	launcherColorGold: {
		id: 'settings.display.launcher-color.gold',
		defaultMessage: 'Gold',
	},
	launcherColorTangerine: {
		id: 'settings.display.launcher-color.tangerine',
		defaultMessage: 'Tangerine',
	},
	launcherColorMagenta: {
		id: 'settings.display.launcher-color.magenta',
		defaultMessage: 'Magenta',
	},
	launcherColorRose: {
		id: 'settings.display.launcher-color.rose',
		defaultMessage: 'Rose',
	},
	launcherColorViolet: {
		id: 'settings.display.launcher-color.violet',
		defaultMessage: 'Violet',
	},
	launcherColorSapphire: {
		id: 'settings.display.launcher-color.sapphire',
		defaultMessage: 'Sapphire',
	},
	launcherColorAqua: {
		id: 'settings.display.launcher-color.aqua',
		defaultMessage: 'Aqua',
	},
	launcherColorEmerald: {
		id: 'settings.display.launcher-color.emerald',
		defaultMessage: 'Emerald',
	},
	launcherColorLime: {
		id: 'settings.display.launcher-color.lime',
		defaultMessage: 'Lime',
	},
	launcherGradientSunset: {
		id: 'settings.display.launcher-color.gradient.sunset',
		defaultMessage: 'Sunset',
	},
	launcherGradientSunrise: {
		id: 'settings.display.launcher-color.gradient.sunrise',
		defaultMessage: 'Sunrise',
	},
	launcherGradientNebula: {
		id: 'settings.display.launcher-color.gradient.nebula',
		defaultMessage: 'Nebula',
	},
	launcherGradientGalaxy: {
		id: 'settings.display.launcher-color.gradient.galaxy',
		defaultMessage: 'Galaxy',
	},
	launcherGradientLava: {
		id: 'settings.display.launcher-color.gradient.lava',
		defaultMessage: 'Lava',
	},
	launcherGradientOcean: {
		id: 'settings.display.launcher-color.gradient.ocean',
		defaultMessage: 'Ocean',
	},
	launcherGradientAurora: {
		id: 'settings.display.launcher-color.gradient.aurora',
		defaultMessage: 'Aurora',
	},
	launcherGradientFrost: {
		id: 'settings.display.launcher-color.gradient.frost',
		defaultMessage: 'Frost',
	},
	launcherGradientEnder: {
		id: 'settings.display.launcher-color.gradient.ender',
		defaultMessage: 'Ender',
	},
	launcherColorSolids: {
		id: 'settings.display.launcher-color.solids',
		defaultMessage: 'Colors',
	},
	launcherColorGradients: {
		id: 'settings.display.launcher-color.gradients',
		defaultMessage: 'Gradients',
	},
	launcherBackgroundTitle: {
		id: 'settings.display.launcher-background.title',
		defaultMessage: 'Launcher background',
	},
	launcherBackgroundDescription: {
		id: 'settings.display.launcher-background.description',
		defaultMessage:
			'Keep the default background or use your own image across the whole launcher. Your image stays on this device.',
	},
	launcherBackgroundNone: {
		id: 'settings.display.launcher-background.none',
		defaultMessage: 'Default',
	},
	launcherBackgroundImport: {
		id: 'settings.display.launcher-background.import',
		defaultMessage: 'Custom background',
	},
	launcherBackgroundImporting: {
		id: 'settings.display.launcher-background.importing',
		defaultMessage: 'Importing…',
	},
	launcherBackgroundImportHint: {
		id: 'settings.display.launcher-background.import-hint',
		defaultMessage: 'PNG, JPG, WebP, BMP or GIF — stored on this computer only.',
	},
	launcherBackgroundRemove: {
		id: 'settings.display.launcher-background.remove',
		defaultMessage: 'Remove wallpaper',
	},
	launcherBackgroundModeTitle: {
		id: 'settings.display.launcher-background.mode.title',
		defaultMessage: 'Background style',
	},
	launcherBackgroundModeDescription: {
		id: 'settings.display.launcher-background.mode.description',
		defaultMessage:
			'Blur creates a cinematic, soft-focus atmosphere. Sharp keeps artwork crisp with a subtle contrast tint so interface text stays easy to read.',
	},
	launcherBackgroundBlur: {
		id: 'settings.display.launcher-background.mode.blur',
		defaultMessage: 'Blur',
	},
	launcherBackgroundBlurDescription: {
		id: 'settings.display.launcher-background.mode.blur-description',
		defaultMessage: 'Soft-focus colour and depth, tuned for comfortable reading.',
	},
	launcherBackgroundSharp: {
		id: 'settings.display.launcher-background.mode.sharp',
		defaultMessage: 'Sharp',
	},
	launcherBackgroundSharpDescription: {
		id: 'settings.display.launcher-background.mode.sharp-description',
		defaultMessage: 'Full-detail artwork with a protective tint for readable text.',
	},
	launcherBackgroundTransparentTitle: {
		id: 'settings.display.launcher-background.transparent.title',
		defaultMessage: 'Transparent mode',
	},
	launcherBackgroundTransparentDescription: {
		id: 'settings.display.launcher-background.transparent.description',
		defaultMessage:
			'Turns the whole launcher to glass — the top bar, the sidebar and the cards let the wallpaper shine through. When off, only the page background changes.',
	},
	specialButtonsTitle: {
		id: 'settings.display.special-buttons.title',
		defaultMessage: 'Special buttons style',
	},
	specialButtonsDescription: {
		id: 'settings.display.special-buttons.description',
		defaultMessage:
			'The Play button, the Stop button and the round Play buttons on instance cards: pick the material they are made of. Every style keeps the same smooth 3D press, click pulse and hover light.',
	},
	specialButtonsPreview: {
		id: 'settings.display.special-buttons.preview',
		defaultMessage: 'Play',
	},
	specialButtonsMinekube: {
		id: 'settings.display.special-buttons.minekube',
		defaultMessage: 'Minekube',
	},
	specialButtonsMinekubeHint: {
		id: 'settings.display.special-buttons.minekube-hint',
		defaultMessage: 'Gold → magenta brand gradient with a live glow.',
	},
	specialButtonsClassic: {
		id: 'settings.display.special-buttons.modrinth',
		defaultMessage: 'Classic',
	},
	specialButtonsClassicHint: {
		id: 'settings.display.special-buttons.modrinth-hint',
		defaultMessage: 'The original app button, unchanged.',
	},
	specialButtonsGlass: {
		id: 'settings.display.special-buttons.glass',
		defaultMessage: 'Glass',
	},
	specialButtonsGlassHint: {
		id: 'settings.display.special-buttons.glass-hint',
		defaultMessage: 'Frosted, translucent, softly lit.',
	},
	specialButtonsNeon: {
		id: 'settings.display.special-buttons.neon',
		defaultMessage: 'Neon',
	},
	specialButtonsNeonHint: {
		id: 'settings.display.special-buttons.neon-hint',
		defaultMessage: 'A lit tube glowing in the dark.',
	},
	specialButtonsChrome: {
		id: 'settings.display.special-buttons.chrome',
		defaultMessage: 'Chrome',
	},
	specialButtonsChromeHint: {
		id: 'settings.display.special-buttons.chrome-hint',
		defaultMessage: 'Machined metal with a sharp specular.',
	},
	specialButtonsArcade: {
		id: 'settings.display.special-buttons.arcade',
		defaultMessage: 'Arcade',
	},
	specialButtonsArcadeHint: {
		id: 'settings.display.special-buttons.arcade-hint',
		defaultMessage: 'A chunky key that really gets pressed.',
	},
	specialButtonsAurora: {
		id: 'settings.display.special-buttons.aurora',
		defaultMessage: 'Aurora',
	},
	specialButtonsAuroraHint: {
		id: 'settings.display.special-buttons.aurora-hint',
		defaultMessage: 'Iridescent light flowing under glass.',
	},
	specialButtonsMinimal: {
		id: 'settings.display.special-buttons.minimal',
		defaultMessage: 'Minimal',
	},
	specialButtonsMinimalHint: {
		id: 'settings.display.special-buttons.minimal-hint',
		defaultMessage: 'Flat, sharp, hairline thin.',
	},
	outlineThemeTitle: {
		id: 'settings.display.outline-theme.title',
		defaultMessage: 'Outline theme',
	},
	outlineThemeDescription: {
		id: 'settings.display.outline-theme.description',
		defaultMessage:
			'Draw a themed outline around the launcher window — static, glowing or fully animated.',
	},
	outlineThemeNone: {
		id: 'settings.display.outline-theme.none',
		defaultMessage: 'None',
	},
	outlineThemeGlow: {
		id: 'settings.display.outline-theme.glow',
		defaultMessage: 'Glow',
	},
	outlineThemeRgb: {
		id: 'settings.display.outline-theme.rgb',
		defaultMessage: 'RGB',
	},
	outlineThemeNeon: {
		id: 'settings.display.outline-theme.neon',
		defaultMessage: 'Neon',
	},
	outlineThemeAurora: {
		id: 'settings.display.outline-theme.aurora',
		defaultMessage: 'Aurora',
	},
	advancedCustomizationTitle: {
		id: 'settings.display.advanced-customization.title',
		defaultMessage: 'Advanced customization options',
	},
	advancedCustomizationDescription: {
		id: 'settings.display.advanced-customization.description',
		defaultMessage:
			'Fine-grained controls for the icon set, the material of the special buttons and the outline drawn around the launcher window.',
	},
	syncAcrossDevicesTitle: {
		id: 'settings.display.theme.sync-across-devices',
		defaultMessage: 'Sync theme across devices',
	},
	syncAcrossDevicesDescription: {
		id: 'settings.display.theme.sync-across-devices.description',
		defaultMessage:
			"Use this theme everywhere you're signed in. Turn this off to keep a separate theme on this device.",
	},
	syncAcrossDevicesSignedOutTooltip: {
		id: 'settings.display.theme.sync-across-devices.sign-in-tooltip',
		defaultMessage: 'Sign in to sync theme',
	},
	projectListLayoutsTitle: {
		id: 'settings.display.project-list-layouts.title',
		defaultMessage: 'Project list layouts',
	},
	projectListLayoutsDescription: {
		id: 'settings.display.project-list-layouts.description',
		defaultMessage: 'Select your preferred layout for each page that displays project lists.',
	},
	mod: {
		id: 'settings.display.project-list-layouts.mod',
		defaultMessage: 'Mods page',
	},
	plugin: {
		id: 'settings.display.project-list-layouts.plugin',
		defaultMessage: 'Plugins page',
	},
	datapack: {
		id: 'settings.display.project-list-layouts.datapack',
		defaultMessage: 'Data Packs page',
	},
	shader: {
		id: 'settings.display.project-list-layouts.shader',
		defaultMessage: 'Shaders page',
	},
	resourcepack: {
		id: 'settings.display.project-list-layouts.resourcepack',
		defaultMessage: 'Resource Packs page',
	},
	modpack: {
		id: 'settings.display.project-list-layouts.modpack',
		defaultMessage: 'Modpacks page',
	},
	server: {
		id: 'settings.display.project-list-layouts.server',
		defaultMessage: 'Servers page',
	},
	user: {
		id: 'settings.display.project-list-layouts.user',
		defaultMessage: 'User profile pages',
	},
	advancedRenderingTitle: {
		id: 'settings.display.sidebar.advanced-rendering.title',
		defaultMessage: 'Advanced rendering',
	},
	advancedRenderingDescription: {
		id: 'settings.display.sidebar.advanced-rendering.description',
		defaultMessage:
			'Enables advanced rendering such as blur effects that may cause performance issues without hardware-accelerated rendering.',
	},
	externalLinksNewTabTitle: {
		id: 'settings.display.sidebar.external-links-new-tab.title',
		defaultMessage: 'Open external links in new tab',
	},
	externalLinksNewTabDescription: {
		id: 'settings.display.sidebar.external-links-new-tab.description',
		defaultMessage:
			'Make links which go outside of the launcher open in a new tab. No matter this setting, links on the same domain and in Markdown descriptions will open in the same tab, and links on ads and edit pages will open in a new tab.',
	},
	rightAlignedFiltersSidebarTitle: {
		id: 'settings.display.sidebar.right-aligned-filters-sidebar.title',
		defaultMessage: 'Right-aligned filters sidebar on search pages',
	},
	rightAlignedFiltersSidebarDescription: {
		id: 'settings.display.sidebar.right-aligned-filters-sidebar.description',
		defaultMessage: 'Aligns the filters sidebar to the right of the search results.',
	},
	leftAlignedContentSidebarTitle: {
		id: 'settings.display.sidebar.left-aligned-content-sidebar.title',
		defaultMessage: 'Left-aligned sidebar on content pages',
	},
	leftAlignedContentSidebarDescription: {
		id: 'settings.display.sidebar.left-aligned-content-sidebar.description',
		defaultMessage: "Aligns the sidebar to the left of the page's content.",
	},
	nativeDecorationsTitle: {
		id: 'app.appearance-settings.native-decorations.title',
		defaultMessage: 'System window frame',
	},
	nativeDecorationsDescription: {
		id: 'app.appearance-settings.native-decorations.description',
		defaultMessage:
			"Use your operating system's title bar and window controls. Requires an app restart.",
	},
})
