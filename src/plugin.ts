import type { App } from 'vue';
import { ZenmanageSymbol } from './context';
import { createRuntime } from './runtime';
import type { ZenmanageGlobalProperties, ZenmanagePlugin, ZenmanagePluginOptions } from './types';

export function createZenmanagePlugin(options: ZenmanagePluginOptions): ZenmanagePlugin {
  const runtime = createRuntime(options);

  return {
    runtime,
    install(app: App): void {
      app.provide(ZenmanageSymbol, runtime);
      (app.config.globalProperties as unknown as ZenmanageGlobalProperties).$zenmanage = runtime;

      // The reactive `context` and `defaults` watchers belong to the app that installed the plugin.
      const unmount = app.unmount.bind(app);
      app.unmount = (): void => {
        runtime.dispose();
        unmount();
      };
    },
  };
}
