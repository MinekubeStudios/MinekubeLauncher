<script setup>
import {
	ModrinthApiError,
	PanelVersionFeature,
	TauriModrinthClient,
	VerboseLoggingFeature,
} from '@modrinth/api-client'
import { FolderOpenIcon, HeartIcon, InfoIcon, PlusIcon, SettingsIcon } from '@modrinth/assets'
import {
	Admonition,
	Button,
	commonMessages,
	ContentInstallModal,
	ContentUpdaterModal,
	CreationFlowModal,
	defineMessages,
	I18nDebugPanel,
	IconButton,
	IconThemeGlyph,
	LoadingBar,
	NotificationPanel,
	PopupNotificationPanel,
	provideModalBehavior,
	provideModrinthClient,
	provideNotificationManager,
	providePageContext,
	providePopupNotificationManager,
	TeleportOverflowMenu,
	TooltipDirective,
	useDebugLogger,
	useFormatBytes,
	useVIntl,
} from '@modrinth/ui'
import { useQueries, useQuery } from '@tanstack/vue-query'
import { getVersion } from '@tauri-apps/api/app'
import { convertFileSrc, invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { openUrl } from '@tauri-apps/plugin-opener'
import { type } from '@tauri-apps/plugin-os'
import { saveWindowState, StateFlags } from '@tauri-apps/plugin-window-state'
import {
	computed,
	defineAsyncComponent,
	nextTick,
	onErrorCaptured,
	onMounted,
	onUnmounted,
	provide,
	ref,
	watch,
} from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'

import launcherLogo from '@/assets/minekube-launcher-icon.png'
import AccountsCard from '@/components/ui/AccountsCard.vue'
import AppActionBar from '@/components/ui/AppActionBar.vue'
import ErrorModal from '@/components/ui/ErrorModal.vue'
import AddServerToInstanceModal from '@/components/ui/install_flow/AddServerToInstanceModal.vue'
import UnknownPackWarningModal from '@/components/ui/install_flow/UnknownPackWarningModal.vue'
import IconEditorModal from '@/components/ui/instance_settings/icon-editor-modal/index.vue'
import { launcherToolbarPill } from '@/components/ui/launcher-toolbar-pill'
import LauncherBackground from '@/components/ui/LauncherBackground.vue'
import LauncherUpdateButton from '@/components/ui/LauncherUpdateButton.vue'
import LocalAccountModal from '@/components/ui/local-account-modal/LocalAccountModal.vue'
import MinecraftAuthErrorModal from '@/components/ui/minecraft-auth-error-modal/MinecraftAuthErrorModal.vue'
import MinecraftRequiredModal from '@/components/ui/minecraft-required-modal/MinecraftRequiredModal.vue'
import MinecraftLaunchOverlay from '@/components/ui/MinecraftLaunchOverlay.vue'
import MinekubeEffectsLayer from '@/components/ui/MinekubeEffectsLayer.vue'
import AppSettingsModal from '@/components/ui/modal/AppSettingsModal.vue'
import InstallToPlayModal from '@/components/ui/modal/InstallToPlayModal.vue'
import ModpackAlreadyInstalledModal from '@/components/ui/modal/ModpackAlreadyInstalledModal.vue'
import UpdateToPlayModal from '@/components/ui/modal/UpdateToPlayModal.vue'
import LinkConfirmModal from '@/components/ui/shield/LinkConfirmModal.vue'
import ModScanWarningModal from '@/components/ui/shield/ModScanWarningModal.vue'
import SidebarInstanceToolbar from '@/components/ui/SidebarInstanceToolbar.vue'
import SidebarPlayerCharacter from '@/components/ui/SidebarPlayerCharacter.vue'
import SplashScreen from '@/components/ui/SplashScreen.vue'
import SupportProjectModal from '@/components/ui/SupportProjectModal.vue'
import WindowControls from '@/components/ui/WindowControls.vue'
import { useCheckDisableMouseover } from '@/composables/macCssFix.js'
import { useAppEvent } from '@/composables/use-app-event'
import { useAppSettings } from '@/composables/use-app-settings.ts'
import { playCharacterScene } from '@/composables/use-character.ts'
import { useError } from '@/composables/use-error.js'
import { useIconTheme } from '@/composables/use-icon-theme.ts'
import { useInstanceMetadataRefresh } from '@/composables/use-instance-metadata-refresh'
import { useLauncherBackground } from '@/composables/use-launcher-background.ts'
import { useLauncherColor } from '@/composables/use-launcher-color.ts'
import { useOutlineTheme } from '@/composables/use-outline-theme.ts'
import { fastLoading } from '@/composables/use-performance.ts'
import { useSpecialButtons } from '@/composables/use-special-buttons.ts'
import { normalizeColorTheme, useTheme } from '@/composables/use-theme.ts'
import { sidebarCharacterActive } from '@/composables/use-visual.ts'
import { config } from '@/config'
import { check_reachable, users as getMinecraftUsers } from '@/helpers/auth.js'
import { get_project_v3, get_version } from '@/helpers/cache.js'
import { gameSettingsQueryOptions } from '@/helpers/game-options'
import { install_create_modpack_instance, install_get_modpack_preview } from '@/helpers/install'
import { get as getInstance, run } from '@/helpers/instance'
import { maxMemoryQueryOptions } from '@/helpers/jre.js'
import {
	completeAndHideLaunchOverlay,
	getLaunchOverlayState,
	hideLaunchOverlay,
	isMinecraftEarlyBootLogLine,
	isMinecraftGameWindowLogLine,
	setLaunchOverlayPhase,
} from '@/helpers/launch-overlay-state'
import { launcherIcon } from '@/helpers/launcher-icons'
import { closeMainWindow, showMainWindow } from '@/helpers/main-window'
import { get_by_instance_id, has_game_window } from '@/helpers/process.js'
import { mergeUrlQuery, parseModrinthLink } from '@/helpers/project-links.ts'
import { setSkinPageTransition, useSkinPageTransition } from '@/helpers/route-transitions.ts'
import {
	appSettingsQueryOptions,
	get as getSettings,
	set as setSettings,
} from '@/helpers/settings.ts'
import { applyLogRetention, ShieldFeature } from '@/helpers/shield'
import { mountSpecialButtons } from '@/helpers/special-buttons'
import { debugStartup, traceStartupStep } from '@/helpers/startup-debug'
import { get_opening_command, initialize_state } from '@/helpers/state'
import {
	gameOptionsSyncSourcesQueryOptions,
	initializedSyncedOptionsQueryOptions,
	syncedServersQueryOptions,
} from '@/helpers/synced-options'
import { syncedPackQueryOptions } from '@/helpers/synced-packs'
import {
	areUpdatesEnabled,
	enqueueUpdateForInstallation,
	getOS,
	getUpdateSize,
	isDev,
	isNetworkMetered,
	setRestartAfterPendingUpdate,
	showIconsFolder,
	showInstancesFolder,
	showJavaVersionsFolder,
	showLauncherRootFolder,
	showSyncedOptionsFolder,
} from '@/helpers/utils.js'
import { start_join_server, start_join_singleplayer_world } from '@/helpers/worlds.ts'
import { setLocale } from '@/i18n.config'
import { instanceListQueryOptions } from '@/pages/instance/query-options'
import {
	appUpdateState,
	downloadAvailableAppUpdate,
	getNextAppUpdatePopupTime,
	installAvailableAppUpdate,
	markAppUpdateActionable,
	markAppUpdatePopupShown,
	openAppUpdateChangelog,
	setAppUpdateActions,
} from '@/providers/app-update.ts'
import { createContentInstall, provideContentInstall } from '@/providers/content-install'
import {
	provideAppUpdateDownloadProgress,
	subscribeToDownloadProgress,
} from '@/providers/download-progress.ts'
import { createServerInstall, provideServerInstall } from '@/providers/server-install'
import { setupProviders } from '@/providers/setup'
import { setupAppEventsProvider } from '@/providers/setup/app-events'
import { setupAuthProvider } from '@/providers/setup/auth'
import { setupLoadingStateProvider } from '@/providers/setup/loading-state'
import { welcomeTourKey } from '@/providers/welcome-tour'

import { AppNotificationManager } from './providers/app-notifications'
import { AppPopupNotificationManager } from './providers/app-popup-notifications'
import {
	appSettingsModalOpenProfileKey,
	appSettingsModalOpenSyncedOptionsKey,
} from './providers/app-settings-modal'

debugStartup('App setup entered')
const appSettings = useAppSettings()
const appTheme = useTheme()
const iconTheme = useIconTheme()
useLauncherColor()
useOutlineTheme()
useSpecialButtons()
useLauncherBackground()
const router = useRouter()
const route = useRoute()
const { channel: appEventChannel, events: appEvents } = setupAppEventsProvider()
useInstanceMetadataRefresh(appEvents)
const canNavigateBack = ref(false)
const canNavigateForward = ref(false)

function updateHistoryNavigationState() {
	const historyState = window.history.state
	canNavigateBack.value = historyState?.back != null
	canNavigateForward.value = historyState?.forward != null
}

function navigateBack() {
	if (canNavigateBack.value) {
		router.back()
		return
	}
	void router.push('/')
}

updateHistoryNavigationState()

// Skin-selector jumps (the shirt button beside each account) get their own
// page transition — a zoom crossfade, mirrored when returning to the page the
// user came from. Cleared after the transition so regular navigation keeps the
// generic route animation.
const skinPageTransition = useSkinPageTransition()
const routeTransitionName = computed(() =>
	skinPageTransition.value ? `skin-route-${skinPageTransition.value}` : 'route',
)
function clearSkinPageTransition() {
	setSkinPageTransition(null)
}

// The page swap is a `<Transition mode="out-in">` + `<Suspense>` + `<KeepAlive>`
// trio. Either piece can get stuck (an async page setup that rejects leaves
// Suspense unresolved, an interrupted leave can keep the transition waiting),
// and the visible result is the same: the content area goes permanently blank
// while the sidebar and top bar stay — "everything disappears when I press
// back". Two safety nets keep that from ever being a dead end:
//   * a watchdog remounts the whole route view (fresh transition state) when a
//     started transition or a pending Suspense does not settle in time;
//   * route setup errors are caught here and shown as a retryable panel
//     instead of an empty area.
const ROUTE_TRANSITION_SETTLE_BUDGET_MS = 2_500
const ROUTE_SUSPENSE_SETTLE_BUDGET_MS = 30_000
const routeViewEpoch = ref(0)
const routeViewError = ref(null)
let routeTransitionWatchdog
let routeSuspenseWatchdog

/**
 * Identity of a routed page for the transition, Suspense and KeepAlive. Pages
 * are identified by their top-level route record, like the original app reused
 * the page component: switching a project tab or another instance keeps the
 * page mounted instead of re-creating (and re-fetching) it.
 */
function routePageKey(pageRoute) {
	return pageRoute.matched[0]?.path ?? pageRoute.path
}

/** Whether the component that threw belongs to the currently routed page. */
function isRoutedPageInstance(instance) {
	const pageComponents = new Set(
		route.matched.flatMap((record) => Object.values(record.components ?? {})),
	)
	let current = instance
	while (current) {
		if (pageComponents.has(current.$?.type)) return true
		current = current.$parent
	}
	return false
}

function clearRouteTransitionWatchdog() {
	if (routeTransitionWatchdog) {
		clearTimeout(routeTransitionWatchdog)
		routeTransitionWatchdog = undefined
	}
}

function clearRouteSuspenseWatchdog() {
	if (routeSuspenseWatchdog) {
		clearTimeout(routeSuspenseWatchdog)
		routeSuspenseWatchdog = undefined
	}
}

function armRouteTransitionWatchdog() {
	clearRouteTransitionWatchdog()
	routeTransitionWatchdog = setTimeout(() => {
		console.error('Route transition did not settle in time; remounting the route view')
		resetRouteView()
	}, ROUTE_TRANSITION_SETTLE_BUDGET_MS)
}

/** A leave or enter animation has begun — it must settle or we reset. */
function onRouteTransitionStart() {
	armRouteTransitionWatchdog()
}

/**
 * Leave finished. The next page may still be loading its data (an async page
 * setup such as a project fetch), which can legitimately take longer than an
 * animation on a slow connection. Silently remounting after the short animation
 * budget restarted that load and kept the page blank even longer, so the enter
 * gets the loading budget and ends in a retryable panel instead.
 */
function onRouteTransitionLeft() {
	clearRouteTransitionWatchdog()
	routeTransitionWatchdog = setTimeout(() => {
		routeTransitionWatchdog = undefined
		console.error('Routed page did not appear in time')
		routeViewError.value = new Error('Route page did not finish loading in time')
	}, ROUTE_SUSPENSE_SETTLE_BUDGET_MS)
}

function onRouteTransitionEntered() {
	clearRouteTransitionWatchdog()
	clearSkinPageTransition()
}

/**
 * Force a clean remount of the whole router-view subtree. Bumping the epoch
 * swaps the Suspense key, which discards any stuck transition or Suspense state
 * along with it. Only used by the watchdogs and the retry button — never during
 * a healthy navigation.
 */
function resetRouteView() {
	clearRouteTransitionWatchdog()
	clearRouteSuspenseWatchdog()
	clearSkinPageTransition()
	routeViewEpoch.value += 1
}

function retryRouteView() {
	routeViewError.value = null
	resetRouteView()
}

onErrorCaptured((error, instance) => {
	// Only errors of the routed page replace the content area. Errors from the
	// sidebar, toolbar or modals keep propagating to the global error handling.
	if (!isRoutedPageInstance(instance)) return
	// An async route setup that rejects would leave the Suspense pending and the
	// content area empty forever. Show a retryable panel instead.
	console.error('Routed page failed to load:', error)
	routeViewError.value = error
	return false
})

/**
 * Last line of defence for the "content area goes blank" failure: shortly after
 * every page change the routed page must have rendered an element. Vue's
 * out-in transition never finishes leaving a page whose template has several
 * root nodes (no `before-leave`/`after-leave` fires for a fragment), so the
 * transition watchdogs above cannot see that case — this check can.
 */
const routeViewHost = ref(null)
let routeSwapCheck

function scheduleRouteSwapCheck() {
	clearTimeout(routeSwapCheck)
	routeSwapCheck = setTimeout(() => {
		routeSwapCheck = undefined
		if (routeViewError.value || suspenseToken || routeTransitionWatchdog) return
		const host = routeViewHost.value
		if (host && host.childElementCount === 0) {
			console.error('Routed page did not render; remounting the route view')
			resetRouteView()
		}
	}, ROUTE_TRANSITION_SETTLE_BUDGET_MS)
}

watch(
	() => route.path,
	() => {
		scheduleRouteSwapCheck()
		routeViewError.value = null
		// A page left while it was still loading never resolves its Suspense; its
		// watchdog and loading token must not outlive it.
		clearRouteSuspenseWatchdog()
		if (suspenseToken) {
			loading.end(suspenseToken)
			suspenseToken = null
		}
	},
)

const APP_SIDEBAR_WIDTH = 300
const sidebarToggled = ref(true)
watch(
	() => appSettings.toggleSidebar,
	(toggleSidebar) => {
		sidebarToggled.value = !toggleSidebar
	},
)
const forceSidebar = computed(
	() => route.path.startsWith('/browse') || route.path.startsWith('/project'),
)
const sidebarVisible = computed(() => sidebarToggled.value || forceSidebar.value)
const notificationManager = new AppNotificationManager()
provideNotificationManager(notificationManager)
const { handleError, addNotification } = notificationManager

useAppEvent(
	'warning',
	(event) =>
		addNotification({
			title: formatMessage(messages.warning),
			text: event.message,
			type: 'warning',
		}),
	appEvents,
)

const popupNotificationManager = new AppPopupNotificationManager()
providePopupNotificationManager(popupNotificationManager)
const { addPopupNotification } = popupNotificationManager

const appVersion = getVersion()
const tauriApiClient = new TauriModrinthClient({
	userAgent: async () => `minekube/launcher/${await appVersion} (MinekubeStudios/MinekubeLauncher)`,
	labrinthBaseUrl: config.labrinthBaseUrl,
	archonBaseUrl: config.archonBaseUrl,
	features: [new ShieldFeature(), new PanelVersionFeature(), new VerboseLoggingFeature()],
})
provideModrinthClient(tauriApiClient)
providePageContext({
	hierarchicalSidebarAvailable: ref(true),
	floatingActionBarOffsets: {
		left: ref('0rem'),
		right: computed(() => (sidebarVisible.value ? `${APP_SIDEBAR_WIDTH}px` : '0px')),
	},
	featureFlags: {
		serverRamAsBytesAlwaysOn: computed(() =>
			appSettings.getFeatureFlag('server_ram_as_bytes_always_on'),
		),
	},
	openExternalUrl: (url) => void openUrl(url),
})
provideModalBehavior({
	noblur: computed(() => !appTheme.advancedRendering),
})

const creationIconEditorModal = ref(null)
const creationGeneratedIcon = ref(null)
const creationIconTarget = ref('creation-flow')

// --- Prism-like top bar branding (icon + name + version) ---
const launcherVersion = ref('')
getVersion()
	.then((v) => {
		launcherVersion.value = v
	})
	.catch(() => {})

// --- Folders toolbar menu (Prism-like) ---
const foldersMenuOptions = computed(() => [
	{
		id: 'launcher-root',
		label: formatMessage(messages.toolbarFolderLauncherRoot),
		icon: launcherIcon('folder'),
		action: () => void showLauncherRootFolder().catch(handleError),
	},
	{
		id: 'instances',
		label: formatMessage(messages.toolbarFolderInstances),
		icon: launcherIcon('folderPlain'),
		action: () => void showInstancesFolder().catch(handleError),
	},
	{
		id: 'icons',
		label: formatMessage(messages.toolbarFolderIcons),
		icon: launcherIcon('folderPlain'),
		action: () => void showIconsFolder().catch(handleError),
	},
	{
		id: 'java',
		label: formatMessage(messages.toolbarFolderJava),
		icon: launcherIcon('folderPlain'),
		action: () => void showJavaVersionsFolder().catch(handleError),
	},
	{ type: 'divider' },
	{
		id: 'discover-content',
		label: formatMessage(commonMessages.discoverContentLabel),
		icon: launcherIcon('discover'),
		action: () => void router.push('/browse/modpack'),
	},
	{
		id: 'screenshots',
		label: formatMessage(messages.screenshots),
		icon: launcherIcon('screenshots'),
		action: () => void router.push('/screenshots'),
	},
	{
		id: 'synced',
		label: formatMessage(messages.toolbarFolderSyncedSettings),
		icon: launcherIcon('folderPlain'),
		action: () => void showSyncedOptionsFolder().catch(handleError),
	},
])

// --- Help toolbar menu (Prism-like) ---
const helpMenuOptions = computed(() => [
	{
		id: 'report-bug',
		label: formatMessage(messages.toolbarReportBug),
		icon: launcherIcon('bug'),
		action: () => void openUrl('https://github.com/MinekubeStudios/MinekubeLauncher/issues'),
	},
	{
		id: 'github',
		label: 'GitHub',
		icon: launcherIcon('source'),
		action: () => void openUrl('https://github.com/MinekubeStudios/MinekubeLauncher'),
	},
	{ type: 'divider', id: 'help-support-divider' },
	{
		id: 'support',
		label: formatMessage(messages.toolbarSupportProject),
		icon: HeartIcon,
		action: () => supportProjectModal.value?.show(),
	},
])

const {
	installationModal,
	unknownPackWarningModal,
	fetchExistingInstanceNames,
	handleCreate,
	handleBrowseModpacks,
	searchProjects,
	getLoaderManifest,
	setModpackAlreadyInstalledModal,
	handleModpackDuplicateCreateAnyway,
	handleModpackDuplicateGoToInstance,
	tags,
} = setupProviders(
	tauriApiClient,
	notificationManager,
	popupNotificationManager,
	appEvents,
	(iconPath) =>
		creationGeneratedIcon.value?.path === iconPath ? creationGeneratedIcon.value.config : null,
)
function openInstanceCreation() {
	installationModal.value?.show()
	playCharacterScene('mining')
}

provide('showCreationModal', openInstanceCreation)

const minecraftAccounts = ref([])
const hasLoggedIntoMinecraft = computed(() => minecraftAccounts.value.length > 0)

async function refreshMinecraftAccounts() {
	minecraftAccounts.value = (await getMinecraftUsers().catch(handleError)) ?? []
}

async function randomizeCreationIcon() {
	const generated = await creationIconEditorModal.value?.randomizeAndSave()
	if (!generated) return null

	creationGeneratedIcon.value = { path: generated.iconPath, config: generated.config }
	return {
		path: generated.iconPath,
		previewUrl: convertFileSrc(generated.iconPath),
	}
}

function customizeCreationIcon() {
	creationIconTarget.value = 'creation-flow'
	creationIconEditorModal.value?.show()
}

function customizeContentInstallIcon() {
	creationIconTarget.value = 'content-install'
	creationIconEditorModal.value?.show()
}

function onCreationIconSaved(iconPath, config) {
	creationGeneratedIcon.value = { path: iconPath, config }
	if (creationIconTarget.value === 'content-install') {
		modInstallModal.value?.setIcon(iconPath, convertFileSrc(iconPath))
		return
	}

	const context = installationModal.value?.ctx
	if (!context) return

	context.instanceIcon.value = null
	context.instanceIconUrl.value = convertFileSrc(iconPath)
	context.instanceIconPath.value = iconPath
}

const offline = ref(!navigator.onLine)
window.addEventListener('offline', () => {
	offline.value = true
})
window.addEventListener('online', () => {
	offline.value = false
})

const os = ref('')
const isDevEnvironment = ref(false)

const stateInitialized = ref(false)
useQueries({
	queries: computed(() =>
		[
			appSettingsQueryOptions(),
			instanceListQueryOptions(),
			maxMemoryQueryOptions(),
			gameSettingsQueryOptions(),
			initializedSyncedOptionsQueryOptions(),
			gameOptionsSyncSourcesQueryOptions(),
			syncedServersQueryOptions(),
			syncedPackQueryOptions('resourcepack'),
			syncedPackQueryOptions('datapack'),
		].map((options) => ({
			...options,
			enabled: stateInitialized.value && options.enabled !== false,
		})),
	),
})

const isMaximized = ref(false)
const isFullscreen = ref(false)

watch([os, isFullscreen], ([osName, fullscreen]) => {
	document.documentElement.classList.toggle('mac-traffic-lights', osName === 'MacOS' && !fullscreen)
})

const authUnreachableDebug = useDebugLogger('AuthReachableChecker')
const authServerQuery = useQuery({
	queryKey: ['authServerReachability'],
	queryFn: async () => {
		await check_reachable()
		authUnreachableDebug('Auth servers are reachable')
		return true
	},
	refetchInterval: 5 * 60 * 1000, // 5 minutes
	retry: false,
	refetchOnWindowFocus: false,
})

const authUnreachable = computed(() => {
	if (authServerQuery.isError.value && !authServerQuery.isLoading.value) {
		console.warn('Failed to reach auth servers', authServerQuery.error.value)
		return true
	}
	return false
})

let unlistenEditMenu
let unlistenWindowResize

const savedWindowStateFlags = StateFlags.POSITION | StateFlags.SIZE | StateFlags.MAXIMIZED

function handleEditMenuAction(action) {
	const event = new CustomEvent(`edit-menu:${action}`, { cancelable: true })
	if (document.dispatchEvent(event)) document.execCommand(action)
}

onMounted(async () => {
	try {
		const listeners = await Promise.all([
			listen('edit-menu://undo', () => handleEditMenuAction('undo')),
			listen('edit-menu://redo', () => handleEditMenuAction('redo')),
		])
		unlistenEditMenu = () => listeners.forEach((unlisten) => unlisten())
	} catch (error) {
		handleError(error)
	}

	await useCheckDisableMouseover()

	mountSpecialButtons()

	document.querySelector('body').addEventListener('click', handleClick)
	document.querySelector('body').addEventListener('auxclick', handleAuxClick)
	document.querySelector('body').addEventListener('contextmenu', handleContextMenu)

	checkUpdates()
	await refreshMinecraftAccounts()
})

onUnmounted(async () => {
	clearRouteTransitionWatchdog()
	clearRouteSuspenseWatchdog()
	document.querySelector('body').removeEventListener('click', handleClick)
	document.querySelector('body').removeEventListener('auxclick', handleAuxClick)
	document.querySelector('body').removeEventListener('contextmenu', handleContextMenu)
	unlistenEditMenu?.()
	unlistenWindowResize?.()
	clearDelayedUpdatePopup()

	await unlistenUpdateDownload?.()
})

const { formatMessage } = useVIntl()
const formatBytes = useFormatBytes()

const messages = defineMessages({
	linkConfirmPackTitle: {
		id: 'app.link-confirm.pack.title',
		defaultMessage: 'Install this modpack?',
	},
	linkConfirmPackText: {
		id: 'app.link-confirm.pack.text',
		defaultMessage: '“{name}” will be installed as a new instance.',
	},
	linkConfirmInstall: { id: 'app.link-confirm.install', defaultMessage: 'Install' },
	linkConfirmServerTitle: {
		id: 'app.link-confirm.server.title',
		defaultMessage: 'Play on this server?',
	},
	linkConfirmServerText: {
		id: 'app.link-confirm.server.text',
		defaultMessage:
			'A link asks to join {name}. Its content will be installed if needed, then the game starts.',
	},
	linkConfirmPlay: { id: 'app.link-confirm.play', defaultMessage: 'Play' },
	linkUnsupportedTitle: {
		id: 'app.link-confirm.unsupported.title',
		defaultMessage: 'Link not supported',
	},
	linkUnsupportedText: {
		id: 'app.link-confirm.unsupported.text',
		defaultMessage: 'Shared instance invites are not available in Minekube Launcher.',
	},
	shieldStrictTitle: {
		id: 'app.shield.strict-blocked.title',
		defaultMessage: 'Blocked by Minekube Shield',
	},
	shieldStrictText: {
		id: 'app.shield.strict-blocked.text',
		defaultMessage:
			'Strict mode is on, so the launcher does not connect to the online library. You can turn it off in Settings → Privacy.',
	},
	warning: { id: 'app.notification.warning', defaultMessage: 'Warning' },
	toolbarAddInstance: { id: 'app.toolbar.add-instance', defaultMessage: 'Add instance' },
	toolbarFolders: { id: 'app.toolbar.folders', defaultMessage: 'Folders' },
	toolbarHelp: { id: 'app.toolbar.help', defaultMessage: 'Help' },
	toolbarFolderLauncherRoot: {
		id: 'app.toolbar.folder.launcher-root',
		defaultMessage: 'Launcher root folder',
	},
	toolbarFolderInstances: {
		id: 'app.toolbar.folder.instances',
		defaultMessage: 'Instances folder',
	},
	toolbarFolderIcons: { id: 'app.toolbar.folder.icons', defaultMessage: 'Icons folder' },
	toolbarFolderJava: { id: 'app.toolbar.folder.java', defaultMessage: 'Java folder' },
	toolbarFolderSyncedSettings: {
		id: 'app.toolbar.folder.synced-settings',
		defaultMessage: 'Synced settings',
	},
	toolbarReportBug: { id: 'app.toolbar.help.report-bug', defaultMessage: 'Report a bug' },
	toolbarSupportProject: {
		id: 'app.toolbar.help.support-project',
		defaultMessage: 'Support the project',
	},
	goBack: { id: 'app.navigation.go-back', defaultMessage: 'Go back' },
	goForward: { id: 'app.navigation.go-forward', defaultMessage: 'Go forward' },
	toggleSidebar: {
		id: 'app.appearance-settings.toggle-sidebar.title',
		defaultMessage: 'Hide right sidebar',
	},
	routeViewErrorHeader: {
		id: 'app.route-view.error.header',
		defaultMessage: 'This page could not be displayed',
	},
	routeViewErrorBody: {
		id: 'app.route-view.error.body',
		defaultMessage:
			'The page failed to load. Going back or retrying usually fixes it; the rest of the launcher keeps working.',
	},
	routeViewErrorRetry: {
		id: 'app.route-view.error.retry',
		defaultMessage: 'Try again',
	},
	updateDownloadMissingVersion: {
		id: 'app.update.download-error.missing-version',
		defaultMessage: 'Failed to download update: no version available',
	},
	updateInstalledToastTitle: {
		id: 'app.update.complete-toast.title',
		defaultMessage: 'Version {version} was successfully installed!',
	},
	updateInstalledToastText: {
		id: 'app.update.complete-toast.text',
		defaultMessage: 'Click here to view the changelog.',
	},
	authUnreachableHeader: {
		id: 'app.auth-servers.unreachable.header',
		defaultMessage: 'Cannot reach authentication servers',
	},
	authUnreachableBody: {
		id: 'app.auth-servers.unreachable.body',
		defaultMessage:
			'Minecraft authentication servers may be down right now. Check your internet connection and try again later.',
	},
	home: {
		id: 'app.nav.home',
		defaultMessage: 'Home',
	},
	screenshots: {
		id: 'app.nav.screenshots',
		defaultMessage: 'Screenshots',
	},
	createNewInstance: {
		id: 'app.nav.create-new-instance',
		defaultMessage: 'Create new instance',
	},
	restarting: {
		id: 'app.restarting',
		defaultMessage: 'Restarting...',
	},
	playingAs: {
		id: 'app.sidebar.playing-as',
		defaultMessage: 'Playing as',
	},
})

async function setupApp() {
	tags.initialize()

	const storedSettings = await traceStartupStep('Read startup settings', getSettings)
	const {
		native_decorations,
		theme,
		locale,
		hide_nametag_skins_page,
		advanced_rendering,
		toggle_sidebar,
		show_files_tab_in_instances,
		show_worlds_tab_in_instances,
		show_screenshots_tab_in_instances,
		developer_mode,
		feature_flags,
		pending_update_toast_for_version,
	} = storedSettings

	// Initialize locale from saved settings
	if (locale) {
		await traceStartupStep('Apply startup locale', () => setLocale(locale))
	}

	Object.assign(appSettings.featureFlags, feature_flags)
	isMaximized.value = await traceStartupStep('Read window maximized state', () =>
		getCurrentWindow().isMaximized(),
	)
	isFullscreen.value = await traceStartupStep('Read window fullscreen state', () =>
		getCurrentWindow().isFullscreen(),
	)
	os.value = await traceStartupStep('Read operating system', getOS)
	const dev = await traceStartupStep('Read development mode', isDev)
	isDevEnvironment.value = dev
	appSettings.nativeDecorations = native_decorations
	if (os.value !== 'MacOS') {
		await traceStartupStep('Apply window decorations', () =>
			getCurrentWindow().setDecorations(native_decorations),
		)
	}

	// The existing database schema creates 'dark' before the first setting can
	// be chosen. Do not rewrite its migration checksum on upgrades; replace
	// only an untouched first-run preference with the new system default.
	const initialTheme =
		!appTheme.hadStoredPreference && theme === 'dark' ? 'system' : normalizeColorTheme(theme)
	if (initialTheme !== theme) {
		await traceStartupStep('Save initial system theme', () =>
			setSettings({ ...storedSettings, theme: initialTheme }),
		)
	}
	appTheme.preferred = initialTheme
	appTheme.advancedRendering = advanced_rendering
	appSettings.hideNametagSkinsPage = hide_nametag_skins_page
	appSettings.toggleSidebar = toggle_sidebar
	appSettings.showFilesTabInInstances = show_files_tab_in_instances
	appSettings.showWorldsTabInInstances = show_worlds_tab_in_instances
	appSettings.showScreenshotsTabInInstances = show_screenshots_tab_in_instances
	appSettings.devMode = developer_mode
	stateInitialized.value = true
	// Minekube Shield: old game logs are removed in the background.
	window.setTimeout(() => void applyLogRetention(), 15_000)
	debugStartup('App state initialized')
	await traceStartupStep('Render initialized app', nextTick)
	unlistenWindowResize = await traceStartupStep('Register window resize listener', () =>
		getCurrentWindow().onResized(async () => {
			isMaximized.value = await getCurrentWindow().isMaximized()
			isFullscreen.value = await getCurrentWindow().isFullscreen()
		}),
	)

	const osType = await traceStartupStep('Read operating system type', async () => type())
	if (osType === 'macos') {
		document.getElementsByTagName('html')[0].classList.add('mac')
	} else {
		document.getElementsByTagName('html')[0].classList.add('windows')
	}

	traceStartupStep('Read opening command', get_opening_command).then(handleCommand)

	if (pending_update_toast_for_version !== null) {
		const settings = await traceStartupStep(
			'Read settings to clear update notification',
			getSettings,
		)
		settings.pending_update_toast_for_version = null
		await traceStartupStep('Clear update notification', () => setSettings(settings))
	}
}

const stateFailed = ref(false)
traceStartupStep('Initialize backend state', () => initialize_state(appEventChannel))
	.then(() => {
		traceStartupStep('Initialize frontend state', setupApp).catch((err) => {
			stateFailed.value = true
			console.error(err)
			error.showError(err, null, false, 'state_init')
		})
	})
	.catch((err) => {
		stateFailed.value = true
		console.error('Failed to initialize app', err)
		error.showError(err, null, false, 'state_init')
	})

const handleClose = async () => {
	try {
		await saveWindowState(savedWindowStateFlags)
	} catch (error) {
		console.error('Failed to save launcher window state before closing', error)
	}
	// Hides the window at once, then closes it (see helpers/main-window).
	await closeMainWindow()
}

const loading = setupLoadingStateProvider(() => ({
	stateInitialized: stateInitialized.value,
	stateFailed: stateFailed.value,
	initialStatePending: !!initialLoadToken,
	navigationPending: !!routerToken,
	routeSuspensePending: !!suspenseToken,
	route: route.path,
}))
loading.setEnabled(false)
let initialLoadToken = loading.begin('Initial app state')
let routerToken = null
let suspenseToken = null

let suspensePending = false

const sidebarOverlayScrollbarsOptions = Object.freeze({
	overflow: {
		x: 'hidden',
		y: 'scroll',
	},
})

// Minekube Shield strict mode keeps the launcher away from Modrinth, so its
// browse and project pages are closed instead of failing request by request.
router.beforeEach((to) => {
	if (
		appSettings.getFeatureFlag('shield_strict') &&
		/^\/(browse|project|mod|plugin|datapack|resourcepack|shader|modpack)(\/|$)/.test(to.path)
	) {
		addNotification({
			title: formatMessage(messages.shieldStrictTitle),
			text: formatMessage(messages.shieldStrictText),
			type: 'info',
		})
		return false
	}
})
router.beforeEach((to, from) => {
	debugStartup('Route navigation started', { to: to.path, from: from.path })
	suspensePending = false
	if (routerToken) loading.end(routerToken)
	routerToken = loading.begin(`Route navigation: ${to.path}`)
})
router.afterEach((to, from, failure) => {
	debugStartup('Route navigation settled', { to: to.path, failed: !!failure })
	updateHistoryNavigationState()
	setTimeout(() => {
		debugStartup('Route loading release check', {
			route: to.path,
			suspensePending,
			stateInitialized: stateInitialized.value,
		})
		if (!suspensePending && stateInitialized.value) {
			if (initialLoadToken) {
				loading.end(initialLoadToken)
				initialLoadToken = null
			}
			if (routerToken) {
				loading.end(routerToken)
				routerToken = null
			}
		}
	}, 100)
})

function onSuspensePending() {
	debugStartup('Route Suspense pending', { route: route.path })
	suspensePending = true
	if (suspenseToken) loading.end(suspenseToken)
	suspenseToken = loading.begin(`Route Suspense: ${route.path}`)
	// A page whose async setup never settles must not leave the view blank. A
	// silent remount would just start the same slow load again (an endless loop
	// on a slow connection), so offer an explicit retry instead.
	clearRouteSuspenseWatchdog()
	routeSuspenseWatchdog = setTimeout(() => {
		routeSuspenseWatchdog = undefined
		console.error('Route Suspense did not resolve in time')
		if (suspenseToken) {
			loading.end(suspenseToken)
			suspenseToken = null
		}
		routeViewError.value = new Error('Route page did not finish loading in time')
	}, ROUTE_SUSPENSE_SETTLE_BUDGET_MS)
}

function onSuspenseResolve() {
	debugStartup('Route Suspense resolved', { route: route.path })
	clearRouteSuspenseWatchdog()
	if (suspenseToken) {
		loading.end(suspenseToken)
		suspenseToken = null
	}
	if (routerToken) {
		loading.end(routerToken)
		routerToken = null
	}
}

watch(stateInitialized, (ready) => {
	debugStartup('State readiness changed', { ready })
	if (ready) {
		if (initialLoadToken) {
			loading.end(initialLoadToken)
			initialLoadToken = null
		}
		if (routerToken) {
			loading.end(routerToken)
			routerToken = null
		}
	}
})

const error = useError()
const errorModal = ref()
const linkConfirmModal = ref()
const minecraftAuthErrorModal = ref()
const minecraftRequiredModal = ref()
const localAccountModal = ref()
provide('localAccountModal', localAccountModal)

const contentInstall = createContentInstall({ router, handleError, appEvents })
provideContentInstall(contentInstall)
const {
	instances: contentInstallInstances,
	compatibleLoaders: contentInstallLoaders,
	gameVersions: contentInstallGameVersions,
	loading: contentInstallLoading,
	defaultTab: contentInstallDefaultTab,
	preferredLoader: contentInstallPreferredLoader,
	preferredGameVersion: contentInstallPreferredGameVersion,
	releaseGameVersions: contentInstallReleaseGameVersions,
	projectInfo: contentInstallProjectInfo,
	handleInstallToInstance,
	handleCreateAndInstall,
	prepareNewInstance,
	handleNavigate: handleContentInstallNavigate,
	handleCancel: handleContentInstallCancel,
	setContentInstallModal,
	setModpackAlreadyInstalledModal: setContentInstallModpackAlreadyInstalledModal,
	handleModpackDuplicateCreateAnyway: handleContentInstallModpackDuplicateCreateAnyway,
	handleModpackDuplicateGoToInstance: handleContentInstallModpackDuplicateGoToInstance,
	setIncompatibilityWarningModal: setContentIncompatibilityWarningModal,
	incompatibilityWarningVersions: contentInstallIncompatibilityWarningVersions,
	incompatibilityWarningCurrentGameVersion: contentInstallIncompatibilityWarningCurrentGameVersion,
	incompatibilityWarningCurrentLoader: contentInstallIncompatibilityWarningCurrentLoader,
	incompatibilityWarningProjectType: contentInstallIncompatibilityWarningProjectType,
	incompatibilityWarningProjectIconUrl: contentInstallIncompatibilityWarningProjectIconUrl,
	incompatibilityWarningProjectName: contentInstallIncompatibilityWarningProjectName,
	incompatibilityWarningMessage: contentInstallIncompatibilityWarningMessage,
	incompatibilityWarningInstalling: contentInstallIncompatibilityWarningInstalling,
	handleIncompatibilityWarningInstall: handleContentInstallIncompatibilityWarningInstall,
	handleIncompatibilityWarningCancel: handleContentInstallIncompatibilityWarningCancel,
} = contentInstall

async function prepareCreationProjectInstall(projectId, projectType) {
	if (projectType === 'modpack') {
		await contentInstall.install(
			projectId,
			null,
			null,
			'CreationModalProject',
			undefined,
			() => void router.replace({ name: 'Home' }),
		)
		return null
	}

	await prepareNewInstance(projectId)
	const info = contentInstallProjectInfo.value
	if (!info) throw new Error(`Project information is unavailable: '${projectId}'`)

	return {
		projectId,
		title: info.title,
		iconUrl: info.iconUrl,
		link: info.link,
		owner: info.owner,
		compatibleLoaders: [...contentInstallLoaders.value],
		gameVersions: [...contentInstallGameVersions.value],
		releaseGameVersions: new Set(contentInstallReleaseGameVersions.value),
	}
}

const serverInstall = createServerInstall({
	router,
	handleError,
	popupNotificationManager,
	appEvents,
})
provideServerInstall(serverInstall)
const {
	setInstallToPlayModal: setServerInstallToPlayModal,
	setUpdateToPlayModal: setServerUpdateToPlayModal,
	setAddServerToInstanceModal: setServerAddServerToInstanceModal,
	playServerProject,
} = serverInstall

const modInstallModal = ref()
const modpackAlreadyInstalledModal = ref()
const contentInstallModpackAlreadyInstalledModal = ref()
const addServerToInstanceModal = ref()
const incompatibilityWarningModal = ref()
const installToPlayModal = ref()
const updateToPlayModal = ref()

const appSettingsModal = ref()
const supportProjectModal = ref()
provide('showSettingsModal', () => appSettingsModal.value?.show())
const splashReady = ref(false)
function onSplashReady() {
	splashReady.value = true
}
const welcomeTour = ref()
const WelcomeTourModal = defineAsyncComponent(
	() => import('@/components/ui/welcome/WelcomeTourModal.vue'),
)
provide(welcomeTourKey, () => welcomeTour.value?.show())

async function onWelcomeFinished(createdPlayer) {
	if (!createdPlayer) return

	await accounts.value?.refreshValues?.()
	await refreshMinecraftAccounts()
}

provide(appSettingsModalOpenProfileKey, () => appSettingsModal.value?.showProfile())
provide(appSettingsModalOpenSyncedOptionsKey, () => appSettingsModal.value?.showSyncedOptions())

watch(incompatibilityWarningModal, (modal) => {
	if (modal) {
		setContentIncompatibilityWarningModal(modal)
	}
})

setupAuthProvider()

onMounted(() => {
	showMainWindow()

	error.setErrorModal(errorModal.value)
	error.setMinecraftAuthErrorModal(minecraftAuthErrorModal.value)
	error.setMinecraftRequiredModal(minecraftRequiredModal.value)

	setContentIncompatibilityWarningModal(incompatibilityWarningModal.value)
	setContentInstallModal(modInstallModal.value)
	setContentInstallModpackAlreadyInstalledModal(contentInstallModpackAlreadyInstalledModal.value)
	setModpackAlreadyInstalledModal(modpackAlreadyInstalledModal.value)
	setServerAddServerToInstanceModal(addServerToInstanceModal.value)
	setServerInstallToPlayModal(installToPlayModal.value)
	setServerUpdateToPlayModal(updateToPlayModal.value)
})

const accounts = ref(null)
provide('accountsCard', accounts)

useAppEvent('command', handleCommand, appEvents)

// Keep the fullscreen launch overlay active while the JVM boots and only begin
// fading it out once the actual Minecraft game window appears in the OS (or if
// the game process terminates early).
let launchWindowPollTimer = null

function stopLaunchWindowPoll() {
	if (launchWindowPollTimer !== null) {
		clearInterval(launchWindowPollTimer)
		launchWindowPollTimer = null
	}
}

function startLaunchWindowPoll(instanceId) {
	stopLaunchWindowPoll()
	if (!instanceId) return

	let checkInFlight = false
	let ticks = 0
	launchWindowPollTimer = setInterval(async () => {
		const overlayState = getLaunchOverlayState()
		if (
			!overlayState.visible ||
			(overlayState.instanceId && overlayState.instanceId !== instanceId)
		) {
			stopLaunchWindowPoll()
			return
		}
		if (checkInFlight) return
		checkInFlight = true
		ticks += 1
		try {
			const windowOpen = await has_game_window(instanceId).catch(() => false)
			if (windowOpen) {
				stopLaunchWindowPoll()
				completeAndHideLaunchOverlay(instanceId)
				return
			}
			// Every ~1.5s verify that the game process is still alive
			if (ticks % 5 === 0) {
				const running = await get_by_instance_id(instanceId).catch(() => null)
				if (Array.isArray(running) && running.length === 0) {
					stopLaunchWindowPoll()
					hideLaunchOverlay('terminated')
				}
			}
		} finally {
			checkInFlight = false
		}
	}, 300)
}

useAppEvent(
	'process',
	(event) => {
		if (!event) return
		if (event.event === 'launched') {
			const overlayInstanceId = getLaunchOverlayState().instanceId
			// Only the game the overlay belongs to may replace its window watch.
			if (overlayInstanceId && event.instance_id && overlayInstanceId !== event.instance_id) return
			setLaunchOverlayPhase('jvm_booting', event.instance_id)
			startLaunchWindowPoll(event.instance_id)
		} else if (event.event === 'finished') {
			// Another instance closing must not dismiss the overlay of the game
			// that is starting right now.
			const overlayInstanceId = getLaunchOverlayState().instanceId
			if (overlayInstanceId && event.instance_id && overlayInstanceId !== event.instance_id) return
			stopLaunchWindowPoll()
			hideLaunchOverlay('terminated')
		}
	},
	appEvents,
)

useAppEvent(
	'log',
	(event) => {
		if (!event) return
		const overlayState = getLaunchOverlayState()
		if (!overlayState.visible) return
		if (
			overlayState.instanceId &&
			event.instance_id &&
			overlayState.instanceId !== event.instance_id
		) {
			return
		}
		const message = typeof event.message === 'string' ? event.message : ''
		if (!message) return
		if (isMinecraftGameWindowLogLine(message)) {
			stopLaunchWindowPoll()
			completeAndHideLaunchOverlay(event.instance_id)
		} else if (isMinecraftEarlyBootLogLine(message)) {
			setLaunchOverlayPhase('loading_game', event.instance_id)
		}
	},
	appEvents,
)

async function handleCommand(e) {
	if (!e) return

	if (e.event === 'RunMRPack') {
		// RunMRPack should directly install a local mrpack given a path
		if (e.path.endsWith('.mrpack')) {
			const location = { type: 'fromFile', path: e.path }
			const preview = await install_get_modpack_preview(location).catch(handleError)
			if (preview?.unknownFile || preview?.externalFilesInModpack.length > 0) {
				const splitPath = e.path.split(/[\\/]/)
				const fileName = splitPath ? splitPath[splitPath.length - 1] : e.path
				unknownPackWarningModal.value?.show(
					async () => {
						const job = await install_create_modpack_instance(location).catch(handleError)
						if (job) await router.replace({ name: 'Home' })
					},
					fileName,
					preview.externalFilesInModpack,
				)
			} else {
				// Minekube Shield: a pack opened from outside never installs silently.
				const splitPath = e.path.split(/[\\/]/)
				const fileName = splitPath[splitPath.length - 1] || e.path
				const confirmed = await linkConfirmModal.value?.ask({
					title: formatMessage(messages.linkConfirmPackTitle),
					text: formatMessage(messages.linkConfirmPackText, { name: fileName }),
					confirmLabel: formatMessage(messages.linkConfirmInstall),
				})
				if (!confirmed) return
				const job = await install_create_modpack_instance(location).catch(handleError)
				if (job) await router.replace({ name: 'Home' })
			}
		}
	} else if (e.event === 'LaunchInstance') {
		const instance = await getInstance(e.id).catch(handleError)
		if (!instance || instance.quarantined) return

		if (e.server) {
			await start_join_server(e.id, e.server).catch(handleError)
		} else if (e.singleplayer_world) {
			await start_join_singleplayer_world(e.id, e.singleplayer_world).catch(handleError)
		} else {
			await run(e.id, null, { name: instance.name }).catch(handleError)
		}
	} else if (e.event === 'InstallServer') {
		await router.push(`/project/${e.id}`)
		// Minekube Shield: a server link from the browser opens the server's
		// page; joining (and installing its content) needs a confirmation.
		const project = await get_project_v3(e.id, 'must_revalidate').catch(() => null)
		const confirmed = await linkConfirmModal.value?.ask({
			title: formatMessage(messages.linkConfirmServerTitle),
			text: formatMessage(messages.linkConfirmServerText, { name: project?.name ?? e.id }),
			confirmLabel: formatMessage(messages.linkConfirmPlay),
		})
		if (!confirmed) return
		await playServerProject(e.id).catch(handleError)
	} else if (e.event === 'InstallSharedInstanceInvite') {
		// Shared instances were a Modrinth account feature; they are not part of
		// Minekube Launcher, so invite links are ignored.
		addNotification({
			title: formatMessage(messages.linkUnsupportedTitle),
			text: formatMessage(messages.linkUnsupportedText),
			type: 'info',
		})
	} else if (e.event === 'InstallVersion') {
		const version = await get_version(e.id, 'must_revalidate').catch(handleError)
		if (version) {
			await contentInstall
				.install(version.project_id, version.id, null, 'URLConfirmModal', undefined, undefined, {
					showProjectInfo: true,
				})
				.catch(handleError)
		}
	} else {
		await contentInstall
			.install(e.id, null, null, 'URLConfirmModal', undefined, undefined, { showProjectInfo: true })
			.catch(handleError)
	}
}

const appUpdateDownload = {
	progress: appUpdateState.progress,
	version: ref(),
}
let unlistenUpdateDownload

const {
	metered,
	finishedDownloading,
	downloading,
	restarting,
	availableUpdate,
	updateSize,
	updatesEnabled,
	autoUpdatesEnabled,
} = appUpdateState
let delayedUpdatePopupTimeout = null

const updatePopupMessages = defineMessages({
	updateAvailable: {
		id: 'app.update-popup.title',
		defaultMessage: 'Update available',
	},
	downloadComplete: {
		id: 'app.update-popup.download-complete',
		defaultMessage: 'Download complete',
	},
	meteredBody: {
		id: 'app.update-popup.body.metered',
		defaultMessage: `Minekube Launcher v{version} is available now! Since you're on a metered network, we didn't automatically download it.`,
	},
	downloadedBody: {
		id: 'app.update-popup.body.download-complete',
		defaultMessage: `Minekube Launcher v{version} has finished downloading. Reload to update now, or automatically when you close Minekube Launcher.`,
	},
	linuxBody: {
		id: 'app.update-popup.body.linux',
		defaultMessage:
			'Minekube Launcher v{version} is available. Use your package manager to update for the latest features and fixes!',
	},
	reload: {
		id: 'app.update-popup.reload',
		defaultMessage: 'Reload to update',
	},
	download: {
		id: 'app.update-popup.download',
		defaultMessage: 'Download ({size})',
	},
	changelog: {
		id: 'app.update-popup.changelog',
		defaultMessage: 'Changelog',
	},
})

function clearDelayedUpdatePopup() {
	if (delayedUpdatePopupTimeout !== null) {
		clearTimeout(delayedUpdatePopupTimeout)
		delayedUpdatePopupTimeout = null
	}
}

function getCurrentUpdatePromptStage() {
	return finishedDownloading.value ? 'downloaded' : 'available'
}

function scheduleDelayedUpdatePopup() {
	clearDelayedUpdatePopup()

	const version = availableUpdate.value?.version
	if (!version) {
		return
	}

	const nextPopupTime = getNextAppUpdatePopupTime(version, getCurrentUpdatePromptStage())
	if (nextPopupTime === null) {
		return
	}

	const delay = nextPopupTime - Date.now()
	if (delay <= 0) {
		showDelayedUpdatePopup()
		return
	}

	delayedUpdatePopupTimeout = setTimeout(showDelayedUpdatePopup, Math.min(delay, 2_147_483_647))
}

function showDelayedUpdatePopup() {
	const update = availableUpdate.value
	if (!update) {
		return
	}

	const stage = getCurrentUpdatePromptStage()
	const nextPopupTime = getNextAppUpdatePopupTime(update.version, stage)
	if (nextPopupTime === null) {
		return
	}

	if (Date.now() < nextPopupTime) {
		scheduleDelayedUpdatePopup()
		return
	}

	if (metered.value && !finishedDownloading.value) {
		addPopupNotification({
			contentType: 'standard',
			title: formatMessage(updatePopupMessages.updateAvailable),
			text: formatMessage(updatePopupMessages.meteredBody, { version: update.version }),
			type: 'info',
			autoCloseMs: null,
			buttons: [
				{
					label: formatMessage(updatePopupMessages.download, {
						size: formatBytes(updateSize.value ?? 0),
					}),
					action: () => downloadAvailableAppUpdate(),
					color: 'brand',
				},
				{
					label: formatMessage(updatePopupMessages.changelog),
					action: () => openAppUpdateChangelog(),
					keepOpen: true,
				},
			],
		})
	} else if (finishedDownloading.value) {
		addPopupNotification({
			contentType: 'standard',
			title: formatMessage(updatePopupMessages.downloadComplete),
			text: formatMessage(updatePopupMessages.downloadedBody, {
				version: update.version,
			}),
			type: 'success',
			autoCloseMs: null,
			buttons: [
				{
					label: formatMessage(updatePopupMessages.reload),
					action: () => installAvailableAppUpdate(),
					color: 'brand',
				},
				{
					label: formatMessage(updatePopupMessages.changelog),
					action: () => openAppUpdateChangelog(),
					keepOpen: true,
				},
			],
		})
	} else {
		scheduleDelayedUpdatePopup()
		return
	}

	markAppUpdatePopupShown(update.version, stage)
}

async function checkUpdates() {
	// Automatic updates are opt-in: until the player turns them on in the
	// "Updates" menu, only a manual check from that menu reaches out.
	if (!autoUpdatesEnabled.value) {
		console.log('Skipping automatic update check as automatic updates are turned off')
		return
	}

	try {
		if (!(await areUpdatesEnabled())) {
			console.log('Skipping update check as updates are disabled in this build or environment')
			updatesEnabled.value = false

			const [platform, development] = await Promise.all([getOS(), isDev()])
			if (platform === 'Linux' && !development) {
				void checkLinuxUpdates()
				setInterval(() => void checkLinuxUpdates(), 5 * 60 * 1000)
			}
			return
		}

		const update = await invoke('plugin:updater|check')
		if (!update) {
			console.log('No update available')
			return
		}

		const isExistingUpdate = update.version === availableUpdate.value?.version
		if (isExistingUpdate) {
			console.log('Update is already known')
			scheduleDelayedUpdatePopup()
			return
		}

		appUpdateDownload.progress.value = 0
		finishedDownloading.value = false
		downloading.value = false
		updateSize.value = null
		availableUpdate.value = update

		console.log(`Update ${update.version} is available.`)
		metered.value = await isNetworkMetered()
		if (!metered.value) {
			console.log('Starting download of update')
			void downloadUpdate(update)
		} else {
			console.log('Metered connection detected, not auto-downloading update.')
			markAppUpdateActionable(update.version)
			scheduleDelayedUpdatePopup()
		}

		void getUpdateSize(update.rid)
			.then((size) => (updateSize.value = size))
			.catch((error) => console.warn('Failed to get update size', error))
	} catch (error) {
		console.warn('Failed to check for launcher updates', error)
	} finally {
		if (updatesEnabled.value && autoUpdatesEnabled.value) {
			window.setTimeout(() => void checkUpdates(), 5 * 60 * 1000)
		}
	}
}

watch(autoUpdatesEnabled, (enabled) => {
	if (enabled) {
		void checkUpdates()
	}
})

async function checkLinuxUpdates() {
	try {
		const [response, currentVersion] = await Promise.all([
			fetch('https://api.github.com/repos/MinekubeStudios/MinekubeLauncher/releases/latest', {
				headers: { Accept: 'application/vnd.github+json' },
			}),
			getVersion(),
		])
		if (!response.ok) return
		const release = await response.json()
		const latestVersion =
			typeof release?.tag_name === 'string' ? release.tag_name.replace(/^v/i, '') : null

		if (latestVersion && latestVersion !== currentVersion) {
			markAppUpdateActionable(latestVersion)
			const nextPopupTime = getNextAppUpdatePopupTime(latestVersion)
			if (nextPopupTime !== null && Date.now() >= nextPopupTime) {
				addPopupNotification({
					contentType: 'standard',
					title: formatMessage(updatePopupMessages.updateAvailable),
					text: formatMessage(updatePopupMessages.linuxBody, { version: latestVersion }),
					type: 'info',
					autoCloseMs: null,
				})
				markAppUpdatePopupShown(latestVersion)
			}
		}
	} catch (e) {
		console.error('Failed to check for updates:', e)
	}
}

async function downloadAvailableUpdate() {
	return downloadUpdate(availableUpdate.value)
}

async function downloadUpdate(versionToDownload) {
	if (!versionToDownload) {
		handleError(formatMessage(messages.updateDownloadMissingVersion))
		return
	}

	if (downloading.value || appUpdateDownload.progress.value !== 0) {
		console.error(`Update ${versionToDownload.version} already downloading`)
		return
	}

	console.log(`Downloading update ${versionToDownload.version}`)
	downloading.value = true

	try {
		unlistenUpdateDownload = await subscribeToDownloadProgress(
			appEvents,
			appUpdateDownload,
			versionToDownload.version,
		)
		await enqueueUpdateForInstallation(versionToDownload.rid)
		downloading.value = false
		finishedDownloading.value = true
		console.log('Finished downloading!')
		markAppUpdateActionable(versionToDownload.version, 'downloaded')
		scheduleDelayedUpdatePopup()
	} catch (error) {
		downloading.value = false
		appUpdateDownload.progress.value = 0
		handleError(error)
	} finally {
		unlistenUpdateDownload?.()
		unlistenUpdateDownload = null
	}
}

async function installUpdate() {
	restarting.value = true

	try {
		await setRestartAfterPendingUpdate(true)
	} catch (e) {
		restarting.value = false
		handleError(e)
		return
	}
	setTimeout(async () => {
		await handleClose()
	}, 250)
}

setAppUpdateActions({
	download: downloadAvailableUpdate,
	install: installUpdate,
	changelog: () => openUrl('https://github.com/MinekubeStudios/MinekubeLauncher/releases'),
})

async function openModrinthProjectLinkInApp(parsed) {
	const { slug, pathSuffix, url } = parsed
	const loadToken = loading.begin()
	try {
		const { id } = await tauriApiClient.labrinth.projects_v2.check(slug)
		const query = mergeUrlQuery(route.query, url)
		await router.push({
			path: `/project/${id}${pathSuffix}`,
			query,
			hash: url.hash || undefined,
		})
	} catch (err) {
		if (err instanceof ModrinthApiError && err.statusCode === 404) {
			openUrl(url.href)
		} else {
			handleError(err)
		}
	} finally {
		loading.end(loadToken)
	}
}

function handleClick(e) {
	let target = e.target
	while (target != null) {
		if (target.matches('a')) {
			if (
				target.href &&
				['http://', 'https://', 'mailto:', 'tel:'].some((v) => target.href.startsWith(v)) &&
				!target.classList.contains('router-link-active') &&
				!target.href.startsWith('http://localhost') &&
				!target.href.startsWith('https://tauri.localhost') &&
				!target.href.startsWith('http://tauri.localhost')
			) {
				const parsed = parseModrinthLink(target.href)
				if (target.target !== '_blank' && parsed) {
					void openModrinthProjectLinkInApp(parsed)
				} else {
					openUrl(target.href)
				}
			}
			e.preventDefault()
			break
		}
		target = target.parentElement
	}
}

function handleAuxClick(e) {
	// disables middle click -> new tab
	if (e.button === 1) {
		e.preventDefault()
		// instead do a left click
		const event = new MouseEvent('click', {
			view: window,
			bubbles: true,
			cancelable: true,
		})
		e.target.dispatchEvent(event)
	}
}

function handleContextMenu(event) {
	const target = event.target
	if (target instanceof Element) {
		if (target.closest('img, textarea, [contenteditable="true"]')) return
		const input = target.closest('input')
		if (
			input &&
			!['button', 'checkbox', 'radio', 'submit', 'reset', 'file', 'range'].includes(input.type)
		) {
			return
		}
	}

	const selection = window.getSelection()
	if (
		target instanceof Node &&
		selection &&
		!selection.isCollapsed &&
		selection.containsNode(target, true)
	) {
		return
	}

	event.preventDefault()
}

provideAppUpdateDownloadProgress(appUpdateDownload)
</script>

<template>
	<LauncherBackground />
	<TooltipDirective />
	<SplashScreen
		v-if="!stateFailed"
		ref="splashScreen"
		data-tauri-drag-region
		@ready="onSplashReady"
	/>
	<WelcomeTourModal
		v-if="stateInitialized && splashReady && !stateFailed"
		ref="welcomeTour"
		:ready="splashReady"
		@finish="onWelcomeFinished"
	/>
	<div id="teleports"></div>
	<div
		v-if="stateInitialized"
		class="app-grid-layout relative"
		:class="{
			'disable-advanced-rendering': !appTheme.advancedRendering,
		}"
	>
		<Transition name="fade">
			<div
				v-if="restarting"
				data-tauri-drag-region
				class="inset-0 fixed bg-black/85 z-[200] flex items-center justify-center"
			>
				<span
					data-tauri-drag-region
					class="flex items-center gap-4 text-contrast font-semibold text-xl select-none cursor-default"
				>
					<IconThemeGlyph
						name="refresh"
						:theme="iconTheme.active"
						data-tauri-drag-region
						class="animate-spin w-6 h-6"
					/>
					{{ formatMessage(messages.restarting) }}
				</span>
			</div>
		</Transition>
		<!--
			The launch overlay belongs on <body>: inside `.app-grid-layout` it was
			trapped in that element's stacking context (z-index: 1) and the page
			content, which is painted later, covered all of it except the corners
			that spilled over the top bar. Teleporting it keeps the launch sequence
			above the whole launcher.
		-->
		<Teleport to="body">
			<MinecraftLaunchOverlay />
		</Teleport>
		<AppSettingsModal ref="appSettingsModal" />
		<SupportProjectModal ref="supportProjectModal" />
		<CreationFlowModal
			ref="installationModal"
			type="instance"
			show-snapshot-toggle
			:fetch-existing-instance-names="fetchExistingInstanceNames"
			:search-projects="searchProjects"
			:prepare-project-install="prepareCreationProjectInstall"
			:create-project-install="handleCreateAndInstall"
			:get-loader-manifest="getLoaderManifest"
			:randomize-instance-icon="randomizeCreationIcon"
			:customize-instance-icon="customizeCreationIcon"
			@create="handleCreate"
			@browse-modpacks="handleBrowseModpacks"
		/>
		<IconEditorModal
			ref="creationIconEditorModal"
			:config="creationGeneratedIcon?.config"
			@saved="onCreationIconSaved"
		/>
		<UnknownPackWarningModal ref="unknownPackWarningModal" />
		<LinkConfirmModal ref="linkConfirmModal" />
		<ModScanWarningModal />
		<div
			data-tauri-drag-region
			class="app-grid-statusbar bg-bg-raised h-[--top-bar-height] flex items-center"
		>
			<div
				data-tauri-drag-region
				class="flex min-w-0 flex-1 items-center overflow-hidden p-2 gap-2"
			>
				<RouterLink
					v-tooltip.bottom="
						launcherVersion ? `Minekube Launcher ${launcherVersion}` : 'Minekube Launcher'
					"
					to="/"
					:aria-label="formatMessage(messages.home)"
					class="logo-home-link flex h-[34px] min-w-[34px] w-[34px] shrink-0 select-none items-center justify-center rounded-lg border border-surface-4 p-0 no-underline transition-colors hover:bg-button-bg"
				>
					<img
						:src="launcherLogo"
						alt="Minekube Launcher"
						class="h-7 w-7 shrink-0 pointer-events-none object-contain"
						draggable="false"
					/>
				</RouterLink>

				<div data-tauri-drag-region class="ml-2 flex shrink-0 items-center gap-1">
					<IconButton
						type="outlined"
						:label="formatMessage(canNavigateBack ? messages.goBack : messages.home)"
						class="!h-[34px] !min-w-[34px] !w-[34px] !border !border-surface-4 !p-0 !opacity-100"
						@click="navigateBack"
					>
						<IconThemeGlyph
							name="chevron-left"
							:theme="iconTheme.active"
							class="!size-4 !text-primary"
						/>
					</IconButton>
					<IconButton
						type="outlined"
						:label="formatMessage(messages.goForward)"
						class="!h-[34px] !min-w-[34px] !w-[34px] !border !border-surface-4 !p-0 !opacity-100"
						:disabled="!canNavigateForward"
						@click="router.forward()"
					>
						<IconThemeGlyph
							name="chevron-right"
							:theme="iconTheme.active"
							class="!size-4 !text-primary"
							:class="{ 'opacity-20': !canNavigateForward }"
						/>
					</IconButton>
				</div>

				<!-- Prism-like main toolbar: Add Instance | Folders, Settings, Help -->
				<div
					data-tauri-drag-region
					class="main-toolbar-prism ml-1 flex shrink-0 items-center gap-1 pr-2 mr-1"
				>
					<Button
						type="outlined"
						size="sm"
						color="brand"
						:class="launcherToolbarPill"
						:aria-label="formatMessage(messages.toolbarAddInstance)"
						@click="openInstanceCreation"
					>
						<PlusIcon class="size-4 shrink-0" />
						<span class="main-toolbar-text">{{ formatMessage(messages.toolbarAddInstance) }}</span>
					</Button>

					<TeleportOverflowMenu
						:label="formatMessage(messages.toolbarFolders)"
						:options="foldersMenuOptions"
						:icon-only="false"
						:circular="false"
						type="outlined"
						size="sm"
						color="brand"
						:class="launcherToolbarPill"
					>
						<FolderOpenIcon class="size-4 shrink-0" />
						<span class="main-toolbar-text">{{ formatMessage(messages.toolbarFolders) }}</span>
					</TeleportOverflowMenu>

					<Button
						type="outlined"
						size="sm"
						color="brand"
						:class="launcherToolbarPill"
						:aria-label="formatMessage(commonMessages.settingsLabel)"
						@click="() => appSettingsModal?.show()"
					>
						<SettingsIcon class="size-4 shrink-0" />
						<span class="main-toolbar-text">{{ formatMessage(commonMessages.settingsLabel) }}</span>
					</Button>

					<TeleportOverflowMenu
						:label="formatMessage(messages.toolbarHelp)"
						:options="helpMenuOptions"
						:icon-only="false"
						:circular="false"
						type="outlined"
						size="sm"
						color="brand"
						:class="launcherToolbarPill"
					>
						<InfoIcon class="size-4 shrink-0" />
						<span class="main-toolbar-text">{{ formatMessage(messages.toolbarHelp) }}</span>
						<template #support="{ option }">
							<HeartIcon class="size-5 shrink-0 help-support-heart" aria-hidden="true" />
							<span class="help-support-text">{{ option.label }}</span>
						</template>
					</TeleportOverflowMenu>

					<span class="main-toolbar-separator" aria-hidden="true"></span>

					<LauncherUpdateButton />
				</div>

				<div data-tauri-drag-region class="ml-1 min-w-0 flex-1" />
			</div>
			<section data-tauri-drag-region class="flex shrink-0 ml-auto items-center gap-1">
				<IconButton
					v-if="!forceSidebar && appSettings.toggleSidebar"
					size="sm"
					:type="sidebarToggled ? 'base' : 'quiet'"
					:label="formatMessage(messages.toggleSidebar)"
					:aria-pressed="!sidebarToggled"
					class="!h-[34px] !min-w-[34px] !w-[34px] mr-1 transition-transform"
					:class="{ 'rotate-180': !sidebarToggled }"
					@click="sidebarToggled = !sidebarToggled"
				>
					<IconThemeGlyph name="arrow-right" :theme="iconTheme.active" />
				</IconButton>
				<div class="flex mr-2">
					<Suspense>
						<AppActionBar />
					</Suspense>
				</div>
				<WindowControls />
			</section>
		</div>
	</div>
	<div
		v-if="stateInitialized"
		class="app-contents"
		:class="{
			'sidebar-enabled': sidebarVisible,
			'disable-advanced-rendering': !appTheme.advancedRendering,
		}"
	>
		<div class="app-viewport flex-grow router-view">
			<div
				class="loading-indicator-container h-8 fixed z-50 pointer-events-none"
				:style="{
					top: 'calc(var(--top-bar-height))',
					left: '0',
					width: 'calc(100% - var(--right-bar-width))',
				}"
			>
				<LoadingBar position="absolute" />
			</div>
			<div
				v-if="appSettings.featureFlags.page_path"
				class="absolute bottom-0 left-0 m-2 bg-tooltip-bg text-tooltip-text font-semibold rounded-full px-2 py-1 text-xs z-50"
			>
				{{ route.fullPath }}
			</div>
			<div
				id="background-teleport-target"
				class="absolute h-full -z-10 rounded-tl-[--radius-xl] overflow-hidden"
				:style="{
					width: 'calc(100% - var(--right-bar-width))',
				}"
			></div>
			<Admonition
				v-if="authUnreachable"
				type="warning"
				:header="formatMessage(messages.authUnreachableHeader)"
				class="m-6 mb-0"
			>
				{{ formatMessage(messages.authUnreachableBody) }}
			</Admonition>
			<div ref="routeViewHost" class="contents">
				<RouterView v-slot="{ Component, route: pageRoute }">
					<template v-if="Component && !routeViewError">
						<Suspense
							:key="routeViewEpoch"
							@pending="onSuspensePending"
							@resolve="onSuspenseResolve"
						>
							<Transition
								:name="routeTransitionName"
								mode="out-in"
								@before-leave="onRouteTransitionStart"
								@after-leave="onRouteTransitionLeft"
								@leave-cancelled="onRouteTransitionLeft"
								@before-enter="onRouteTransitionStart"
								@after-enter="onRouteTransitionEntered"
								@enter-cancelled="onRouteTransitionEntered"
							>
								<KeepAlive v-if="fastLoading" :max="4">
									<component :is="Component" :key="routePageKey(pageRoute)"></component>
								</KeepAlive>
								<component :is="Component" v-else :key="routePageKey(pageRoute)"></component>
							</Transition>
						</Suspense>
					</template>
				</RouterView>
			</div>
			<!--
				A routed page whose async setup rejects would otherwise leave the
				content area empty forever (Suspense never resolves). This panel is
				the visible safety net — the watchdogs above reset it via Retry.
			-->
			<Admonition
				v-if="routeViewError"
				type="error"
				:header="formatMessage(messages.routeViewErrorHeader)"
				class="m-6"
			>
				<p class="m-0 mb-3">
					{{ formatMessage(messages.routeViewErrorBody) }}
				</p>
				<Button @click="retryRouteView">{{ formatMessage(messages.routeViewErrorRetry) }}</Button>
			</Admonition>
		</div>
		<div
			class="app-sidebar mt-px shrink-0 flex flex-col border-0 border-l-[1px] border-[--brand-gradient-border] border-solid"
		>
			<div
				v-overlay-scrollbars="sidebarOverlayScrollbarsOptions"
				class="app-sidebar-scrollable flex-grow shrink relative"
				:class="sidebarCharacterActive && hasLoggedIntoMinecraft ? 'pb-[22rem]' : 'pb-12'"
				data-overlayscrollbars-initialize
			>
				<div id="sidebar-teleport-target" class="sidebar-teleport-content"></div>
				<div class="sidebar-default-content" :class="{ 'sidebar-enabled': sidebarVisible }">
					<div class="p-4 border-0 border-b-[1px] border-[--brand-gradient-border] border-solid">
						<h3 class="text-base text-primary font-medium m-0">
							{{ formatMessage(messages.playingAs) }}
						</h3>
						<suspense>
							<AccountsCard ref="accounts" @change="refreshMinecraftAccounts" />
						</suspense>
					</div>
					<Suspense>
						<SidebarInstanceToolbar />
					</Suspense>
				</div>
			</div>
		</div>
	</div>
	<SidebarPlayerCharacter v-if="hasLoggedIntoMinecraft && sidebarVisible" />
	<MinekubeEffectsLayer />
	<I18nDebugPanel />
	<NotificationPanel :has-sidebar="sidebarVisible" />
	<PopupNotificationPanel :has-sidebar="sidebarVisible" />
	<ErrorModal ref="errorModal" />
	<MinecraftAuthErrorModal ref="minecraftAuthErrorModal" />
	<MinecraftRequiredModal ref="minecraftRequiredModal" />
	<LocalAccountModal ref="localAccountModal" />
	<ContentInstallModal
		ref="modInstallModal"
		:instances="contentInstallInstances"
		:compatible-loaders="contentInstallLoaders"
		:game-versions="contentInstallGameVersions"
		:loading="contentInstallLoading"
		:default-tab="contentInstallDefaultTab"
		:preferred-loader="contentInstallPreferredLoader"
		:preferred-game-version="contentInstallPreferredGameVersion"
		:release-game-versions="contentInstallReleaseGameVersions"
		:project-info="contentInstallProjectInfo"
		:randomize-icon="randomizeCreationIcon"
		:customize-icon="customizeContentInstallIcon"
		@install="handleInstallToInstance"
		@create-and-install="handleCreateAndInstall"
		@navigate="handleContentInstallNavigate"
		@cancel="handleContentInstallCancel"
	/>
	<ModpackAlreadyInstalledModal
		ref="modpackAlreadyInstalledModal"
		@create-anyway="handleModpackDuplicateCreateAnyway"
		@go-to-instance="handleModpackDuplicateGoToInstance"
	/>
	<AddServerToInstanceModal ref="addServerToInstanceModal" />
	<ContentUpdaterModal
		ref="incompatibilityWarningModal"
		mode="incompatibility-warning"
		:versions="contentInstallIncompatibilityWarningVersions"
		:current-game-version="contentInstallIncompatibilityWarningCurrentGameVersion"
		:current-loader="contentInstallIncompatibilityWarningCurrentLoader"
		current-version-id=""
		:is-app="true"
		:project-type="contentInstallIncompatibilityWarningProjectType"
		:project-icon-url="contentInstallIncompatibilityWarningProjectIconUrl"
		:project-name="contentInstallIncompatibilityWarningProjectName"
		:warning="contentInstallIncompatibilityWarningMessage"
		:action-loading="contentInstallIncompatibilityWarningInstalling"
		@update="handleContentInstallIncompatibilityWarningInstall"
		@cancel="handleContentInstallIncompatibilityWarningCancel"
	/>
	<ModpackAlreadyInstalledModal
		ref="contentInstallModpackAlreadyInstalledModal"
		@create-anyway="handleContentInstallModpackDuplicateCreateAnyway"
		@go-to-instance="handleContentInstallModpackDuplicateGoToInstance"
	/>
	<InstallToPlayModal ref="installToPlayModal" :show-external-warnings="false" />
	<UpdateToPlayModal ref="updateToPlayModal" :show-external-warnings="false" />
</template>

<style lang="scss" scoped>
.app-grid-layout,
.app-contents {
	--top-bar-height: 3rem;
	--right-bar-width: 300px;
}

.app-grid-layout {
	display: grid;
	grid-template: 'status' 'nav';
	grid-template-columns: minmax(0, 1fr);
	grid-template-rows: auto minmax(0, 1fr);
	position: relative;
	z-index: 1;
	background-color: var(--color-raised-bg);
	height: 100vh;
}

.app-grid-statusbar {
	grid-area: status;
	padding-right: var(--window-controls-width, 0px);
	position: relative;
	z-index: 2;
	background-color: var(--launcher-surface-raised, var(--color-raised-bg));
}

.main-toolbar-prism {
	// Prism-like: icon + text beside icon, collapses to icon-only when narrow
	display: flex;
	align-items: center;
}

.main-toolbar-prism .main-toolbar-text {
	white-space: nowrap;
}

/* Small grey straight slash that keeps Updates visually attached to Help
   without turning the two into a single control. */
.main-toolbar-separator {
	flex: 0 0 auto;
	width: 1px;
	height: 18px;
	margin: 0 0.375rem;
	border-radius: 999px;
	background-color: color-mix(in srgb, var(--color-secondary) 65%, transparent);
}

@media (max-width: 1200px) {
	.main-toolbar-prism .main-toolbar-text {
		display: none;
	}
}

@media (max-width: 900px) {
	.main-toolbar-prism {
		gap: 0 !important;
	}
}

@media (prefers-reduced-motion: no-preference) {
	.app-grid-layout,
	.app-grid-statusbar,
	.app-contents,
	.app-sidebar {
		transition: background-color 0.25s ease-in-out;
	}
}

[data-tauri-drag-region-exclude] {
	-webkit-app-region: no-drag;
}

.app-contents {
	position: absolute;
	z-index: 1;
	left: 0;
	top: var(--top-bar-height);
	right: 0;
	bottom: 0;
	height: calc(100vh - var(--top-bar-height));
	background-color: var(--launcher-surface-bg, var(--color-bg));
	border-top-left-radius: var(--radius-xl);

	display: grid;
	grid-template-columns: 1fr 0px;
	// transition: grid-template-columns 0.4s ease-in-out;

	&.sidebar-enabled {
		grid-template-columns: 1fr 300px;
	}

	// The loading bar, page backgrounds, toasts and floating action bars leave
	// room for the right sidebar only while it is actually shown.
	&:not(.sidebar-enabled) {
		--right-bar-width: 0px;
	}
}

.loading-indicator-container {
	border-top-left-radius: var(--radius-xl);
	overflow: hidden;
}

.app-sidebar {
	overflow: visible;
	width: 300px;
	position: relative;
	height: calc(100vh - var(--top-bar-height));
	// The brand gradient stays on top of the launcher wallpaper tint, so the
	// sidebar keeps its Minekube flavor in front of any background.
	background-color: var(--launcher-surface-sidebar, transparent);
	background-image: var(--brand-gradient-bg);

	--color-button-bg: var(--brand-gradient-button);
	--surface-4: var(--brand-gradient-button);
	--color-button-bg-hover: var(--brand-gradient-border);
	--surface-5: var(--brand-gradient-border);
	--color-divider: var(--brand-gradient-border);
	--color-divider-dark: var(--brand-gradient-border);
}

.disable-advanced-rendering {
	.app-sidebar::before {
		box-shadow: none;
	}

	&.app-contents::before {
		box-shadow: none;
	}

	*,
	:deep(*) {
		box-shadow: none !important;
		--tw-drop-shadow:;
	}
}

.app-sidebar::before {
	content: '';
	box-shadow: -15px 0 15px -15px rgba(0, 0, 0, 0.1) inset;
	top: 0;
	bottom: 0;
	left: -2rem;
	width: 2rem;
	position: absolute;
	pointer-events: none;
}

.app-viewport {
	flex-grow: 1;
	height: 100%;
	overflow: auto;
	overflow-x: hidden;
	scrollbar-gutter: stable;
}

.app-contents::before {
	z-index: 30;
	content: '';
	position: fixed;
	left: 0;
	top: var(--top-bar-height);
	right: 0;
	bottom: 0;
	border-radius: var(--radius-xl);
	box-shadow: 1px 1px 15px rgba(0, 0, 0, 0.1) inset;
	border-color: var(--surface-5);
	border-width: 1px;
	border-style: solid;
	pointer-events: none;
}

.sidebar-teleport-content {
	display: contents;
}

.sidebar-default-content {
	display: none;
}

.sidebar-teleport-content:empty + .sidebar-default-content.sidebar-enabled {
	display: contents;
}

@media (prefers-reduced-motion: no-preference) {
	.nav-button-animated-enter-active {
		transition: all 0.5s cubic-bezier(0.15, 1.4, 0.64, 0.96);
	}

	.nav-button-animated-leave-active {
		transition: all 0.25s ease;
	}

	.nav-button-animated-enter-active {
		position: relative;
	}

	.nav-button-animated-enter-active::before {
		content: '';
		inset: 0;
		border-radius: 100vw;
		background-color: var(--color-brand-highlight);
		position: absolute;
		animation: pop 0.5s ease-in forwards;
		opacity: 0;
	}

	@keyframes pop {
		0% {
			scale: 0.5;
		}
		50% {
			opacity: 0.5;
		}
		100% {
			scale: 1.5;
		}
	}

	.nav-button-animated-enter-from {
		scale: 0.5;
		translate: -2rem 0;
		opacity: 0;
	}

	.nav-button-animated-leave-to {
		scale: 0.75;
		opacity: 0;
	}

	.fade-enter-active {
		transition: 0.25s ease-in-out;
	}

	.fade-enter-from {
		opacity: 0;
	}
}
</style>
<style>
html[data-launcher-background] .app-grid-layout {
	background-color: transparent;
}

/* Transparent mode: cards and panels inside the launcher turn to glass over
   the wallpaper. Modals and menus live outside these containers and stay
   solid, so pop-ups always remain easy to read. No backdrop blur is used —
   the wallpaper is already softened once, so this costs nothing per frame. */
html[data-launcher-glass] .app-contents {
	--surface-1: var(--launcher-glass-surface-1);
	--surface-2: var(--launcher-glass-surface-2);
	--surface-3: var(--launcher-glass-surface-3);
	--color-raised-bg: var(--launcher-glass-raised);
}

[data-divider-id='help-support-divider'] {
	background-color: #84858d;
}

.help-support-heart {
	color: #f04d61 !important;
	fill: currentColor;
}

.help-support-text {
	background: linear-gradient(100deg, #eeb74a, #ef5baa);
	background-clip: text;
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
	font-weight: 800;
}

html.light-mode .help-support-text,
html.macos-mode .help-support-text,
html.parchment-mode .help-support-text {
	background-image: linear-gradient(100deg, #975c08, #a82371);
}

.os-theme-dark,
.os-theme-light {
	--os-handle-bg: var(--color-scrollbar) !important;
	--os-handle-bg-hover: var(--color-scrollbar) !important;
	--os-handle-bg-active: var(--color-scrollbar) !important;
}

.app-grid-statusbar {
	padding-left: 0.25rem;
}

.mac-traffic-lights {
	.app-grid-statusbar {
		padding-left: 5rem;
	}
}

.windows {
	.fake-appbar {
		height: 2.5rem !important;
	}

	.info-card {
		right: 22rem;
	}

	.profile-card {
		right: 8rem;
	}
}

.route-enter-active,
.route-leave-active {
	transition:
		opacity var(--mk-dur-slow, 300ms) var(--mk-ease-standard, cubic-bezier(0.32, 0.72, 0, 1)),
		transform var(--mk-dur-slow, 300ms) var(--mk-ease-standard, cubic-bezier(0.32, 0.72, 0, 1));
	will-change: opacity, transform;
}

.route-enter-from {
	opacity: 0;
	transform: translate3d(0, 0.75rem, 0);
}

.route-leave-to {
	opacity: 0;
	transform: translate3d(0, -0.25rem, 0);
}

/* Skin-selector swap — used only when the shirt button beside an account
   opens or closes the Skin selector page. A soft zoom crossfade going in,
   mirrored coming back, so the toggle reads as one place opening and closing
   again instead of a plain page change. */
.skin-route-fwd-enter-active,
.skin-route-back-enter-active {
	transition:
		opacity var(--mk-dur-base, 200ms) var(--mk-ease-out, cubic-bezier(0.16, 1, 0.3, 1)),
		transform var(--mk-dur-base, 200ms) var(--mk-ease-out, cubic-bezier(0.16, 1, 0.3, 1));
	will-change: opacity, transform;
}

.skin-route-fwd-leave-active,
.skin-route-back-leave-active {
	transition:
		opacity var(--mk-dur-fast, 140ms) var(--mk-ease-in, cubic-bezier(0.55, 0, 1, 0.45)),
		transform var(--mk-dur-fast, 140ms) var(--mk-ease-in, cubic-bezier(0.55, 0, 1, 0.45));
	will-change: opacity, transform;
}

.skin-route-fwd-enter-from {
	opacity: 0;
	transform: translate3d(0, 0.625rem, 0) scale(0.99);
}

.skin-route-fwd-leave-to {
	opacity: 0;
	transform: scale(1.01);
}

.skin-route-back-enter-from {
	opacity: 0;
	transform: translate3d(0, -0.625rem, 0) scale(0.99);
}

.skin-route-back-leave-to {
	opacity: 0;
	transform: scale(1.01);
}

@media (prefers-reduced-motion: reduce) {
	.route-enter-active,
	.route-leave-active {
		transition: none;
		will-change: auto;
	}

	.route-enter-from,
	.route-leave-to {
		transform: none;
	}

	.skin-route-fwd-enter-active,
	.skin-route-fwd-leave-active,
	.skin-route-back-enter-active,
	.skin-route-back-leave-active {
		transition: none;
		will-change: auto;
	}

	.skin-route-fwd-enter-from,
	.skin-route-fwd-leave-to,
	.skin-route-back-enter-from,
	.skin-route-back-leave-to {
		transform: none;
	}
}
</style>
