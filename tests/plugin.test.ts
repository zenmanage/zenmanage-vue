import { describe, expect, it, vi } from 'vitest';
import { Context, DefaultsCollection } from '@zenmanage/sdk';
import { createZenmanagePlugin } from '../src/plugin';
import { appInstallingPlugin, createMockClient, createMockManager } from './test-utils';

describe('createZenmanagePlugin', () => {
  it('throws if neither client nor environmentToken is provided', () => {
    expect(() => createZenmanagePlugin({ preload: false })).toThrow(
      'Zenmanage Vue plugin requires either a client or an environmentToken.'
    );
  });

  it('installs runtime into app provide and global properties', () => {
    const manager = createMockManager({ 'new-ui': true });
    const client = createMockClient(manager);
    const plugin = createZenmanagePlugin({ client: client as never, preload: false });

    const app = appInstallingPlugin(plugin);

    expect((app.provide as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    expect((app.config.globalProperties as { $zenmanage?: unknown }).$zenmanage).toBeDefined();
    expect(plugin.runtime.isReady.value).toBe(true);
    expect(plugin.runtime.isLoading.value).toBe(false);
  });

  it('applies context and defaults to the manager', () => {
    const manager = createMockManager({});
    const client = createMockClient(manager);
    const context = Context.single('user', '123');
    const defaults = DefaultsCollection.fromObject({ 'flag-a': true });

    createZenmanagePlugin({
      client: client as never,
      context,
      defaults,
      preload: false,
    });

    expect(manager.withContext).toHaveBeenCalledWith(context);
    expect(manager.withDefaults).toHaveBeenCalledWith(defaults);
  });

  it('preloads flags when preload is true', async () => {
    const manager = createMockManager({ 'new-ui': true });
    const client = createMockClient(manager);
    const plugin = createZenmanagePlugin({ client: client as never, preload: true });

    appInstallingPlugin(plugin);

    await plugin.runtime.preload();

    expect(manager.all).toHaveBeenCalled();
    expect(plugin.runtime.isReady.value).toBe(true);
    expect(plugin.runtime.error.value).toBeNull();
  });

  it('supports runtime refresh success path', async () => {
    const manager = createMockManager({ 'new-ui': true });
    const client = createMockClient(manager);
    const plugin = createZenmanagePlugin({ client: client as never, preload: false });

    await plugin.runtime.refresh();

    expect(manager.refreshRules).toHaveBeenCalledTimes(1);
    expect(plugin.runtime.isReady.value).toBe(true);
    expect(plugin.runtime.error.value).toBeNull();
  });

  it('builds internal client when environment token is provided', () => {
    const plugin = createZenmanagePlugin({
      environmentToken: 'cli_test_client_key',
      apiEndpoint: 'https://api.zenmanage.com',
      cacheTtl: 120,
      enableUsageReporting: false,
      preload: false,
    });

    const app = appInstallingPlugin(plugin);

    expect((app.config.globalProperties as { $zenmanage?: unknown }).$zenmanage).toBeDefined();
    expect(plugin.runtime.isReady.value).toBe(true);
  });

  it('surfaces preload and refresh errors via runtime and callback', async () => {
    const manager = createMockManager({});
    manager.all = vi.fn(async () => {
      throw new Error('preload failed');
    });
    manager.refreshRules = vi.fn(async () => {
      throw new Error('refresh failed');
    });

    const client = createMockClient(manager);
    const onError = vi.fn();
    const plugin = createZenmanagePlugin({
      client: client as never,
      preload: false,
      onError,
    });

    await expect(plugin.runtime.preload()).rejects.toThrow('preload failed');
    await expect(plugin.runtime.refresh()).rejects.toThrow('refresh failed');

    expect(onError).toHaveBeenCalledTimes(2);
    expect(plugin.runtime.error.value?.message).toBe('refresh failed');
  });
});
