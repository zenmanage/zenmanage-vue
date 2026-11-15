export {
  DEFAULT_BOOTSTRAP_ELEMENT_ID,
  type BootstrapPayload,
  type BuildBootstrapPayloadOptions,
  type BuildBootstrapScriptOptions,
  type PrimitiveFlagValue,
  type ServerFlagInput,
  type ServerFlagsInput,
  type UseFlagResult,
  type UseVariantResult,
  type VueFlagsRuntime,
  type VueZenmanageClientOptions,
  type ZenmanagePlugin,
  type ZenmanagePluginOptions,
  type ZenmanageRuntime,
} from './types';

export { createZenmanagePlugin } from './plugin';
export { useZenmanage, useFlag, useBooleanFlag, useVariant, useConfig } from './composables';

export {
  buildBootstrapPayload,
  buildBootstrapScript,
  contextFromBootstrapPayload,
  defaultsFromBootstrapDocument,
  defaultsFromBootstrapPayload,
  deserializeBootstrapPayload,
  readBootstrapPayloadFromDocument,
  serializeBootstrapPayload,
} from './bootstrap';

export {
  contextWithDefaults,
  createServerClient,
  createServerManager,
  createServerRuntime,
  getFlagValue,
  getServerFlag,
  getServerFlags,
  mergeDefaults,
  preloadServerFlags,
} from './server';
