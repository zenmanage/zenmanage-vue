// plugins/zenmanage.ts
//
// nuxt.config.ts:
//
//   export default defineNuxtConfig({
//     runtimeConfig: {
//       // NUXT_ZENMANAGE_SERVER_KEY: a server key (srv_...). It never reaches the browser.
//       zenmanageServerKey: '',
//       public: {
//         // NUXT_PUBLIC_ZENMANAGE_CLIENT_KEY: a client key (cli_...).
//         zenmanageClientKey: '',
//       },
//     },
//   });
import { createZenmanagePlugin, type BootstrapPayload } from '@zenmanage/vue';

export default defineNuxtPlugin(async (nuxtApp) => {
  const config = useRuntimeConfig();

  if (import.meta.server) {
    // Server key, evaluated while Nuxt renders the page.
    const plugin = createZenmanagePlugin({ environmentToken: config.zenmanageServerKey });
    nuxtApp.vueApp.use(plugin);

    // Once the page has rendered, hand the flags it read to the browser through the Nuxt payload.
    nuxtApp.hook('app:rendered', async () => {
      nuxtApp.payload.zenmanage = await plugin.runtime.getBootstrapPayload();
    });
    return;
  }

  // Client key, starting from what the server evaluated so hydration matches the HTML.
  nuxtApp.vueApp.use(
    createZenmanagePlugin({
      environmentToken: config.public.zenmanageClientKey,
      bootstrap: (nuxtApp.payload.zenmanage as BootstrapPayload | undefined) ?? null,
    })
  );
});
