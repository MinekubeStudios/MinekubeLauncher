<script setup lang="ts" generic="T extends string">
import { MoonIcon, RadioButtonCheckedIcon, RadioButtonIcon, SunIcon } from '@modrinth/assets'

import { defineMessages, useVIntl } from '#ui/composables/i18n'

const { formatMessage } = useVIntl()

const { ariaLabel, modelValue, themeOptions, systemThemeColor, preferredDarkTheme } = defineProps<{
	ariaLabel: string
	modelValue: T
	themeOptions: readonly T[]
	systemThemeColor: T
	preferredDarkTheme: T
}>()

const emit = defineEmits<{
	'update:modelValue': [theme: T]
}>()

const themeLabels = defineMessages({
	system: {
		id: 'settings.display.theme.system',
		defaultMessage: 'Sync with system',
	},
	parchment: {
		id: 'settings.display.theme.parchment',
		defaultMessage: 'Parchment',
	},
	ember: {
		id: 'settings.display.theme.ember',
		defaultMessage: 'Ember',
	},
	abyss: {
		id: 'settings.display.theme.abyss',
		defaultMessage: 'Abyss',
	},
	lagoon: {
		id: 'settings.display.theme.lagoon',
		defaultMessage: 'Lagoon',
	},
	bloom: {
		id: 'settings.display.theme.bloom',
		defaultMessage: 'Bloom',
	},
	nether: {
		id: 'settings.display.theme.nether',
		defaultMessage: 'Nether',
	},
	cinder: {
		id: 'settings.display.theme.cinder',
		defaultMessage: 'Cinder',
	},
	light: {
		id: 'settings.display.theme.light',
		defaultMessage: 'Light',
	},
	dark: {
		id: 'settings.display.theme.dark',
		defaultMessage: 'Dark',
	},
	windows: {
		id: 'settings.display.theme.windows',
		defaultMessage: 'Windows',
	},
	macos: {
		id: 'settings.display.theme.macos',
		defaultMessage: 'macOS',
	},
	linux: {
		id: 'settings.display.theme.linux',
		defaultMessage: 'Linux',
	},
	oled: {
		id: 'settings.display.theme.oled',
		defaultMessage: 'OLED',
	},
	retro: {
		id: 'settings.display.theme.retro',
		defaultMessage: 'Retro',
	},
})

const themeTooltips = defineMessages({
	preferredLight: {
		id: 'settings.display.theme.preferred-light-theme',
		defaultMessage: 'Preferred light theme',
	},
	preferredDark: {
		id: 'settings.display.theme.preferred-dark-theme',
		defaultMessage: 'Preferred dark theme',
	},
})

function formatTheme(theme: T): string {
	const message = themeLabels[theme as keyof typeof themeLabels]
	return message ? formatMessage(message) : theme
}

function getPreviewClass(option: T): string {
	const base = option === 'system' ? systemThemeColor : option
	return base.endsWith('-mode') ? base : `${base}-mode`
}
</script>

<template>
	<div class="theme-options" role="group" :aria-label="ariaLabel">
		<button
			v-for="option in themeOptions"
			:key="option"
			type="button"
			class="preview-radio button-base"
			:class="{ selected: modelValue === option }"
			:aria-pressed="modelValue === option"
			@click="emit('update:modelValue', option)"
		>
			<div class="preview" :class="getPreviewClass(option)" aria-hidden="true">
				<div class="palette">
					<span class="swatch brand"></span>
					<span class="swatch surface"></span>
					<span class="swatch contrast"></span>
				</div>
				<div class="example-card rounded-lg border border-solid border-surface-4 bg-surface-3">
					<div class="example-icon"></div>
					<div class="example-text-1"></div>
					<div class="example-text-2"></div>
				</div>
			</div>
			<div class="label">
				<RadioButtonCheckedIcon
					v-if="modelValue === option"
					class="radio shrink-0"
					aria-hidden="true"
				/>
				<RadioButtonIcon v-else class="radio shrink-0" aria-hidden="true" />
				{{ formatTheme(option) }}
				<SunIcon
					v-if="option === 'parchment' || option === 'light' || option === 'macos'"
					v-tooltip="formatMessage(themeTooltips.preferredLight)"
					class="theme-icon shrink-0"
					aria-hidden="true"
				/>
				<MoonIcon
					v-else-if="option === preferredDarkTheme"
					v-tooltip="formatMessage(themeTooltips.preferredDark)"
					class="theme-icon shrink-0"
					aria-hidden="true"
				/>
			</div>
		</button>
	</div>
</template>

<style scoped lang="scss">
.theme-options {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: var(--gap-lg);

	/* Three columns are narrower: a slightly tighter preview keeps the
	   miniature card in proportion. */
	.preview-radio .preview {
		padding: 1.1rem;
	}

	.preview-radio .label {
		min-width: 0;
	}

	.palette {
		display: flex;
		gap: 0.35rem;
		margin-bottom: 0.75rem;
	}

	.swatch {
		width: 0.95rem;
		height: 0.95rem;
		border-radius: var(--radius-max, 999px);
		border: 1px solid var(--color-divider);
	}

	.swatch.brand {
		background: var(--color-brand);
	}

	.swatch.surface {
		background: var(--surface-4);
	}

	.swatch.contrast {
		background: var(--color-contrast);
	}

	.preview {
		&.light-mode,
		&.parchment-mode {
			--color-bg: #f3e7d6;
			--surface-3: #fffaf3;
			--surface-4: #ffffff;
			--color-brand: #c45c18;
			--color-base: #4a382c;
			--color-secondary: #7a6558;
			--color-contrast: #2a1c12;
			--color-divider: #e4d3bc;
		}

		&.light-mode {
			--color-bg: #ebebeb;
			--surface-3: #f8f8f8;
			--surface-4: #ffffff;
			--color-brand: #e85800;
			--color-base: #2c2e31;
			--color-secondary: #484d54;
			--color-contrast: #1a202c;
			--color-divider: #dddddd;
		}

		&.dark-mode,
		&.ember-mode {
			--color-bg: #161014;
			--surface-3: #301e24;
			--surface-4: #432c34;
			--color-brand: #fcb400;
			--color-base: #ead4c8;
			--color-secondary: #c4a49a;
			--color-contrast: #fff6ee;
			--color-divider: #5a3c46;
		}

		&.dark-mode {
			--color-bg: #16181c;
			--surface-3: #27292e;
			--surface-4: #34363c;
			--color-brand: #fcb400;
			--color-base: #b0bac5;
			--color-secondary: #96a2b0;
			--color-contrast: #ffffff;
			--color-divider: #34363c;
		}

		&.windows-mode {
			--color-bg: #0c1729;
			--surface-3: #1d3959;
			--surface-4: #27496d;
			--color-brand: #69bdff;
			--color-base: #d0e2f6;
			--color-secondary: #a6c3df;
			--color-contrast: #f2f8ff;
			--color-divider: #365c7f;
		}

		&.macos-mode {
			--color-bg: #f4f1fa;
			--surface-3: #ffffff;
			--surface-4: #f7f2fd;
			--color-brand: #7151bb;
			--color-base: #463a57;
			--color-secondary: #6c607b;
			--color-contrast: #261d38;
			--color-divider: #dcd2ec;
		}

		&.linux-mode {
			--color-bg: #121b15;
			--surface-3: #304235;
			--surface-4: #3c5040;
			--color-brand: #a5d681;
			--color-base: #d7e4ce;
			--color-secondary: #b4c8a8;
			--color-contrast: #f2f6e8;
			--color-divider: #536750;
		}

		&.oled-mode {
			--color-bg: #000000;
			--surface-3: #101013;
			--surface-4: #1b1b20;
			--color-brand: #1bd96a;
			--color-base: #b0bac5;
			--color-secondary: #96a2b0;
			--color-contrast: #ffffff;
			--color-divider: #25262b;
		}

		&.abyss-mode {
			--color-bg: #000000;
			--surface-3: #141414;
			--surface-4: #1e1e1e;
			--color-brand: #ffd15a;
			--color-base: #ead4c8;
			--color-secondary: #c4a49a;
			--color-contrast: #fff6ee;
			--color-divider: #2e2e2e;
		}

		&.retro-mode {
			--color-bg: #191917;
			--surface-3: #232421;
			--surface-4: #3a3b38;
			--color-brand: #4d9227;
			--color-base: #c3c4b3;
			--color-secondary: #9b9e98;
			--color-contrast: #e6e2d1;
			--color-divider: #5a5c58;
			--radius-sm: 0.15rem;
			--radius-lg: 0.28rem;
		}

		&.cinder-mode {
			--color-bg: #161208;
			--surface-3: #342a14;
			--surface-4: #4a3c1c;
			--color-brand: #f0a202;
			--color-base: #ead8a4;
			--color-secondary: #b8a06a;
			--color-contrast: #fff6d8;
			--color-divider: #645228;
			--radius-sm: 0.15rem;
			--radius-lg: 0.28rem;
		}

		&.lagoon-mode {
			--color-bg: #071416;
			--surface-3: #16383c;
			--surface-4: #1e4c50;
			--color-brand: #3ddec8;
			--color-base: #c9eee8;
			--color-secondary: #8ec4bc;
			--color-contrast: #f3fffc;
			--color-divider: #2e686c;
		}

		&.bloom-mode {
			--color-bg: #140f1c;
			--surface-3: #2e2240;
			--surface-4: #403058;
			--color-brand: #e07cff;
			--color-base: #e6d4f2;
			--color-secondary: #b89ac8;
			--color-contrast: #fbf4ff;
			--color-divider: #584274;
		}

		&.nether-mode {
			--color-bg: #140608;
			--surface-3: #3a161c;
			--surface-4: #542028;
			--color-brand: #ff4d6d;
			--color-base: #f0c8ce;
			--color-secondary: #c898a0;
			--color-contrast: #fff0f2;
			--color-divider: #70343c;
		}
	}

	.preview .example-card {
		margin: 0;
		padding: 1rem;
		display: grid;
		grid-template: 'icon text1' 'icon text2';
		grid-template-columns: auto 1fr;
		gap: 0.5rem;
		outline: 2px solid transparent;

		.example-icon {
			grid-area: icon;
			width: 2rem;
			height: 2rem;
			background-color: var(--color-brand);
			border-radius: var(--radius-sm);
			outline: 2px solid transparent;
		}

		.example-text-1,
		.example-text-2 {
			height: 0.5rem;
			border-radius: var(--radius-sm);
			outline: 2px solid transparent;
		}

		.example-text-1 {
			grid-area: text1;
			width: 100%;
			background-color: var(--color-base);
		}

		.example-text-2 {
			grid-area: text2;
			width: 60%;
			background-color: var(--color-secondary);
		}
	}
}
</style>
