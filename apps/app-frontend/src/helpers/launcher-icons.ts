import {
	BoxIcon,
	BugIcon,
	CheckCircleIcon,
	ClipboardCopyIcon,
	CoffeeIcon,
	CollectionIcon,
	CompassIcon,
	EditIcon,
	ExternalIcon,
	FolderIcon,
	FolderOpenIcon,
	GaugeIcon,
	GithubIcon,
	HeartIcon,
	ImageIcon,
	InfoIcon,
	IssuesIcon,
	LanguagesIcon,
	MicrochipIcon,
	MinusIcon,
	MonitorIcon,
	PackageOpenIcon,
	PaintbrushIcon,
	PaletteIcon,
	PauseIcon,
	PlayIcon,
	PlusIcon,
	RefreshCwIcon,
	Settings2Icon,
	ShieldCheckIcon,
	SparklesIcon,
	SquarePlusIcon,
	StarIcon,
	StopCircleIcon,
	SunIcon,
	TagCategorySwordsIcon,
	ToggleRightIcon,
	TrashIcon,
	UploadIcon,
	UserIcon,
	XCircleIcon,
} from '@modrinth/assets'
import { type Component, defineComponent, h } from 'vue'

/**
 * The launcher's icon for each action, in one place, so the same action always
 * shows the same Modrinth icon wherever it appears (menus, tabs, buttons).
 */
const ICONS = {
	play: PlayIcon,
	stop: StopCircleIcon,
	favorite: StarIcon,
	add: PlusIcon,
	remove: MinusIcon,
	edit: EditIcon,
	duplicate: ClipboardCopyIcon,
	folder: FolderOpenIcon,
	folderPlain: FolderIcon,
	copy: ClipboardCopyIcon,
	upload: UploadIcon,
	paint: PaletteIcon,
	delete: TrashIcon,
	export: PackageOpenIcon,
	shortcut: ExternalIcon,
	group: CollectionIcon,
	appearance: PaintbrushIcon,
	features: TagCategorySwordsIcon,
	behavior: Settings2Icon,
	language: LanguagesIcon,
	flags: ToggleRightIcon,
	visual: SparklesIcon,
	performance: GaugeIcon,
	profile: UserIcon,
	privacy: ShieldCheckIcon,
	synced: RefreshCwIcon,
	java: CoffeeIcon,
	resources: MicrochipIcon,
	replay: SparklesIcon,
	instance: BoxIcon,
	success: CheckCircleIcon,
	warning: IssuesIcon,
	error: XCircleIcon,
	info: InfoIcon,
	discover: CompassIcon,
	screenshots: ImageIcon,
	bug: BugIcon,
	source: GithubIcon,
	support: HeartIcon,
	inbox: SquarePlusIcon,
	motion: PlayIcon,
	pause: PauseIcon,
	memory: BoxIcon,
	quality: MonitorIcon,
	glow: SunIcon,
} satisfies Record<string, Component>

export type LauncherIconName = keyof typeof ICONS

const cache = new Map<LauncherIconName, Component>()

/**
 * The icon component for an action. It renders the Modrinth icon with the
 * `mk-icon` class, which gives every launcher icon the same refined stroke
 * (see `global.scss`); sizing classes passed to it work like on the icon.
 */
export function launcherIcon(name: LauncherIconName): Component {
	let component = cache.get(name)
	if (!component) {
		const icon = ICONS[name]
		component = defineComponent({
			name: `LauncherIcon_${name}`,
			setup() {
				return () => h(icon, { class: 'mk-icon', 'aria-hidden': 'true' })
			},
		})
		cache.set(name, component)
	}
	return component
}
