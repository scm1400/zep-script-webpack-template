# Runtime Model

Use this file for runtime, server/client boundary, and "where does this run?"
questions.

## Contents

- [Mental Model](#mental-model)
- [Game Server Runtime](#game-server-runtime)
- [Upload/Install Flow](#uploadinstall-flow)
- [Lifecycle Order](#lifecycle-order)
- [Client Rendering](#client-rendering)
- [Boundary Table](#boundary-table)

## Mental Model

```text
main.ts/main.js + res/
  -> build/archive/upload or publish
  -> web server stores app package data
  -> game server installs a ScriptApp for a room/map/sidebar/minigame
  -> the app's *.js is loaded from the app zip
  -> JavaScript runs in a Jint engine
  -> injected App/Map/player/widget APIs mutate server-side state
  -> game server sends network packets
  -> zep-client renders Phaser objects and React widget iframes
```

Backend script code controls state and emits effects. It does not draw pixels
directly. The client renders the result.

## Game Server Runtime

The game server runs the built JavaScript in a Jint engine and injects the
runtime globals, including:

```text
print, log
setTimeout, setInterval
App
PlayerStorage
Map
Utility
require
TileEffectType, ColorType, KeyCodeType, ObjectEffectType
DateType, Time, PutObjectType, ChangeObjectSubType
Web3
```

Practical consequences:

- TypeScript must be compiled; the game server runs JavaScript.
- `App` and `Map` are runtime globals injected into Jint, not browser/Node
  objects.
- `setTimeout` and `setInterval` map to script jobs, not Node timers.
- Backend script code should not assume DOM, browser fetch, Node modules, or
  filesystem access.
- UI pixels are not drawn by the backend script itself. Backend API calls mutate
  server-side state and emit packets; the client renders the visible result.

## Upload/Install Flow

Observed behavior:

- A raw `.js` upload can be wrapped as `main.js`.
- A zip upload must contain root-level `main.js`.
- App metadata/package data is saved in the app record.
- Map-installed apps are associated with a map app ID.
- Room install creates a `ScriptApp` and starts its script thread.

## Lifecycle Order

After scripts load:

1. `onInit`
2. existing players joined through the player service
3. `onStart` waits for client readiness, with timeout
4. `onUpdate` begins
5. destroy/migration paths stop the thread and dispose resources

Use `ScriptApp.onMigrationStart` and migration player flags only after checking
current SDK/runtime support.

## Client Rendering

The client turns server packets into rendered output:

- `ScriptMap.putObject*` effects become packets handled by Phaser-side object
  managers.
- `ScriptApp.addPhaserGo` and related APIs are bridged through packet handlers
  to the Phaser UI layer.
- `player.showWidget` / `ScriptApp.showWidget` become show-widget packets; the
  client mounts a React widget that loads the app's HTML in a sandboxed iframe.
- Widget iframe messages are forwarded back to the game server. A
  `WidgetRearrange` message is applied client-side as a partial merge onto the
  widget props (message `width`/`height`/`anchor`/`draggable`/`transform`, where
  `anchor` sets the widget alignment; any other key merges into CSS `style`), so
  widget/iframe state is preserved across a rearrange. See `patterns.md` Widgets.

## Boundary Table

| Layer | Owns |
| --- | --- |
| ZEP Script JS in Jint | rules, state mutation, callbacks, app/player/map/widget API calls |
| Game server | app install, lifecycle, storage, HTTP bridge, packet emission |
| zep-client Phaser | map, objects, players, effects, camera, game canvas |
| zep-client React/iframe | widgets, sidebar/popup/floating UI, iframe messaging |
