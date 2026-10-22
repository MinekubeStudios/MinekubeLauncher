import { defineMessage, type MessageDescriptor, useVIntl } from '@modrinth/ui'

import type { EffectStyle } from './use-visual.ts'

// Names and descriptions of the launcher-wide particle effects. They are
// shared between the Visual settings and the loading screen settings, so both
// places always call the same effect by the same name.

export const effectStyleMessages: Record<
	EffectStyle,
	{ name: MessageDescriptor; description: MessageDescriptor }
> = {
	cubes: {
		name: defineMessage({
			id: 'app.settings.visual.effect-style.cubes',
			defaultMessage: '3D cubes',
		}),
		description: defineMessage({
			id: 'app.settings.visual.effect-style.cubes-desc',
			defaultMessage: 'Glowing Minekube blocks drift through a soft three-dimensional space.',
		}),
	},
	embers: {
		name: defineMessage({
			id: 'app.settings.visual.effect-style.embers',
			defaultMessage: 'Embers',
		}),
		description: defineMessage({
			id: 'app.settings.visual.effect-style.embers-desc',
			defaultMessage: 'Warm sparks rise and flicker like a quiet portal flame.',
		}),
	},
	snow: {
		name: defineMessage({
			id: 'app.settings.visual.effect-style.snow',
			defaultMessage: 'Snowfall',
		}),
		description: defineMessage({
			id: 'app.settings.visual.effect-style.snow-desc',
			defaultMessage: 'Fine winter flakes drift at different depths across the scene.',
		}),
	},
	fireflies: {
		name: defineMessage({
			id: 'app.settings.visual.effect-style.fireflies',
			defaultMessage: 'Fireflies',
		}),
		description: defineMessage({
			id: 'app.settings.visual.effect-style.fireflies-desc',
			defaultMessage: 'Quiet, floating lights pulse softly in the distance.',
		}),
	},
	aurora: {
		name: defineMessage({
			id: 'app.settings.visual.effect-style.aurora',
			defaultMessage: 'Aurora',
		}),
		description: defineMessage({
			id: 'app.settings.visual.effect-style.aurora-desc',
			defaultMessage: 'Slow ribbons of luminous colour flow beneath the interface.',
		}),
	},
	galaxy: {
		name: defineMessage({
			id: 'app.settings.visual.effect-style.galaxy',
			defaultMessage: 'Galaxy',
		}),
		description: defineMessage({
			id: 'app.settings.visual.effect-style.galaxy-desc',
			defaultMessage: 'A spiralling starfield with layered parallax and a glowing nebula.',
		}),
	},
	lightning: {
		name: defineMessage({
			id: 'app.settings.visual.effect-style.lightning',
			defaultMessage: 'Lightning',
		}),
		description: defineMessage({
			id: 'app.settings.visual.effect-style.lightning-desc',
			defaultMessage: 'Brief, branching bolts light up a stormy sky without obscuring text.',
		}),
	},
}

export function useEffectStyleLabels() {
	const { formatMessage } = useVIntl()
	return {
		name: (style: EffectStyle) => formatMessage(effectStyleMessages[style].name),
		description: (style: EffectStyle) => formatMessage(effectStyleMessages[style].description),
	}
}
