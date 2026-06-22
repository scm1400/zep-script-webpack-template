# Development And Deploy

Use this file for setup, build, archive, upload, and SDK/CLI questions.

## Contents

- [Official Setup Facts](#official-setup-facts)
- [Project Shape](#project-shape)
- [SDK Package Roles](#sdk-package-roles)
- [Type Sources And Installation](#type-sources-and-installation)
- [JavaScript And TypeScript Authoring Flow](#javascript-and-typescript-authoring-flow)
- [Deployment Paths](#deployment-paths)
- [CLI Commands](#cli-commands)
- [`zep-script.json`](#zep-scriptjson)
- [TypeScript Naming](#typescript-naming)
- [Verification](#verification)

## Official Setup Facts

Official docs cover the stable public flow:

- Install Node.js LTS.
- Use `res/` for images, sounds, and HTML files.
- JavaScript projects can be archived with `npx zep-script archive` when the
  project already has `main.js` and resources in the expected shape.
- TypeScript projects must be built to JavaScript before execution.
- TypeScript authoring uses `ScriptApp` rather than `App`.
- Upload packages through My Apps or deploy through the CLI.

When exact setup behavior matters, verify against the official docs:

- JS setup/deploy: https://docs.zep.us/zep-script/zep-script-guide/zep-script-development-guide/javascript-development-tips
- TS setup/build: https://docs.zep.us/zep-script/zep-script-guide/zep-script-development-guide/typescript-development-tips
- zip/upload/install/error: https://docs.zep.us/zep-script/zep-script-guide/zep-script-development-guide/zep-script-deployment-guide

## Project Shape

Expected simple project shape:

```text
my-zep-app/
├── main.ts or main.js
├── res/
│   ├── widgets/*.html
│   ├── images, sounds, other resources
│   └── main.js, when using a webpack-style build
├── package.json
├── zep-script.json
├── tsconfig.json
├── babel.config.js
└── webpack.config.js, if used
```

The final uploaded zip must contain root-level `main.js`. The official
deployment guide says to select the individual files and compress them, not the
containing folder.

## SDK Package Roles

Treat the public SDK as one ZEP Script app-development toolchain with different
roles for JavaScript and TypeScript authoring, not as two separate runtimes:

| Package/source | Role |
| --- | --- |
| `zep-script` | Public SDK package used by app projects; exposes the TypeScript-facing declarations and bundles the CLI. |
| `zep-script-cli` | `init`, `build`, `archive`, and `publish` commands used for project setup, packaging, and upload/update. |
| `babel-plugin-zep-script` | TypeScript build transform that rewrites `ScriptApp`/`ScriptMap` authoring names to runtime `App`/`Map`. |
| SDK `.d.ts` files | TypeScript API surface for `ScriptApp`, `ScriptMap`, `ScriptPlayer`, `ScriptWidget`, and related values. |

JavaScript authoring targets the runtime JavaScript shape directly. TypeScript
authoring uses SDK types and build transforms before the app can run on ZEP.

## Type Sources And Installation

For TypeScript app projects, install `zep-script` as a development dependency.
Do not rely on the platform runtime or SDK tooling to make editor/type-checker
types appear implicitly:

```bash
pnpm add -D zep-script
# or: npm install --save-dev zep-script
```

`zep-script` includes:

- `index.d.ts`, which exports `ScriptApp`, `ScriptMap`, `ScriptPlayer`,
  `ScriptWidget`, and related types.
- the `zep-script` CLI binary.
- the Babel plugin and CLI packages as package dependencies.

Typical TypeScript config:

```json
{
	"compilerOptions": {
		"typeRoots": ["./types", "./node_modules/@types"],
		"types": ["zep-script"]
	},
	"include": ["src/**/*", "types/**/*"]
}
```

A typical project wires types with `devDependencies.zep-script`, a
`tsconfig.json` `types: ["zep-script"]` entry, and a local
`types/zep-script/index.d.ts` for module augmentation. Treat such local
augmentation as typing corrections or internal/private API classification before
relying on it (see `patterns.md` Private And Type-Augmented APIs).

## JavaScript And TypeScript Authoring Flow

JavaScript flow:

```text
main.js + res/
  -> npx zep-script archive or manual zip
  -> upload/publish
  -> game server runs main.js
```

TypeScript flow:

```text
main.ts + res/ + SDK types
  -> type check
  -> Babel or webpack build
  -> built JavaScript with runtime App/Map names
  -> archive/upload or publish
  -> game server runs built JavaScript
```

For TypeScript, write `ScriptApp` and `ScriptMap` in source. The built
JavaScript runs as `App` and `Map`. Treat `ScriptPlayer` and `ScriptWidget` as
TypeScript types or object handles, not runtime global namespaces.

## Deployment Paths

Manual upload path:

1. Build the app if it uses TypeScript.
2. Create a zip that contains root-level `main.js` and the app resources.
3. Upload the zip from the ZEP platform's My Apps / personal app upload page.
4. Install the uploaded app by the app type: map app, mini-game, or sidebar app.

CLI publish path:

1. Put the existing app ID in `zep-script.json`.
2. Run `npx zep-script build` if needed.
3. Run `npx zep-script archive`.
4. Run `npx zep-script publish` to update the uploaded app through the SDK/CLI.

Use CLI publish primarily as an update flow for an already-created app unless
current platform behavior confirms app creation is supported.

## CLI Commands

Common commands:

```bash
npx zep-script init MyZepApp --npm
npx zep-script build
npx zep-script archive
npx zep-script publish
```

`zep-script-cli` is bundled with `zep-script`; it generally does not need direct
installation. Check the SDK README and CLI README when command behavior is in
question.

CLI behavior notes (verify against your installed `zep-script` version):

- `build` detects `main.ts` or `main.js`.
- TypeScript build runs `tsc -p . --noEmit`.
- If a webpack config exists, build uses webpack output path `./res`.
- Otherwise Babel compiles `main.ts` to `dist/`.
- `archive` creates `{projectName}.zepapp.zip`.
- TS archive includes `dist/` or built `res/main.js`, plus `res/`.
- JS archive includes `*.js` files plus `res/`.
- `publish` reads `zep-script.json`, finds a `.zepapp.zip`, performs email-code
  auth if needed, and uploads to the My Apps API.

## `zep-script.json`

Typical shape:

```json
{
	"appId": "Zjkgoj",
	"name": "Template",
	"description": "Template application",
	"type": "normal"
}
```

Official docs describe `appId` as the ID from an existing My Apps URL. In
practice, use CLI publish as an update flow for an existing app unless current
platform behavior confirms app creation.

App type:

| Type | Meaning | Install route |
| --- | --- | --- |
| `normal` | Map-installed app | Map Editor -> Map Setting -> Application dropdown |
| `minigame` | Mini-game app | Play screen -> Mini-Game sidebar button |
| `sidebar` | Sidebar app | Sidebar app installation/activation |

## TypeScript Naming

Official TS docs say to add `Script` before App/Map/Player/Widget. The
implementation distinction is more precise:

| TypeScript authoring | Built/runtime JavaScript |
| --- | --- |
| `ScriptApp.foo` | `App.foo` |
| `ScriptMap.foo` | `Map.foo` |
| `ScriptPlayer` | type/class for callback player instances |
| `ScriptWidget` | type/class for widget handles |

`ScriptApp` and `ScriptMap` are compile-time aliases. `ScriptPlayer` and
`ScriptWidget` should be treated as TypeScript types/handles, not global
runtime namespaces.

## Verification

Before upload:

1. Run project type checks/lint.
2. Build.
3. Archive.
4. Confirm package contains root-level `main.js`.
5. If widgets changed, run widget-specific checks.
6. Test the installed app with a staff-or-higher account so script errors are
   visible in chat.
