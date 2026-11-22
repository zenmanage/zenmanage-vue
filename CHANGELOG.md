# @zenmanage/vue

## 1.1.0

### Minor Changes

- 06afea7: Maintenance release. Development dependency updates: `@typescript-eslint/eslint-plugin` and `parser` 6 to 8, `eslint-config-prettier` 9 to 10, `@changesets/cli` 2 to 3, and the smoke app's `vitest` and `jsdom`. The release workflow now runs on Node 22. No changes to the public API or runtime behavior.

## 1.0.0

First public release. The API below is the 1.0 surface, and semantic versioning applies from here. The Changed, Removed, and Fixed entries are relative to the internal 0.1.0 snapshot.

### Added

- `createZenmanagePlugin`, `useFlag`, `useBooleanFlag`, `useVariant`, `useConfig`, `useZenmanage`, and the `FlagGate` component.
- JSON flags. Pass an object or array as the default to `useFlag` or `useConfig` and read the flag's JSON value.
- Reactive keys, context, and defaults. `useFlag` takes a ref or getter for the key, and the plugin's `context` and `defaults` options take a ref or getter. Changing any of them re-evaluates every mounted composable.
- The plugin identifies itself to the API as `zenmanage-vue/<version>` instead of the base SDK's `zenmanage-javascript`. This relies on `ConfigBuilder.withClientAgent()` from `@zenmanage/sdk` 3.5.0.
- Server rendering. Composables load their flags in `onServerPrefetch`, so the HTML carries the real values. `runtime.getBootstrapPayload()` hands the flags the page read to the browser, and the browser's plugin starts from them (as the `bootstrap` option, or from a `<script>` tag) so hydration matches the server HTML. Nuxt and Vite SSR examples are in `docs/SSR.md`.
- `getBootstrapPayload`, `clearServerClients`, and `createServerClient` for server code outside a component. On a server the plugin and these helpers share one client per configuration, so a request reuses the rules the one before it fetched. Server clients cache rules for 60 seconds unless you set `cacheTtl`.
- `runtime.revision`, `runtime.whenReady()`, `runtime.preload()`, and `runtime.dispose()`.
- The package ships separate type declarations for ESM and CJS (`index.d.ts` and `index.d.cts`) and is marked `sideEffects: false`.

### Changed

- `@zenmanage/sdk` 3.5.1 or newer is now required.
- `useFlag('k', false).value.value` is typed `boolean`, and `useFlag('k', 'control').value.value` is `string`. Before, the literal default leaked into the type.
- The composables don't evaluate until the plugin's preload finishes, so every composable reads from the same cache. Before, each one could trigger its own rules fetch.
- A result only counts for the key and context that produced it. Before, switching `key` showed the old key's value until the new one loaded, and a slow response for the old key could overwrite the new one.
- `refresh()` re-fetches rules from the API and re-evaluates every mounted composable. Before, it re-read the cache. A refresh doesn't set `isLoading`, so `FlagGate` keeps its content mounted while it runs.
- The plugin starts preloading when it is created, not when it is installed, and compares `context` and `defaults` by content, so an equal-but-new `Context` doesn't restart loading.
- `getFlagValue(input, fallback)` uses `fallback` as the default for a missing flag or an unreachable API, and returns JSON values for an object or array fallback.
- `useBooleanFlag`, `useVariant`, and `useConfig` accept the same reactive keys as `useFlag`, and `useConfig` reads JSON flags too.
- `runtime.manager`, `runtime.context`, and `runtime.defaults` are getters, so reading them inside an effect tracks changes. `isReady`, `isLoading`, and `error` are read-only refs.
- The composables' `value`, `isLoading`, and `error` are computed refs, and `key` is a ref.

### Removed

- `contextWithDefaults`. It only wrapped `DefaultsCollection.fromObject`.
- `docs/PUBLISHING_NEXT_STEPS.md`. Releases go out through Changesets; see `CONTRIBUTING.md`.

### Fixed

- A server-rendered page hydrated against the browser's defaults, so the HTML and the first client render didn't match. The bootstrap payload now seeds the first render.
- The bootstrap defaults passed to the SDK were ignored by every composable, because the SDK prefers an inline default.
- `buildBootstrapScript` accepted any element id, including one that could break out of the attribute. It now rejects ids that aren't valid HTML ids.
- `deserializeBootstrapPayload` accepted payloads with non-flag values. It now drops them.
- `getFlagValue` didn't use its fallback as the default, so a missing flag threw.
- The Nuxt example never handed the server's values to the browser.

## 0.1.0

### Added

- Initial Vue SDK package structure for Zenmanage.
- `createZenmanagePlugin` for app-level installation.
- `useFlag`, `useBooleanFlag`, `useVariant`, and `useConfig` composables.
- SSR helpers for server-side evaluation and hydration.
- Vite and Nuxt examples, CI pipeline, and publishing documentation.
