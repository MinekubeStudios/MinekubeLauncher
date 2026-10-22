import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'

import type { LauncherBackgroundOption } from '../launcher-background'
import AppearanceSettingsLauncherBackgroundSelector from './appearance-settings-launcher-background-selector.vue'

function gradientPreview(from: string, to: string): string {
	const svg =
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100">` +
		`<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
		`<stop offset="0" stop-color="${encodeURIComponent(from)}"/>` +
		`<stop offset="1" stop-color="${encodeURIComponent(to)}"/>` +
		`</linearGradient></defs>` +
		`<rect width="160" height="100" fill="url(#g)"/></svg>`
	return `data:image/svg+xml;utf8,${svg}`
}

const options: LauncherBackgroundOption[] = [
	{
		id: 'custom:dune',
		label: 'my-holiday-photo.jpg',
		previewUrl: gradientPreview('#3d2a12', '#e6b46a'),
		custom: true,
	},
	{
		id: 'custom:forest',
		label: 'forest.png',
		previewUrl: gradientPreview('#102521', '#71a878'),
		custom: true,
	},
]

const meta = {
	title: 'Settings/LauncherBackgroundSelector',
	// @ts-ignore - error comes from generically typed component
	component: AppearanceSettingsLauncherBackgroundSelector,
} satisfies Meta<typeof AppearanceSettingsLauncherBackgroundSelector>

export default meta

export const Interactive: StoryObj = {
	render: () => ({
		components: { AppearanceSettingsLauncherBackgroundSelector },
		setup() {
			const selected = ref('custom:dune')
			const mode = ref('blur')
			const importing = ref(false)
			return { selected, mode, importing, options }
		},
		template: `
			<AppearanceSettingsLauncherBackgroundSelector
				v-model="selected"
				v-model:mode="mode"
				:options="options"
				:importing="importing"
				@import="importing = !importing"
			/>
		`,
	}),
}

export const DefaultBackground: StoryObj = {
	render: () => ({
		components: { AppearanceSettingsLauncherBackgroundSelector },
		setup() {
			const selected = ref('none')
			const mode = ref('sharp')
			return { selected, mode, options }
		},
		template: `
			<AppearanceSettingsLauncherBackgroundSelector v-model="selected" v-model:mode="mode" :options="options" />
		`,
	}),
}
