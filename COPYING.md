# Copying Guidelines

Minekube Launcher as a whole — the desktop app (`apps/app`, `apps/app-frontend`),
the app core (`packages/app-lib`) and the shared packages it builds on
(`packages/ui`, `packages/utils`) — is distributed under the **GNU General Public
License, Version 3 only** (`GPL-3.0-only`), provided in the file
[LICENSE](./LICENSE).

This project is a fork of the [Modrinth App](https://github.com/modrinth/code),
which is also `GPL-3.0-only`. Because the GPL is a copyleft license, this fork
**must stay open source under GPL-3.0-only** — it cannot be relicensed to a
permissive or proprietary license, and any distributed build (installer, binary,
modified source) must come with the corresponding source code.

Some packages are licensed differently by their authors. Their original license
files are kept intact, and for those packages the package license applies:

| Package                         | License                                       |
| ------------------------------- | --------------------------------------------- |
| `packages/api-client`           | LGPL-3.0-only (`packages/api-client/LICENSE`) |
| `packages/daedalus`             | MIT (`packages/daedalus/LICENSE`)             |
| `packages/async-minecraft-ping` | MIT OR Apache-2.0                             |
| `.github/workflows`             | MIT (`.github/workflows/LICENSE`)             |

Refer to each package's `COPYING.md`, `LICENSE.txt`, or `LICENSE` file for details.

## Modrinth Branding

The use of Modrinth branding elements, including but not limited to the wrench-in-labyrinth logo, the landing image, and any variations thereof, is strictly prohibited without explicit written permission from Rinth, Inc. This includes trademarks, logos, or other branding elements.

> All rights reserved. © 2020-2025 Rinth, Inc.

This includes, but may not be limited to, the following files:

- .idea/icon.svg
- .github/api_cover.png
- .github/app_cover.png
- .github/monorepo_cover.png
- .github/web_cover.png

If you fork this repository, you must remove all Modrinth branding assets from your fork.
