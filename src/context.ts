import { inject } from 'vue';
import type { ZenmanageInjectionKey, ZenmanageRuntime } from './types';

export const ZenmanageSymbol: ZenmanageInjectionKey = Symbol('Zenmanage');

export function useInjectedZenmanageRuntime(): ZenmanageRuntime {
  const runtime = inject(ZenmanageSymbol, null);

  if (!runtime) {
    throw new Error(
      'Zenmanage Vue composables must be used after app.use(createZenmanagePlugin(...)).'
    );
  }

  return runtime;
}
