# Smoke App

This app checks that the packed `@zenmanage/vue` tarball works as a real dependency of a Vue 3 app. It runs the real `@zenmanage/sdk`; only the network is faked.

It covers:

- a client-side app: `createZenmanagePlugin`, `useBooleanFlag`, `useVariant`, `useConfig`, `useFlag` with a JSON default, and `FlagGate`
- server rendering with `vue/server-renderer`, and the payload `runtime.getBootstrapPayload()` hands to the browser
- hydrating that markup without a mismatch

Run from the package root:

```bash
npm run test:smoke
```

`SMOKE_VUE_VERSION=3.4 npm run test:smoke` runs it on another Vue version. Vue 3.4 is the oldest this package supports.
