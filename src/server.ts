import { DefaultsCollection, type Flag, type FlagManager, type FlagValue } from '@zenmanage/sdk';
import { buildBootstrapPayload } from './bootstrap';
import { createServerClient } from './client';
import type {
  BootstrapPayload,
  ServerBootstrapInput,
  ServerFlagInput,
  ServerFlagsInput,
  VueFlagsRuntime,
  WidenFlagValue,
} from './types';

export { mergeDefaults } from './defaults';
export { clearServerClients, createServerClient } from './client';

export function createServerRuntime(options: ServerFlagsInput): VueFlagsRuntime {
  const client = createServerClient(options);

  // A manager loads its rules once and keeps them until its cache TTL passes. Handing out the
  // client's own manager would share that state between requests, so every call gets a copy
  // that reads the shared cache instead.
  let manager = client.flags().withDefaults(options.defaults ?? new DefaultsCollection());

  if (options.context) {
    manager = manager.withContext(options.context);
  }

  return { client, manager };
}

export function createServerManager(options: ServerFlagsInput): FlagManager {
  return createServerRuntime(options).manager;
}

export async function getServerFlag(input: ServerFlagInput): Promise<Flag> {
  const manager = createServerManager(input);
  return manager.single(input.key, input.defaultValue);
}

export async function getServerFlags(input: ServerFlagsInput): Promise<Flag[]> {
  const manager = createServerManager(input);
  return manager.all();
}

export async function preloadServerFlags(input: ServerFlagsInput): Promise<FlagManager> {
  const manager = createServerManager(input);
  await manager.all();
  return manager;
}

/**
 * Evaluates a flag and returns its value as the type of `fallback`: a boolean, number or
 * string, or a JSON object or array. A literal fallback (`'control'`, `false`) gives the
 * widened type (`string`, `boolean`), so the result can be compared with other values.
 *
 * `fallback` is also the default, for a flag that doesn't exist or when the API can't be
 * reached. A `defaultValue` in `input`, or an entry for the key in `input.defaults`, is more
 * specific and wins over it.
 */
export async function getFlagValue<T extends FlagValue>(
  input: ServerFlagInput,
  fallback: T
): Promise<WidenFlagValue<T>> {
  // The SDK prefers an inline default over a defaults collection, so the fallback only goes in
  // when nothing else would supply one. Otherwise it would override the collection's entry.
  const hasOwnDefault = input.defaultValue !== undefined || input.defaults?.has(input.key) === true;
  const flag = await getServerFlag(hasOwnDefault ? input : { ...input, defaultValue: fallback });

  if (typeof fallback === 'boolean') {
    return flag.asBool() as WidenFlagValue<T>;
  }

  if (typeof fallback === 'number') {
    return flag.asNumber() as WidenFlagValue<T>;
  }

  if (typeof fallback === 'string') {
    return flag.asString() as WidenFlagValue<T>;
  }

  return flag.asJson() as WidenFlagValue<T>;
}

/**
 * Evaluates flags on the server and packages them for the browser's plugin. Pass `keys` to
 * send only the flags the page reads.
 */
export async function getBootstrapPayload(input: ServerBootstrapInput): Promise<BootstrapPayload> {
  const flags = await getServerFlags(input);
  const wanted = input.keys ? new Set(input.keys) : null;

  return buildBootstrapPayload(
    flags.filter((flag) => wanted === null || wanted.has(flag.getKey())),
    { context: input.includeContext ? input.context : undefined }
  );
}
