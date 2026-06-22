# Troubleshooting

Use this file when a ZEP Script app builds but behaves incorrectly, or when
debugging runtime/server/client behavior.

## Symptom Map

| Symptom | Likely area | Inspect |
| --- | --- | --- |
| TS uses `ScriptApp` but runtime error mentions `ScriptApp` | build/Babel transform missing | Babel config, the `zep-script` Babel plugin |
| `Map` or built-in collection behaves oddly in backend TS | `Map` name conflict/runtime global | use plain object/Record; inspect lint rules |
| Field changed but player/app did not update visually | missing flush | `player.sendUpdated()` or `ScriptApp.sendUpdated()` |
| NPC HP gauge / name does not update | mutated `npcProperty` but did not flush, or flushed the wrong object | mutate `npc.npcProperty.*`, then call the returned object's own `sendUpdated()` (not `player`/`ScriptApp`); see `patterns.md` NPC Key Objects |
| App storage changed but not persisted or is stale across maps | legacy direct storage/save path or missing `setStorage` | `ScriptApp.getStorage` / `ScriptApp.setStorage`; avoid new `ScriptApp.storage` + `ScriptApp.save()` writes |
| Delayed callback mutates wrong/missing player | stale handle | store ID and refetch via `ScriptApp.getPlayerByID` |
| Late-joining player cannot see object/UI | one-time packet or per-player state not replayed | join handler, object API family, client manager |
| Widget appears but does not resize/hide correctly | iframe arrangement protocol | `WidgetRearrange` message contract — see `patterns.md` Widgets |
| `WidgetRearrange` field has no effect (anchor/size/style unchanged) | unrecognized message key or `undefined` value | message keys: `width`/`height`/`anchor`/`draggable`/`transform`; any other key is applied as CSS `style` (`top`, `left`, `visibility`, `pointerEvents`, `zIndex`, …); `undefined` is dropped — see `patterns.md` Widgets |
| Widget message not received by backend | wrong channel or iframe source | `widget.onMessage`, `window.parent.postMessage`, widget ID |
| Parent web app does not receive message | wrong channel or missing internal augmentation | public `ScriptApp.onPostMessage`; internal/type-augmented `player.sendParentWindowMessage` / `ScriptApp.onParentWindowMessage` |
| HTTP call fails in backend | wrong API or parsing | `ScriptApp.httpGet/httpPostJson`, headers, JSON parse |
| Localization is blank | missing key or helper behavior | backend localize payload, widget localize map |
| Media widget restarts BGM unexpectedly | missing previous-state policy | `player.tag` media state, widget close handlers |
| Works in source but not uploaded app | archive shape | root-level `main.js`, `res/`, zipped files not folder |
| Built app throws at load referencing `self`/global | webpack `output.globalObject` wrong for Jint | set `output.globalObject: "this"`; see `webpack-build.md` |
| Split build runs locally but uploaded app misses code | non-deterministic chunk names or chunk not archived | stable `chunk-local-NNN.js` naming; ensure all `*.js` are in the zip; see `webpack-build.md` |
| Restricted globals (`window`/`fetch`/`Map`…) slip through despite a lint | lint `files` globs do not match source layout | point eslint `files` at `src/`/`main.ts`; see `patterns.md` Restricted Globals |
| Errors visible only to some users | permission behavior | official deployment guide says staff-or-higher see red chat errors |

## Runtime Boundary Checks

Before debugging deeply, answer these:

1. Is the code backend script or widget iframe code?
2. Is the problem before build, after build, after upload, or after install?
3. Is the visible result rendered by Phaser, React widget iframe, or parent web
   app?
4. Is the relevant source repo available locally?
5. Is the code using public SDK APIs, local type augmentation, or private APIs?

## Verification Checklist

For code changes:

- Run current repo type check and lint.
- Run backend restricted-global lint if available, and confirm its `files` globs
  actually match your source layout (see `patterns.md`).
- Build the affected app. For webpack projects, confirm `res/main.js` builds and
  chunk names are stable (see `webpack-build.md`).
- Archive/package if deploy behavior changed.
- Run widget build/test if widget source changed.
- Manually test owner/admin/staff and ordinary players.
- Manually test desktop/tablet/mobile when UI changed.
- Test late join and leave/rejoin around delayed callbacks.
- Test widget close/reopen/repeated interaction.
- Test localization for supported locales touched by the change.
- Test storage persistence across reload/re-entry if storage changed.
