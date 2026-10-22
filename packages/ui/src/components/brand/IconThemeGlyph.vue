<script setup lang="ts">
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	CompassIcon,
	ImageIcon,
	PlayIcon,
	PlusIcon,
	RefreshCwIcon,
	RightArrowIcon,
	SettingsIcon,
	ShirtIcon,
} from '@modrinth/assets'
import type { Component } from 'vue'
import { computed } from 'vue'

import {
	iconThemeArt,
	iconThemeEmoji,
	type IconThemeId,
	iconThemeSvgAttrs,
	iconThemeTint,
} from './icon-theme-art'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
	name: string
	theme: IconThemeId
}>()

const outlineIcons: Record<string, Component> = {
	play: PlayIcon,
	shirt: ShirtIcon,
	compass: CompassIcon,
	image: ImageIcon,
	plus: PlusIcon,
	settings: SettingsIcon,
	'chevron-left': ChevronLeftIcon,
	'chevron-right': ChevronRightIcon,
	'arrow-right': RightArrowIcon,
	refresh: RefreshCwIcon,
}

const outlineIcon = computed(() => outlineIcons[props.name] ?? null)
const emoji = computed(() =>
	props.theme === 'emoji' ? (iconThemeEmoji[props.name] ?? null) : null,
)
const nodes = computed(() => {
	if (props.theme === 'outline' || props.theme === 'emoji') return null
	return iconThemeArt[props.theme]?.[props.name] ?? null
})
const svgAttrs = computed(() =>
	props.theme === 'outline' || props.theme === 'emoji' ? {} : iconThemeSvgAttrs[props.theme],
)
const tintStyle = computed(() => {
	const tint = iconThemeTint[props.theme]?.[props.name]
	return tint ? { color: tint } : undefined
})
</script>

<template>
	<span
		v-if="emoji"
		class="themed-icon themed-icon-emoji"
		:class="`themed-icon-${theme}`"
		aria-hidden="true"
		v-bind="$attrs"
		>{{ emoji }}</span
	>
	<component :is="outlineIcon" v-else-if="theme === 'outline' && outlineIcon" v-bind="$attrs" />
	<svg
		v-else-if="nodes"
		class="themed-icon"
		:class="[`themed-icon-${theme}`, { 'themed-icon-neon': theme === 'neon' }]"
		viewBox="0 0 24 24"
		:style="tintStyle"
		v-bind="{ ...svgAttrs, ...$attrs }"
		aria-hidden="true"
	>
		<component :is="node.tag" v-for="(node, index) in nodes" :key="index" v-bind="node.attrs" />
	</svg>
	<component :is="outlineIcon" v-else-if="outlineIcon" v-bind="$attrs" />
</template>
