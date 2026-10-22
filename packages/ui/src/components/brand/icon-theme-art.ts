export const ICON_THEME_IDS = [
	'outline',
	'colorful',
	'emoji',
	'minecraft',
	'neon',
	'candy',
	'arcade',
	'pixel',
] as const

export type IconThemeId = (typeof ICON_THEME_IDS)[number]

export type IconNode = {
	tag: 'path' | 'circle' | 'rect' | 'ellipse' | 'line' | 'polyline'
	attrs: Record<string, string | number>
}

export type IconArtTheme = Exclude<IconThemeId, 'outline' | 'emoji'>

export const iconThemeSvgAttrs: Record<IconArtTheme, Record<string, string>> = {
	colorful: { fill: 'currentColor', stroke: 'none' },
	minecraft: { fill: 'currentColor', stroke: 'none', 'shape-rendering': 'crispEdges' },
	neon: {
		fill: 'none',
		stroke: 'currentColor',
		'stroke-width': '1.7',
		'stroke-linecap': 'round',
		'stroke-linejoin': 'round',
	},
	candy: { fill: 'currentColor', stroke: 'none' },
	arcade: { fill: 'currentColor', stroke: 'none' },
	pixel: { fill: 'currentColor', stroke: 'none', 'shape-rendering': 'crispEdges' },
}

export const iconThemeEmoji: Record<string, string> = {
	play: '🎮',
	plus: '➕',
	settings: '⚙️',
	compass: '🧭',
	shirt: '👕',
	image: '🖼️',
	'chevron-left': '◀️',
	'chevron-right': '▶️',
	'arrow-right': '➡️',
	refresh: '🔄',
}

export const iconThemeTint: Partial<Record<IconThemeId, Record<string, string>>> = {
	neon: {
		play: '#ff2d95',
		plus: '#76ff03',
		settings: '#ff9100',
		compass: '#00e5ff',
		shirt: '#e040fb',
		image: '#ffea00',
		'chevron-left': '#40c4ff',
		'chevron-right': '#40c4ff',
		'arrow-right': '#1de9b6',
		refresh: '#b388ff',
	},
}

function pixelArt(rows: string[], palette: Record<string, string>): IconNode[] {
	const size = 2
	const nodes: IconNode[] = []
	for (let y = 0; y < rows.length; y++) {
		const row = rows[y]
		let x = 0
		while (x < row.length) {
			const fill = palette[row[x]]
			if (!fill) {
				x++
				continue
			}
			let run = 1
			while (x + run < row.length && palette[row[x + run]] === fill) run++
			nodes.push({
				tag: 'rect',
				attrs: { x: x * size, y: y * size, width: run * size, height: size, fill },
			})
			x += run
		}
	}
	return nodes
}

const colorful: Record<string, IconNode[]> = {
	play: [
		{ tag: 'circle', attrs: { cx: 12, cy: 12, r: 10, fill: '#ff8a3d' } },
		{ tag: 'path', attrs: { d: 'M10.2 7.6 17 12l-6.8 4.4z', fill: '#fff7e6' } },
	],
	compass: [
		{ tag: 'circle', attrs: { cx: 12, cy: 12, r: 10, fill: '#38bdf8' } },
		{ tag: 'path', attrs: { d: 'M12 6.2 14.9 12 12 17.8z', fill: '#ff5c7a' } },
		{ tag: 'path', attrs: { d: 'M12 6.2 9.1 12 12 17.8z', fill: '#fff7e6' } },
	],
	plus: [
		{ tag: 'circle', attrs: { cx: 12, cy: 12, r: 10, fill: '#2ee6a8' } },
		{
			tag: 'path',
			attrs: { d: 'M11 7h2v4h4v2h-4v4h-2v-4H7v-2h4z', fill: '#fff7e6' },
		},
		{
			tag: 'path',
			attrs: {
				d: 'M18.2 2.8l.6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6z',
				fill: '#ffc93c',
			},
		},
	],
	settings: [
		{
			tag: 'path',
			attrs: {
				'fill-rule': 'evenodd',
				d: 'M10.1 2.6h3.8l.6 2.1 1.9.8 1.9-1.2 2.7 2.7-1.2 1.9.8 1.9 2.1.6v3.8l-2.1.6-.8 1.9 1.2 1.9-2.7 2.7-1.9-1.2-1.9.8-.6 2.1h-3.8l-.6-2.1-1.9-.8-1.9 1.2-2.7-2.7 1.2-1.9-.8-1.9-2.1-.6v-3.8l2.1-.6.8-1.9-1.2-1.9 2.7-2.7 1.9 1.2 1.9-.8z',
				fill: '#a78bfa',
			},
		},
		{ tag: 'circle', attrs: { cx: 12, cy: 12, r: 3.4, fill: '#ff5c7a' } },
		{ tag: 'circle', attrs: { cx: 12, cy: 12, r: 1.4, fill: '#fff7e6' } },
	],
	shirt: [
		{
			tag: 'path',
			attrs: {
				d: 'M8.2 7.2 9.6 4.8h4.8l1.4 2.4 4.2 1.6-1.6 3.2-2.2-.8V20H7.8V11.2l-2.2.8-1.6-3.2z',
				fill: '#38bdf8',
			},
		},
		{ tag: 'path', attrs: { d: 'M9.6 4.8h4.8L12 8z', fill: '#ffc93c' } },
		{ tag: 'circle', attrs: { cx: 12, cy: 12.4, r: 0.7, fill: '#b6f24d' } },
		{ tag: 'circle', attrs: { cx: 12, cy: 15.4, r: 0.7, fill: '#b6f24d' } },
	],
	image: [
		{ tag: 'rect', attrs: { x: 3, y: 5, width: 18, height: 14, rx: 2.5, fill: '#ffc93c' } },
		{ tag: 'rect', attrs: { x: 4.8, y: 6.8, width: 14.4, height: 10.4, rx: 1.2, fill: '#38bdf8' } },
		{ tag: 'circle', attrs: { cx: 9, cy: 10, r: 1.7, fill: '#ff8a3d' } },
		{
			tag: 'path',
			attrs: { d: 'M4.8 17.2 9.2 12.4l2.6 2.8 3-3.4 4.4 5.4z', fill: '#2ee6a8' },
		},
	],
	'chevron-left': [
		{
			tag: 'path',
			attrs: { d: 'M14.6 4.2 5.4 12l9.2 7.8 2.4-2.8-6.6-5 6.6-5z', fill: '#ff7ad9' },
		},
	],
	'chevron-right': [
		{
			tag: 'path',
			attrs: { d: 'M9.4 4.2 18.6 12l-9.2 7.8-2.4-2.8 6.6-5-6.6-5z', fill: '#ff7ad9' },
		},
	],
	'arrow-right': [
		{
			tag: 'path',
			attrs: { d: 'M3.5 9.6h9.2V5.4L20.6 12l-7.9 5.4v-4.2H3.5z', fill: '#38bdf8' },
		},
		{
			tag: 'path',
			attrs: {
				d: 'M20.4 2.6l.6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6z',
				fill: '#ffc93c',
			},
		},
	],
	refresh: [
		{
			tag: 'path',
			attrs: {
				d: 'M19.3 12a7.3 7.3 0 1 1-2.4-5.4',
				fill: 'none',
				stroke: '#a78bfa',
				'stroke-width': 2.6,
				'stroke-linecap': 'round',
			},
		},
		{
			tag: 'path',
			attrs: {
				d: 'M17.4 3.2v4.2h-4.2',
				fill: 'none',
				stroke: '#ffc93c',
				'stroke-width': 2.6,
				'stroke-linecap': 'round',
				'stroke-linejoin': 'round',
			},
		},
		{
			tag: 'path',
			attrs: {
				d: 'M6.2 4.2l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5z',
				fill: '#2ee6a8',
			},
		},
	],
}

const minecraftPalette = {
	G: '#5db93f',
	g: '#8ce05f',
	D: '#9b6b43',
	L: '#c8a165',
	O: '#ffd23f',
	R: '#f4322a',
	B: '#3b6fd4',
	b: '#6f9df5',
	A: '#b266ff',
	W: '#f3f3f3',
	S: '#8b8b8b',
	K: '#2b2b2b',
}

const minecraft: Record<string, IconNode[]> = {
	play: pixelArt(
		[
			'............',
			'.gG.........',
			'.gGG........',
			'.gGGG.......',
			'.gGGGG......',
			'.gGGGGG.....',
			'.gGGGGG.....',
			'.gGGGG......',
			'.gGGG.......',
			'.gGG........',
			'.gG.........',
			'............',
		],
		minecraftPalette,
	),
	compass: pixelArt(
		[
			'....bbbb....',
			'..bbBBBBbb..',
			'.bBWWWWWWBb.',
			'.bBWWRRWWBb.',
			'.bBWRRRRWBb.',
			'.bBWSSSSWBb.',
			'.bBWWSSWWBb.',
			'.bBWWWWWWBb.',
			'.bBWWWWWWBb.',
			'..BBbbbbBB..',
			'....BBBB....',
			'............',
		],
		minecraftPalette,
	),
	plus: pixelArt(
		[
			'............',
			'.....RR.....',
			'.....RR.....',
			'.....RR.....',
			'.....RR.....',
			'..rrRRRRRR..',
			'..RRRRRRRR..',
			'.....RR.....',
			'.....RR.....',
			'.....RR.....',
			'.....RR.....',
			'............',
		],
		{ ...minecraftPalette, r: '#ff7b6b' },
	),
	settings: pixelArt(
		[
			'....OOOO....',
			'....OOOO....',
			'..ooOOOOoo..',
			'..OOOOOOOO..',
			'OOOO....OOOO',
			'OOOO.KK.OOOO',
			'OOOO.KK.OOOO',
			'OOOO....OOOO',
			'..OOOOOOOO..',
			'..ooOOOOoo..',
			'....OOOO....',
			'....OOOO....',
		],
		{ ...minecraftPalette, o: '#ffea80' },
	),
	shirt: pixelArt(
		[
			'...LL..LL...',
			'..LLLLLLLL..',
			'LLllLLLLllLL',
			'LLllLLLLllLL',
			'..LLLLLLLL..',
			'..LLLOOLLL..',
			'..LLLLLLLL..',
			'..LLLOOLLL..',
			'..LLLLLLLL..',
			'..LLLLLLLL..',
			'..DDDDDDDD..',
			'............',
		],
		{ ...minecraftPalette, l: '#e0b87e' },
	),
	image: pixelArt(
		[
			'OOOOOOOOOOOO',
			'OWWWWWWWWWWO',
			'OWWWOOBBBBWO',
			'OWWWOOBBBBWO',
			'OWWWWWWWWWWO',
			'OWGGGGGGGWWO',
			'OWGGGGGGGGWO',
			'OWGGGGGGGGWO',
			'OWGGGGGGGGWO',
			'OWWWWWWWWWWO',
			'OWWWWWWWWWWO',
			'OOOOOOOOOOOO',
		],
		minecraftPalette,
	),
	'chevron-left': pixelArt(
		[
			'......BB....',
			'.....BB.....',
			'....BB......',
			'...BB.......',
			'..BB........',
			'.BB.........',
			'.BB.........',
			'..BB........',
			'...BB.......',
			'....BB......',
			'.....BB.....',
			'......BB....',
		],
		minecraftPalette,
	),
	'chevron-right': pixelArt(
		[
			'....BB......',
			'.....BB.....',
			'......BB....',
			'.......BB...',
			'........BB..',
			'.........BB.',
			'.........BB.',
			'........BB..',
			'.......BB...',
			'......BB....',
			'.....BB.....',
			'....BB......',
		],
		minecraftPalette,
	),
	'arrow-right': pixelArt(
		[
			'............',
			'......OO....',
			'.......OO...',
			'........OO..',
			'OOOOOOOOOOO.',
			'OOOOOOOOOOOO',
			'OOOOOOOOOOOO',
			'OOOOOOOOOOO.',
			'........OO..',
			'.......OO...',
			'......OO....',
			'............',
		],
		minecraftPalette,
	),
	refresh: pixelArt(
		[
			'...AAAAA....',
			'..A.....AA..',
			'.A.......AA.',
			'.A.......AAA',
			'A.........A.',
			'A..........A',
			'A..........A',
			'.A.........A',
			'.AAA.......A',
			'.AA.......A.',
			'..AA.....A..',
			'...AAAAA....',
		],
		minecraftPalette,
	),
}

const neon: Record<string, IconNode[]> = {
	play: [
		{ tag: 'path', attrs: { d: 'M8.5 5.5 18 12l-9.5 6.5z' } },
		{ tag: 'path', attrs: { d: 'M10.9 8.7 14.8 12l-3.9 3.3z' } },
	],
	compass: [
		{ tag: 'circle', attrs: { cx: 12, cy: 12, r: 8.2 } },
		{ tag: 'path', attrs: { d: 'M12 6.8 14.8 12 12 17.2 9.2 12z' } },
		{ tag: 'circle', attrs: { cx: 12, cy: 12, r: 0.9, fill: 'currentColor', stroke: 'none' } },
	],
	plus: [
		{ tag: 'line', attrs: { x1: 12, y1: 5, x2: 12, y2: 19 } },
		{ tag: 'line', attrs: { x1: 5, y1: 12, x2: 19, y2: 12 } },
	],
	settings: [
		{ tag: 'path', attrs: { d: 'M12 3.5 19 7.5v9L12 20.5 5 16.5v-9z' } },
		{ tag: 'circle', attrs: { cx: 12, cy: 12, r: 2.6 } },
	],
	shirt: [
		{
			tag: 'path',
			attrs: { d: 'M8.2 7.4 10 5h4l1.8 2.4 3.6 1.3-1.3 2.6-2.1-.6V19H8v-8.3l-2.1.6-1.3-2.6z' },
		},
	],
	image: [
		{ tag: 'rect', attrs: { x: 4.2, y: 5.4, width: 15.6, height: 13.2, rx: 1.4 } },
		{ tag: 'path', attrs: { d: 'M6.8 15.4 10 11.8l2.2 1.8 3.2-3.6 1.8 5.4' } },
		{
			tag: 'circle',
			attrs: { cx: 9.1, cy: 9.4, r: 1, fill: 'currentColor', stroke: 'none' },
		},
	],
	'chevron-left': [{ tag: 'path', attrs: { d: 'M14.8 5.2 8 12l6.8 6.8' } }],
	'chevron-right': [{ tag: 'path', attrs: { d: 'M9.2 5.2 16 12l-6.8 6.8' } }],
	'arrow-right': [
		{ tag: 'path', attrs: { d: 'M4 12h13' } },
		{ tag: 'path', attrs: { d: 'M13 7 18 12l-5 5' } },
	],
	refresh: [
		{ tag: 'path', attrs: { d: 'M18.6 12.2A6.8 6.8 0 1 1 16.4 7' } },
		{ tag: 'path', attrs: { d: 'M16.2 3.8v3.6h-3.6' } },
	],
}

const candy: Record<string, IconNode[]> = {
	play: [
		{
			tag: 'path',
			attrs: {
				d: 'M10.2 7.5a1.5 1.5 0 0 1 2.3-1.3l6.7 4.5a1.5 1.5 0 0 1 0 2.6l-6.7 4.5a1.5 1.5 0 0 1-2.3-1.3z',
				fill: '#ff5fa2',
			},
		},
		{
			tag: 'ellipse',
			attrs: {
				cx: 13.4,
				cy: 9.4,
				rx: 2.4,
				ry: 1,
				transform: 'rotate(-30 13.4 9.4)',
				fill: '#ffffff',
				opacity: 0.45,
			},
		},
	],
	compass: [
		{ tag: 'circle', attrs: { cx: 12, cy: 12, r: 10, fill: '#5b8cff' } },
		{ tag: 'path', attrs: { d: 'M12 6.8 14.8 12 12 17.2z', fill: '#ff5fa2' } },
		{ tag: 'path', attrs: { d: 'M12 6.8 9.2 12 12 17.2z', fill: '#fff7e6' } },
		{
			tag: 'ellipse',
			attrs: {
				cx: 8.6,
				cy: 7.4,
				rx: 2.6,
				ry: 1.1,
				transform: 'rotate(-30 8.6 7.4)',
				fill: '#ffffff',
				opacity: 0.4,
			},
		},
	],
	plus: [
		{
			tag: 'path',
			attrs: {
				d: 'M10.2 3.5h3.6c.7 0 1.2.5 1.2 1.2v4.3h4.3c.7 0 1.2.5 1.2 1.2v3.6c0 .7-.5 1.2-1.2 1.2h-4.3v4.3c0 .7-.5 1.2-1.2 1.2h-3.6c-.7 0-1.2-.5-1.2-1.2v-4.3H4.7c-.7 0-1.2-.5-1.2-1.2v-3.6c0-.7.5-1.2 1.2-1.2h4.3V4.7c0-.7.5-1.2 1.2-1.2z',
				fill: '#2be0b0',
			},
		},
		{
			tag: 'ellipse',
			attrs: {
				cx: 10.2,
				cy: 6.8,
				rx: 1.6,
				ry: 0.7,
				transform: 'rotate(-30 10.2 6.8)',
				fill: '#ffffff',
				opacity: 0.45,
			},
		},
	],
	settings: [
		{
			tag: 'path',
			attrs: {
				'fill-rule': 'evenodd',
				d: 'M10.1 2.6h3.8l.6 2.1 1.9.8 1.9-1.2 2.7 2.7-1.2 1.9.8 1.9 2.1.6v3.8l-2.1.6-.8 1.9 1.2 1.9-2.7 2.7-1.9-1.2-1.9.8-.6 2.1h-3.8l-.6-2.1-1.9-.8-1.9 1.2-2.7-2.7 1.2-1.9-.8-1.9-2.1-.6v-3.8l2.1-.6.8-1.9-1.2-1.9 2.7-2.7 1.9 1.2 1.9-.8z',
				fill: '#b06bff',
			},
		},
		{ tag: 'circle', attrs: { cx: 12, cy: 12, r: 3.1, fill: '#ffd43b' } },
		{
			tag: 'ellipse',
			attrs: {
				cx: 9,
				cy: 6.8,
				rx: 1.8,
				ry: 0.8,
				transform: 'rotate(-30 9 6.8)',
				fill: '#ffffff',
				opacity: 0.4,
			},
		},
	],
	shirt: [
		{
			tag: 'path',
			attrs: {
				d: 'M8.2 7.2 9.6 4.8h4.8l1.4 2.4 4.2 1.6-1.6 3.2-2.2-.8V20H7.8V11.2l-2.2.8-1.6-3.2z',
				fill: '#5b8cff',
			},
		},
		{ tag: 'path', attrs: { d: 'M9.6 4.8h4.8L12 8z', fill: '#ffd43b' } },
		{
			tag: 'ellipse',
			attrs: {
				cx: 9.4,
				cy: 9.8,
				rx: 1.5,
				ry: 0.7,
				transform: 'rotate(-30 9.4 9.8)',
				fill: '#ffffff',
				opacity: 0.4,
			},
		},
	],
	image: [
		{ tag: 'rect', attrs: { x: 3, y: 5, width: 18, height: 14, rx: 3, fill: '#ffd43b' } },
		{ tag: 'rect', attrs: { x: 4.8, y: 6.8, width: 14.4, height: 10.4, rx: 1.8, fill: '#5b8cff' } },
		{ tag: 'circle', attrs: { cx: 9, cy: 10, r: 1.7, fill: '#ff922b' } },
		{
			tag: 'path',
			attrs: { d: 'M4.8 17.2 9.2 12.4l2.6 2.8 3-3.4 4.4 5.4z', fill: '#2be0b0' },
		},
		{
			tag: 'ellipse',
			attrs: {
				cx: 6.4,
				cy: 6.2,
				rx: 1.6,
				ry: 0.7,
				transform: 'rotate(-30 6.4 6.2)',
				fill: '#ffffff',
				opacity: 0.5,
			},
		},
	],
	'chevron-left': [
		{
			tag: 'path',
			attrs: {
				d: 'M14 5.5 8.5 12l5.5 6.5',
				fill: 'none',
				stroke: '#ff5fa2',
				'stroke-width': 3.6,
				'stroke-linecap': 'round',
				'stroke-linejoin': 'round',
			},
		},
	],
	'chevron-right': [
		{
			tag: 'path',
			attrs: {
				d: 'M10 5.5 15.5 12 10 18.5',
				fill: 'none',
				stroke: '#ff5fa2',
				'stroke-width': 3.6,
				'stroke-linecap': 'round',
				'stroke-linejoin': 'round',
			},
		},
	],
	'arrow-right': [
		{
			tag: 'path',
			attrs: {
				d: 'M4.5 12h12',
				fill: 'none',
				stroke: '#2be0b0',
				'stroke-width': 3.6,
				'stroke-linecap': 'round',
			},
		},
		{
			tag: 'path',
			attrs: {
				d: 'M12.5 7.5 17.5 12l-5 4.5',
				fill: 'none',
				stroke: '#2be0b0',
				'stroke-width': 3.6,
				'stroke-linecap': 'round',
				'stroke-linejoin': 'round',
			},
		},
	],
	refresh: [
		{
			tag: 'path',
			attrs: {
				d: 'M18.8 12.4A6.9 6.9 0 1 1 16.6 7.2',
				fill: 'none',
				stroke: '#b06bff',
				'stroke-width': 3.2,
				'stroke-linecap': 'round',
			},
		},
		{
			tag: 'path',
			attrs: {
				d: 'M16.6 3.4v4h-4',
				fill: 'none',
				stroke: '#b06bff',
				'stroke-width': 3.2,
				'stroke-linecap': 'round',
				'stroke-linejoin': 'round',
			},
		},
	],
}

const arcade: Record<string, IconNode[]> = {
	play: [
		{ tag: 'path', attrs: { d: 'M8.5 5.5 18.3 12 8.5 18.5z', fill: '#ffd23f' } },
		{
			tag: 'path',
			attrs: { d: 'M8.5 5.5 18.3 12H8.5z', fill: '#fff3c2', opacity: 0.55 },
		},
	],
	compass: [
		{
			tag: 'path',
			attrs: {
				d: 'M12 3l4 2 3 4v6l-3 4-4 2-4-2-3-4V9l3-4z',
				fill: '#2f6fe4',
			},
		},
		{ tag: 'path', attrs: { d: 'M12 6.2 15.6 12 12 17.8z', fill: '#ff4d6d' } },
		{ tag: 'path', attrs: { d: 'M12 6.2 8.4 12 12 17.8z', fill: '#fff7e6' } },
		{
			tag: 'path',
			attrs: {
				d: 'M12 3l4 2 3 4v3H5V9l3-4z',
				fill: '#7eb0ff',
				opacity: 0.5,
			},
		},
	],
	plus: [
		{ tag: 'path', attrs: { d: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z', fill: '#3ee08a' } },
		{
			tag: 'path',
			attrs: { d: 'M9 3h6v6h6v3H3V9h6z', fill: '#b8ffd8', opacity: 0.55 },
		},
	],
	settings: [
		{ tag: 'circle', attrs: { cx: 12, cy: 12, r: 6.6, fill: '#b06bff' } },
		{
			tag: 'rect',
			attrs: { x: 10, y: 1.8, width: 4, height: 5, fill: '#b06bff', transform: 'rotate(0 12 12)' },
		},
		{
			tag: 'rect',
			attrs: { x: 10, y: 1.8, width: 4, height: 5, fill: '#b06bff', transform: 'rotate(45 12 12)' },
		},
		{
			tag: 'rect',
			attrs: { x: 10, y: 1.8, width: 4, height: 5, fill: '#b06bff', transform: 'rotate(90 12 12)' },
		},
		{
			tag: 'rect',
			attrs: {
				x: 10,
				y: 1.8,
				width: 4,
				height: 5,
				fill: '#b06bff',
				transform: 'rotate(135 12 12)',
			},
		},
		{
			tag: 'rect',
			attrs: {
				x: 10,
				y: 1.8,
				width: 4,
				height: 5,
				fill: '#b06bff',
				transform: 'rotate(180 12 12)',
			},
		},
		{
			tag: 'rect',
			attrs: {
				x: 10,
				y: 1.8,
				width: 4,
				height: 5,
				fill: '#b06bff',
				transform: 'rotate(225 12 12)',
			},
		},
		{
			tag: 'rect',
			attrs: {
				x: 10,
				y: 1.8,
				width: 4,
				height: 5,
				fill: '#b06bff',
				transform: 'rotate(270 12 12)',
			},
		},
		{
			tag: 'rect',
			attrs: {
				x: 10,
				y: 1.8,
				width: 4,
				height: 5,
				fill: '#b06bff',
				transform: 'rotate(315 12 12)',
			},
		},
		{ tag: 'circle', attrs: { cx: 12, cy: 12, r: 2.8, fill: '#ffdf3f' } },
		{
			tag: 'circle',
			attrs: { cx: 10.2, cy: 10, r: 2.4, fill: '#ffffff', opacity: 0.28 },
		},
	],
	shirt: [
		{
			tag: 'path',
			attrs: {
				d: 'M8.2 7.2 9.6 4.8h4.8l1.4 2.4 4.2 1.6-1.6 3.2-2.2-.8V20H7.8V11.2l-2.2.8-1.6-3.2z',
				fill: '#ff8a3d',
			},
		},
		{
			tag: 'path',
			attrs: { d: 'M8.2 7.2 9.6 4.8h4.8l-2.4 3.2z', fill: '#ffd23f' },
		},
		{
			tag: 'path',
			attrs: { d: 'M8.2 7.2 4 8.8 5.6 12l2.2-.8V11.2z', fill: '#ffc59e', opacity: 0.6 },
		},
	],
	image: [
		{ tag: 'rect', attrs: { x: 3, y: 5, width: 18, height: 14, fill: '#ffd23f' } },
		{ tag: 'rect', attrs: { x: 5, y: 7, width: 14, height: 10, fill: '#3b8cff' } },
		{ tag: 'circle', attrs: { cx: 9, cy: 10, r: 1.6, fill: '#ffdf3f' } },
		{
			tag: 'path',
			attrs: { d: 'M5 17 9.4 12.2l2.6 2.8 3-3.4 4 5.4z', fill: '#3ee08a' },
		},
		{
			tag: 'path',
			attrs: { d: 'M3 5h18v3H3z', fill: '#fff3c2', opacity: 0.5 },
		},
	],
	'chevron-left': [{ tag: 'path', attrs: { d: 'M15 4 6 12l9 8h-4L2 12 11 4z', fill: '#ffd23f' } }],
	'chevron-right': [{ tag: 'path', attrs: { d: 'M9 4l9 8-9 8H5l9-8-9-8z', fill: '#ffd23f' } }],
	'arrow-right': [
		{ tag: 'path', attrs: { d: 'M3 10h11V6l7 6-7 6v-4H3z', fill: '#3ee08a' } },
		{
			tag: 'path',
			attrs: { d: 'M3 10h11V6l3.5 3.5-2.5 2.5H3z', fill: '#b8ffd8', opacity: 0.5 },
		},
	],
	refresh: [
		{
			tag: 'path',
			attrs: {
				d: 'M19.3 12a7.3 7.3 0 1 1-2.4-5.4',
				fill: 'none',
				stroke: '#b06bff',
				'stroke-width': 3,
				'stroke-linecap': 'butt',
			},
		},
		{
			tag: 'path',
			attrs: {
				d: 'M17.4 3.2v4.2h-4.2',
				fill: 'none',
				stroke: '#ffdf3f',
				'stroke-width': 3,
				'stroke-linecap': 'butt',
				'stroke-linejoin': 'miter',
			},
		},
	],
}

const pixelPalette = {
	K: '#211820',
	W: '#f8f8f8',
	R: '#e83030',
	O: '#f89030',
	Y: '#f8d878',
	G: '#30c020',
	C: '#48d8f8',
	B: '#6848f8',
	P: '#f878f8',
	S: '#9098a8',
}

const pixel: Record<string, IconNode[]> = {
	play: pixelArt(
		[
			'............',
			'.PP.........',
			'.PPP........',
			'.PPPP.......',
			'.PPPPP......',
			'.PPPPPP.....',
			'.PPPPPP.....',
			'.PPPPP......',
			'.PPPP.......',
			'.PPP........',
			'.PP.........',
			'............',
		],
		pixelPalette,
	),
	compass: pixelArt(
		[
			'....SSSS....',
			'..SSWWWWSS..',
			'.SWWWWWWWWS.',
			'.SWWWWRRWWS.',
			'.SWWRRRRWWS.',
			'.SWWKKKKWWS.',
			'.SWWWKKWWWS.',
			'.SWWWWWWWWS.',
			'.SWWWWWWWWS.',
			'..SSWWWWSS..',
			'....SSSS....',
			'............',
		],
		pixelPalette,
	),
	plus: pixelArt(
		[
			'............',
			'.....GG.....',
			'.....GG.....',
			'.....GG.....',
			'.....GG.....',
			'..GGGGGGGG..',
			'..GGGGGGGG..',
			'.....GG.....',
			'.....GG.....',
			'.....GG.....',
			'.....GG.....',
			'............',
		],
		pixelPalette,
	),
	settings: pixelArt(
		[
			'....YYYY....',
			'....YYYY....',
			'..OOYYYYOO..',
			'..YYYYYYYY..',
			'YYYY....YYYY',
			'YYYY.RR.YYYY',
			'YYYY.RR.YYYY',
			'YYYY....YYYY',
			'..YYYYYYYY..',
			'..OOYYYYOO..',
			'....YYYY....',
			'....YYYY....',
		],
		pixelPalette,
	),
	shirt: pixelArt(
		[
			'...CC..CC...',
			'..CCCCCCCC..',
			'CCBBCCCCBBCC',
			'CCBBCCCCBBCC',
			'..CCCCCCCC..',
			'..CCCWWCCC..',
			'..CCCCCCCC..',
			'..CCCWWCCC..',
			'..CCCCCCCC..',
			'..CCCCCCCC..',
			'..BBBBBBBB..',
			'............',
		],
		pixelPalette,
	),
	image: pixelArt(
		[
			'YYYYYYYYYYYY',
			'YWWWWWWWWWWY',
			'YWWWCCCCWWWY',
			'YWWWCCCCWWWY',
			'YWWWWWWWWWWY',
			'YWGGGGGGGWWY',
			'YWGGGGGGGGWY',
			'YWGGGGGGGGWY',
			'YWGGGGGGGGWY',
			'YWWWWWWWWWWY',
			'YWWWWWWWWWWY',
			'YYYYYYYYYYYY',
		],
		pixelPalette,
	),
	'chevron-left': pixelArt(
		[
			'......WW....',
			'.....WW.....',
			'....WW......',
			'...WW.......',
			'..WW........',
			'.WW.........',
			'.WW.........',
			'..WW........',
			'...WW.......',
			'....WW......',
			'.....WW.....',
			'......WW....',
		],
		pixelPalette,
	),
	'chevron-right': pixelArt(
		[
			'....WW......',
			'.....WW.....',
			'......WW....',
			'.......WW...',
			'........WW..',
			'.........WW.',
			'.........WW.',
			'........WW..',
			'.......WW...',
			'......WW....',
			'.....WW.....',
			'....WW......',
		],
		pixelPalette,
	),
	'arrow-right': pixelArt(
		[
			'............',
			'......OO....',
			'.......OO...',
			'........OO..',
			'OOOOOOOOOOO.',
			'OOOOOOOOOOOO',
			'OOOOOOOOOOOO',
			'OOOOOOOOOOO.',
			'........OO..',
			'.......OO...',
			'......OO....',
			'............',
		],
		pixelPalette,
	),
	refresh: pixelArt(
		[
			'...BBBBB....',
			'..B.....BB..',
			'.B.......BB.',
			'.B.......BBB',
			'B.........B.',
			'B..........B',
			'B..........B',
			'.B.........B',
			'.BBB.......B',
			'.BB.......B.',
			'..BB.....B..',
			'...BBBBB....',
		],
		pixelPalette,
	),
}

export const iconThemeArt: Record<IconArtTheme, Record<string, IconNode[]>> = {
	colorful,
	minecraft,
	neon,
	candy,
	arcade,
	pixel,
}
