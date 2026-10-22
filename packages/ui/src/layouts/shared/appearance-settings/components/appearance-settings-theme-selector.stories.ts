import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'

import AppearanceSettingsThemeSelector from './appearance-settings-theme-selector.vue'

const meta = {
	title: 'Settings/ThemeSelector',
	// @ts-ignore - error comes from generically typed component
	component: AppearanceSettingsThemeSelector,
} satisfies Meta<typeof AppearanceSettingsThemeSelector>

export default meta

export const Interactive: StoryObj = {
	render: () => ({
		components: { AppearanceSettingsThemeSelector },
		setup() {
			const currentTheme = ref('ember')
			const themeOptions = [
				'system',
				'light',
				'dark',
				'oled',
				'retro',
				'parchment',
				'ember',
				'abyss',
				'lagoon',
				'bloom',
				'nether',
				'cinder',
			]
			return { currentTheme, themeOptions }
		},
		template: `
			<AppearanceSettingsThemeSelector
				aria-label="Color theme"
				v-model="currentTheme"
				:theme-options="themeOptions"
				system-theme-color="ember"
				preferred-dark-theme="abyss"
			/>
		`,
	}),
}
