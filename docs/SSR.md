# Server-Side Rendering

How `@zenmanage/vue` works with Vite SSR and Nuxt.

## How it works

1. On the server, the plugin evaluates flags while Vue renders. Each composable loads its flag in `onServerPrefetch`, so `renderToString` waits for it and the HTML carries the real value.
2. After rendering, `runtime.getBootstrapPayload()` returns the flags the page read. You send them to the browser.
3. In the browser, the plugin starts from those values. The first render matches the server HTML, so hydration doesn't mismatch or flash the default. Once the browser's rules load, its own evaluation replaces the server's value. If they never load (a blocked CDN, no network), the server's value stays.

Keys:

- The server needs a server key (`srv_...`), from a server-only environment variable.
- The browser needs a client key (`cli_...`).
- `@zenmanage/sdk` refuses the wrong one in each place. A `srv_` key must never reach the browser.

On a server the plugin shares one client per configuration, so a request reuses the rules the one before it fetched. Rules are cached for 60 seconds unless you set `cacheTtl`.

## Vite SSR

Server entry, once per request (`examples/vite-ssr-server.ts`):

```ts
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { buildBootstrapScript, createZenmanagePlugin } from '@zenmanage/vue';

const plugin = createZenmanagePlugin({
  environmentToken: process.env.ZENMANAGE_SERVER_KEY!,
  context, // the current user
});

const app = createSSRApp(App);
app.use(plugin);

const html = await renderToString(app);
const bootstrap = buildBootstrapScript(await plugin.runtime.getBootstrapPayload());

return `<body><div id="app">${html}</div>${bootstrap}</body>`;
```

Client entry (`examples/vite-ssr-client.ts`):

```ts
import { createSSRApp } from 'vue';
import { createZenmanagePlugin } from '@zenmanage/vue';

const app = createSSRApp(App);

// With no `bootstrap` option, the plugin reads the server's <script> tag from the page.
app.use(createZenmanagePlugin({ environmentToken: import.meta.env.VITE_ZENMANAGE_CLIENT_KEY }));

app.mount('#app');
```

`buildBootstrapScript` escapes the payload, so flag values can't break out of the `<script>` tag.

## Nuxt

`nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  runtimeConfig: {
    // NUXT_ZENMANAGE_SERVER_KEY: a server key (srv_...). It never reaches the browser.
    zenmanageServerKey: '',
    public: {
      // NUXT_PUBLIC_ZENMANAGE_CLIENT_KEY: a client key (cli_...).
      zenmanageClientKey: '',
    },
  },
});
```

`plugins/zenmanage.ts` (`examples/nuxt-plugin.ts`):

```ts
import { createZenmanagePlugin, type BootstrapPayload } from '@zenmanage/vue';

export default defineNuxtPlugin(async (nuxtApp) => {
  const config = useRuntimeConfig();

  if (import.meta.server) {
    const plugin = createZenmanagePlugin({ environmentToken: config.zenmanageServerKey });
    nuxtApp.vueApp.use(plugin);

    // Once the page has rendered, hand the flags it read to the browser through the Nuxt payload.
    nuxtApp.hook('app:rendered', async () => {
      nuxtApp.payload.zenmanage = await plugin.runtime.getBootstrapPayload();
    });
    return;
  }

  nuxtApp.vueApp.use(
    createZenmanagePlugin({
      environmentToken: config.public.zenmanageClientKey,
      bootstrap: (nuxtApp.payload.zenmanage as BootstrapPayload | undefined) ?? null,
    })
  );
});
```

Then use the composables in any page or component, as in a plain Vue app.

## The user context

To evaluate for the signed-in user on the server, pass a `Context` to the server's plugin. The payload leaves the context out by default, since it can carry personal data. The browser needs its own context for the same user. Either build it again from the session, or send the server's:

```ts
await plugin.runtime.getBootstrapPayload({ includeContext: true });
```

With no `context` option, the browser's plugin then evaluates for the context in the payload.

## Without a component

To read flags in server code that isn't a Vue app (an API route, middleware), use the helpers. They share the same clients:

```ts
import { getFlagValue, getBootstrapPayload } from '@zenmanage/vue';

const enabled = await getFlagValue({ environmentToken, key: 'new-checkout', context }, false);

// Every flag in the environment, or just the ones you name
const payload = await getBootstrapPayload({ environmentToken, context, keys: ['new-checkout'] });
```

`getFlagValue` uses its second argument as the default for a flag that doesn't exist or when the API can't be reached.
