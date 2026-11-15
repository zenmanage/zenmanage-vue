# Zenmanage Vue SDK

[![npm version](https://badge.fury.io/js/@zenmanage%2Fvue.svg)](https://www.npmjs.com/package/@zenmanage/vue)
[![Build Status](https://github.com/zenmanage/zenmanage-vue/actions/workflows/ci.yml/badge.svg)](https://github.com/zenmanage/zenmanage-vue)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

Vue 3 plugin and composables for Zenmanage feature flags.

This package extends `@zenmanage/sdk` and adds Vue-native primitives:

- `createZenmanagePlugin(options)` for app-level installation
- `useFlag(key, defaultValue)`
- `useBooleanFlag(key, defaultValue?)`
- `useVariant(key, defaultVariant?)`
- `useConfig(key, defaultValue)`
- SSR helpers for server-side flag evaluation and hydration-safe defaults

## Why This Package

- Thin wrapper over the proven JavaScript SDK
- Vue 3 plugin/provider pattern for consistent app initialization
- Typed composables for boolean, variant, and config access
- SSR-compatible helper functions for Vite SSR and Nuxt
- High test coverage with CI-enforced thresholds

## Installation

```bash
npm install @zenmanage/vue @zenmanage/sdk vue
```

## Key Compatibility

- Browser/client runtime: use client keys prefixed with `cli_`
- Server/node runtime: use server keys prefixed with `srv_`
- Mobile keys (`mob_`) are not valid for this package

## Quick Start (Vue 3)

```ts
import { createApp, defineComponent, h } from 'vue';
import { createZenmanagePlugin, useBooleanFlag } from '@zenmanage/vue';

const App = defineComponent({
  setup() {
    const newCheckout = useBooleanFlag('new-checkout', false);

    return () => h('button', newCheckout.value.value ? 'Checkout (New)' : 'Checkout');
  },
});

const app = createApp(App);

app.use(
  createZenmanagePlugin({
    environmentToken: 'cli_your_client_key_here',
    preload: true,
  })
);

app.mount('#app');
```

## Plugin API

```ts
app.use(
  createZenmanagePlugin({
    environmentToken: 'cli_your_client_key_here',
    apiEndpoint: 'https://api.zenmanage.com',
    cacheTtl: 3600,
    enableUsageReporting: true,
    preload: true,
    onError: (error) => console.error('Zenmanage preload error', error),
  })
);
```

Options:

- `client?`: existing `Zenmanage` client
- `environmentToken?`: token for internal client construction
- `apiEndpoint?`: custom API base URL
- `cacheTtl?`: cache TTL in seconds
- `enableUsageReporting?`: usage reporting toggle
- `logger?`: custom logger
- `context?`: base `Context` for evaluations
- `defaults?`: fallback `DefaultsCollection`
- `preload?`: whether to preload all flags at install time (default: `true`)
- `onError?`: preload/refresh error callback

## Composables

### `useFlag(key, defaultValue)`

```ts
const checkout = useFlag('checkout-v2', false);
```

Returns refs:

- `value`
- `flag`
- `isLoading`
- `error`
- `refresh()`

### `useBooleanFlag(key, defaultValue = false)`

```ts
const enabled = useBooleanFlag('beta-payments', false);
```

### `useVariant(key, defaultVariant = 'control')`

```ts
const variant = useVariant('checkout-flow', 'control');
```

### `useConfig(key, defaultValue)`

```ts
const timeout = useConfig('api-timeout-ms', 5000);
const copy = useConfig('hero-copy', 'Welcome');
```

## SSR and Nuxt Patterns

The package includes SSR helpers for request-time evaluation and hydration:

- `createServerClient(options)`
- `createServerManager(options)`
- `getServerFlag(input)`
- `getServerFlags(input)`
- `getFlagValue(input, fallback)`
- `buildBootstrapPayload(flags, options?)`
- `buildBootstrapScript(payload, options?)`
- `defaultsFromBootstrapPayload(payload)`
- `defaultsFromBootstrapDocument(elementId?)`

See [docs/SSR.md](docs/SSR.md) for complete Vite SSR and Nuxt usage.

## Examples

See [examples/README.md](examples/README.md).

Includes the same core sample set as other Zenmanage SDKs:

- `simple-flags.ts`
- `context-based-flags.ts`
- `ab-testing.ts`
- `defaults.ts`
- `caching.ts`
- `percentage-rollouts.ts`

And framework examples required by ZEN-580:

- `vite-app.ts`
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

A local smoke app is available at `examples/smoke-app` to validate package-level Vue integration against the built SDK artifacts.

Run it from package root:

```bash
npm run test:smoke
```

## Publishing

Use [docs/PUBLISHING_NEXT_STEPS.md](docs/PUBLISHING_NEXT_STEPS.md).

Automated releases are configured with Changesets via:

- `.changeset/config.json`
- `.github/workflows/release.yml`

## License

MIT
