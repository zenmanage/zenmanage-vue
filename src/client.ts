import { ConfigBuilder, Zenmanage, type Logger } from '@zenmanage/sdk';
import { CLIENT_AGENT, PACKAGE_VERSION } from './identity';
import { DEFAULT_SERVER_CACHE_TTL, type VueZenmanageClientOptions } from './types';

type ClientConfiguration = Partial<VueZenmanageClientOptions>;

/** `true` while rendering on a server: nothing a browser would have. Mirrors @zenmanage/sdk. */
export function isServerRender(): boolean {
  return typeof window === 'undefined' && typeof document === 'undefined';
}

export function buildClient(options: ClientConfiguration, defaultCacheTtl?: number): Zenmanage {
  if (!options.environmentToken) {
    throw new Error('Zenmanage Vue plugin requires either a client or an environmentToken.');
  }

  const builder = ConfigBuilder.create()
    .withEnvironmentToken(options.environmentToken)
    .withClientAgent(CLIENT_AGENT)
    .withSdkVersion(PACKAGE_VERSION);

  if (options.apiEndpoint) {
    builder.withApiEndpoint(options.apiEndpoint);
  }

  const cacheTtl = options.cacheTtl ?? defaultCacheTtl;
  if (typeof cacheTtl === 'number') {
    builder.withCacheTtl(cacheTtl);
  }

  if (typeof options.enableUsageReporting === 'boolean') {
    builder.withUsageReporting(options.enableUsageReporting);
  }

  if (options.logger) {
    builder.withLogger(options.logger);
  }

  return new Zenmanage(builder.build());
}

// A client owns the rules cache, so building one per call would refetch the rules for every
// flag on every request. On a server, clients are shared per configuration for the life of
// the process. Loggers are compared by identity, hence the WeakMap.
const clientsWithoutLogger = new Map<string, Zenmanage>();
let clientsByLogger = new WeakMap<Logger, Map<string, Zenmanage>>();

function configurationKey(options: ClientConfiguration): string {
  return JSON.stringify([
    options.environmentToken,
    options.apiEndpoint ?? null,
    options.cacheTtl ?? null,
    options.enableUsageReporting ?? null,
  ]);
}

/**
 * Returns the client for this configuration, creating it on first use. Calls with the same
 * token, endpoint, TTL, usage setting and logger share one client and so one rules cache.
 */
export function createServerClient(options: VueZenmanageClientOptions): Zenmanage {
  let clients = clientsWithoutLogger;

  if (options.logger) {
    clients = clientsByLogger.get(options.logger) ?? new Map<string, Zenmanage>();
    clientsByLogger.set(options.logger, clients);
  }

  const key = configurationKey(options);
  let client = clients.get(key);

  if (!client) {
    client = buildClient(options, DEFAULT_SERVER_CACHE_TTL);
    clients.set(key, client);
  }

  return client;
}

/** Forgets every shared client, and with them their cached rules. Mostly useful in tests. */
export function clearServerClients(): void {
  clientsWithoutLogger.clear();
  clientsByLogger = new WeakMap();
}

/**
 * The client the plugin builds from `environmentToken`. In the browser each app gets its own.
 * On a server (SSR creates an app per request) they're shared, so a request reuses the rules
 * the one before it loaded instead of fetching them again.
 */
export function createPluginClient(options: ClientConfiguration): Zenmanage {
  return isServerRender()
    ? createServerClient(options as VueZenmanageClientOptions)
    : buildClient(options);
}
