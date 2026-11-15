import { DefaultsCollection, type Context, type FlagManager, type FlagValue } from '@zenmanage/sdk';
import {
  effectScope,
  isRef,
  computed,
  ref,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue';
import {
  buildBootstrapPayload,
  contextFromBootstrapPayload,
  defaultsFromBootstrapPayload,
  readBootstrapPayloadFromDocument,
} from './bootstrap';
import { createPluginClient } from './client';
import { describeDefaults, mergeDefaults } from './defaults';
import { registerInternals } from './internal';
import {
  DEFAULT_BOOTSTRAP_ELEMENT_ID,
  type BootstrapPayload,
  type RuntimeBootstrapOptions,
  type ZenmanagePluginOptions,
  type ZenmanageRuntime,
} from './types';

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function isReactive(source: MaybeRefOrGetter<unknown>): boolean {
  return isRef(source) || typeof source === 'function';
}

function describeContext(context: Context | undefined): string {
  return context === undefined ? '' : JSON.stringify(context);
}

function resolveBootstrap(options: ZenmanagePluginOptions): BootstrapPayload | null {
  if (options.bootstrap !== undefined) {
    return options.bootstrap;
  }

  return readBootstrapPayloadFromDocument(
    options.bootstrapElementId ?? DEFAULT_BOOTSTRAP_ELEMENT_ID
  );
}

export function createRuntime(options: ZenmanagePluginOptions): ZenmanageRuntime {
  const client = options.client ?? createPluginClient(options);
  const preloadEnabled = options.preload !== false;
  const bootstrap = resolveBootstrap(options);
  const bootstrapDefaults = defaultsFromBootstrapPayload(bootstrap);

  // Without an explicit context the browser evaluates for the user the server evaluated for.
  // Only when no `context` option was given at all: a ref that becomes undefined (a user
  // logging out) means "no context", not "the server's user".
  const currentContext = (): Context | undefined =>
    options.context === undefined
      ? contextFromBootstrapPayload(bootstrap)
      : toValue(options.context);
  const currentDefaults = (): DefaultsCollection | undefined =>
    mergeDefaults(toValue(options.defaults), bootstrapDefaults);

  // The manager is copied even without a context or defaults: a manager loads its rules once
  // and keeps them until the cache TTL passes, so the client's own would be shared by everyone.
  const buildManager = (): FlagManager => {
    let manager = client.flags().withDefaults(currentDefaults() ?? new DefaultsCollection());
    const context = currentContext();

    if (context) {
      manager = manager.withContext(context);
    }

    return manager;
  };

  const manager = shallowRef<FlagManager>(buildManager());
  const isReady = ref(!preloadEnabled);
  const isLoading = ref(preloadEnabled);
  const error = ref<Error | null>(null);
  const revision = ref(0);

  /** Which flags the loaded rules contain, to tell "the live value" from "fell back to a default". */
  const live = shallowRef<ReadonlySet<string> | null>(null);
  const evaluated = new Map<string, FlagValue>();
  let sequence = 0;
  let initialLoad: Promise<void> = Promise.resolve();

  // Resolves whatever happens: the SDK serves defaults instead of throwing when it can't load
  // rules, and a load that does throw is reported through `error` and `onError`.
  function load(): Promise<void> {
    sequence += 1;
    const current = sequence;
    const target = manager.value;

    live.value = null;
    error.value = null;

    if (!preloadEnabled) {
      isLoading.value = false;
      isReady.value = true;
      return Promise.resolve();
    }

    isLoading.value = true;
    isReady.value = false;

    return target.all().then(
      (flags) => {
        if (current !== sequence) {
          return;
        }

        live.value = new Set(flags.map((flag) => flag.getKey()));
        isLoading.value = false;
        isReady.value = true;
      },
      (loadError: unknown) => {
        if (current !== sequence) {
          return;
        }

        const resolved = toError(loadError);
        live.value = new Set();
        error.value = resolved;
        isLoading.value = false;
        isReady.value = false;
        options.onError?.(resolved);
      }
    );
  }

  initialLoad = load();

  const scope = effectScope(true);

  // `context` and `defaults` are often built inline (`() => Context.single('user', id.value)`),
  // so compare them by content: a new-but-equal object must not replace the flag manager,
  // which would put every mounted composable back into its loading state.
  if (isReactive(options.context) || isReactive(options.defaults)) {
    scope.run(() => {
      const signature = computed(
        () => `${describeContext(currentContext())}|${describeDefaults(currentDefaults())}`
      );

      watch(
        signature,
        () => {
          manager.value = buildManager();
          initialLoad = load();
        },
        { flush: 'sync' }
      );
    });
  }

  // A background refresh deliberately doesn't set `isLoading`: composables keep serving their
  // last value while rules re-fetch, so gated UI doesn't unmount and remount on every refresh.
  async function refresh(): Promise<void> {
    const target = manager.value;

    try {
      await target.refreshRules();
      const flags = await target.all();

      // The context changed while this ran: the new manager's own load is the one that counts.
      if (target !== manager.value) {
        return;
      }

      live.value = new Set(flags.map((flag) => flag.getKey()));
      isReady.value = true;
      error.value = null;
      revision.value += 1;
    } catch (refreshError) {
      const resolved = toError(refreshError);

      if (target === manager.value) {
        error.value = resolved;
        options.onError?.(resolved);
      }

      throw resolved;
    }
  }

  async function preload(): Promise<void> {
    initialLoad = load();
    await initialLoad;

    if (error.value) {
      throw error.value;
    }
  }

  async function getBootstrapPayload(
    payloadOptions: RuntimeBootstrapOptions = {}
  ): Promise<BootstrapPayload> {
    await initialLoad;

    let flags: Record<string, FlagValue>;

    if (payloadOptions.keys) {
      const wanted = new Set(payloadOptions.keys);
      const all = await manager.value.all();
      flags = Object.fromEntries(
        all
          .filter((flag) => wanted.has(flag.getKey()))
          .map((flag) => [flag.getKey(), flag.getValue()])
      );
    } else {
      // What the page displayed, including flags answered from a default: the browser has to
      // start from the same values or hydration won't match.
      flags = Object.fromEntries(evaluated);
    }

    return buildBootstrapPayload(flags, {
      context: payloadOptions.includeContext ? currentContext() : undefined,
    });
  }

  const runtime: ZenmanageRuntime = {
    client,
    get manager() {
      return manager.value;
    },
    get context() {
      return currentContext();
    },
    get defaults() {
      return currentDefaults();
    },
    bootstrap,
    isReady,
    isLoading,
    error,
    revision,
    preload,
    refresh,
    whenReady: () => initialLoad,
    getBootstrapPayload,
    dispose: () => scope.stop(),
  };

  registerInternals(runtime, { evaluated, live, seedManager: manager.value });

  return runtime;
}
