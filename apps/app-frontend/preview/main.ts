import '../src/assets/stylesheets/global.scss'
import './preview.scss'

import { createApp, defineComponent, h, onMounted, ref } from 'vue'

import { SPECIAL_BUTTON_STYLE_IDS } from '../../../packages/ui/src/layouts/shared/appearance-settings/special-buttons'
import MinecraftLaunchOverlay from '../src/components/ui/MinecraftLaunchOverlay.vue'
import { hideLaunchOverlay, showLaunchOverlay } from '../src/helpers/launch-overlay-state'
import { mountSpecialButtons } from '../src/helpers/special-buttons'
import i18nPlugin from '../src/plugins/i18n'

const NOTES: Record<string, string> = {
	minekube: 'Gold → magenta brand gradient with a live glow.',
	modrinth: 'The original app button, unchanged.',
	glass: 'Frosted, translucent, softly lit.',
	neon: 'A lit tube glowing in the dark.',
	chrome: 'Machined metal with a sharp specular.',
	arcade: 'A chunky key that really gets pressed.',
	aurora: 'Iridescent light flowing under glass.',
	minimal: 'Flat, sharp, hairline thin.',
}

const PlayGlyph = () =>
	h('svg', { viewBox: '0 0 24 24', fill: 'currentColor', class: 'glyph' }, [
		h('path', {
			d: 'M8 5.14v13.72a1 1 0 0 0 1.53.85l10.5-6.86a1 1 0 0 0 0-1.7L9.53 4.3A1 1 0 0 0 8 5.14z',
		}),
	])

const StopGlyph = () =>
	h('svg', { viewBox: '0 0 24 24', fill: 'currentColor', class: 'glyph' }, [
		h('path', { d: 'M7 6h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z' }),
	])

const Preview = defineComponent({
	setup() {
		const active = ref<string>('minekube')

		function apply(style: string) {
			active.value = style
			document.documentElement.dataset.specialButtons = style
		}

		onMounted(() => {
			document.documentElement.dataset.specialButtons = active.value
			mountSpecialButtons()
		})

		return () =>
			h('div', { class: 'preview-shell' }, [
				h('header', { class: 'preview-head' }, [
					h('h1', 'Special buttons — Minekube Launcher'),
					h(
						'p',
						'Every style below is the real stylesheet and the real runtime. Click a button to feel the press pulse, drag across it for the 3D tilt and the pointer light.',
					),
				]),
				h('div', { class: 'style-picker' }, [
					...SPECIAL_BUTTON_STYLE_IDS.map((style) =>
						h(
							'button',
							{
								type: 'button',
								class: ['style-chip', active.value === style ? 'is-active' : ''],
								onClick: () => apply(style),
							},
							style,
						),
					),
					h(
						'button',
						{
							type: 'button',
							class: 'style-chip is-launch',
							onClick: () => showLaunchOverlay({ id: 'preview', name: 'Minekube Preview 1.21' }),
						},
						'▶ Show the launch overlay',
					),
					h(
						'button',
						{
							type: 'button',
							class: 'style-chip',
							onClick: () => hideLaunchOverlay(),
						},
						'Stop overlay',
					),
				]),
				h('section', { class: 'hero' }, [
					h('h2', 'Live buttons in the selected style'),
					h('div', { class: 'hero-row' }, [
						h('button', { class: 'mk-play-cta' }, [h(PlayGlyph), 'Play']),
						h('button', { class: 'mk-stop-cta' }, [h(StopGlyph), 'Stop']),
						h('button', { class: 'mk-play-icon' }, [h(PlayGlyph)]),
						h('button', { class: 'mk-stop-icon' }, [h(StopGlyph)]),
						h('button', { class: 'mk-play-cta', 'aria-disabled': 'true' }, [
							h(PlayGlyph),
							'Disabled',
						]),
					]),
				]),
				h(
					'section',
					{ class: 'gallery' },
					SPECIAL_BUTTON_STYLE_IDS.map((style) =>
						h(
							'article',
							{
								class: ['card', active.value === style ? 'is-active' : ''],
								'data-special-preview': style,
								onClick: () => apply(style),
							},
							[
								h('span', { class: 'stage' }, [
									h('button', { class: 'mk-play-cta' }, [h(PlayGlyph), 'Play']),
									h('button', { class: 'mk-play-icon orb' }, [h(PlayGlyph)]),
								]),
								h('h3', style),
								h('p', NOTES[style] ?? ''),
							],
						),
					),
				),
				h(MinecraftLaunchOverlay),
			])
	},
})

// The overlay asks the app's intl composable for its strings, exactly like
// every other component, so the harness installs the same plugin.
const app = createApp(Preview)
app.use(i18nPlugin)
app.mount('#preview')
