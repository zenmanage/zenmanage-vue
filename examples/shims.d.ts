// Stand-ins for what Vite and Nuxt provide, so the framework examples type-check on their own.

declare module '*.vue' {
  import type { Component } from 'vue';
  const component: Component;
  export default component;
}

interface ImportMeta {
  readonly env: Record<string, string | undefined>;
  readonly server: boolean;
  readonly client: boolean;
}

declare function defineNuxtPlugin(
  plugin: (nuxtApp: NuxtApp) => void | Promise<void>
): (nuxtApp: NuxtApp) => void | Promise<void>;

declare function useRuntimeConfig(): {
  zenmanageServerKey: string;
  public: { zenmanageClientKey: string };
};

interface NuxtApp {
  vueApp: import('vue').App;
  payload: Record<string, unknown>;
  hook: (name: 'app:rendered', callback: () => void | Promise<void>) => void;
}
