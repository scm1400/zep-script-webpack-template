---
name: zep-script-guide
description: "Use for ZEP Script app setup, build/deploy, TypeScript APIs, widget messaging, and runtime/server/client debugging."
---

# ZEP Script

## Operating Model

Treat ZEP Script as a split runtime:

```text
TypeScript/JavaScript app package
  -> zep-script build/archive or manual zip
  -> ZEP app upload/publish
  -> C# game server runs built JavaScript in Jint
  -> script mutates app/player/map/widget state
  -> game server emits packets
  -> zep-client renders Phaser scene and React widget iframes
```

Do not assume backend script code runs in a browser or Node.js. Widget HTML/JS
runs in a browser iframe; backend app code runs in the ZEP Script server
runtime.

## Quick Start

Most common goal — build and deploy an app from a template project:

1. Build to `res/main.js`: `pnpm build` (webpack) or `npx zep-script build`.
2. Package: `npx zep-script archive` -> `{name}.zepapp.zip` (root-level `main.js`).
3. Upload via My Apps, or `npx zep-script publish` to update an existing app.

Webpack projects build with `webpack` directly (not `zep-script build`); see
`references/webpack-build.md`. For anything beyond this path, follow First Steps.

## First Steps

1. Identify the current repository, if one is present, and read its local agent
   instructions first (`AGENTS.md`, `CLAUDE.md`, or equivalent).
2. Classify the task:
   - setup/build/deploy
   - backend script feature/change
   - widget UI/message protocol
   - runtime/debugging/server/client behavior
3. Read only the relevant references:
   - `references/source-routing.md`: where to look and fallback rules.
   - `references/development-and-deploy.md`: setup, build, archive, deploy.
   - `references/webpack-build.md`: webpack + Jint bundling, chunk splitting,
     build/package/deploy scripts.
   - `references/runtime-model.md`: Jint, game server, zep-client rendering.
   - `references/patterns.md`: implementation rules and examples.
   - `references/troubleshooting.md`: symptoms, checks, verification.
4. Locate relevant source before editing. Do not assume the session starts
   inside the app source repository. Read the files the task touches in the
   current project; if the target source is unavailable, answer from official
   docs plus the visible project source.
5. Never claim you inspected source you could not open. When behavior cannot be
   verified against the project or official docs, say so.

## Non-Negotiable Rules

- In TypeScript, write `ScriptApp` and `ScriptMap`; after build they become
  runtime `App` and `Map`.
- Treat `ScriptPlayer` and `ScriptWidget` primarily as TypeScript types/handles,
  not as runtime global namespaces.
- Keep backend script code away from browser/Node assumptions such as
  `window`, `document`, `fetch`, `localStorage`, `process`, filesystem, or
  normal Node timers unless the target repo explicitly provides a safe wrapper.
- Keep DOM work in widget iframe code, not in backend script code.
- For webpack-based projects, set `output.globalObject: "this"` (Jint has no
  `self`/`window`), build with `webpack` directly, and keep chunk names stable;
  see `references/webpack-build.md`.
- Use `ScriptApp.httpGet`/`httpPost`/`httpPostJson` for backend HTTP.
- Use `player.tag` for volatile per-player runtime state.
- Call `player.sendUpdated()` after changing visible/behavioral player fields.
- Call `ScriptApp.sendUpdated()` after changing visible app/global fields.
- For app storage, prefer TypeScript `ScriptApp.getStorage`/`setStorage`
  (runtime `App.getStorage`/`setStorage`). Treat direct `ScriptApp.storage`
  assignment plus `ScriptApp.save()` as legacy/non-preferred.
- For delayed callbacks that touch players, store `player.id` and refetch with
  `ScriptApp.getPlayerByID(...)`.
- Prefer `{ type, payload }` for widget message protocols.

## Source Priority

Prefer sources in this order:

1. Official ZEP docs and public SDK docs for setup/build/archive/deploy/API
   basics.
2. The target repository's local rules, type augmentations, and visible source,
   when available.
3. The public `zep-script` SDK package (types, CLI, Babel plugin) for
   build/transform behavior.

When a higher-priority source is unavailable, use the next one down.

## Common Search Commands

Use these from the project root and adapt paths as needed.

```bash
rg -n "ScriptApp\\.|ScriptMap\\.|ScriptPlayer|ScriptWidget" .
rg -n "sendUpdated\\(|getStorage\\(|setStorage\\(|ScriptApp\\.storage|ScriptApp\\.save\\(" .
rg -n "showWidget\\(|sendMessage\\(|onMessage\\.Add|WidgetRearrange" .
rg -n "runLater\\(|setTimeout\\(|setInterval\\(" .
rg -n "httpGet\\(|httpPost\\(|httpPostJson\\(" .
```

When mining a built project, exclude generated output so you read source, not
the bundle:

```bash
rg -n "ScriptApp\\.|ScriptMap\\.|showWidget\\(" src main.ts --glob '!**/res/**'
```

## Verification

Run the target repo's documented checks. For ZEP Script projects, usually verify
some combination of:

- type check
- backend restricted-global lint
- app build
- archive/package creation
- widget build/test if widgets changed
- manual play test for join, late join, leave/rejoin, widget resize, storage,
  localization, and script error visibility

Never claim runtime behavior is verified unless you actually ran or inspected
the relevant runtime path.
