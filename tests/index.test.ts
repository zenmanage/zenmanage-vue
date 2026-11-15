import { describe, expect, it } from 'vitest';
import * as root from '../src/index';
import * as server from '../src/server';

describe('package entry point', () => {
  it('exports the public API', () => {
    expect(Object.keys(root).sort()).toEqual(
      [
        'DEFAULT_BOOTSTRAP_ELEMENT_ID',
        'FlagGate',
        'buildBootstrapPayload',
        'buildBootstrapScript',
        'clearServerClients',
        'contextFromBootstrapPayload',
        'createServerClient',
        'createServerManager',
        'createServerRuntime',
        'createZenmanagePlugin',
        'defaultsFromBootstrapDocument',
        'defaultsFromBootstrapPayload',
        'deserializeBootstrapPayload',
        'getBootstrapPayload',
        'getFlagValue',
        'getServerFlag',
        'getServerFlags',
        'mergeDefaults',
        'preloadServerFlags',
        'readBootstrapPayloadFromDocument',
        'serializeBootstrapPayload',
        'useBooleanFlag',
        'useConfig',
        'useFlag',
        'useVariant',
        'useZenmanage',
      ].sort()
    );
  });

  it('re-exports the server helpers unchanged', () => {
    expect(server.getServerFlag).toBe(root.getServerFlag);
    expect(server.getBootstrapPayload).toBe(root.getBootstrapPayload);
    expect(server.createServerClient).toBe(root.createServerClient);
  });
});
