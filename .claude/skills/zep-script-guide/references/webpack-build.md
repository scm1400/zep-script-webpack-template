# Webpack Build

Use this file for webpack-based ZEP Script projects: bundling `main.ts` plus
`src/` modules into the `res/main.js` (and optional chunks) that the game server
runs in Jint.

## Contents

- [When Webpack Instead Of `zep-script build`](#when-webpack-instead-of-zep-script-build)
- [Minimal-Correct Config](#minimal-correct-config)
- [Chunk Splitting And Deterministic Names](#chunk-splitting-and-deterministic-names)
- [tsconfig For Webpack Projects](#tsconfig-for-webpack-projects)
- [Scripts](#scripts)
- [Verification](#verification)
- [Evidence](#evidence)

## When Webpack Instead Of `zep-script build`

The `zep-script` CLI can build simple projects (Babel `main.ts` -> `dist/`, or
detect an existing webpack config). Webpack is used directly when a project:

- splits code across many `src/` modules but wants a single bundled `main.js`
- needs chunk splitting for large shared libraries
- wants explicit control over output shape for the Jint runtime

In these projects the `build` script runs `webpack` directly and **bypasses**
`zep-script build`. The CLI is then used only for `archive` and `publish`.

## Minimal-Correct Config

The settings below are load-bearing for the ZEP Script (Jint) runtime, not
generic webpack defaults. Annotated from a working webpack template.

```js
const path = require("path");

module.exports = {
    mode: "production",
    entry: "./main.ts",                 // app entry; becomes res/main.js
    module: {
        rules: [
            { test: /\.ts$/, use: "babel-loader", exclude: /node_modules/ },
            { test: /\.ts$/, loader: "ts-loader",
              options: { transpileOnly: false }, exclude: /node_modules/ },
        ],
    },
    resolve: {
        extensions: [".ts", ".js"],
        alias: { "zep-script": path.resolve(__dirname, "node_modules/zep-script") },
    },
    output: {
        filename: "[name].js",          // -> res/main.js
        chunkFilename: "[name].js",
        globalObject: "this",           // REQUIRED: Jint has no self/window
        path: path.resolve(__dirname, "res"),
    },
    optimization: {
        minimize: false,                // ship readable JS (see notes)
        runtimeChunk: false,            // keep webpack runtime inside main.js
        chunkIds: "natural",
        splitChunks: { /* see Chunk Splitting */ },
    },
};
```

### Why these matter

| Setting | Reason | Status |
| --- | --- | --- |
| `output.globalObject: "this"` | Jint exposes no `self`/`window`; webpack's default global reference (`self`) throws at load | Authoritative — required by the runtime |
| `optimization.minimize: false` | Readable stack traces in staff chat errors; avoids minifier output the runtime may not accept | Convention/inference — confirm against your SDK/runtime version |
| `optimization.runtimeChunk: false` | The server loads `main.js` as the entry; the webpack runtime must live there, not in a separate file | Inference — confirm against SDK/runtime |
| Two `.ts` loaders (`babel-loader` + `ts-loader`) | `@zep.us/zep-script` Babel plugin rewrites `ScriptApp`/`ScriptMap` -> `App`/`Map`; `ts-loader` (`transpileOnly:false`) type-checks in the same build | Authoritative — from `babel.config.js` + webpack rules |
| `resolve.alias["zep-script"]` | Pin SDK resolution to the installed package | Convention |

`babel.config.js`:

```js
module.exports = {
    presets: ["@babel/preset-typescript"],
    plugins: ["@zep.us/zep-script"],   // the ScriptApp/ScriptMap transform
};
```

Note the **published Babel plugin package name is `@zep.us/zep-script`** in this
toolchain. The SDK source directory is `babel-plugin-zep-script`; do not assume
the npm name and the SDK package directory are identical.

## Chunk Splitting And Deterministic Names

Large projects split shared code into chunks. The game server loads every
`*.js` packaged in the archive, so chunk names must be **stable and
deterministic** — hashed names complicate the archive and upload.

A working template enforces this with a `splitChunks` group plus a small
emit-time plugin that renames split chunks to `chunk-local-NNN.js`:

```js
// in optimization
splitChunks: {
    chunks: "all",
    minSize: 50 * 1024,     // only split once shared code exceeds ~50KB
    maxSize: 128 * 1024,
    cacheGroups: {
        default: false,
        vendors: false,
        local: { test: /[\\/]libs[\\/]/, chunks: "all", priority: 10, reuseExistingChunk: true },
    },
},
```

```js
// rename split chunks deterministically at emit time
class SequentialChunkRenamerPlugin {
    apply(compiler) {
        compiler.hooks.emit.tap("SequentialChunkRenamerPlugin", (compilation) => {
            const chunks = compilation.chunks
                .filter((c) => c.name !== "main")
                .sort((a, b) => a.id - b.id);
            chunks.forEach((chunk, idx) => {
                const oldName = Array.from(chunk.files).find((f) => f.endsWith(".js") && f !== "main.js");
                if (!oldName) return;
                const newName = `chunk-local-${String(idx + 1).padStart(3, "0")}.js`;
                compilation.assets[newName] = compilation.assets[oldName];
                delete compilation.assets[oldName];
            });
        });
    }
}
```

Practical notes:

- Splitting only triggers once matched code exceeds `minSize`. A small app emits
  just `res/main.js` and no chunks — the splitting infra is latent until shared
  code grows.
- If you change chunk naming, re-archive and re-test the uploaded app; the zip
  must contain `main.js` plus every chunk file at the root the loader expects.

## tsconfig For Webpack Projects

```json
{
    "compilerOptions": {
        "target": "ES2020",
        "module": "CommonJS",
        "isolatedModules": true,     // required: babel/ts-loader transpile per file
        "noEmit": false,             // ts-loader emits; differs from `zep-script build` (tsc --noEmit)
        "types": ["zep-script"],
        "typeRoots": ["./types", "./node_modules/@types"]
    },
    "include": ["src", "main.ts"]
}
```

`lib` may include `DOM` if widget TypeScript shares the project, but backend
code must still avoid DOM at runtime (see `patterns.md` Backend Versus Widget).

## Scripts

```json
{
    "scripts": {
        "build": "webpack",
        "pack": "webpack && zep-script archive",
        "archive": "zep-script archive",
        "deploy": "zep-script publish"
    }
}
```

`archive` zips `res/` (built `main.js` + chunks + `widgets/` + assets) into
`{name}.zepapp.zip` with `main.js` at the root. `publish` reads
`zep-script.json` and uploads/updates the My Apps record.

## Verification

- `pnpm build` (or `npm run build`) produces `res/main.js`.
- Built `main.js` uses `this` (not `self`) as the global reference.
- For split builds, chunk files use stable names and are all present in the zip.
- Type check passes (ts-loader `transpileOnly:false`, or a separate `tsc --noEmit`).
- Restricted-global lint actually covers your source dirs (see `patterns.md`
  Restricted Globals and `troubleshooting.md`).
- Install and play-test with a staff-or-higher account so script errors show in
  chat.

## Evidence

- This project's webpack config: `webpack.config.js`, `babel.config.js`,
  `tsconfig.json`, `package.json`, `zep-script.json` at the project root.
- The installed `zep-script` CLI for build/archive/publish behavior.
