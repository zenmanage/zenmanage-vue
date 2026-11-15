import { ConfigBuilder, Zenmanage } from '@zenmanage/sdk';
import { ref, type App } from 'vue';
import { ZenmanageSymbol } from './context';
import type { ZenmanageGlobalProperties, ZenmanagePlugin, ZenmanagePluginOptions } from './types';

function resolveClient(options: ZenmanagePluginOptions): Zenmanage {
  if (options.client) {
    return options.client;
  }

  if (!options.environmentToken) {
    throw new Error('Zenmanage Vue plugin requires either a client or an environmentToken.');
  }

  const builder = ConfigBuilder.create().withEnvironmentToken(options.environmentToken);

  if (options.apiEndpoint) {
    builder.withApiEndpoint(options.apiEndpoint);
  }

  if (typeof options.cacheTtl === 'number') {
    builder.withCacheTtl(options.cacheTtl);
  }

  if (typeof options.enableUsageReporting === 'boolean') {
    builder.withUsageReporting(options.enableUsageReporting);
  }

  if (options.logger) {
    builder.withLogger(options.logger);
  }

  return new Zenmanage(builder.build());
}

export function createZenmanagePlugin(options: ZenmanagePluginOptions): ZenmanagePlugin {
  const client = resolveClient(options);

  let manager = client.flags();
  if (options.context) {
    manager = manager.withContext(options.context);
  }
  if (options.defaults) {
    manager = manager.withDefaults(options.defaults);
  }

  const isReady = ref(false);
  const isLoading = ref(false);
  const error = ref<Error | null>(null);

  const runtime = {
    client,
    manager,
    context: options.context,
    defaults: options.defaults,
    isReady,
    isLoading,
    error,
    preload: async (): Promise<void> => {
      isLoading.value = true;
      error.value = null;

      try {
        await manager.all();
        isReady.value = true;
        isLoading.value = false;
      } catch (loadError) {
        const resolvedError = loadError as Error;
        error.value = resolvedError;
        isReady.value = false;
        isLoading.value = false;
        options.onError?.(resolvedError);
        throw resolvedError;
      }
    },
    refresh: async (): Promise<void> => {
      isLoading.value = true;
      error.value = null;

      try {
        await manager.refreshRules();
        isReady.value = true;
        isLoading.value = false;
      } catch (refreshError) {
        const resolvedError = refreshError as Error;
        error.value = resolvedError;
        isReady.value = false;
        isLoading.value = false;
        options.onError?.(resolvedError);
        throw resolvedError;
      }
    },
  };

  return {
    runtime,
    install(app: App): void {
      app.provide(ZenmanageSymbol, runtime);
      (app.config.globalProperties as unknown as ZenmanageGlobalProperties).$zenmanage = runtime;

      if (options.preload !== false) {
        void runtime.preload().catch(() => {
          // preload errors are surfaced via runtime.error and onError callback
        });
      } else {
        runtime.isReady.value = true;
      }
    },
  };
}
