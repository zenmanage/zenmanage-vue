# Zenmanage Vue SDK

[![npm version](https://badge.fury.io/js/@zenmanage%2Fvue.svg)](https://www.npmjs.com/package/@zenmanage/vue)
[![Build Status](https://github.com/zenmanage/zenmanage-vue/actions/workflows/ci.yml/badge.svg)](https://github.com/zenmanage/zenmanage-vue)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

Vue 3 plugin, composables, and server-rendering helpers for Zenmanage feature flags.

This package extends [`@zenmanage/sdk`](https://www.npmjs.com/package/@zenmanage/sdk) and adds Vue-native primitives:

- `createZenmanagePlugin(options)` for app-level setup
- `useFlag(key, defaultValue)`, `useBooleanFlag`, `useVariant`, and `useConfig`
- `FlagGate` conditional rendering component
- Server rendering for Vite SSR and Nuxt, with hydration that matches the server HTML

## Why This Package

- Minimal wrapper around [`@zenmanage/sdk`](https://www.npmjs.com/package/@zenmanage/sdk)
- Typed composables for booleans, strings, numbers, and JSON
- Keys, context, and defaults can be refs: change one and every flag re-evaluates
- Explicit loading and error states, so you decide how to handle both
- Works in Nuxt and Vite SSR without a flash of the default value

## Installation

```bash
npm install @zenmanage/vue @zenmanage/sdk vue
```

Requires Vue 3.4 or newer and `@zenmanage/sdk` 3.5.1 or newer.

## Key Compatibility

- Browser/client runtime: use client keys prefixed with `cli_`
- Server/node runtime: use server keys prefixed with `srv_`
- Mobile keys (`mob_`) are not valid for this package

`@zenmanage/sdk` checks the key against the runtime it's running in, so a `cli_` key throws in Node.js and a `srv_` key throws in a browser. Never ship a `srv_` key to the browser. See [Server-Side Rendering](#server-side-rendering) if you render on the server.

## Quick Start

```ts
import { createApp, defineComponent, h } from 'vue';
import { createZenmanagePlugin, useFlag } from '@zenmanage/vue';

const App = defineComponent({
  setup() {
    const { value: enabled, isLoading } = useFlag('new-checkout-button', false);

    return () =>
      isLoading.value
        ? h('button', { disabled: true }, 'Loading...')
        : h('button', enabled.value ? 'Checkout (New)' : 'Checkout');
  },
});

const app = createApp(App);

app.use(createZenmanagePlugin({ environmentToken: 'cli_your_client_key_here' }));

app.mount('#app');
```

In a single-file component:

```vue
<script setup lang="ts">
import { useFlag } from '@zenmanage/vue';

const { value: enabled, isLoading } = useFlag('new-checkout-button', false);
</script>

<template>
  <button v-if="isLoading" disabled>Loading...</button>
  <button v-else>{{ enabled ? 'Checkout (New)' : 'Checkout' }}</button>
</template>
```

The composables return refs, so a template reads `enabled` and a script reads `enabled.value`.

## Plugin

```ts
app.use(
  createZenmanagePlugin({
    environmentToken: 'cli_your_client_key_here',
    cacheTtl: 3600,
    enableUsageReporting: true,
    preload: true,
    onError: (error) => console.error(error),
  })
);
```

Options:

- `client?`: existing `Zenmanage` client. When set, `environmentToken` and the other client options are ignored
- `environmentToken?`: token used to create an internal client
- `apiEndpoint?`: custom API base URL
- `cacheTtl?`: cache TTL in seconds (60 on a server unless you set it)
- `enableUsageReporting?`: usage reporting toggle
- `logger?`: custom logger
- `context?`: base `Context` to evaluate with. A ref or getter works
- `defaults?`: `DefaultsCollection` fallback values. A ref or getter works
- `preload?`: load every flag when the plugin is created (default: `true`)
- `bootstrap?`: what the server evaluated, for the first render in the browser. See [Server-Side Rendering](#server-side-rendering)
- `bootstrapElementId?`: id of the `<script>` tag to read the server's payload from
- `onError?`: preload/refresh error callback

Pass either `client` or `environmentToken`. Without one, `createZenmanagePlugin` throws.

The internal client identifies itself to the API as `zenmanage-vue`. If you pass your own `client`, it reports whatever agent you configured on it.

`createZenmanagePlugin` returns `{ install, runtime }`. The runtime has `client`, `manager`, `isReady`, `isLoading`, `error`, `refresh()`, and `whenReady()`. Inside a component, get it with `useZenmanage()`, or read `$zenmanage` in a template.

## Composables

### `useFlag(key, defaultValue)`

Resolves and evaluates a single flag. The type of `defaultValue` decides how the flag is read: boolean, string, number, or a JSON object or array.

```ts
const { value, flag, isLoading, error, refresh } = useFlag('checkout-v2', false);
```

- `value` is the default until the flag resolves, and again if evaluation fails
- `isLoading` is `true` until the first value for that key lands
- `error` is set when evaluation failed or a `refresh()` failed. `value` falls back to your default in that case
- `refresh()` re-fetches rules from the API. Every mounted composable re-evaluates and keeps showing its last value while it does

`useFlag('k', false).value.value` is typed `boolean`, and `useFlag('k', 'control').value.value` is `string`. Not the literals `false` and `'control'`.

`key` can be a ref or a getter. When it changes, the composable re-evaluates and never shows the old key's value for the new one.

```ts
const section = ref('billing');
const { value: limit } = useFlag(() => `${section.value}-limit`, 100);
```

#### JSON flags

Pass an object or array as the default to read a JSON flag. Type it with a generic when the default doesn't say enough:

```ts
const { value: ui } = useFlag('ui-config', { theme: 'light', pageSize: 20 });
const { value: steps } = useFlag<string[]>('onboarding-steps', []);
```

### `useBooleanFlag(key, defaultValue = false)`

`useFlag(key, false)`, for the common case.

### `useVariant(key, defaultVariant = 'control')`

Convenience composable for A/B variants. Returns `variant` in place of `value`.

```ts
const { variant } = useVariant('checkout-flow', 'control');
```

### `useConfig(key, defaultValue)`

`useFlag` for remote config: strings, numbers, and JSON.

```ts
const timeout = useConfig('api-timeout-ms', 5000);
const copy = useConfig('hero-copy', 'Welcome');
```

### `FlagGate`

Declarative conditional rendering. The default slot renders while the flag is on; `disabled` renders when it's off and `loading` while it resolves.

```vue
<FlagGate flag-key="beta-chat">
  <BetaChat />
  <template #disabled><LegacyChat /></template>
  <template #loading><ChatSkeleton /></template>
</FlagGate>
```

Props: `flagKey`, `defaultValue` (default `false`), and `invert`.

## Usage Patterns

### Context-Based Targeting

```ts
import { Attribute, Context } from '@zenmanage/sdk';

const context = new Context('user', user.name, user.id, [new Attribute('plan', [user.plan])]);

app.use(createZenmanagePlugin({ environmentToken: 'cli_your_client_key_here', context }));
```

When the user can change, pass a ref or getter. Every flag re-evaluates, and composables report `isLoading` until the new values land:

```ts
const context = computed(() => new Context('user', user.value.name, user.value.id));

app.use(createZenmanagePlugin({ environmentToken: 'cli_your_client_key_here', context }));
```

`context` and `defaults` are compared by content, so a new-but-equal object doesn't restart loading.

### A/B Testing with `useVariant`

```ts
const { variant, isLoading } = useVariant('checkout-flow', 'control');
```

### When The API Is Unreachable

`@zenmanage/sdk` falls back to your defaults. Composables resolve to the default you passed (or the one in `defaults`) with no error, so a flag outage doesn't take your UI down.

`refresh()` is the exception. It throws, sets `error` on the runtime and every composable, and calls `onError`, so you can show a retry:

```ts
const { refresh, error } = useZenmanage();

if (error.value) {
  await refresh().catch(() => undefined);
}
```

## Server-Side Rendering

On the server, composables load their flags while Vue renders (`onServerPrefetch`), so the HTML carries the real values. Three things to know:

- The server needs a `srv_` key, read from a server-only environment variable. The browser needs a `cli_` key.
- On the server the plugin shares one client between requests, so the rules are fetched once, not once per request. Server clients cache rules for 60 seconds unless you set `cacheTtl`.
- The browser has to start from the same values, or hydration mismatches. After rendering, ask the runtime for the flags the page read and give them to the browser's plugin.

```ts
// Server, once per request
const plugin = createZenmanagePlugin({
  environmentToken: process.env.ZENMANAGE_SERVER_KEY!,
  context,
});
app.use(plugin);
const html = await renderToString(app);
const bootstrap = buildBootstrapScript(await plugin.runtime.getBootstrapPayload());
// Put `bootstrap` in the page after the app markup.

// Browser, with a cli_ key
app.use(createZenmanagePlugin({ environmentToken: 'cli_your_client_key_here' }));
```

The browser's plugin reads that `<script>` tag by itself. The payload holds only the flags the page read, and the context only if you ask for it with `getBootstrapPayload({ includeContext: true })`. The browser starts from the server's values, then switches to its own once its rules load. If they never load, the server's values stay.

See [docs/SSR.md](docs/SSR.md) for Vite SSR and Nuxt in full.

## Examples

See [examples/README.md](examples/README.md) for runnable examples matching the core SDK use-cases:

- `simple-flags.ts`
- `context-based-flags.ts`
- `ab-testing.ts`
- `defaults.ts`
- `caching.ts`
- `percentage-rollouts.ts`
- `json-flags.ts`
- `flag-gate.ts`

And the framework setups:

- `vite-app.ts`
- `vite-ssr-server.ts` and `vite-ssr-client.ts`
- `nuxt-plugin.ts`

## Development

```bash
npm install
npm run validate
```

Useful commands:

- `npm run lint`
- `npm run type-check`
- `npm run test:coverage`
- `npm run build`
- `npm run test:smoke`

## Smoke App

A local integration smoke app lives in `examples/smoke-app`. It installs the packed package into a copy of the app and runs the real `@zenmanage/sdk` against a faked API, covering:

- the plugin and every composable
- `FlagGate`
- server rendering and hydration

Run it with:

```bash
npm run test:smoke
```

`SMOKE_VUE_VERSION=3.4 npm run test:smoke` runs it on another Vue version. Vue 3.4 is the oldest this package supports.

## Releases

Releases go out through Changesets via:

- `.changeset/config.json`
- `.github/workflows/release.yml`

See [CHANGELOG.md](CHANGELOG.md) for what changed in each version.

## License

MIT
