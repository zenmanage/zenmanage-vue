# Zenmanage Vue SDK Examples

Examples mirroring the core SDK use-cases with Vue composables.

## Setup

```bash
npm install
```

Use a client key (`cli_...`) in the browser and a server key (`srv_...`) on a server.

## Core Sample Set

- `simple-flags.ts`: Plugin installation and a boolean flag check
- `context-based-flags.ts`: Context-targeted evaluations
- `ab-testing.ts`: Variant-driven rendering
- `defaults.ts`: A `DefaultsCollection` and remote config
- `caching.ts`: Cache TTL and usage reporting
- `percentage-rollouts.ts`: Deterministic rollout behavior
- `json-flags.ts`: JSON flags and a reactive key
- `flag-gate.ts`: The `FlagGate` component with its slots

## Framework Setups

- `vite-app.ts`: A client-side Vite app
- `vite-ssr-server.ts` and `vite-ssr-client.ts`: Vite SSR with hydration
- `nuxt-plugin.ts`: A Nuxt plugin with the server payload handed to the browser

See [docs/SSR.md](../docs/SSR.md) for the server-rendering guide.

## Smoke App

`examples/smoke-app` runs the packed package against the real SDK. Run it from the package root:

```bash
npm run test:smoke
```
