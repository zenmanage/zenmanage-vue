import {
  buildBootstrapPayload,
  createServerManager,
  createZenmanagePlugin,
  serializeBootstrapPayload,
} from '@zenmanage/vue';

export default defineNuxtPlugin(async (nuxtApp) => {
  if (import.meta.server) {
    const manager = createServerManager({
      environmentToken: process.env.ZENMANAGE_ENVIRONMENT_TOKEN!,
    });

    const flags = await manager.all();
    const defaults = Object.fromEntries(flags.map((flag) => [flag.getKey(), flag.getValue()]));
    const payload = buildBootstrapPayload(defaults);

    useHead({
      script: [
        {
          id: '__ZENMANAGE_BOOTSTRAP__',
          type: 'application/json',
          children: serializeBootstrapPayload(payload),
        },
      ],
    });
  }

  nuxtApp.vueApp.use(
    createZenmanagePlugin({
      environmentToken: import.meta.server
        ? process.env.ZENMANAGE_ENVIRONMENT_TOKEN!
        : (window as { __NUXT__?: { config?: { public?: { zenmanageToken?: string } } } }).__NUXT__
            ?.config?.public?.zenmanageToken,
      preload: !import.meta.server,
    })
  );
});
