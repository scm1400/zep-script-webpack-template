# Source Routing

Use this file to decide where to look. Prefer source evidence over memory, but
do not assume the session starts in a source checkout.

## Public Sources

| Question | Source |
| --- | --- |
| What is the official JS setup flow? | https://docs.zep.us/zep-script/zep-script-guide/zep-script-development-guide/javascript-development-tips |
| What is the official TS setup/build flow? | https://docs.zep.us/zep-script/zep-script-guide/zep-script-development-guide/typescript-development-tips |
| How are zip upload, My Apps, app type install, and staff error messages documented? | https://docs.zep.us/zep-script/zep-script-guide/zep-script-development-guide/zep-script-deployment-guide |
| What packages are in the SDK? | https://github.com/zep-us/zep-script-sdk |
| How does `zep-script` expose TypeScript support? | `packages/zep-script/README.md` in the SDK repo |
| What CLI commands exist? | `packages/zep-script-cli/README.md` in the SDK repo |
| What does the Babel plugin do? | `packages/babel-plugin-zep-script/README.md` plus the installed plugin source |

Prefer public sources for user-facing explanations.

## Project Sources

Within a project, prefer evidence from the project itself:

| Need | Source |
| --- | --- |
| Project rules/conventions | `AGENTS.md`, `CLAUDE.md`, local docs/README |
| Installed SDK types | `node_modules/zep-script` (`index.d.ts`, `src/*.d.ts`) |
| Local type augmentation | a `types/` dir or `declare module "zep-script"` blocks |
| Build/transform config | `webpack.config.js`, `babel.config.js`, `tsconfig.json` |
| App identity / deploy | `zep-script.json`, `package.json` scripts |

## Fallback Rules

- If official docs and the installed SDK disagree, distinguish them: "Official
  docs say X; the installed SDK appears to do Y."
- If changing code in a project with local type augmentation, inspect that
  augmentation before adding wrappers or `@ts-ignore`.
- If mining examples from build output, prefer source TypeScript/HTML instead.
  Exclude generated `res/` output unless debugging compiled artifacts.

## Read Order

For the read order before a code change, see SKILL.md "First Steps". In short:
project rules -> local `zep-script` type augmentation -> the files the task
touches -> the relevant reference here.
