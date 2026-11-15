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
import type { App, InjectionKey, Ref } from 'vue';

export type PrimitiveFlagValue = boolean | string | number;

export interface ZenmanagePluginOptions {
  client?: Zenmanage;
  environmentToken?: string;
  apiEndpoint?: string;
  cacheTtl?: number;
  enableUsageReporting?: boolean;
  logger?: Logger;
  context?: Context;
  defaults?: DefaultsCollection;
  preload?: boolean;
  onError?: (error: Error) => void;
}

export interface ZenmanageRuntime {
  client: Zenmanage;
  manager: FlagManager;
  context?: Context;
  defaults?: DefaultsCollection;
  isReady: Ref<boolean>;
  isLoading: Ref<boolean>;
  error: Ref<Error | null>;
  preload: () => Promise<void>;
  refresh: () => Promise<void>;
}

export interface ZenmanagePlugin {
  install: (app: App) => void;
  runtime: ZenmanageRuntime;
}

export interface UseFlagResult<T extends PrimitiveFlagValue> {
  key: string;
  value: Ref<T>;
  flag: Ref<Flag | null>;
  isLoading: Ref<boolean>;
  error: Ref<Error | null>;
  refresh: () => Promise<void>;
}

export interface UseVariantResult {
  key: string;
  variant: Ref<string>;
  flag: Ref<Flag | null>;
  isLoading: Ref<boolean>;
  error: Ref<Error | null>;
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

export interface VueFlagsRuntime {
  client: Zenmanage;
  manager: FlagManager;
}

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

export interface ZenmanageGlobalProperties {
  $zenmanage: ZenmanageRuntime;
}

export type ZenmanageInjectionKey = InjectionKey<ZenmanageRuntime>;
