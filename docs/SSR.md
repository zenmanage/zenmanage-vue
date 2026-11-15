# SSR Patterns for Zenmanage Vue SDK

This package supports SSR-compatible patterns for both generic Vue SSR (Vite) and Nuxt.

## 1. Evaluate Flags on the Server

Use server helpers to evaluate flags during request handling:

```ts
import { Context } from '@zenmanage/sdk';
import { getServerFlag } from '@zenmanage/vue';

const context = Context.single('user', 'user-123');

const flag = await getServerFlag({
  environmentToken: process.env.ZENMANAGE_ENVIRONMENT_TOKEN!,
  key: 'dashboard-v2',
  defaultValue: false,
  context,
});
```

## 2. Bootstrap Defaults into HTML

```ts
import { buildBootstrapPayload, buildBootstrapScript } from '@zenmanage/vue';

const payload = buildBootstrapPayload({ 'dashboard-v2': true });
const bootstrapScript = buildBootstrapScript(payload);
```

Embed the generated script tag into SSR HTML so the client can reuse defaults during hydration.

## 3. Hydrate Client Defaults

```ts
import { defaultsFromBootstrapDocument, createZenmanagePlugin } from '@zenmanage/vue';

const defaults = defaultsFromBootstrapDocument();

app.use(
  createZenmanagePlugin({
    environmentToken: import.meta.env.VITE_ZENMANAGE_ENVIRONMENT_TOKEN,
    defaults,
    preload: false,
  })
);
```

## Nuxt Notes

- Evaluate on server using `createServerManager` or `getServerFlag`
- Serialize to payload with `buildBootstrapPayload`
- Initialize client plugin with defaults or disable duplicate preload when hydrated
