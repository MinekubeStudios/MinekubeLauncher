/**
 * Storage for the player's own launcher wallpapers.
 *
 * Images are kept as Blobs in IndexedDB, because a wallpaper is easily a few
 * megabytes and would blow up localStorage. Only a small index of ids and
 * names lives in localStorage, so the library is available instantly on the
 * next launch without opening the database first.
 */

export interface LauncherWallpaperMeta {
	id: string
	name: string
	addedAt: number
}

const DB_NAME = 'minekube-launcher-wallpapers'
const DB_VERSION = 1
const STORE_NAME = 'wallpapers'
const INDEX_STORAGE_KEY = 'minekube-launcher-wallpaper-library'

/** Imported wallpapers are scaled down to at most this size. */
export const WALLPAPER_MAX_WIDTH = 2560
export const WALLPAPER_MAX_HEIGHT = 1440

/** Images already below this size are stored untouched to avoid re-encoding. */
const WALLPAPER_KEEP_ORIGINAL_BYTES = 1_200_000

/** Anything larger is re-encoded once more with a lower quality. */
const WALLPAPER_TARGET_BYTES = 6_000_000

export function createWallpaperKey(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID()
	}
	return `wallpaper-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function hasIndexedDb(): boolean {
	return typeof indexedDB !== 'undefined'
}

function openDatabase(): Promise<IDBDatabase | null> {
	if (!hasIndexedDb()) return Promise.resolve(null)

	return new Promise((resolve) => {
		let request: IDBOpenDBRequest
		try {
			request = indexedDB.open(DB_NAME, DB_VERSION)
		} catch {
			resolve(null)
			return
		}

		request.onupgradeneeded = () => {
			const database = request.result
			if (!database.objectStoreNames.contains(STORE_NAME)) {
				database.createObjectStore(STORE_NAME, { keyPath: 'id' })
			}
		}
		request.onsuccess = () => resolve(request.result)
		request.onerror = () => resolve(null)
		request.onblocked = () => resolve(null)
	})
}

function requestResult<T>(request: IDBRequest<T>): Promise<T | null> {
	return new Promise((resolve) => {
		request.onsuccess = () => resolve(request.result)
		request.onerror = () => resolve(null)
	})
}

async function withStore<T>(
	mode: IDBTransactionMode,
	action: (store: IDBObjectStore) => Promise<T>,
	fallback: T,
): Promise<T> {
	const database = await openDatabase()
	if (!database) return fallback

	try {
		// Each action issues a single request, so the transaction is free to
		// commit as soon as that request resolves.
		return await action(database.transaction(STORE_NAME, mode).objectStore(STORE_NAME))
	} catch {
		return fallback
	}
}

/** Reads the localStorage index of imported wallpapers. */
export function readWallpaperIndex(): LauncherWallpaperMeta[] {
	try {
		const raw = localStorage.getItem(INDEX_STORAGE_KEY)
		if (!raw) return []
		const parsed: unknown = JSON.parse(raw)
		if (!Array.isArray(parsed)) return []
		return parsed
			.filter(
				(entry): entry is LauncherWallpaperMeta =>
					typeof entry === 'object' &&
					entry !== null &&
					typeof (entry as LauncherWallpaperMeta).id === 'string' &&
					typeof (entry as LauncherWallpaperMeta).name === 'string',
			)
			.map((entry) => ({
				id: entry.id,
				name: entry.name,
				addedAt: entry.addedAt ?? 0,
			}))
	} catch {
		return []
	}
}

export function writeWallpaperIndex(entries: LauncherWallpaperMeta[]): void {
	try {
		localStorage.setItem(INDEX_STORAGE_KEY, JSON.stringify(entries))
	} catch {
		// Storage may be unavailable — the library then only lasts this session.
	}
}

/** Lists the wallpapers really present in the database, newest first. */
export async function listStoredWallpapers(): Promise<LauncherWallpaperMeta[]> {
	const entries = await withStore<LauncherWallpaperMeta[]>(
		'readonly',
		async (store) => {
			const records = await requestResult(store.getAll())
			return (records ?? [])
				.map((record) => ({
					id: String(record.id),
					name: String(record.name ?? ''),
					addedAt: Number(record.addedAt ?? 0),
				}))
				.sort((a, b) => b.addedAt - a.addedAt)
		},
		[],
	)

	writeWallpaperIndex(entries)
	return entries
}

export async function readWallpaperBlob(key: string): Promise<Blob | null> {
	return await withStore<Blob | null>(
		'readonly',
		async (store) => {
			const record = await requestResult(store.get(key))
			const blob = record?.blob
			return blob instanceof Blob ? blob : null
		},
		null,
	)
}

export async function writeWallpaper(meta: LauncherWallpaperMeta, blob: Blob): Promise<boolean> {
	const database = await openDatabase()
	if (!database) return false

	return new Promise((resolve) => {
		try {
			const transaction = database.transaction(STORE_NAME, 'readwrite')
			transaction.oncomplete = () => resolve(true)
			transaction.onabort = () => resolve(false)
			transaction.onerror = () => resolve(false)
			transaction.objectStore(STORE_NAME).put({ ...meta, blob })
		} catch {
			resolve(false)
		}
	})
}

export async function deleteStoredWallpaper(key: string): Promise<void> {
	await withStore<boolean>(
		'readwrite',
		async (store) => {
			await requestResult(store.delete(key))
			return true
		},
		false,
	)
}

function decodeImage(file: Blob): Promise<HTMLImageElement | null> {
	return new Promise((resolve) => {
		const url = URL.createObjectURL(file)
		const image = new Image()
		image.onload = () => {
			URL.revokeObjectURL(url)
			resolve(image)
		}
		image.onerror = () => {
			URL.revokeObjectURL(url)
			resolve(null)
		}
		image.src = url
	})
}

function encodeCanvas(
	canvas: HTMLCanvasElement,
	type: string,
	quality: number,
): Promise<Blob | null> {
	return new Promise((resolve) => {
		try {
			canvas.toBlob((blob) => resolve(blob && blob.type === type ? blob : null), type, quality)
		} catch {
			resolve(null)
		}
	})
}

/**
 * Scales an imported image down to wallpaper size and re-encodes it, so a
 * 20 MB photo does not end up as a 20 MB entry in the wallpaper library.
 */
export async function prepareWallpaperBlob(file: File): Promise<Blob> {
	const image = await decodeImage(file)
	if (!image) throw new Error('This image could not be opened. Choose a PNG, JPG or WebP file.')

	const width = image.naturalWidth
	const height = image.naturalHeight
	if (!width || !height) return file

	const scale = Math.min(1, WALLPAPER_MAX_WIDTH / width, WALLPAPER_MAX_HEIGHT / height)
	if (scale === 1 && file.size <= WALLPAPER_KEEP_ORIGINAL_BYTES) {
		return file
	}

	try {
		const canvas = document.createElement('canvas')
		canvas.width = Math.max(1, Math.round(width * scale))
		canvas.height = Math.max(1, Math.round(height * scale))
		const context = canvas.getContext('2d')
		if (!context) return file
		context.drawImage(image, 0, 0, canvas.width, canvas.height)

		const webp = await encodeCanvas(canvas, 'image/webp', 0.92)
		if (webp && webp.size <= WALLPAPER_TARGET_BYTES) return webp
		const jpeg = await encodeCanvas(canvas, 'image/jpeg', 0.86)
		if (jpeg) return jpeg
		if (webp) return webp
		return file
	} catch {
		return file
	}
}
