import type {
  Context,
  ContextData,
  DefaultsCollection,
  Flag,
  FlagManager,
  FlagValue,
  Logger,
  Zenmanage,
} from '@zenmanage/sdk';
import type { App, ComputedRef, InjectionKey, MaybeRefOrGetter, Ref } from 'vue';

export type PrimitiveFlagValue = boolean | string | number;

/**
 * Widens a literal default (`false`, `'control'`, `1500`) to its primitive type, so
 * `useFlag('k', false).value.value` is `boolean` rather than the literal `false`. Object and
 * array defaults (JSON flags) pass through unchanged.
 */
export type WidenFlagValue<T extends FlagValue> = T extends boolean
  ? boolean
  : T extends number
    ? number
    : T extends string
      ? string
      : T;

/** Server cache TTL (seconds) when none is given. Short, so a long-running server picks up flag changes. */
export const DEFAULT_SERVER_CACHE_TTL = 60;

export const DEFAULT_BOOTSTRAP_ELEMENT_ID = '__ZENMANAGE_BOOTSTRAP__';

export interface BootstrapPayload {
  version: 1;
  generatedAt: string;
  flags: Record<string, FlagValue>;
  context?: ContextData;
}

export interface BuildBootstrapPayloadOptions {
  context?: Context;
  generatedAt?: Date;
}

export interface BuildBootstrapScriptOptions {
  elementId?: string;
}

export interface RuntimeBootstrapOptions {
  /** Flags to include. Defaults to the flags the composables read while rendering. */
  keys?: string[];
  /** Also send the evaluation context, so the browser evaluates for the same user. Off by default. */
  includeContext?: boolean;
}

export interface ZenmanagePluginOptions {
  /** An existing client. When set, `environmentToken` and the other client options are ignored. */
  client?: Zenmanage;
  environmentToken?: string;
  apiEndpoint?: string;
  cacheTtl?: number;
  enableUsageReporting?: boolean;
  logger?: Logger;
  /** Base context for every evaluation. Pass a ref or getter to change it while the app runs. */
  context?: MaybeRefOrGetter<Context | undefined>;
  /** Fallback values. Pass a ref or getter to change them while the app runs. */
  defaults?: MaybeRefOrGetter<DefaultsCollection | undefined>;
  /** Preload every flag at install time (default: `true`). */
  preload?: boolean;
  /**
   * What the server evaluated, for the first render in the browser. When it's left out the
   * plugin looks for a `<script>` tag with `bootstrapElementId`; pass `null` to skip that.
   */
  bootstrap?: BootstrapPayload | null;
  /** Id of the `<script type="application/json">` tag the bootstrap payload is read from. */
  bootstrapElementId?: string;
  onError?: (error: Error) => void;
}

export interface ZenmanageRuntime {
  client: Zenmanage;
  /** The flag manager for the current context and defaults. Read it inside an effect to track changes. */
  readonly manager: FlagManager;
  readonly context: Context | undefined;
  readonly defaults: DefaultsCollection | undefined;
  /** The payload the browser started from, when there was one. */
  readonly bootstrap: BootstrapPayload | null;
  /** `true` once the initial preload has succeeded (or immediately when `preload` is off). */
  isReady: Readonly<Ref<boolean>>;
  /** `true` only while the initial preload is in flight; background refreshes don't set it. */
  isLoading: Readonly<Ref<boolean>>;
  error: Readonly<Ref<Error | null>>;
  /** Bumps after every successful `refresh()` so mounted composables re-evaluate. */
  revision: Readonly<Ref<number>>;
  /** Loads every flag again. Rejects with the load error. */
  preload: () => Promise<void>;
  /** Re-fetches rules from the API and re-evaluates every mounted composable. */
  refresh: () => Promise<void>;
  /** Resolves once the first preload has finished, whether or not it succeeded. Never rejects. */
  whenReady: () => Promise<void>;
  /** Packages flag values for the browser. Call it after the server render has finished. */
  getBootstrapPayload: (options?: RuntimeBootstrapOptions) => Promise<BootstrapPayload>;
  /** Stops watching a reactive `context` or `defaults`. Called when the app unmounts. */
  dispose: () => void;
}

export interface ZenmanagePlugin {
  install: (app: App) => void;
  runtime: ZenmanageRuntime;
}

export interface UseFlagResult<T extends FlagValue> {
  key: Readonly<Ref<string>>;
  value: ComputedRef<T>;
  flag: Readonly<Ref<Flag | null>>;
  isLoading: ComputedRef<boolean>;
  error: ComputedRef<Error | null>;
  /** Re-fetches rules from the API; the value updates once the re-evaluation lands. */
  refresh: () => Promise<void>;
}

export interface UseVariantResult {
  key: Readonly<Ref<string>>;
  variant: ComputedRef<string>;
  flag: Readonly<Ref<Flag | null>>;
  isLoading: ComputedRef<boolean>;
  error: ComputedRef<Error | null>;
  refresh: () => Promise<void>;
}

export interface VueZenmanageClientOptions {
  environmentToken: string;
  apiEndpoint?: string;
  cacheTtl?: number;
  enableUsageReporting?: boolean;
  logger?: Logger;
}

export interface ServerFlagInput extends VueZenmanageClientOptions {
  key: string;
  defaultValue?: FlagValue;
  context?: Context;
  defaults?: DefaultsCollection;
}

export interface ServerFlagsInput extends VueZenmanageClientOptions {
  context?: Context;
  defaults?: DefaultsCollection;
}

export interface ServerBootstrapInput extends ServerFlagsInput {
  /** Flags to include. Defaults to every flag in the environment. */
  keys?: string[];
  /** Also send the context, so the browser evaluates for the same user. Off by default. */
  includeContext?: boolean;
}

export interface VueFlagsRuntime {
  client: Zenmanage;
  manager: FlagManager;
}

export interface ZenmanageGlobalProperties {
  $zenmanage: ZenmanageRuntime;
}

export type ZenmanageInjectionKey = InjectionKey<ZenmanageRuntime>;

declare module 'vue' {
  interface ComponentCustomProperties {
    $zenmanage: ZenmanageRuntime;
  }
}
