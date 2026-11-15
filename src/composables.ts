import type { Flag, FlagManager, FlagValue } from '@zenmanage/sdk';
import {
  computed,
  getCurrentInstance,
  onBeforeUnmount,
  onMounted,
  onServerPrefetch,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue';
import { useInjectedZenmanageRuntime } from './context';
import { internalsOf } from './internal';
import type { UseFlagResult, UseVariantResult, WidenFlagValue, ZenmanageRuntime } from './types';

interface Resolution<T> {
  key: string;
  manager: FlagManager;
  flag: Flag | null;
  value: T;
  error: Error | null;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function coerceValue<T extends FlagValue>(flag: Flag, defaultValue: T): WidenFlagValue<T> {
  if (typeof defaultValue === 'boolean') {
    return flag.asBool() as WidenFlagValue<T>;
  }

  if (typeof defaultValue === 'number') {
    return flag.asNumber() as WidenFlagValue<T>;
  }

  if (typeof defaultValue === 'string') {
    return flag.asString() as WidenFlagValue<T>;
  }

  return flag.asJson() as WidenFlagValue<T>;
}

function sameKind(candidate: FlagValue, fallback: FlagValue): boolean {
  if (typeof fallback === 'object') {
    return (
      typeof candidate === 'object' &&
      candidate !== null &&
      Array.isArray(candidate) === Array.isArray(fallback)
    );
  }

  return typeof candidate === typeof fallback;
}

export function useZenmanage(): ZenmanageRuntime {
  return useInjectedZenmanageRuntime();
}

export function useFlag<T extends FlagValue>(
  key: MaybeRefOrGetter<string>,
  defaultValue: T
): UseFlagResult<WidenFlagValue<T>> {
  const runtime = useZenmanage();
  const { evaluated, live } = internalsOf(runtime);
  const currentKey = computed(() => toValue(key));
  const resolution = shallowRef<Resolution<WidenFlagValue<T>> | null>(null);
  let evaluation = 0;
  let isDisposed = false;

  async function evaluate(): Promise<void> {
    // Wait for the plugin's preload so every composable reads from the warm cache instead of
    // each triggering its own rules fetch. If the preload failed, `isLoading` is false and the
    // composable settles on its default with the plugin's error surfaced.
    if (runtime.isLoading.value) {
      return;
    }

    evaluation += 1;
    const current = evaluation;
    const evaluatedKey = currentKey.value;
    const manager = runtime.manager;

    try {
      const flag = await manager.single(evaluatedKey, defaultValue);

      if (current === evaluation && !isDisposed) {
        const value = coerceValue(flag, defaultValue);
        evaluated.set(evaluatedKey, flag.getValue());
        resolution.value = { key: evaluatedKey, manager, flag, value, error: null };
      }
    } catch (error) {
      if (current === evaluation && !isDisposed) {
        resolution.value = {
          key: evaluatedKey,
          manager,
          flag: null,
          value: defaultValue as WidenFlagValue<T>,
          error: toError(error),
        };
      }
    }
  }

  // A result only counts for the key and manager that produced it. After either changes, the
  // previous result is ignored (never shown for the wrong key or context) until the new one
  // lands. A `revision` bump keeps the last value on screen while re-evaluating.
  const settled = computed(() => {
    const result = resolution.value;

    return result !== null && result.key === currentKey.value && result.manager === runtime.manager
      ? result
      : null;
  });

  // What the server evaluated for this key, while it's the best answer there is: the server's
  // value, until the browser's rules contain the flag and its own evaluation replaces it.
  // Without it the browser would render the default first and swap, which doesn't match the
  // server's HTML.
  const seed = computed(() => {
    const candidate = runtime.bootstrap?.flags[currentKey.value];

    if (candidate === undefined || !sameKind(candidate, defaultValue)) {
      return undefined;
    }

    const hasLiveValue = live.value?.has(currentKey.value) === true;
    return hasLiveValue && settled.value !== null ? undefined : candidate;
  });

  const value = computed(() => {
    if (seed.value !== undefined) {
      return seed.value as WidenFlagValue<T>;
    }

    return settled.value ? settled.value.value : (defaultValue as WidenFlagValue<T>);
  });

  const isLoading = computed(
    () => seed.value === undefined && (runtime.isLoading.value || settled.value === null)
  );
  const error = computed(() => runtime.error.value ?? settled.value?.error ?? null);
  const flag = computed(() => settled.value?.flag ?? null);

  watch([currentKey, () => runtime.manager, runtime.revision, runtime.isLoading], () => {
    void evaluate();
  });

  if (getCurrentInstance()) {
    // The server awaits this before it renders, so the HTML carries the real value.
    onServerPrefetch(async () => {
      await runtime.whenReady();
      await evaluate();
    });
    onMounted(() => {
      void evaluate();
    });
    onBeforeUnmount(() => {
      isDisposed = true;
    });
  } else {
    void evaluate();
  }

  return {
    key: currentKey,
    value,
    flag,
    isLoading,
    error,
    refresh: runtime.refresh,
  };
}

export function useBooleanFlag(
  key: MaybeRefOrGetter<string>,
  defaultValue = false
): UseFlagResult<boolean> {
  return useFlag<boolean>(key, defaultValue);
}

export function useVariant(
  key: MaybeRefOrGetter<string>,
  defaultVariant = 'control'
): UseVariantResult {
  const result = useFlag<string>(key, defaultVariant);

  return {
    key: result.key,
    variant: result.value,
    flag: result.flag,
    isLoading: result.isLoading,
    error: result.error,
    refresh: result.refresh,
  };
}

export function useConfig<T extends FlagValue>(
  key: MaybeRefOrGetter<string>,
  defaultValue: T
): UseFlagResult<WidenFlagValue<T>> {
  return useFlag<T>(key, defaultValue);
}
