# Implementation Patterns

Use this file when editing ZEP Script backend code or widget code.

Most sections apply to any ZEP Script app. Sections marked **(advanced)** target
large apps; skip them for a small template app.

## Contents

- [Backend Versus Widget](#backend-versus-widget)
- [Restricted Globals (Backend Lint)](#restricted-globals-backend-lint)
- [Lifecycle](#lifecycle)
- [Player State](#player-state)
- [`sendUpdated()` And Storage](#sendupdated-and-storage)
- [Delayed Work](#delayed-work)
- [Map And Object Events](#map-and-object-events)
- [Objects And Phaser Objects](#objects-and-phaser-objects)
- [Widgets](#widgets)
- [Parent Window Messages](#parent-window-messages) (advanced)
- [Storage](#storage)
- [HTTP](#http)
- [Localization, Media, Effects, Analytics](#localization-media-effects-analytics)
- [Private And Type-Augmented APIs](#private-and-type-augmented-apis) (advanced)

## Backend Versus Widget

| Area | Runtime | Use | Avoid |
| --- | --- | --- | --- |
| Backend script | game server + Jint | `ScriptApp`, `ScriptMap`, callback players, widget handles | DOM, browser fetch, Node APIs |
| Widget iframe | browser iframe | DOM, `window.postMessage`, local UI state | direct `ScriptApp` calls |

## Restricted Globals (Backend Lint)

Backend script code must avoid browser/Node globals (see the table above). Make
this a lint error, not a convention. ESLint flat-config recipe:

```js
// eslint.config.mjs
import tseslint from "typescript-eslint";

export default [
    ...tseslint.configs.recommended.map((c) => ({ ...c, files: ["./src/**/*.ts", "./main.ts"] })),
    {
        files: ["./src/**/*.ts", "./main.ts"],   // <-- must match your real source layout
        rules: {
            "no-restricted-globals": ["error",
                { name: "console", message: "console is not available in ZEP-SCRIPT." },
                { name: "window", message: "window is not available in ZEP-SCRIPT." },
                { name: "document", message: "document is not available in ZEP-SCRIPT." },
                { name: "localStorage", message: "localStorage is not available." },
                { name: "sessionStorage", message: "sessionStorage is not available." },
                { name: "fetch", message: "fetch is not available; use ScriptApp.httpGet/httpPost." },
                { name: "XMLHttpRequest", message: "XMLHttpRequest is not available." },
                { name: "Map", message: "Map collides with the runtime Map global; use a plain object/Record." },
                { name: "process", message: "Node process is not available." },
                { name: "global", message: "Node global is not available." },
            ],
        },
    },
];
```

Notes:

- `Map` is restricted because the runtime injects a `Map` global (the C# map
  stub); a backend `new Map()` can resolve to the wrong thing. Use a plain
  object or `Record<...>`.
- `console` is restricted; use the runtime `print`/`log` (or a logging helper).
- Widget iframe code is browser code; lint it separately (DOM and `window` are
  legitimate there).

> Gotcha: the rule only protects files its `files` globs match. A config that
> targets `./libs/**`/`./apps/**` while the code lives in `src/`/`main.ts` lints
> nothing and passes silently. Confirm the globs match your layout.

## Lifecycle

Small app:

```ts
ScriptApp.onInit.Add(() => {
	// load resources, initialize app state
});

ScriptApp.onJoinPlayer.Add(player => {
	player.tag = {};
});

ScriptApp.onUpdate.Add(dt => {
	// keep cheap
});
```

Large app: centralize raw lifecycle hooks behind a local manager. Useful manager
features:

- priority ordering
- duplicate registration protection
- one exception policy
- explicit removal for temporary `onUpdate` callbacks

## Player State

Use `player.tag` for volatile per-player runtime state:

- role flags
- progress
- temporary locks
- widget handles
- parsed `player.customData`
- media/effect restore state

Initialize intentionally on join:

```ts
ScriptApp.onJoinPlayer.Add(player => {
	player.tag = {};
});
```

Do not treat `player.tag` as durable storage. For ambiguous `customData` fields,
convert to meaningful app-local names immediately.

## `sendUpdated()` And Storage

Call `player.sendUpdated()` after visible/behavioral player mutations:

- name/title/titleColor
- moveSpeed/hidden/displayRatio
- sprite/avatar/effect/scale/animation state
- player interaction flags, when supported

Call `ScriptApp.sendUpdated()` after visible app/global mutations.

For app storage, prefer TypeScript `ScriptApp.getStorage` and
`ScriptApp.setStorage`; after build these are runtime `App.getStorage` and
`App.setStorage`.

```ts
player.moveSpeed = 0;
player.sendUpdated();

ScriptApp.getStorage(rawStorage => {
	const data = rawStorage ? JSON.parse(rawStorage) : {};
	data.enabled = true;
	ScriptApp.setStorage(JSON.stringify(data));
});
```

Direct `ScriptApp.storage` assignment plus `ScriptApp.save()` is still exposed
by the SDK and appears in legacy code, but treat it as the non-preferred path
for new work. Use it only when maintaining legacy code and after checking
current runtime behavior.

## Delayed Work

Refetch players in delayed callbacks:

```ts
const playerId = player.id;

ScriptApp.runLater(() => {
	const current = ScriptApp.getPlayerByID(playerId);
	if (!current) return;
	current.moveSpeed = 80;
	current.sendUpdated();
}, 0.5);
```

For overlapping interactions, use a token:

```ts
const token = Date.now();
player.tag.actionToken = token;

ScriptApp.runLater(() => {
	const current = ScriptApp.getPlayerByID(player.id);
	if (!current || current.tag.actionToken !== token) return;
	current.tag.locked = false;
}, 1);
```

## Map And Object Events

Common APIs:

- `ScriptMap.hasLocation(name)`
- `ScriptMap.getLocation(name)`
- `ScriptMap.getLocationList(name)`
- `ScriptApp.addOnLocationEnter(name, callback)`
- `ScriptApp.addOnLocationExit(name, callback)`
- `ScriptApp.onTriggerObject.Add(...)`
- `ScriptApp.onObjectTouched.Add(...)`
- `ScriptApp.onAppObjectTouched.Add(...)`, when supported

Interaction recipe:

1. Check global lock/game state.
2. Check object key/location/effect metadata.
3. Check player role/progress.
4. Apply a short interaction lock if repeated triggers are possible.
5. Mutate `player.tag`, app state, or map state.
6. Show widget, dialogue, sound, object animation, or label.
7. Flush changed visible fields.

## Objects And Phaser Objects

Keep visibility models separate:

| API family | Visibility |
| --- | --- |
| `ScriptMap.putObject*` | map/app object through server packets |
| `player.putIndividualObject` | one player only |
| `ScriptApp.addPhaserGo` | global Phaser UI/game object, if supported |
| `player.addPhaserGo` | one player only, if supported |

Late join is the common failure mode. If state was emitted before a player
joined, reinstall visual state in `onJoinPlayer`, use map-backed state included
in dynamic map data, or use per-player APIs on join.

### NPC Key Objects

An NPC is a map key object that carries an `npcProperty` (a name + HP gauge).
Place it with `ScriptMap.putObjectWithKey(x, y, dynamicResource, option)`. When
`option` includes `npcProperty`, the return type is an `NpcObject` — it exposes
the live `npcProperty` plus its own `sendUpdated()`.

```ts
const sprite = ScriptApp.loadSpritesheet("npc.png");

const npc = ScriptMap.putObjectWithKey(x, y, sprite, {
	key: "boss-1",                // key-object id
	npcProperty: {
		name: "Boss",
		hp: 100,
		hpMax: 100,               // gauge fills as hp / hpMax
		gaugeWidth: 64,           // HP gauge width
		hpColor: 0xff0000,        // HP color as a number (0xRRGGBB)
	},
});

npc.npcProperty.hp -= 10;         // mutate the NPC's own fields
npc.sendUpdated();                // then flush via the object's own sendUpdated()
```

`NpcProperty` fields are all optional: `name`, `hp`, `hpMax`, `gaugeWidth`,
`hpColor` (a numeric color). Without `npcProperty`, `putObjectWithKey` returns a
plain `MapDataTileAppObject` (no NPC gauge). The returned object's
`sendUpdated()` is distinct from `player.sendUpdated()` / `ScriptApp.sendUpdated()`
— call it after changing the NPC's own fields.

## Widgets

Backend pattern:

```ts
player.tag.menuWidget?.destroy();
player.tag.menuWidget = null;

const widget = player.showWidget("widgets/menu.html", "topright", 0, 0);
player.tag.menuWidget = widget;

widget.onMessage.Add((sender, data) => {
	if (data?.type === "initRequest") {
		widget.sendMessage({
			type: "init",
			payload: {
				isMobile: sender.isMobile,
				isTablet: sender.isTablet,
			},
		});
	}
});
```

Widget iframe pattern:

```js
window.addEventListener("message", event => {
	const message = event.data;
});

window.parent.postMessage({ type: "initRequest" }, "*");

// WidgetRearrange: partial update of this widget's layout/visibility/drag.
// Send only the fields you want to change.
window.parent.postMessage({
	type: "WidgetRearrange",
	width: "100%",            // size — "%" or "px" (e.g. "100%", "320px")
	height: "100%",
	anchor: "topright",       // alignment enum (see contract below)
	draggable: false,         // toggle drag (boolean)
	// any other key is applied as CSS on the widget element:
	top: "10px",
	left: "-10px",
	visibility: "hidden",     // "visible" | "hidden"
	pointerEvents: "none",
	zIndex: 9999,
}, "*");
```

Prefer `{ type, payload }` for widget communication protocols.

`WidgetRearrange` can hide/resize an iframe without destroying state. Choose
destroy/recreate for modal/callback reset; choose preload/hide/show for
frequent or animated widgets.

### `WidgetRearrange` message contract

A `WidgetRearrange` message is a **partial update** of a single widget's layout,
visibility, and drag state. The client merges it onto the existing widget props
(`{ ...widget, ...changes }`), so the React widget state and iframe are preserved
and only the fields you send change — this is why `WidgetRearrange` can
resize/hide a widget without destroying it.

Message fields the iframe can send:

| Field | Effect | Applied when |
| --- | --- | --- |
| `width` / `height` | widget size as a CSS length — `%` or `px` (e.g. `"100%"`, `"100px"`, `"320px"`) | value is not `undefined` |
| `anchor` | sets the widget alignment | value is truthy |
| `draggable` | toggle drag handle | value is a boolean |
| `transform` | CSS `transform` on the widget | value is not `undefined` |
| any other key | applied as CSS on the widget element | value is not `undefined` |

`anchor` values: `"top"`, `"topleft"`, `"topright"`, `"middle"`, `"bottom"`,
`"bottomleft"`, `"bottomright"`.

CSS passthrough — any key that is not `width`/`height`/`anchor`/`draggable`/
`transform` is merged into the widget's CSS `style`. Common ones: `top`, `left`,
`visibility` (`"visible"`/`"hidden"`), `pointerEvents` (`"none"`/`"auto"`),
`zIndex`, `opacity`, `display`.

Behavioral facts to rely on:

- **Merge, not replace.** `style` accumulates (`{ ...widget.style, ...new }`);
  send only the props you want to change.
- **`undefined` is ignored.** You cannot clear a field by sending `undefined`;
  send a real value instead (e.g. `visibility: "visible"` to un-hide).
- **Hide/show is a style change** (`visibility: "hidden"`, `display: "none"`, or
  `opacity: 0`) — the widget/iframe state survives, so a later
  `visibility: "visible"` restores it without a reload.
- **`pointerEvents: "none"`** lets clicks pass through a full-screen overlay
  widget to the game canvas underneath.
- **Drag** only toggles when `draggable` is a real boolean.

The client merges these message fields onto the widget's props (a partial
update, not a replace); author-facing widget code only needs to send the fields
above.

## Parent Window Messages

*(Advanced — for large apps coordinating with an outer product page.
Skip for a small template app.)*

Do not mix widget messages with parent-window messages.

| Channel | Use |
| --- | --- |
| `ScriptWidget.sendMessage` / `widget.onMessage` | backend <-> widget iframe |
| `ScriptApp.onPostMessage` | public SDK callback for widget/iframe `window.parent.postMessage` messages into the backend |
| `player.sendParentWindowMessage` / `ScriptApp.onParentWindowMessage` | internal/type-augmented backend <-> outer product page coordination |

Use parent-window messages for product-shell coordination: readiness, profile
or name sync, class/context sync, score peeking, platform UI requests.
Do not assume `ScriptApp.onParentWindowMessage` exists in the public SDK; verify
local type augmentation before using it.

## Storage

Use `ScriptApp.getStorage` to read app storage and parse defensively:

```ts
function readStorage(callback: (data: Record<string, unknown>) => void) {
	ScriptApp.getStorage(rawStorage => {
		try {
			callback(rawStorage ? JSON.parse(rawStorage) : {});
		} catch {
			callback({});
		}
	});
}
```

Use `ScriptApp.setStorage(JSON.stringify(data))` to persist app storage. Do not
introduce new direct `ScriptApp.storage = ...; ScriptApp.save();` writes.

Namespace player storage keys by app/space/map/feature. Use `player.tag` only
for runtime state.

## HTTP

Use the ZEP Script HTTP bridge:

```ts
ScriptApp.httpGet(url, null, response => {
	let data;
	try {
		data = JSON.parse(response);
	} catch {
		return;
	}
});
```

Patterns:

- build query strings with `encodeURIComponent`
- keep auth headers in one service/helper
- normalize response status in one place
- retry only safe/idempotent calls

## Localization, Media, Effects, Analytics

- Determine player language at join/widget init; send `languageCode` and needed
  strings explicitly.
- Verify missing localization keys do not render as blank UI.
- For media widgets, record previous BGM/media state and restore only if it was
  active before opening.
- For temporary avatar/effect changes, save original state in `player.tag` and
  restore on leave/end/close.
- Wrap analytics calls in a service/helper that enriches app/map/space/player
  context.

## Private And Type-Augmented APIs

*(Advanced — for apps that extend the SDK with local type augmentation.
Skip for a small template app.)*

Classify local API additions:

| Classification | Meaning |
| --- | --- |
| typing correction | runtime supports it; SDK type is incomplete/wrong |
| guide-missing public API | runtime supports it; likely safe internally |
| internal/private API | useful but platform-change risk is higher |

Before adding `@ts-ignore`, inspect local type augmentation. Before teaching an
API broadly, decide which classification applies.

Type augmentation pattern:

```ts
import "zep-script";
import { ScriptPlayer } from "zep-script";

declare module "zep-script" {
	interface ScriptPlayer {
		localize(key: string, locale?: string): string;
	}
}
```

A typical setup installs `zep-script`, enables `types: ["zep-script"]` in
`tsconfig.json`, and layers a local `types/zep-script/index.d.ts` module
augmentation on top of the SDK-provided types. Keep those local additions
classified as typing corrections, guide-missing public APIs, or internal/private
APIs before relying on them elsewhere.
