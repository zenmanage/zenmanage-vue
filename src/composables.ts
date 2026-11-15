import type { Flag, FlagValue } from '@zenmanage/sdk';
import { onMounted, onServerPrefetch, ref, shallowRef, type Ref } from 'vue';
import { useInjectedZenmanageRuntime } from './context';
import type { PrimitiveFlagValue, UseFlagResult, UseVariantResult } from './types';

function coerceFlagValue<T extends PrimitiveFlagValue>(flag: Flag, defaultValue: T): T {
  if (typeof defaultValue === 'boolean') {
    return flag.asBool() as T;
  }

  if (typeof defaultValue === 'number') {
    return flag.asNumber() as T;
  }

  return flag.asString() as T;
}

export function useZenmanage() {
  return useInjectedZenmanageRuntime();
}

export function useFlag<T extends PrimitiveFlagValue>(
  key: string,
  defaultValue: T
): UseFlagResult<T> {
  const runtime = useZenmanage();
  const value = ref(defaultValue) as Ref<T>;
  const flag = shallowRef<Flag | null>(null);
  const isLoading = ref(true);
  const error = ref<Error | null>(null);

  const load = async (): Promise<void> => {
    isLoading.value = true;
    error.value = null;

    try {
      const resolvedFlag = await runtime.manager.single(key, defaultValue as FlagValue);
      flag.value = resolvedFlag;
      value.value = coerceFlagValue(resolvedFlag, defaultValue);
      isLoading.value = false;
    } catch (loadError) {
      flag.value = null;
      value.value = defaultValue;
      error.value = loadError as Error;
      isLoading.value = false;
    }
  };

  const refresh = async (): Promise<void> => {
    await load();
  };

  onMounted(() => {
    void load();
  });

  onServerPrefetch(async () => {
    await load();
  });

  return {
    key,
    value,
    flag,
    isLoading,
    error,
    refresh,
  };
}

export function useBooleanFlag(key: string, defaultValue = false): UseFlagResult<boolean> {
  return useFlag<boolean>(key, defaultValue);
}

export function useVariant(key: string, defaultVariant = 'control'): UseVariantResult {
  const base = useFlag<string>(key, defaultVariant);

  return {
    key,
    variant: base.value,
    flag: base.flag,
    isLoading: base.isLoading,
    error: base.error,
    refresh: base.refresh,
  };
}

export function useConfig<T extends string | number>(
  key: string,
  defaultValue: T
): UseFlagResult<T> {
  return useFlag<T>(key, defaultValue);
}
