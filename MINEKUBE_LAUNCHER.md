# Minekube Launcher

A rebranded fork of the **Modrinth App** desktop launcher, restyled into the
Minekube brand (gold / orange / magenta on maroon). Built with **Tauri**
(Rust core) + **Vue 3** frontend.

---

## ⚠️ Read this first — the honest limitations

1. **License is GPL‑3.0.** The Modrinth App is licensed under GPL‑3.0, so this
   fork **must stay open source** under GPL‑3.0. You cannot turn it into a
   closed/proprietary product. The original `LICENSE` / `COPYING.md` files are
   kept intact, as the license requires.

2. **It uses Modrinth's backend.** This is a *mod/modpack manager and
   launcher*. Even rebranded, it still fetches mods, versions and metadata from
   **Modrinth's own servers/API** (`api.modrinth.com`). The API URLs are
   compiled into the Rust core from `packages/app-lib/.env.prod`. It is a
   Minekube *skin* over the Modrinth service — not independent infrastructure.
   References to the Modrinth *service* (sign‑in, "Modrinth Servers" hosting,
   API) were intentionally left in place, because the app genuinely uses them —
   renaming them would be misleading.

3. **No Lunar/Badlion‑style in‑game modules.** The Modrinth App has no HUD
   editor, zoom, FPS boost, keystrokes, etc. This fork doesn't add them — that
   would be a separate, much larger project.

4. **Branding removed per COPYING.md.** All Modrinth logo assets were replaced
   (wordmark, splash, app icons, the "Modrinth Wrench" instance icon). The
   product is named **Minekube Launcher**.

---

## What was changed

| Area | Change |
|------|--------|
| Product name | `Modrinth App` → **`Minekube Launcher`** (`apps/app/tauri.conf.json`, window title, `mainBinaryName`, ~84 source/locale files) |
| Bundle identifier | `ModrinthApp` → `com.minekube.launcher` |
| Deep-link scheme | `minekube://` (the `modrinth://` registration was removed so the launcher no longer competes with the Modrinth App) |
| Colors | Minekube palette added as brand overrides at the end of `packages/assets/styles/variables.scss` (gold `#FCC000`, orange `#FC9C00`/`#FC6000`, magenta `#FC0060`, maroon `#480000`). The `green-*` scale is kept for success states. |
| Wordmark | `packages/ui/src/components/brand/TextLogo.vue` → Minekube cube + "MINEKUBE" |
| Splash screen | `apps/app-frontend/src/components/ui/SplashScreen.vue` → Minekube wordmark |
| Loader | `packages/ui/src/components/brand/AnimatedLogo.vue` → spinning Minekube cube |
| App icons | `apps/app/icons/*` regenerated (isometric Minekube cube) |
| Modrinth logo assets | removed `wrench-rinth.png`, `modrinth_app.svg`; dropped the "Modrinth Wrench" instance icon |
| CI | added `.github/workflows/minekube-build.yml` (unsigned Windows `.exe`, macOS `.dmg` and Linux `.deb`/AppImage builds on GitHub-hosted runners) |
| Trimmed | removed `apps/frontend` (the modrinth.com website) and `packages/blog/public` (blog images) — not needed to build the launcher |
| Sidebar account | `apps/app-frontend/src/App.vue` + `components/ui/AccountsCard.vue`: the "Playing as" panel is always shown; a fresh install shows the bundled default head avatar with **Not logged in** instead of an empty sidebar |
| Support section | `Settings → Support project` shows a single heart — the `❤Support project` heading — and the settings entry uses a helping-hands icon |
| Language coverage | the language picker reports how much of the message catalog is translated (`scripts/coverage-i18n.ts`), so a fully translated language shows 100%; source-level interface coverage is still reported as `interfaceCoverage` / `unlocalizedStrings` |
| Czech | `cs-CZ` catalogs are fully translated (app + `packages/ui`) |
| Instance archives | `Create instance` → second option **Upload a file (.zip / .mrpack)**: imports instances exported from Prism Launcher / MultiMC (`.zip` with `instance.cfg` + `mmc-pack.json`, also when nested in a folder) as well as `.mrpack` modpacks (`packages/app-lib/src/api/pack/import/mmc.rs`, `get_instance_archive_kind`). The Prism `.zip` export now carries the instance icon the way Prism does (`<iconKey>.png` next to `instance.cfg`). |

To see the full diff against upstream, run `git diff` after adding the upstream
remote (see below).

---

## Building the Windows installer

### Option A — GitHub Actions (recommended, no local setup)

1. Create a new GitHub repository and push this source to it.
2. Go to the **Actions** tab → **"Minekube Launcher (Windows build)"** →
   **Run workflow**.
3. When it finishes, download the **`Minekube-Launcher-windows-setup`**
   artifact from the run summary. Inside is the `*-setup.exe` installer.

The installer is **unsigned**, so Windows SmartScreen will show a
"Windows protected your PC" warning on first run — click *More info → Run
anyway*. Signing requires a code-signing certificate (see below).

### Option B — One-click on Windows (easiest local route)

Unzip this archive and **double-click `build-windows.bat`**. On first run it
auto-installs the required tools via `winget` (Rust, Node, JDK 17, VS C++ Build
Tools, WebView2), then builds the installer and opens the output folder. First
build takes ~15–25 min (downloads + compile). If it reports a tool is not on
PATH, restart the PC once and run it again.

> If `winget` is missing, install **"App Installer"** from the Microsoft Store.

### Option C — Build locally on Windows (manual steps)

Prerequisites:

- **Rust 1.95.0** (MSVC toolchain) — <https://rustup.rs>
- **Node 24.15.0** (see `.nvmrc`) + **pnpm** via `corepack enable`
- **JDK 17** (Temurin) — the build compiles bundled Java helpers via Gradle
- **Visual Studio Build Tools** (C++ workload) and **WebView2 Runtime**
  (preinstalled on Windows 11)

Then, from the repo root:

```bash
# 1) provide the backend environment (compile-time API URLs)
cp packages/app-lib/.env.prod packages/app-lib/.env

# 2) install JS dependencies (recent Node has no corepack, so use npm to get pnpm)
npm install -g pnpm@10.33.2
pnpm install

# 3) build the unsigned NSIS installer
pnpm --filter=@modrinth/app run tauri build --bundles nsis
```

The installer lands in
`target/release/bundle/nsis/Minekube Launcher_<version>-setup.exe`.

### Code signing (optional)

To avoid the SmartScreen warning you need a code-signing certificate. The
upstream signing setup (jsign + DigiCert ONE) lives in
`apps/app/tauri-release.conf.json`; adapt it to your own certificate, or use any
Authenticode signing tool on the produced `.exe`.

---

## Note on the build environment

This fork was prepared in a Linux cloud sandbox that could not complete a full
`pnpm install` (one dependency is served from `codeload.github.com`, which the
sandbox proxy blocks) and cannot cross‑compile a Windows Tauri installer from
Linux. The actual compile is therefore expected to happen on Windows or via the
GitHub Actions workflow above, where GitHub is reachable. All rebranding source
changes were verified for validity (JSON/YAML/SCSS/Vue structure).

---

## Credits

Based on the **Modrinth App** by Rinth, Inc. and contributors, licensed under
GPL‑3.0. Minekube branding applied to logos, colors and naming. This is an
independent, unofficial fork and is not affiliated with or endorsed by Modrinth.

---

## Debloat & customization update

This build additionally strips out Modrinth-service clutter and adds a new
Visual settings section:

**Removed**
- Advertising: the native ad window and the "Modrinth Hosting / Medal" promo are
  fully disabled (`helpers/ads.js` is now a no-op; the ad panel and consent popup
  never appear).
- Telemetry: PostHog analytics is permanently disabled (`initAnalytics` is a
  no-op — no usage data is collected or sent).
- The "Getting started / Sign in to Modrinth" onboarding checklist.
- The "News" (Novinky) section and the "Modrinth+" upsell link.
- The Pride fundraiser banner.
- The "Modrinth Hosting" left-sidebar nav item (the hosting page is no longer
  reachable from the UI).
- All remaining on-screen "Modrinth" wording is rebranded to "Minekube"
  (display strings only — backend API URLs are untouched, since the app still
  runs on Modrinth's servers).

**Added — Settings → Visual (Vizuál)** (replaces the old Privacy tab)
- **Launcher animations** — master on/off switch for all animations and
  transitions (helps on very weak hardware).
- **Enhanced Optimized Animations** — springy, GPU-accelerated, smooth easing
  across buttons, cards and scrolling. Uses more CPU/GPU but makes the launcher
  feel much more fluid. Implemented via `composables/use-visual.ts` +
  `<html>` classes in `assets/stylesheets/global.scss`; the choice is saved and
  restored on restart.

**Icons**
- App icon (framed cube) → exe / installer / desktop shortcut, and the in-app
  welcome logo.
- Control-panel icon (transparent hexagon) → the running window / taskbar icon
  (set at runtime in `apps/app/src/main.rs`).

**Kept on purpose**
- The "Playing as" Minecraft account card stays in the right sidebar, and the
  Minecraft (Microsoft) sign-in is untouched — it's required to actually play.
  (The Friends list was removed later, with the rest of the Modrinth social
  layer.)

*Verified:* the frontend was type-checked and built successfully
(`vite build`) with all of the above changes.

---

## Privacy & sidebar update

**Modrinth account sign-in fully removed** — the launcher now authenticates with
**Microsoft/Minecraft only**:
- Removed all four Modrinth-account buttons from the left nav (the "Sign in"
  button, account switcher and account menu).
- Removed the friends list and its "Sign in to add friends" prompt from the
  right sidebar (it was a networked social feature tied to that account).
- Removed the Modrinth-account **Profile** and **Social** settings tabs (the
  account forms). Both were later brought back as purely informational panels —
  see *Modrinth services removal & Profile/Social rewrite* at the end.
- The launcher starts in a clean, signed-out state: no account is linked, and
  nothing nags the user. Browsing and installing mods works logged out (the
  Modrinth API is public); a Microsoft account is added only when the user
  wants to actually play.

**New right-sidebar panel** (`components/ui/SidebarStatusPanel.vue`) — replaces
the empty space, all data read locally, no network calls:
- *Game status*: which instances are running right now (polled every 5 s, with a
  pulsing indicator), the most recently played instance with a relative
  timestamp, and total playtime across all instances.
- *System*: instance count, allocated RAM, OS and version, launcher version.

**Deliberately NOT implemented:** an offline/"warez" account that would let the
launcher start pre-signed-in under a fake name such as "Player". In theseus the
`offline_profile` is only a cached copy of an already-verified Microsoft account
(it is filled in after `minecraft_entitlements()` succeeds) so that the launcher
still works without internet. Creating a fake credential would mean bypassing
Minecraft's ownership check, i.e. shipping a piracy bypass — that was declined.

*Verified:* frontend builds successfully (`vite build`) with all of the above.

---

## Branding & effects update

**Remaining Modrinth sign-in removed from settings** — the three "Sync … across
devices" toggles (Appearance / Features / Behavior) all required a Modrinth
account and showed a "Sign into a Minekube account" tooltip. All three are gone,
so nothing in Settings asks for that account any more.

**Sidebar banner cleaned** — the grey band floating in the right sidebar was
`.app-sidebar::after`, a fade-out strip anchored `250px` from the bottom (the
space the removed ad used to occupy). It has been deleted, so the sidebar
gradient is now clean.

**Logo replaced with the Minekube Studios lockup** — the cropped, transparent
logo now lives at `packages/assets/branding/minekube-studios-logo.png` and is
exported as `MinekubeStudiosLogo`. It is used by:
- `packages/ui/src/components/brand/TextLogo.vue` — the top-left wordmark in the
  app (rendered at `h-8` so the "STUDIOS" line stays readable),
- `apps/app-frontend/src/components/ui/SplashScreen.vue` — the loading logo,
  now shown large (`min(26rem, 70vw)`).

**New — Settings → Visual → Enhanced Optimized Effects**
- Adds a particle layer (`components/ui/MinekubeEffectsLayer.vue`): soft floating
  cubes in the Minekube colors drifting upward with a gentle sway and spin, plus
  a brand glow on highlighted elements.
- *Optimized* is literal: each brand color's glowing cube is **pre-rendered once
  into an offscreen sprite** and then blitted with `drawImage`, instead of
  building gradients or using `shadowBlur` per particle per frame. Particle count
  scales with viewport area (18–70), device pixel ratio is capped at 2, the loop
  runs on `requestAnimationFrame`, and it stops entirely when the window is
  hidden or the toggle is off.
- Tied to the master animations switch: turning animations off also switches the
  effects (and enhanced animations) off.

*Verified:* frontend builds successfully (`vite build`) with all of the above.

---

## Navigation, 3D skins & Performance update

**Skin selector moved** — it now sits directly under Home in the left nav, above
the mods/Discover button.

**Live 3D skins (Settings → Visual, on by default)** — a note on what was
already there: the player model in `packages/assets/models/*.gltf` already has
real `Hat_Layer`, `Body_Layer` and `*_Arm/Leg_Layer` meshes, inflated by half a
pixel on the head and a quarter pixel elsewhere. That *is* the 3dskinlayers
effect, and the big preview has always rendered it.

What was missing was life in the grid: the tiles are pre-baked still images.
Now, hovering a tile swaps it for a live rotating `SkinPreviewRenderer`
(`BakedSkinButton.vue`, plus a new `hover-preview` slot on `SkinButton.vue`).
It activates after a 150 ms hover delay and unmounts on leave, so sweeping the
mouse across the grid never spins up a WebGL context per tile — at most one tile
is live at a time. Toggle: *Live 3D skins*.

**New — Settings → Performance → Fast loading** (`composables/use-performance.ts`)

This is a real caching/navigation change, not a placebo. When enabled:
- query `staleTime` goes from 0 to 5 minutes and `gcTime` from 5 to 30 minutes,
  so revisiting a page renders from cache instead of refetching,
- `refetchOnWindowFocus` and `refetchOnReconnect` are turned off, so the app
  stops reloading everything when you alt-tab back,
- failed requests retry once instead of three times,
- visited pages stay mounted via `<KeepAlive :max="4">` around the router view,
  making back-navigation instant.

Honest limits, also shown in the UI: it costs RAM, mod lists can be a few
minutes stale until refreshed, and it does **not** speed up launcher startup or
Minecraft launching — those happen in the Rust/Java layers, outside the
interface. It ships **off by default** because the KeepAlive page caching could
not be runtime-tested here; if anything behaves oddly, switching it off restores
the previous behaviour instantly.

*Verified:* frontend builds successfully (`vite build`) with all of the above.

---

## Sharper skins & a real Performance section

**Hover-to-3D reverted.** The live rotating model on grid tiles is gone;
`BakedSkinButton.vue` is back to plain baked thumbnails, the `hover-preview`
slot was removed from `SkinButton.vue`, and the *Live 3D skins* toggle is out of
the Visual section. The 3D model now appears only where it belongs: the current
skin in the Skin selector and the **Editing skin** modal.

**The skin preview is now genuinely sharp.** The important detail: the renderer
used `dpr: [1, 1.5]`, and TresJS treats a tuple as *clamp the display's own pixel
ratio into this range*. On an ordinary 1x monitor that resolves to 1.0, so
raising the cap would have changed nothing at all.

`SkinPreviewRendererImpl.vue` now takes a `pixelRatio` prop that **forces an
exact ratio**, which is real supersampling — the model is drawn at 2x or 3x the
pixels and scaled down. Skin textures were already `NearestFilter`, so the
result is crisp pixel edges rather than a blurry upscale. Both the Skin selector
and the skin editor pass the value from the new setting, and the canvas is keyed
on the ratio so changes apply immediately.

**Settings → Performance** now holds four things, all of which do real work:

| Setting | What it actually does |
|---|---|
| **Fast loading** | Query `staleTime` 0 → 5 min, `gcTime` 5 → 30 min, no refetch on window focus/reconnect, 1 retry instead of 3, and `<KeepAlive :max="4">` around the router view. |
| **Skin render quality** | Forces the preview renderer's pixel ratio — Balanced `min(device, 1.5)`, High `max(device, 2)`, Ultra `max(device, 3)`. The panel shows the ratio in use. Default: High. |
| **Pause background activity** | While the window is hidden, the running-instance poll and the particle layer stop. Resumes instantly on return. Default: on. |
| **Free up memory** | `queryClient.clear()` — drops all cached network data on demand and releases the RAM immediately. |

What is deliberately *not* claimed: none of this speeds up launcher startup or
Minecraft launching. Those happen in the Rust and Java layers, outside the
interface, and no frontend switch can change them.

*Verified:* frontend builds successfully (`vite build`) with all of the above.

---

## Ultra 4x rendering & a proper motion system

**Skin render quality gained a fourth tier: Ultra 4x (still).**

Four times the pixel ratio means sixteen times the pixels, so redrawing that
every frame would be exactly the waste the request was trying to avoid. Instead
this tier switches the canvas to TresJS `render-mode="on-demand"`: a frame is
produced only when something actually changes — dragging to rotate, a new skin
or cape, a resize. The result is the sharpest possible model for essentially no
continuous GPU load.

The honest trade, stated in the settings panel too: the idle sway animation
holds still in this tier. You cannot have 16x the pixels animating continuously
*and* near-zero GPU cost; the thing that gives is the animation, not the
sharpness.

**The animation CSS was rewritten into a real motion system.**

The previous version applied `transition-timing-function: … !important` to `*`,
which is heavy-handed: it hits every element in the tree, including ones mid
layout, and is a good way to cause the very stutter it was meant to remove.
That blanket rule is gone.

In its place, `assets/stylesheets/global.scss` now defines motion tokens once:

| Token | Value | Used for |
|---|---|---|
| `--mk-ease-standard` | `cubic-bezier(0.32, 0.72, 0, 1)` | the decelerating curve native macOS and Windows 11 Fluent surfaces use |
| `--mk-ease-out` / `--mk-ease-in` | expo-out / accelerate | entrances vs exits |
| `--mk-ease-spring` | `cubic-bezier(0.34, 1.26, 0.64, 1)` | a barely-there overshoot |
| `--mk-dur-instant … slow` | 90 / 140 / 200 / 300 ms | one shared speed scale |

Principles applied throughout:
- **Only compositor-friendly properties animate** — `transform`, `opacity` and
  colours. Layout properties (`width`, `height`, `top`, `left`) are never
  transitioned, because they force a relayout every frame, which is the usual
  cause of stutter on Windows.
- **Press feedback**: buttons scale to 0.97 on `:active` in 90 ms. A surface
  that visibly answers the click is the single biggest thing separating a
  native-feeling app from a web page.
- **Asymmetric transitions**: entrances decelerate, exits accelerate. That
  asymmetry is what reads as physical rather than mechanical.
- **Enhanced Optimized Animations** is now the same system with a longer scale
  and a gentle overshoot — it simply redefines the tokens — rather than a
  separate pile of `!important` rules.
- `prefers-reduced-motion` is honoured.

Not claimed: no font-smoothing or text-rendering tricks were added. Those are
largely a macOS concern and would not measurably change anything on Windows.

*Verified:* frontend builds successfully (`vite build`) with all of the above.

---

## Animation styles

Enhanced Optimized Animations is no longer a single on/off look. The toggle
turns the system on; a **style** then decides its personality. Each style
redefines the shared motion tokens, so every surface in the launcher changes
character at once rather than each component carrying its own bespoke animation.

| Style | Curve | Speed scale | Character |
|---|---|---|---|
| **Smooth** | `cubic-bezier(0.32, 0.72, 0, 1)` | 180 / 260 / 380 ms | Elegant, understated, decelerates into place |
| **Playful** *(default)* | `cubic-bezier(0.34, 1.45, 0.56, 1)` | 200 / 300 / 440 ms | Springy overshoot, buttons squash to 0.94, nav icons wiggle |
| **Snappy** | `cubic-bezier(0.2, 0, 0, 1)` | 90 / 130 / 180 ms | Everything under a tenth of a second |
| **Cinematic** | `cubic-bezier(0.16, 1, 0.3, 1)` | 260 / 420 / 640 ms | Slower, panels rise out of a soft blur |
| **Arcade** | `steps(5, end)` | 120 / 180 / 260 ms | Discrete stepped motion, the way a block game animates |

Tokens each style provides: `--mk-ease-standard`, the `--mk-dur-*` scale,
`--mk-lift` (hover travel), `--mk-press` (press compression) and `--mk-pop`
(entrance scale).

Details covered, since the small ones are what make it feel finished:
- hover lift and press compression scale with the style, not fixed values,
- navigation icons react themselves — scaling, and wiggling in Playful,
- panels, menus and dialogs share one entrance keyframe (`mk-enter`), with a
  blur-and-depth variant for Cinematic,
- list items arrive staggered 22 ms apart, capped at nine so long grids never
  feel slow,
- toggle thumbs inherit the style's curve — the control people flip most,
- Arcade also disables smooth scrolling, because stepped motion and gliding
  scroll contradict each other.

The settings panel includes a **live preview** — a real button, card and
navigation row that already carry the chosen style, so the choice can be felt
before it is committed.

All of it still animates only `transform`, `opacity`, colour and shadow, so the
cost stays on the compositor.

*Verified:* frontend builds successfully (`vite build`).

---

## Effect themes

Enhanced Optimized Effects now works the same way as the animation styles: the
toggle turns the particle layer on, a **theme** decides what it actually is.
Each theme is a full config — sprite shape, colour set, density, travel
direction and speed, sway, spin, alpha range, twinkle depth, blend mode and
layer opacity — in `components/ui/MinekubeEffectsLayer.vue`.

| Theme | Particle | Motion | Density |
|---|---|---|---|
| **Cubes** *(default)* | Minekube-coloured blocks with a glow | Rise 6–24 px/s, tumbling | 1 per 26k px², max 70 |
| **Embers** | Small bright sparks, `lighter` blend | Rise fast 26–64 px/s, heavy flicker | 1 per 15k px², max 110 |
| **Snow** | Pale six-spoke flakes | **Fall** 8–24 px/s with wide sway | 1 per 17k px², max 95 |
| **Fireflies** | Soft glowing dots, `lighter` blend | Wander slowly up *and* down, strong pulse | 1 per 34k px², max 45 |
| **Aurora** | A dozen huge soft colour blooms | Drift 2–7 px/s | 1 per 160k px², max 12 |

Details worth noting:
- Direction is part of the theme, not a constant — Snow falls, so the wrap logic
  respawns particles above the viewport instead of below, and Fireflies drift in
  both directions at once.
- `twinkle` oscillates each particle's alpha against its own phase, so nothing
  pulses in lockstep.
- Sprites are rebuilt only when the theme changes; within a theme the same
  handful of bitmaps is blitted, which is what keeps the layer cheap.
- Switching theme reseeds every particle immediately rather than waiting for the
  old ones to drift off screen.
- Aurora is the *lightest* option despite looking the most elaborate: twelve
  large blooms cost far less than a hundred small sprites.

*Verified:* frontend builds successfully (`vite build`).

---

## Sidebar player character

An animated 3D player model now lives at the bottom of the right-hand panel.
It is the same renderer the Skin selector uses, so it shows the account's
actually equipped skin, its cape and its 3D hat/jacket layers.

**Behaviour**

1. **Nobody signed in → nothing is rendered.** The component is gated twice:
   `hasLoggedIntoMinecraft` in `App.vue` and an internal check that a default
   user and a skin texture both resolved. No account means no WebGL context at
   all, not a hidden canvas.
2. **A Microsoft account signs in → the character slides up and fades in**
   (`SidebarPlayerCharacter.vue`, `Transition`), with its own skin.
3. **It waves.** There is no wave clip in `classic-player.gltf` — the file only
   ships `idle`, `idle_sub_1..3` and `interact` — so the greeting is generated
   procedurally: the right arm is raised out and up (~2.5 rad about its local
   Z), oscillates for 1.3 s, then lowers again, with eased raise and drop.
4. **Then it looks at the mouse.** The head takes ~74% of the turn and the
   torso ~26%, exactly the split the Minecraft inventory model uses, so the
   shoulders follow the head a little instead of the neck twisting alone. The
   gaze is critically damped (~0.13 s) rather than snapped, and it fades in over
   0.7 s as the greeting arm comes down so the two never fight over the neck.

**How the pose layer works** (`use-skin-preview-gaze.ts`)

The glTF clips animate `Head`, `Body` and both arms on *every* frame, so a
look-at cannot simply be written into those nodes — the mixer would overwrite
it. Instead each tracked node's quaternion is **post-multiplied** by an offset
right after the mixer has run, which composes the offset in the node's own local
space. The composable is deliberately registered *after* `useSkinPreviewAnimation`
in `SkinPreviewRendererImpl.vue`, because both hook the same render loop and
handlers fire in registration order.

To make that safe even in a frame where the mixer produces nothing, each node
remembers what was left on it last frame (`written`). If the node's quaternion
still matches, the previous frame's base is reused; if it changed, the mixer
wrote a new value and that becomes the base. The offset therefore can never
compound on itself.

The head also compensates for the model group's own rotation
(`initialRotation + PI`, plus any drag), which is why the character looks
straight at you while its body stays angled.

**New renderer props** — `lookAtCursor`, `greetOnReady`, `hideControlsHint`,
`interactive`. All default to the previous behaviour, so the Skin selector and
the skin editor are unchanged.

**Setting** — *Visual → Sidebar player character* (on by default). Turning off
all launcher animations disables it too.

**Honest cost:** this is a real 3D view, so a small WebGL canvas keeps drawing
while the launcher window is visible. It renders at 2x into a 300x240 box, which
is cheap, and the system throttles background rAF on its own once the window is
hidden — but it is not free, and on a weak GPU it is the first thing worth
switching off. It does *not* stop on `backgroundPaused`; keeping it mounted
avoids reloading the model and re-playing the wave every time the window comes
back.

*Verified:* frontend builds successfully (`vite build`). The wave and gaze
geometry were derived from the glTF node hierarchy and the preview camera
position (`[0, 1.5, -3.25]`) rather than observed at runtime — I have no way to
run the Tauri app here, so the exact feel of the arm angle and turn limits is
the one thing worth checking on your machine.

---

## Character emotes and reactions

The sidebar character now has a full procedural emote system and reacts to what
you do in the launcher.

**Emote engine** — `use-skin-preview-pose.ts` (replaces `use-skin-preview-gaze.ts`)

Eleven emotes live as data in `skin-preview-emotes.ts`: `wave`, `nod`, `shake`,
`cheer`, `shrug`, `think`, `point`, `jump`, `dance`, `facepalm`, `present`. Each
is a function of normalised time returning joint rotations for head, torso, both
arms, both legs and a vertical `lift`. None of this is baked animation — the
glTF only ships `idle`, `idle_sub_1..3` and `interact` — so every pose is
generated per frame and composed on top of the mixer's output.

Layering rules that keep it from looking like a ragdoll:

- Emotes **cross-fade**. Starting one marks the previous as fading out over
  0.22 s, so a burst of toggle clicks blends instead of snapping.
- Each emote declares how much cursor tracking survives it (`gaze`, 0..1), so
  the character keeps half an eye on you while nodding but stops looking around
  mid-wave.
- The relaxed carrying pose only fills the weight an emote is *not* using
  (`carryWeight = itemWeight * (1 - emoteWeight)`), so a full-strength emote
  takes the arm over completely rather than adding to it and bending the
  shoulder through the torso.
- `lift` is written to the `Orbit` node, which no clip animates, so hops are a
  direct position write with no additive trickery.

**Held props** — `skin-preview-held-item.ts`

Six 16x16 pixel-art icons — gear, heart, cross, check, sparkle, gem — generated
in code rather than authored as sprites: a shape predicate per icon, then
shading derived from it (any lit pixel touching the outside is the outline,
upper-left pixels get the highlight, the rest the body colour). Nearest-filtered
so they stay chunky next to the skin.

The prop is a plane kept **outside** the glTF scene, as a sibling of it, with
its matrix synced each frame from the right arm's world matrix. That matters:
`applyTexture`, `applyEarsMod`, `disposeSceneMaterials` and the auto-fit bounds
all traverse the model root, so a prop parented into the model would get the
skin texture painted on it and would resize the whole character. As a sibling it
is invisible to every one of those passes. It pops in with an overshoot, faces
the camera so it stays readable at sidebar size, and a gear spins while
everything else bobs.

**Reaction bus** — `use-character.ts`

`playCharacterEmote`, `setCharacterItem` (persistent), `flashCharacterItem`
(temporary, then back to the persistent one). Anything in the launcher can call
these without knowing whether the character exists; with nobody signed in or
reactions off they are no-ops. Reactions travel as props rather than method
calls because the renderer is an async component that may not be mounted yet.

**What triggers what**

| Trigger | Reaction |
|---|---|
| Settings window opens | fetches a **gear**, shows it off (`present`), then carries it for as long as the window is open |
| Settings window closes | puts the gear away, nods |
| Any toggle switched **on** | `jump` + a green **check** in hand |
| Any toggle switched **off** | `shake` + a red **cross** |
| A game starts | `cheer` + a **sparkle** |
| The last game closes | `wave` |
| Home / Skins / Browse / Screenshots | `wave` / `dance` / `point` / `cheer` |
| Left alone 50–95 s | one of `think`, `shrug`, `dance`, `nod`, `point` |

Toggle reactions cost zero changes to the settings components: every launcher
toggle renders as `button[role="switch"]`, so one capturing `click` listener on
`document` catches all of them. The click fires before the model updates, which
is why the new state is the negation of the current `aria-checked`.

**Setting** — *Visual → Let the character react to you* (on by default, nested
under the character toggle). Off leaves the character present, looking at the
cursor, but silent.

*Verified:* frontend builds successfully (`vite build`), and the three new
TypeScript modules pass `tsc --strict --noEmit` cleanly. The icon geometry was
rendered out and checked by eye. The poses themselves were derived from the
glTF node hierarchy rather than watched at runtime — angles are the thing most
likely to want a nudge on your machine.

---

## Free movement, 24 emotes, and always on top

### Turning with the whole body

The character no longer cranes its neck at the cursor — it turns. The pose
layer now writes the model group's own Y rotation, and splits the turn the way
a person does: the neck takes the first ~45° on its own (`NECK_YAW`), and only
what is left over spills into the shoulders. The head is smoothed over 0.12 s
and the body over 0.42 s, so the head always leads and the torso swings round
after it.

The angle itself is real geometry, not a linear guess. The character is treated
as standing `VIEW_DEPTH` pixels behind the screen, so the turn is
`atan2(dx, VIEW_DEPTH)` — the cursor far off to one side genuinely reaches a
profile view, and near the character it barely moves the shoulders.

`initialRotation` stands the model at a three-quarter angle on purpose, so that
built-in offset is measured once (`restOffset`) and subtracted; otherwise the
character would look permanently past you.

### Movement with no clamp on it

`Orbit` is the one node no glTF clip touches, which makes it the lever for
everything the rig was never rigged to do. Poses can now return:

- `spin` — whole-body rotation with no limit at all, which is how the
  somersault, the barrel roll, the pirouette and the tumble work. The pivot is
  at the waist, roughly where a real one turns.
- `lift` / `slide` — position offsets, used by hops, sitting down, and roaming.

The roaming offset is wanted in *screen* space, but Orbit sits inside the
turned model group, so it is rotated back out of that turn before being
applied — otherwise walking sideways would drift diagonally the moment the body
turned.

**A bug worth recording:** the flips originally ended on a full `TAU`. Since the
pose layer scales everything by a blend envelope, that value was being faded
from `TAU` back to `0` as the emote ended — which renders as a second, much
faster flip. `fullTurn()` now returns exactly `0` once the revolution completes;
`TAU` and `0` are the same orientation, so the swap is invisible and there is
nothing left for the envelope to unwind.

### Walking and idle life

Between emotes the character is never still. `addIdleLife` adds breathing, a
slow shift of weight from one leg to the other, and micro-glances — all scaled
by how much of the pose an emote is *not* already using, so it never fights a
somersault. When it roams, stride length follows speed so slowing down shortens
the steps instead of stopping mid-air, and it leans slightly into the direction
of travel. Roaming is suppressed while a grounded set piece is running, because
sliding along the floor half way through sitting down gives the game away.

### The repertoire — 24 emotes

`wave`, `nod`, `shake`, `cheer`, `shrug`, `think`, `point`, `jump`, `dance`,
`facepalm`, `present`, **`backflip`**, **`barrelRoll`**, **`pirouette`**,
**`sit`**, **`read`**, **`doze`**, **`clap`**, **`stretch`**, **`kick`**,
**`mine`**, **`peek`**, **`laugh`**, **`tumble`**.

`read` sits down with a book and turns a page every few seconds; `mine` swings a
pickaxe with a fast chop and a slow lift, the shape of a real swing; `doze`
droops and then snaps awake on a loop.

Two new props to go with them — a **book** and a **pickaxe** — bringing the set
to eight. The icon generator gained a second pass (`DETAILS`) for marks a
silhouette cannot carry on its own, such as the book's spine.

### Always visible, never blurred

The character used to live inside the sidebar, which meant a modal's
`backdrop-filter: blur(5px)` washed it out the moment any dialog opened. It is
now `Teleport`ed to `<body>` as a fixed overlay at `z-index: 8800` — above the
modal stack (which tops out near 200) and below the particle layer at 9000. It
stays crisp over the settings window, instance creation, project pages,
everything.

Two knock-on fixes that came with it:
- Toast notifications were at `z-index: 200`, which would now put them *behind*
  the character; they are at 9200. A toast should never be the thing that ends
  up behind decoration.
- The sidebar reserves `22rem` of bottom padding while the character is on, so
  the System panel scrolls clear of it instead of sitting underneath.

The box is 300×340 and framed with 23% headroom above and 17% below, because
both margins are load-bearing: a somersault needs room over the standing pose
and sitting down needs room under it.

### Idle director

A weighted table of 18 actions fires every 9–21 s (plus the action's own length),
and a separate timer sends the character wandering every 7–16 s. Common things
(peeking, stretching, shrugging) are six times as likely as a backflip.

### New reactions

| Trigger | Reaction |
|---|---|
| New instance button | gets the **pickaxe** out and starts swinging |
| A project page | sits down and **reads** |
| An instance page | **mines** |
| Skins page | **shows off** a gem |
| A user page | **peeks** |

*Verified:* frontend builds successfully (`vite build`); the three new
TypeScript modules pass `tsc --strict --noEmit`; and all 24 emotes were compiled
and run through 400 samples each, asserting every joint value is finite and
inside a sane range, `gaze` stays in 0..1, and every full-turn emote is back at
exactly neutral at both endpoints. That last check is what caught the double-flip
bug above.

Angles are still derived from the glTF hierarchy rather than watched at runtime,
so individual poses may want a nudge on your machine.

---

## Modrinth services removal & Profile/Social rewrite

The launcher no longer ships **any** Modrinth *account/service* feature. What is
left of Modrinth is the public content API used by Discover — browsing and
installing mods and modpacks, which is the whole point of the app.

**Deleted outright** (`apps/app-frontend`)

| Feature | Files removed |
|---|---|
| Shared instances (publish, invites, members, update/stale/unavailable/wrong-account admonitions) | `components/ui/shared-instances/`, `pages/instance/share/`, `pages/instance/shared-instance-context.ts`, `pages/instance/components/settings-modal/sharing-settings.vue`, `…/shared-instance-installation-settings-controls.vue`, `pages/instance/components/admonitions/*`, `helpers/shared-instance-errors.ts` |
| Friends | `components/ui/friends/`, `composables/use-friends.ts`, `helpers/friends.ts` |
| Modrinth user pages | `pages/User.vue`, `helpers/users.ts`, `helpers/user-campaigns.ts`, `helpers/account-appearance.ts` |
| Modrinth Hosting (server pages) | `pages/Servers.vue`, `pages/hosting/**`, `components/ui/HostingUpdateRequired.vue` |
| Modrinth account sign-in | `helpers/mr_auth.ts`, `components/ui/modal/ModrinthAccountRequiredModal.vue`, `components/ui/onboarding-checklist/`, `providers/onboarding-checklist.ts`, `helpers/onboarding-checklist.ts` |
| Ads, telemetry, surveys, fundraisers | `helpers/ads.js`, `helpers/analytics.ts`, `components/ui/SurveyPopup.vue`, `components/ui/PromotionWrapper.vue`, `components/ui/PrideFundraiserBanner.vue` |
| Account sync across devices | `components/ui/sync-instances-update-modal/`, `helpers/user-preferences.ts`, `providers/setup/user-preferences.ts` |

**Stripped in place**
- The three **"Sync … across devices"** toggles (Appearance / Behavior /
  Features), the `sync_*_across_devices` settings fields and the feature flags
  `show_sync_instances_update_modal` and `pride_fundraiser` are gone — nothing in
  Settings asks for a Modrinth account any more.
- `install-to-play` no longer installs "required content" from a server pack into
  a locked instance; the instance-lock surface (`instance.locked.*`,
  `content.locked-instance.*`) was removed with it.
- The `showAds` / `adConsentAvailable` page-context flags and the
  `updatePreferences` requirement in the shared appearance-settings provider are
  now optional, so `packages/ui` no longer assumes an account exists.

**Settings → Profile and Social are now informational panels**, built in the same
style as *Privacy* and *Support project* (gradient header, badges, card grid, CTA
box, footer note):
- **Profile** — "Tvůj profil": only a locally stored profile exists; a Microsoft
  account or a local (offline) account, the skin, and the note that nothing is
  uploaded anywhere.
- **Social** — "Komunita a zpětná vazba": GitHub issues for bug reports, the
  public source tree for contributing, Discord rich presence as the only optional
  online feature. No friends list, no user directory, no tracking.

**Kept on purpose**: Home/library, instances, **Discover**, Skins, Screenshots
and every other setting. The Modrinth *content* API is public and is still used
by Discover; only the account-bound service layer was removed.

*Verified:* `vite build` passes, `vue-tsc --noEmit -p tsconfig.app.json` reports
no new errors, `eslint .` is clean (only pre-existing warnings), and the message
catalog was re-extracted with `formatjs` (1484 keys, down from 1647) — the new
Profile/Social/lock copy is in both `en-US` and `cs-CZ`.

---

## Color themes restored, Launcher color, Outline theme & icon themes rewrite

The Display settings page grew two brand-new sections, got the original Modrinth
color themes back, and the whole icon theme system was rebuilt from scratch.

**Color theme — originals restored** (`composables/use-theme.ts`,
`state/settings.rs`, `state/legacy_converter.rs`, shared appearance types)

- The four original Modrinth app themes — **Light, Dark, OLED, Retro** — are
  selectable again and coexist with the Minekube set (Parchment, Ember, Abyss,
  Lagoon, Bloom, Nether, Cinder) plus **Sync with system**.
- The Rust `Theme::from_string` no longer folds `light/dark/oled/retro` into the
  Minekube equivalents, and the legacy-settings converter keeps the original
  theme the user had in the Modrinth app. "Sync with system" resolves to Light /
  the preferred dark theme like the original app did.

**Launcher color** (above *Icons theme*) — `composables/use-launcher-color.ts`,
`appearance-settings-launcher-color-selector.vue`

- An accent color picker that recolors every button, highlight, focus ring and
  the loading bar across the launcher: **Theme colors** (default — follow the
  active color theme), nine vivid presets (Gold, Tangerine, Magenta, Rose,
  Violet, Sapphire, Aqua, Emerald, Lime) and a fully **custom** hex picker.
- The chosen color is derived at runtime into `--color-brand`, brand
  highlight/shadow, selected-button colors and gradients on `<html>`, so it
  works with every color theme.

**Launcher background** (between *Launcher color* and *Icons theme*) —
`composables/use-launcher-background.ts`, `helpers/launcher-wallpapers.ts`,
`components/ui/LauncherBackground.vue`,
`appearance-settings-launcher-background-selector.vue`

- Six bundled SVG wallpapers — **Minekube Night**, **Sunset Blocks**, **Ember
  Depths**, **End Portal**, **Frost Peaks** and **Pixel Meadow** — plus
  **Default** (the plain theme background) and **Add image**, which imports a
  PNG/JPG/WebP/BMP/GIF/AVIF from disk. Imported images are scaled to at most
  2560×1440, re-encoded to WebP (JPEG fallback) and kept in IndexedDB, with only
  a small index in localStorage — they never leave the computer.
- A fixed layer behind the interface paints the wallpaper, and the surfaces
  above it are tinted with the *active theme's own* background colors read from
  the document (`--launcher-surface-bg`, `--launcher-surface-raised`), so every
  color theme and launcher color keeps its character.
- The mini setting picks between **Blur** (`filter: blur(30px)`, more of the
  picture visible, easiest to read) and **Sharp** (crisp picture with a stronger
  scrim over it). Imported wallpapers can be removed again from their tile.

**Outline theme** (below *Icons theme*) — `composables/use-outline-theme.ts`,
`styles/outline-themes.scss`, `appearance-settings-outline-theme-selector.vue`

- Draws a themed outline along the window edges: **None**, **Glow** (soft accent
  glow), **RGB** (animated flowing rainbow gradient border), **Neon** (pulsing
  neon tube in the launcher color) and **Aurora** (slow teal–violet–pink flow
  with a wide halo). Animations respect `no-animations`/reduced motion.

**Icons theme rewrite** (`icon-theme-art.ts`, `IconThemeGlyph.vue`,
`icon-themes.scss`, `appearance-settings-icon-theme-selector.vue`)

- Eight completely new icon packs for the sidebar glyphs (play, compass, plus,
  settings, shirt, image, chevrons, arrow, refresh): **Modrinth** (the original
  app icons, kept as-is), **Colorful** (flat multi-hue shapes), **Emoji**
  (real emoji glyphs), **Minecraft** (pixel blocks in a Minecraft palette),
  **Neon** (multicolor glowing neon tubes), **Candy** (glossy candy shapes with
  highlights), **Arcade** (chunky beveled game-UI with hard shadows) and
  **Retro Pixel** (8-bit sprites in a NES-style palette). The pixel packs are
  generated from ASCII art maps, so new icons stay cheap to add.
- Each pack also restyles every other chrome icon in the app (stroke style,
  crisp pixel rendering, colored glows, chunky drop shadows).

**Everything vivid** (`styles/variables.scss`, `global.scss`)

- All red/orange/green/blue/purple scales in both light and dark modes were
  rebuilt with much higher chroma, text colors got more contrast and the
  Minekube brand orange/gold was saturated further.
- A global `saturate(1.22)` filter on `body` (tunable via `--global-saturation`)
  keeps every color in the launcher — including images and thumbnails — vivid
  instead of faded.

*Verified:* icon art module loads and every theme renders all ten glyphs within
the 24×24 viewBox (checked programmatically); all touched TS modules pass
`node --experimental-strip-types --check`; SCSS brace-balance checked; `en-US`
and `cs-CZ` message catalogs updated (26 new keys each).

---

## App logo update (Minekube App Logo)

The old maroon hexagon-with-cube mark was replaced everywhere by the new
**Minekube App Logo** (orange/gold framed cube). The only logo left untouched is
the **Minekube Studios** lockup in the top-left corner of the app
(`TextLogo.vue` → `minekube-studios-logo.png`).

| Where | File(s) |
|-------|---------|
| exe, installer, desktop shortcut, Start menu | `apps/app/icons/icon.ico` (16–256 px), `favicon.ico` |
| Window / taskbar icon (set at runtime in `main.rs`) | `apps/app/icons/window-icon.png` |
| Tauri bundle icons, Windows Store tiles | `apps/app/icons/icon.png`, `128x128*.png`, `Square*Logo.png`, `StoreLogo.png` |
| macOS | `apps/app/icons/icon.icns`, `apple.icon/` (full-colour PNG layer, no tint/glass), DMG background header |
| Splash screen, Settings → About (dev-mode button) | `packages/assets/branding/minekube-mark.png` (`MinekubeMark`) |
| Welcome screen | `apps/app-frontend/src/assets/welcome/minekube-icon.png` |
| Spinning loader | `packages/ui/src/components/brand/AnimatedLogo.vue` now spins `MinekubeMark` |
| Inline brand icon (`ModrinthIcon` component) | `packages/assets/branding/logo.svg` embeds the new logo as PNG |
| Webview favicon | `apps/app-frontend/index.html` |

All sizes were downscaled from the 4800 px master with the transparent margin
trimmed, at the same ~90 % fill as the previous icon set.

*Verified:* frontend builds successfully (`vite build`); ICO contains all nine
sizes; ICNS, JSON and SVG files parse.

## First-run welcome tour

The launcher now opens a five-step introduction after the startup splash has
finished (and after any existing modal is dismissed). It covers the installed
version, Java Edition / mod management, privacy and external services, voluntary
support, and first actions. The existing empty-library screen is unchanged.

- Components: `apps/app-frontend/src/components/ui/welcome/`.
- English source messages and Czech translations are included. Other languages
  use the existing English fallback.
- Completion or skipping (including Escape) writes `minekube:welcome-completed`
  to the webview's local storage. Merely opening or navigating the tour does not.
  The marker is independent of the launcher version and the number of instances.
  Existing installations without this marker also see the introduction once.
- Settings → **Replay introduction** reopens it without resetting the marker.
- Unavailable storage does not block use; a warning explains that the tour may
  return after restarting. Clearing webview storage resets completion.
- Uses the shared modal stack and keyboard focus trap. Step headings receive
  focus, navigation has an announced step count, and shortcuts do not propagate
  into the library. Window controls remain above the modal.
- Reduced-motion preferences and the launcher's animation setting disable motion;
  decorative animations pause when the document is hidden. No autoplay or timers
  advance the tour. Content scrolls independently of the navigation/footer.
- Offline users can finish or skip; account/creation/import shortcuts are disabled
  until connectivity returns. Action modals open only after the tour has closed.
- The privacy copy discloses the current production Sentry integration and online
  service connections, rather than promising zero telemetry. This is information,
  not a consent dialog, and no privacy preferences are changed.
- Financial support goes to the existing Support project settings, not an invented
  donation account. A project-specific payment destination still needs to be
  configured there (the Ko-fi button points to `https://ko-fi.com/minekubestudios`).

Storage regression tests: `node --experimental-strip-types --test
apps/app-frontend/tests/welcome-state.test.ts` (Node 22+). Browser smoke checks
should cover first run, all five steps, skip/Escape, replay, offline/reconnect,
failed external links, reduced motion, and restart persistence. Native startup,
window controls and opening external browsers should also be checked in Tauri.

---

## Launcher failed to start after install (fixed)

**Symptom:** after installing the Windows build, the launcher appeared not to
start — no window at all, and after ~10 s at most an empty frame. The process
was running; nothing was rendered.

**Cause:** `apps/app-frontend/src/App.vue` called `useLauncherBackground()`
(added with the Launcher Background setting) without importing it, so the root
component's setup threw `ReferenceError: useLauncherBackground is not defined`.
The main window starts hidden (`visible: false` in `apps/app/tauri.conf.json`)
and is only revealed by the `show_window` command that the UI sends once it has
mounted, so a root-component failure means the window is never shown. In a
production build Vue only logs such an error instead of rethrowing it, so
`app.mount()` resolved with an empty app and even the `mount().catch()` fallback
in `main.js` never ran.

This is the same class of failure as the earlier `useLauncherColor` /
`useOutlineTheme` regression. It slipped through both guards again for the same
reason: `App.vue` uses `<script setup>` **without** `lang="ts"`, and
`tsconfig.app.json` sets `allowJs` but not `checkJs`, so `vue-tsc` does not
type-check that file at all. `eslint` does not enable `no-undef` either.

**Fixed**

- `apps/app-frontend/src/App.vue` — added the missing
  `import { useLauncherBackground } from '@/composables/use-launcher-background.ts'`.
- `apps/app-frontend/src/pages/Browse.vue` — `resetInstanceContext()` called
  `browseBreadcrumb.reset()`, but no such variable exists (leftover from an older
  breadcrumb API); it now calls `syncBreadcrumbs()`, which is what rebuilds the
  breadcrumb chain for the current route. Leaving an instance-scoped Discover
  page no longer throws.
- `apps/app-frontend/src/main.js` — a startup failure is now visible instead of
  silent. If Vue produced no UI at all, the app renders a plain "Minekube
  Launcher failed to start" panel with the underlying error and reveals the
  window immediately, rather than waiting for the 10 s fallback and showing a
  blank window.

**Verified** by loading the production `vite build` output in a DOM with a
mocked Tauri IPC bridge:

| Build | `show_window` called | rendered root elements |
|---|---|---|
| before the fix | only via the 10 s fallback | 0 (blank window) |
| after the fix | yes, during startup | 4 |

`vue-tsc --noEmit -p tsconfig.app.json` no longer reports the undefined
`browseBreadcrumb`; the same check with `checkJs` enabled (temporary config, not
committed) reports `Cannot find name 'useLauncherBackground'` on the unfixed
tree and nothing after the fix. `vite build`, `eslint` and `prettier --check`
pass on all three changed files.

---

## Special buttons & the Minekube launch sequence

The Play button, the Stop button and the round Play orbs on instance cards are
now one designed system instead of a pile of overrides, the launch animation
that appears when you press Play is in the Studios palette, and a new
**Settings → Appearance → Special buttons style** section chooses what those
buttons are made of — with the original Modrinth button kept as one of the
options.

### What the request was

> "Přepiš do barev Minekube Studios i tu animaci, co se zobrazí po kliknutí na
> Play; ta epická tlačítka Play a další nejsou udělaná profesionálně (jsou tam
> chyby a nemají moc pěkný design) — udělej je víc animovaná, víc smooth,
> zarovnaná, kliknutí vyvolá pulz, ostrá a čitelná, ve 3D. A do nastavení
> v Appearance mezi Icons theme a Outline theme přidej sekci Special buttons
> style."

### The launch sequence

`apps/app-frontend/src/components/ui/MinecraftLaunchOverlay.vue` was rewritten
around the brand palette only — gold `#FFE866`/`#FCC000`, orange `#FF8A2A`/
`#FF5A1F`, magenta `#FF2E8B`/`#FC0060`, maroons `#6B0018`/`#3A0008`/`#14010A`.
There is no foreign colour left in the layer, and the light sources make sense
as a scene: a gold haze from above, a magenta one from below, a perspective
grid floor in both, orbit rings with travelling sparks and a breathing core
behind the logo.

Details that make it read as a sequence rather than a spinner:

- **One-shot brand burst** — three rings and a core shock wave fire once, the
  moment the overlay appears. The layer is then removed from the DOM, so
  nothing keeps animating off screen for the rest of the launch.
- **A 12 s ramp** to 92 %, one stage name per quarter of the bar, and a tip
  line that rotates every 1.4 s. The overlay holds at 92 % rather than
  pretending to finish: the real signal is the launcher telling it that the
  game started.
- **Exit** is a 480 ms fade-and-scale, then unmount. A launch that never
  reports back is force-closed after 45 s, and the stop path closes it in
  250 ms (`launched` keeps it up 650 ms so the burst is not cut off).
- **Everything animated is `transform`, `opacity` or `filter`**, and
  `prefers-reduced-motion` / the launcher's own animation setting freeze the
  scene.

Two things were fixed while rewriting it:

1. the overlay no longer wraps the whole tree in an assertive live region —
   the progress bar redraws every frame, and announcing that 60 times a second
   is unusable with a screen reader. There is now one polite, visually hidden
   status line that announces the stage and the progress in 10 % steps;
2. the strings are translatable. The previous version had Czech sentences
   hard-coded in the component, so an English launcher showed Czech tips. They
   are now 18 messages (`app.launch-overlay.*` in
   `apps/app-frontend/src/locales/{en-US,cs-CZ}/index.json`) and the uppercase
   look comes from CSS `text-transform`, which also stops screen readers from
   spelling out `PŘÍPRAVA`. The corner HUD labels (`LAUNCH PROTOCOL`,
   `SECURE CHANNEL`, …) are decoration and are hidden from assistive
   technology.

### The buttons

Five classes carry the whole feature; nothing else in the app needs to know
about it.

| Class | Surface |
|---|---|
| `.mk-play-cta` | a Play / launch CTA (instance header, project page, world and instance rows, welcome screen) |
| `.mk-stop-cta` | its Stop twin while the game runs |
| `.welcome-create-button` | the first-run "Create instance" button |
| `.mk-play-icon` | a round, icon-only Play action (instance cards) |
| `.mk-stop-icon` | the round Stop twin on the same cards |

They are applied in `pages/instance/components/page-header/index.vue`,
`pages/project/Index.vue`, `components/ui/Instance.vue`,
`components/ui/library/instance-group/instance-card.vue`,
`components/ui/world/WorldItem.vue`, `components/ui/world/InstanceItem.vue` and
`components/ui/WelcomeScreen.vue`. Every one of them keeps its original
Modrinth `Button`/`IconButton` markup, slots, tooltips, disabled states and
keyboard behaviour; the class only changes what it is made of.

The stylesheet is `packages/assets/styles/special-buttons.scss` (imported from
`omorphia.scss`, so it ships with the design system rather than with one
screen). A style is nothing but a list of CSS custom properties — `--sb-surface`,
`--sb-shadow`, `--sb-glow`, `--sb-particles`, `--sb-tilt`, `--sb-radius`, … —
and the shared block only ever reads them. Three consequences:

- the geometry, the transitions and the 3D press are written **once**, so no
  style can drift out of alignment from the others;
- the settings preview renders a **real** Play button per style by setting the
  same variables on the preview card, with no selector fight;
- adding the next style cannot break the existing ones.

What the shared behaviour actually does:

- **3D press**: hover lifts the button `-3px` and scales it to 1.035, `:active`
  pushes it back down and to 0.955 in 90 ms. The tilt is a real perspective
  rotation — the runtime writes pointer-derived `rotateX`/`rotateY` through the
  same `transform`, so movement and press can never cancel each other.
- **Click pulse**: a single `sb-pressed` class runs a 640 ms flash that animates
  only shadow and light, plus a burst of sparks and an expanding ring on the
  shared canvas. Rapid clicking restarts it visibly instead of being swallowed.
- **Readability**: the label is never blurred, never scaled below 1, keeps its
  own `text-shadow` contract, and `-webkit-font-smoothing: antialiased` /
  `text-rendering: optimizeLegibility` are set on the button itself.
- **Disabled buttons** keep their look but lose the animation, the lift and the
  cursor — a disabled CTA no longer pulses at you.
- **Focus** is a real `:focus-visible` ring in brand gold, not a removed
  outline.

### The runtime

`apps/app-frontend/src/helpers/special-buttons.ts` is the interactive half
(sparks, rings, tilt, pointer light). The previous implementation injected
effect elements into the buttons, which is exactly how it managed to leave
orphaned nodes behind after a re-render; this one injects nothing:

- **one** `aria-hidden` canvas is appended to `<body>` and shared by every
  button on screen;
- **one** `requestAnimationFrame` loop draws it and stops itself completely
  when there is nothing left to draw — an offscreen or hidden button costs
  nothing at runtime;
- sprites are pre-rendered once per colour into 48 px offscreen canvases and
  blitted with `drawImage`; the old code built a radial gradient per particle
  per frame, which is the most expensive thing a 2D canvas loop can do.
  Particles are capped at 320;
- `IntersectionObserver` (120 px margin) wakes a button up before it scrolls
  into view, `ResizeObserver` follows its box, and a `MutationObserver` picks up
  buttons added by Vue. Mutation work is coalesced into a single flush per
  frame, so a list that mounts forty buttons schedules one scan, not forty;
- colours are read from the active style's CSS variables, so a style owns its
  own sparks without a line of JavaScript changing;
- if the launcher's animations are off (`html.no-animations`) or the system
  asks for reduced motion, the loop is never started and only the CSS half of
  the style remains.

The decorative layer is also not allowed to break a button: a webview without
2D canvas support (or with it disabled) degrades to the CSS effect — the press
pulse still answers the click — instead of throwing inside a click handler.

### The eight styles

| Style | Material | Particles / tilt |
|---|---|---|
| **Minekube** *(default)* | gold → orange → magenta gradient on maroon, breathing bloom | 16 · 7° |
| **Modrinth** | the original app button: `--color-brand`, flat, no glow | 0 · 3° |
| **Glass** | frosted translucency, backdrop blur, soft inner light | 8 · 8° |
| **Neon** | a dark tube with a lit magenta edge and an inner glow | 10 · 4° |
| **Chrome** | machined metal gradient with a hard specular highlight | 0 · 9° |
| **Arcade** | a chunky key with hard 6 px offsets that really gets pressed | 4 · 2° |
| **Aurora** | iridescent gradient flowing under glass | 18 · 8° |
| **Minimal** | flat surface, hairline border, a 2 px rule that sweeps in on hover | 0 · 4° |

Each style also defines its **danger variant** — the same form in the red end
of its own palette — which is what the Stop button and the round Stop orb use,
so a card shows both of its states in the same material.

### Settings → Appearance → Special buttons style

The section sits between **Icons theme** and **Outline theme**, with a card per
style that renders a real Play button and a real orb on a stage, the style's
name, a one-line description of its material, and the usual radio indicator.
Clicking a card applies the style instantly (`html[data-special-buttons='<id>']`)
and the choice is stored under `minekube-special-buttons`; hovering a card
previews it without committing. The list of ids lives in
`packages/ui/src/layouts/shared/appearance-settings/special-buttons.ts`, so the
settings UI and the stylesheet cannot disagree about which styles exist, and
the strings are translated in both `en-US` and `cs-CZ`.

### Honest notes

- A special CTA **overrides the `color` prop** of the button it is applied to.
  That is the point — the class is a redesign of that one surface — but it does
  mean a `color="green"` Play button in the world list now follows the chosen
  style rather than staying green. The Modrinth style keeps the original
  `--color-brand` look for anyone who wants it back.
- The styles are not skins of each other: Chrome and Minimal deliberately ask
  for no sparks on their CTAs (0 particles), because a machined key or a flat
  button throwing sparks would contradict the material. The Modrinth style has
  none either — that is the original button, which never had any.
- The old CTA block in `global.scss` was replaced by a pointer comment; the
  shared palette (`--mk-gold-1 … --mk-cta-ink`) now lives in
  `special-buttons.scss` and `SplashScreen.vue` no longer keeps a private copy
  of it, so a palette change reaches both the splash and the buttons.

*Verified:* `vite build` succeeds (14.8 s / 15.5 s / 18.4 s on separate runs,
warnings only); `sass` compiles `omorphia.scss` with the shared block and all
eight style scopes emitted; `eslint .` is clean in both packages (0 errors — the
two import-order errors it found were an import this change had inserted in
`App.vue` and the same pre-existing issue in `WelcomeTour.vue`); the 18
`app.launch-overlay.*` ids match their `defaultMessage`s exactly in the
component and in both locale files. A jsdom smoke test drives the runtime end to
end — mount, press, tilt, one shared canvas, disabled buttons left alone, style
refresh, canvas-less webview — and passes. The visual check is a dev-only
harness (`apps/app-frontend/preview/`, run with
`pnpm --filter=@modrinth/app-frontend exec vite --config preview/vite.config.ts`)
that renders the real stylesheet, the real runtime and the real overlay for
clicking through every style; it is outside the shipped app graph.

Two gates in this fork are red for reasons that predate this change, and it is
fairer to name them than to claim a clean run:

- `prettier --check .` is clean in `packages/ui` and `packages/assets`, but
  `apps/app-frontend` still reports four files with formatting drift —
  `SplashScreen.vue`, `WelcomeScreen.vue`, `welcome/WelcomeTour.vue` and
  `helpers/launch-overlay-state.ts`. All four already fail at `HEAD`, none of
  them was reformatted here (that would have buried a real change in hundreds
  of unrelated lines), and every file this change adds or edits is
  `prettier --write` clean — the `SplashScreen.vue` edit actually shrinks its
  drift from 261 to 247 lines.
- `pnpm prepr:frontend:app` cannot finish in this fork: the app depends on
  `@modrinth/ui`, which depends on `@modrinth/blog`, and the blog package's
  `fix` task scans `apps/frontend/src/public/news/article` — a directory that
  the earlier trimming step removed. That failure is unrelated to this feature
  (`@modrinth/blog#fix` fails on an empty checkout of this tree as well); the
  equivalent per-package commands were run instead. Running that command also
  rewrites `packages/blog/compiled/**`, so the working tree had to be restored
  afterwards; do not run it expecting a green result until the blog package is
  trimmed too.

---

## Prism-style instance editor (Modrinth instance controls removed)

The instance **Edit** page is no longer a Modrinth App settings modal/page.
It is a full Prism-style local instance editor in the Minekube design, modelled
on Prism Launcher's "Edit instance" window. The global Settings page and the
main left sidebar were deliberately not touched.

**Layout** — `pages/instance/editor/index.vue` now has a grouped left sub-nav
inside the instance page (global sidebar untouched):

- *Instance*: Overview, Version, Notes
- *Content*: Mods, Resource packs, Shader packs, Data packs, Worlds & servers,
  Screenshots, Files (each content section shows a count badge)
- *Settings*: Java & memory, Window, Launch commands, Game options, Interface
- *System*: Logs & console, Files & tools

Old `?section=` values (`general`, `installation`, `sync`, `content`) are
mapped onto the new sections, so existing links/bookmarks keep working.

**Removed (Modrinth App instance controls)**

- The whole Modrinth "Installation" settings flow for instances
  (`InstallationSettingsLayout` with modpack version/update/swap actions) and
  its provider component `settings-modal/installation-settings.vue`.
- The per-instance "Sync overrides" section and the synced-options editor
  (`synced-options-settings.vue`) from the instance editor.
- The dead `TabbedModal` instance settings modal (`settings-modal/index.vue`),
  which was superseded by the editor page and had no remaining callers.
- The Modrinth content "Update channel" (release/beta/alpha) control from
  General settings.

Instances keep all their data; nothing is deleted from existing instances.
A still-linked modpack instance now shows a single explicit action on the
Version page — *Detach and keep content* — after which it is a purely local
instance. Internal backend fields (`link`, `update_channel`, synced options)
remain in storage/API for compatibility and for the rest of the app, they are
just no longer Modrinth-style controls on the edit page.

**New / rewritten editor sections**

- **Overview** (`editor/overview.vue`): summary cards (Minecraft, loader, Java,
  effective memory, playtime, created/last played, folder), Prism-style group
  membership toggles, and Play / Open folder / Copy path / Export / Shortcut
  actions, on top of the existing name & icon editing, duplicate and delete.
- **Version** (`editor/version-settings.vue`): a Prism-like component table
  (Minecraft, mod loader, recommended Java) and a fully local version changer —
  loader (Vanilla/Fabric/Forge/Quilt/NeoForge), Minecraft version (with
  snapshot toggle), loader version, explicit *Apply and reinstall*, plus
  installation repair. No modpack UI.
- **Content split**: `content/index.vue` accepts an optional `contentType`
  prop, so Mods / Resource packs / Shader packs / Data packs are separate
  editor sections (each with its own filter persistence and matching Browse
  destination), instead of one mixed Modrinth content list.
- Worlds & servers, Screenshots, Files and the live Logs console are embedded
  as editor sections instead of only living behind separate instance tabs.

**Backend (Rust, `packages/app-lib`)**

- `MemorySettings` gained an optional `minimum` (`-Xms`) next to `maximum`
  (`-Xmx`), mirroring Prism's minimum memory allocation. It is stored only in
  per-instance launch-overrides JSON, old stored values deserialize unchanged
  (`#[serde(default)]`), and the value is clamped to the maximum when the JVM
  arguments are built (`launcher/args.rs`, `launcher/hooks.rs`). The instance
  Java editor exposes minimum and maximum sliders. The global settings DB
  schema is unchanged.

*Verified:* `pnpm --filter=@modrinth/app-frontend run build` (vue-tsc + vite)
succeeds; `eslint` is clean on every touched file; all touched files are
`prettier --write` clean; all 106 new message ids match their
`defaultMessage`s in both `en-US` and `cs-CZ` catalogs. The Rust workspace
could not be compiled in the sandbox (no Rust toolchain and no network route
to install one), so the Rust change was kept deliberately small, additive and
serde-backwards-compatible; it needs one `cargo check` on a developer machine.

---

## Left sidebar removed, Home first, and instance info window

**The left navigation rail is gone.** `App.vue` no longer renders the 4 rem
icon column (`app-grid-navbar`); the whole launcher window is now the content
area plus the existing right sidebar. Everything the rail offered moved into
the Prism-style top toolbar, which therefore reads:

*Add instance · Discover content · Screenshots · Folders · Settings · Help*

- **Add instance** (toolbar) opens the creation flow and still plays the
  sidekick's "mining" scene — that was previously the rail's `+` button.
- **Discover content** and **Screenshots** are new toolbar pills
  (`/browse/modpack`, `/screenshots`) and light up while their page is active.
  Screenshots stays hidden unless synced screenshots are enabled, exactly like
  the rail item did.
- **Settings** and the folder/help menus were already in the toolbar, so
  Settings remains reachable — nothing there was touched.
- **Home is now the logo.** Clicking the Minekube mark / wordmark in the top bar
  navigates to `/` (it gets a tooltip, a hover surface and an `aria-label`).
- `--left-bar-width` and `.app-grid-navbar` (CSS + the hover-animation rules in
  `assets/stylesheets/global.scss`, now targeting `.main-toolbar-prism`) were
  removed, together with the `APP_LEFT_NAV_WIDTH` offset reported to
  `providePageContext`. `QuickInstanceSwitcher` and `NavButton` are no longer
  mounted anywhere (the files are kept; the "Quick instances" setting in
  Settings → Features now has no surface — say the word and it either comes
  back as a toolbar dropdown or is removed from Settings).

**Home is the priority section.** The back/forward buttons now behave like a
real browser history with Home as the root:

- `navigateBack()` goes to the previous visited page when there is one
  (Home → Skin selector → Back lands back on Home) and falls back to `/` when
  there is none, so Back is never a dead button; its tooltip/label switches
  between *Go back* and *Home* accordingly. Forward is unchanged.
- The launcher still starts on Home and every section pushes onto history, so
  "back to where I was" works for the skin selector, screenshots, Discover,
  projects, instances and the settings sub-pages alike.
- Scroll position and instance state survive the trip (the library viewport
  position and page components are already cached).

**Instance info window.** A left-click on an instance's *icon* in the library
now opens a small dialog over the whole launcher
(`components/ui/instance/instance-info-modal.vue`, a `NewModal` capped at
480 px, titled *Instance info*, with a *Close* button and — added later, see
*Edit back* below — an *Edit instance* button) instead of opening the
instance. It shows the essentials:

- **Memory** — the instance override (`-Xmx`, or `-Xms–-Xmx` when a minimum is
  set), or `{maximum} MB (global)` when the instance follows the global
  setting.
- **Time played** — submitted + recent playtime, `{hours} h {minutes} min`.
- **Minecraft** — the instance's game version.
- **Mod loader** — Vanilla/Fabric/Forge/Quilt/NeoForge, with loader version.
- **Last played** — localised date, or *Never*.

Clicking the rest of the card (name, loader line, empty space) still opens the
instance exactly like before; the play/stop/repair and selection buttons keep
working, selection mode and drag-and-drop are unaffected (a click that ends a
drag does not open the window). The click is detected via a
`data-instance-icon` marker inside `InstanceCardView`, so no new props or
events are threaded through the group/library components.

*Verified:* `npx vite build` (app-frontend) succeeds; `eslint` and
`prettier --check` are clean on every touched file; `vue-tsc -b --noEmit`
reports no error in any touched file (the repo has ~1450 pre-existing type
errors elsewhere, unchanged by this work); the 12 new message ids match in both
the `en-US` and `cs-CZ` catalogs. The Tauri window itself could not be launched
in the sandbox (no Rust toolchain), so the visual result was reviewed via the
built bundle, not on a real window.

---

## Edit back: the Prism instance editor is reachable again

Removing the instance detail route also took away the only way into the
Prism-style **Edit instance** page: the editor stayed in the tree but nothing
linked to it, and the right sidebar's *Edit* row plus the library context
menu's *Edit instance* entry went with it. The editor is back, as a standalone
page — the removed instance detail page (banner + Content/Files/Worlds/Logs
tabs) deliberately stays removed.

- **Route** (`apps/app-frontend/src/routes.js`): `/instance/:id` is a layout
  route again, with the editor as its `edit` child (`name: 'InstanceEdit'`,
  `pages/instance/editor/index.vue`). `pages/instance/layout.vue` hides its own
  header and tabs whenever that child is active, so the editor renders on its
  own. The bare `/instance/:id` and any other instance sub-path (for example
  `/instance/<id>/worlds`) still redirect to Home (`InstanceRemoved` /
  `InstanceNotFound`).
- **Right sidebar → Instance panel**: the *Edit* row (pencil icon) is back in
  the action list, right after the Launch/Stop divider and before *Change
  group* (`components/ui/SidebarInstanceToolbar.vue`).
- **Library → right-click an instance**: the context menu offers *Edit
  instance* again (in `components/ui/library/use-library.ts`, exposed by
  `instance-card.vue` as `editInstance`), between the add-content divider and
  *Duplicate*.
- **Home → "Jump in" cards**: both the *…* menu and the card's right-click menu
  offer *Edit instance* (`components/ui/world/InstanceItem.vue`).
- **Instance info window** (opens on a card click): *Edit instance* button next
  to *Close*, disabled for locked instances
  (`components/ui/instance/instance-info-modal.vue`).
- The editor's own header button is *Back to Home* now
  (`app.instance.editor.back-to-home`, replacing `back-to-instance`) because the
  page it used to return to no longer exists; `closeEditor()` goes Home as well.

New message ids — `app.sidebar.instance-toolbar.edit`,
`app.library.instance.action.edit-instance`,
`app.home.jump-back-in.edit-instance`, `app.instance.info.edit` and
`app.instance.editor.back-to-home` — exist in both the `en-US` and `cs-CZ`
catalogs (*Upravit*, *Upravit instanci*, *Upravit instanci*, *Upravit instanci*,
*Zpět domů*).

*Verified:* the app-frontend `vite build` succeeds (the editor chunk is emitted
and contains the new strings), ESLint and `prettier --check` are clean on every
touched file, router matching was exercised against `vue-router` itself
(`/instance/x` → Home, `/instance/x/edit` → `InstanceEdit`, `/instance/x/logs`
→ Home), and every message id touched here resolves in both catalogs. Two
sandbox gotchas worth knowing: `pnpm install` needs
`NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt` (otherwise the one
GitHub tarball dependency fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`), and
`pnpm … tsc:check` checks nothing at all — the root `tsconfig.json` has
`files: []`, so a real type check means
`vue-tsc --noEmit -p tsconfig.app.json`, which OOMs on the 4 GB sandbox (the
build was used as the compile check instead).

---

## Quiet, faster loading screen & clean Prism instance exports

Two requests: the launcher should stop performing while it opens, and a Prism
instance should be exportable as a pack that is ready for *someone else* to
play. Both changes are additive in the places that matter — the animation
presets stay available and the classic exports stay unchanged — so nothing that
was already possible was taken away.

### The loading logo no longer animates by default

- `DEFAULT_SPLASH_PREFS.logoAnimation` is `'none'`
  (`apps/app-frontend/src/composables/use-splash-screen.ts`). The playful
  presets — float, breathe, pulse, tilt, shimmer — are exactly where they were,
  in **Settings → Visual → Loading screen → Logo animation**.
- `'none'` now means genuinely still, not "the stage is still but everything
  around it keeps moving": `SplashScreen.vue` also stops the perpetual halo
  breathing and the orbiting spark for that preset
  (`.splash-screen[data-splash-logo='none'] .logo-halo` and
  `… .logo-trail::after`). The short entrance fade of the wordmark is kept, so
  the screen still resolves instead of snapping into place.
- Preferences written by an older build are upgraded once. They are persisted on
  first launch, so without this an old, slow default would have survived every
  update: the stored payload now carries `version`
  (`SPLASH_PREFS_VERSION = 2`) and `upgradeLegacyPrefs()` only replaces values
  that still equal the *old* defaults (`float`, `50`, `2500`, `900`). Anything a
  player deliberately adjusted is left alone.

### The loading screen is much shorter

| Preference                                     | Old default | New default |
| ---------------------------------------------- | ----------- | ----------- |
| Minimum time on screen (`minDisplayMs`)        | 2500 ms     | 400 ms      |
| Fade-out (`fadeOutMs`)                         | 900 ms      | 250 ms      |
| Animation speed multiplier (`animationSpeed`)  | 50 %        | 200 %       |

- The multiplier shortens every remaining duration in the CSS (`nebula-drift`,
  `halo-breathe`, hover transitions …), and the two entrance animations were
  shortened at the source as well: `logo-entrance` 1 s → 420 ms and
  `wordmark-arrive` 850 ms → 380 ms (before the multiplier).
- The settings sliders follow the new range: `fadeOutMs` is now 0–3000 ms in
  50 ms steps (`minDisplayMs` was already 0–6000).
- The in-settings replay (`SplashPreviewPlayer` → `SplashScreen` in preview
  mode) plays for 1.5 s instead of 2.6 s, so the preview shows the real pace.

### Prism Instance (.zip) can be exported clean

*Export → Prism Instance (.zip) → Export as a clean instance* (off by default)
writes the same re-importable archive, minus every trace of the player who built
it — something Prism Launcher itself does not offer. Instance settings, keybinds,
mods and mod configs are kept, so the archive is a modpack ready to play.

- **Backend** (`packages/app-lib/src/api/instance/export_mrpack.rs`):
  `export_prism_instance_zip(instance_id, export_path, clean)` skips every path
  `is_clean_export_excluded()` matches, and skips whole directories instead of
  walking into them. Three rule sets:
  - **Root entries** — `logs`, `crash-reports`, `modrinth_logs`, `.mcsessions`,
    `saves`, `backups`, `screenshots`, `journeymap`, `xaerowaypoints`,
    `xaeroworldmap`, `voxelmap`, `mapwriter`, `essential`,
    `local/crash_assistant`, `launcher_accounts.json`, `launcher_profiles.json`,
    `servers.dat`, `servers.dat_old`, `usercache.json`, `usernamecache.json`,
    `realms_persistence.json`.
  - **Directories dropped at any depth** — `logs`, `crash-reports`,
    `.mcsessions`, so a mod with its own log folder cannot leak either.
  - **JVM crash artefacts** — `hs_err_pid*`, `replay_pid*`, `*.hprof`.
  - Matching is case-insensitive (Windows writes `XaeroWaypoints`), compares
    against the instance-relative unix path, and an entry matches its exact path
    or the directory it names (`logs` covers `logs/2024-01-01-1.log.gz`).
  - Everything else stays: mods, resource packs, shader packs, datapacks,
    `config/`, `options.txt`, keybinds and every instance setting. Worlds are
    personal data and go with `saves/`.
- **Command** (`apps/app/src/api/instance.rs`): `instance_export_prism_zip` takes
  the new `clean: bool`. The command name is unchanged, so the plugin block in
  `apps/app/build.rs` needs no edit.
- **UI** (`apps/app-frontend/src/components/ui/ExportModal.vue`): the toggle only
  appears in Prism mode (the `.mrpack` path has its own manifest and file
  selection), it is off by default, and switching it on suggests
  `"<instance> - Clean"` as the archive name — but only while the name field
  still holds the value the modal pre-filled, so a typed name is never
  overwritten. New message ids `app.export-modal.prism-clean-label` and
  `app.export-modal.prism-clean-hint` exist in the `en-US` and `cs-CZ` catalogs
  (*Export as a clean instance* / *Exportovat jako čistou instanci*).

*Verified:* ESLint and `prettier --check` are clean on every touched source file,
the new `en-US` entries match `formatjs extract` byte for byte, and a scoped
`vue-tsc` project (the four touched files only) reports no errors in
`apps/app-frontend` — the full `tsconfig.app.json` check still OOMs on this
sandbox. The Rust side could not be compiled here (no `cargo`/`rustc` and no
crates.io access), so `is_clean_export_excluded()` was reviewed by hand;
`pnpm install` needed `NODE_TLS_REJECT_UNAUTHORIZED=0` for the GitHub tarball
dependency.

## Window-opening animation removed, launch overlay fixed, settings footer restored

**Removed — Settings → Visual → System window opening animation.** The card is
gone from `components/ui/settings/display/VisualSettings.vue`, together with the
`systemOpenAnimation` / `systemOpenAnimationSpeed` preferences in
`composables/use-visual.ts` (stored values are simply ignored and dropped on the
next save), the `mk-window-opening` pop-in CSS in `App.vue` and the native
transitions it switched on: `DWMWA_TRANSITIONS_FORCEDISABLED` (Windows DWM) and
`NSWindowAnimationBehavior` (macOS) in `apps/app/src/main.rs`. `show_window`
no longer takes an argument and the `set_system_window_animation` /
`preview_window_open_animation` commands are gone, so the window appears
immediately with the system's own behaviour. The eight
`app.settings.visual.window-open.*` / `app.settings.visual.kicker.window-open`
message ids were removed from both the `en-US` and `cs-CZ` catalogs.

**Fixed — the Minecraft launch overlay was painted underneath the launcher.**
The overlay was rendered inside `.app-grid-layout`, which has `position:
relative; z-index: 1` and therefore creates its own stacking context; the page
content (`.app-contents`, a later sibling with the same `z-index`) covered all
of it except the corner HUD labels (MINEKUBE / SECURE CHANNEL), which spilled
over the top bar. In `App.vue` the overlay is now wrapped in
`<Teleport to="body">`, so its `z-index: 20000` applies to the whole window and
the launch sequence stays above the launcher, settings and splash layers.

**Restored — the settings footer mark.** The full-width `MINEKUBE LAUNCHER`
wordmark that stretched the footer of the settings modal is back to the
upstream Modrinth arrangement: a small 24 × 24 launcher icon
(`assets/minekube-launcher-icon.png`) in a plain button, still the hidden
developer-mode switch (`components/ui/modal/AppSettingsModal.vue`).

*Verified:* both locale catalogs parse and keep an identical key set for the
removed ids, the three changed Vue single-file components parse and compile
with `@vue/compiler-sfc`, and `git diff --check` is clean. The Rust side could
not be compiled in this sandbox (no `cargo`/`rustc`), but the change only
deletes a helper, two commands and their registration.

## Settings footer wordmark restored (with version, links and a gleam), window
arrive/leave animation, skin-selector button always visible

**Restored — the settings footer wordmark, plus a useful row.** The footer of
the settings modal (`components/ui/modal/AppSettingsModal.vue`) again anchors on
the full-width `MINEKUBE LAUNCHER` wordmark (`MinekubeLauncherLogo`,
`packages/assets/branding/minekube-launcher-logo.png`) instead of the small
24 × 24 icon. Under it sits a compact row: the launcher version (`v…`, from
`getVersion()`) and two link buttons — Minekube website
(https://minekubestudios.github.io/launcher) and Source code on GitHub
(https://github.com/MinekubeStudios/MinekubeLauncher). Hovering the wordmark
sweeps a soft brand-gold gleam across it (`settings-footer-mark__shine`,
transform-only, hidden entirely under `html.no-animations` or
`prefers-reduced-motion`), and the wordmark is still the hidden developer-mode
switch (six clicks). New message ids `app.settings.footer.version`,
`app.settings.footer.website-link` and `app.settings.footer.github-link` exist
in the `en-US` and `cs-CZ` catalogs and match `formatjs extract` byte for byte.

**Fixed — launching now animates.** A hidden Tauri window is shown without the
system's open animation, so starting the launcher popped the window onto the
screen while closing played a smooth system fade. The window now *arrives* and
*leaves* with one matching, compositor-only fade (opacity + a whisper of scale
on `<body>`, which is already a fixed, viewport-sized layer):

- `helpers/main-window.ts` holds the body invisible (`mk-window-hidden`) until
  the backend `show_window` call resolves, then plays `mk-window-arrive`
  (320 ms, decelerating) — so the first painted frame is already the fade-in,
  never a pop. `closeMainWindow()` plays `mk-window-leave` (200 ms, accelerating)
  before destroying the window; both custom title-bar close and the update
  restart path go through it.
- The splash entrance (`splash-contents-enter` on `.app-logo-wrapper`) is paused
  (`mk-window-starting`, `animation-play-state: paused`) until the window is
  really visible. CSS animations run while the window is hidden, so the logo
  entrance used to finish before the first visible frame — now opening reads as
  one sequence: the window settles in and the logo glides in with it.
- The splash exit gained a whisper of scale (1 → 1.02) alongside its opacity
  fade, so the app underneath settles in instead of just appearing.
- `html` is painted in `--color-bg`, so the fades never flash the webview's
  white default. Both fades are skipped entirely when the launcher's animation
  switch is off or `prefers-reduced-motion` is set, and their durations are
  deliberately fixed (not tied to the motion-style tokens) so closing never
  feels slow.

**Changed — the skin-selector button beside each account is always there.**
The shirt button left of the trash icon (`components/ui/AccountsCard.vue`) no
longer hides behind a settings toggle: the *Show skin selector in account
banner* card is gone from Settings → Features (the stored
`show_skin_selector_in_sidebar` value is left untouched and simply ignored), and
the button always shows. Clicking it opens the Skin selector page with its own
transition — a soft zoom crossfade (`skin-route-fwd`, `helpers/route-transitions.ts`
+ `App.vue`), mirrored (`skin-route-back`) on the second click, which returns to
exactly the page the user came from. Regular page changes keep the generic
route animation.

*Verified:* ESLint and `prettier --check` are clean on every touched file, a
scoped `vue-tsc` project reports no new type errors versus `HEAD` (the one
pre-existing `AccountsCard.vue` strictness warning is unchanged and was not
introduced here), `vite build` compiles the whole frontend, both locale
catalogs parse and the three new `en-US` entries match `formatjs extract`
byte for byte while the two removed ids are gone from both source and
catalogs. The Rust side is untouched.

---

## Back navigation never blanks the view again; window fade speeds swapped; new footer icon

**Fixed — pressing Back (or any back control) could empty the content area.**
Clicking through the launcher and then using a back control (the toolbar
arrow, mouse back button, keyboard back) sometimes left the whole main area
blank while the sidebar and top bar stayed — the router view never came
back. The page swap is a `<Transition mode="out-in">` + `<Suspense>` +
`<KeepAlive>` trio (`App.vue`), and either piece can get stuck: an async page
setup that rejects leaves the Suspense unresolved and the view empty
forever, an interrupted leave can keep the transition state waiting. Two
safety nets now make that state impossible to stay in:

- Watchdogs watch every page transition (`before/after-leave`,
  `before/after-enter`, both cancelled variants) and every pending route
  Suspense. If a started swap does not settle within 1.5 s — or a page load
  hangs for 10 s — the whole route view is force-remounted (a fresh
  `<Suspense :key>` discards any stuck transition/Suspense state) and the
  page comes back.
- Route setup errors are caught in `App.vue` with `onErrorCaptured` and shown
  as a small retryable *This page could not be displayed* panel (three new
  `app.route-view.error.*` strings, `en-US` + `cs-CZ`) instead of a silently
  empty area.

**Changed — the window open/close fade speeds were swapped 1:1.** Opening
used to pop in fast while closing lingered. The two definitions in
`assets/stylesheets/global.scss` traded places: `mk-window-arrive` now runs
with the old close feel (200 ms, `cubic-bezier(0.55, 0, 1, 0.45)` — gradual)
and `mk-window-leave` with the old open feel (320 ms,
`cubic-bezier(0.16, 1, 0.3, 1)` — quick). `CLOSE_FADE_DURATION_MS` in
`helpers/main-window.ts` follows the leave duration (320 ms) so the window
stays alive until the fade has actually finished.

**Changed — Settings footer icon.** The gold *MINEKUBE LAUNCHER* wordmark at
the bottom of Settings is gone. In its place sits the new, symmetric
`MinekubeLogo-Launcher_IconV2` artwork (the Steve/Alex/pig trio), added to
`packages/assets/branding/minekube-launcher-icon-v2.png` (trimmed and
downscaled from the 8.3 MB master to a 675 KB, 982×1000 PNG, exported as
`MinekubeLauncherIconV2`) and centered in the footer at a fixed 6 rem height.
The yellow hover gleam (`settings-footer-mark__shine`) was removed with it —
the icon is clean now. The splash screen and its preview keep the original
`MinekubeLauncherLogo` wordmark; the six-click hidden developer-mode switch
and the version tooltip on the footer button are unchanged.

*Verified:* ESLint and `prettier --check` are clean on every touched file,
`vue-tsc --noEmit` passes, and `vite build` compiles the whole frontend
(`packages/assets` export resolves). The Rust side is untouched.
