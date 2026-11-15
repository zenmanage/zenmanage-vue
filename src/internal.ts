import type { FlagValue } from '@zenmanage/sdk';
import type { ShallowRef } from 'vue';
import type { ZenmanageRuntime } from './types';

/**
 * Bookkeeping the composables share with their runtime. Kept out of the public runtime type:
 * it isn't API.
 */
export interface RuntimeInternals {
  /** The flags the composables have read, for `runtime.getBootstrapPayload()`. */
  evaluated: Map<string, FlagValue>;
  /**
   * Which flags the loaded rules contain, or `null` until they have loaded. Tells "the live
   * value" apart from "the SDK fell back to the default because nothing loaded".
   */
  live: ShallowRef<ReadonlySet<string> | null>;
}

const internals = new WeakMap<ZenmanageRuntime, RuntimeInternals>();

export function registerInternals(runtime: ZenmanageRuntime, value: RuntimeInternals): void {
  internals.set(runtime, value);
}

export function internalsOf(runtime: ZenmanageRuntime): RuntimeInternals {
  const value = internals.get(runtime);

  if (!value) {
    throw new Error('This Zenmanage runtime was not created by createZenmanagePlugin().');
  }

  return value;
}
