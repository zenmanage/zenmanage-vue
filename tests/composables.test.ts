// @vitest-environment jsdom
import { Attribute, Context, DefaultsCollection } from '@zenmanage/sdk';
import { createApp, defineComponent, h, nextTick, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { useBooleanFlag, useConfig, useFlag, useVariant, useZenmanage } from '../src/composables';
import { createZenmanagePlugin } from '../src/plugin';
import { flag, installFakeApi } from './fakeApi';
import { CLIENT_KEY, mountComposable, settled } from './helpers';

// These tests run the composables against the real @zenmanage/sdk, with only the network
// faked, so they catch drift between this package and the SDK.

describe('useFlag against the real @zenmanage/sdk', () => {
  it('evaluates boolean, string, number and JSON flags', async () => {
    installFakeApi([
      flag('promo', true),
      flag('mode', 'one-page'),
      flag('timeout', 1500),
      flag('ui', { theme: 'dark', pageSize: 50 }),
      flag('steps', [1, 2, 3]),
    ]);

    const { result } = mountComposable(() => ({
      promo: useFlag('promo', false),
      boolean: useBooleanFlag('promo'),
      mode: useVariant('mode'),
      timeout: useFlag('timeout', 1000),
      config: useConfig('timeout', 1000),
      ui: useFlag('ui', { theme: 'light', pageSize: 20 }),
      steps: useFlag<number[]>('steps', []),
    }));
    await settled(...Object.values(result));

    expect(result.promo.value.value).toBe(true);
    expect(result.boolean.value.value).toBe(true);
    expect(result.mode.variant.value).toBe('one-page');
    expect(result.timeout.value.value).toBe(1500);
    expect(result.config.value.value).toBe(1500);
    expect(result.ui.value.value).toEqual({ theme: 'dark', pageSize: 50 });
    expect(result.steps.value.value).toEqual([1, 2, 3]);
    expect(result.promo.flag.value?.getKey()).toBe('promo');
    expect(result.promo.key.value).toBe('promo');
  });

  it('starts from the default, loading, and settles on the flag', async () => {
    installFakeApi([flag('promo', true)]);

    const { result } = mountComposable(() => useFlag('promo', false));

    expect(result.value.value).toBe(false);
    expect(result.isLoading.value).toBe(true);
    expect(result.flag.value).toBeNull();

    await settled(result);
    expect(result.value.value).toBe(true);
    expect(result.error.value).toBeNull();
  });

  it('loads the rules once for the whole tree, not once per composable', async () => {
    const api = installFakeApi([flag('a', true)]);

    const { result } = mountComposable(() => [
      useFlag('a', false),
      useFlag('b', false),
      useFlag('c', false),
      useFlag('d', false),
    ]);
    await settled(...result);

    expect(api.rulesLoads()).toHaveLength(1);
  });

  it('resolves to the default for a flag that does not exist, without an error', async () => {
    installFakeApi([]);

    const { result } = mountComposable(() => useFlag('missing', 'fallback'));
    await settled(result);

    expect(result.value.value).toBe('fallback');
    expect(result.error.value).toBeNull();
  });

  it('uses the plugin defaults when the composable has no default of its own to give', async () => {
    installFakeApi([]);

    const { result, plugin } = mountComposable(() => useFlag('missing', false), {
      defaults: DefaultsCollection.fromObject({ missing: true }),
    });
    await settled(result);

    // The SDK prefers the inline default, so the collection answers `manager.single(key)`.
    expect(result.value.value).toBe(false);
    expect((await plugin.runtime.manager.single('missing')).asBool()).toBe(true);
  });

  it('reports usage as zenmanage-vue, including the default the composable fell back to', async () => {
    const api = installFakeApi([flag('promo', true)]);

    const { result } = mountComposable(() => useFlag('promo', false), {
      enableUsageReporting: true,
    });
    await settled(result);
    await vi.waitFor(() => expect(api.usageReports()).toHaveLength(1));

    expect(JSON.parse(api.usageReports()[0].headers['X-ZEN-DEFAULT-VALUE'])).toEqual({
      promo: false,
    });
  });
});

describe('failures', () => {
  it('serves defaults without an error when the API is unreachable, and surfaces refresh() failures', async () => {
    installFakeApi([flag('promo', false)]).goOffline();
    const onError = vi.fn();

    const { result, plugin } = mountComposable(() => useFlag('promo', true), { onError });
    await settled(result);

    expect(result.value.value).toBe(true);
    expect(result.error.value).toBeNull();
    expect(onError).not.toHaveBeenCalled();

    await expect(result.refresh()).rejects.toThrow('fetch failed');

    expect(result.error.value?.message).toContain('fetch failed');
    expect(plugin.runtime.error.value?.message).toContain('fetch failed');
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('keeps the previous value on screen when a refresh fails', async () => {
    const api = installFakeApi([flag('promo', true)]);

    const { result } = mountComposable(() => useFlag('promo', false));
    await settled(result);
    api.goOffline();

    await expect(result.refresh()).rejects.toThrow();

    expect(result.value.value).toBe(true);
    expect(result.isLoading.value).toBe(false);
  });

  it('turns a non-Error failure into an Error', async () => {
    installFakeApi([]);
    const { result, plugin } = mountComposable(() => useFlag('promo', false), { preload: false });
    await settled(result);
    vi.spyOn(plugin.runtime.manager, 'refreshRules').mockRejectedValue('boom');

    await expect(result.refresh()).rejects.toThrow('boom');
  });

  it('reports an evaluation error and falls back to the default', async () => {
    installFakeApi([]);

    const { result, plugin } = mountComposable(() => useFlag('anything', 5), { preload: false });
    vi.spyOn(plugin.runtime.manager, 'single').mockRejectedValue(new Error('evaluation failed'));
    await plugin.runtime.refresh().catch(() => undefined);
    await settled(result);
    await vi.waitFor(() => expect(result.error.value?.message).toBe('evaluation failed'));

    expect(result.value.value).toBe(5);
    expect(result.flag.value).toBeNull();
  });
});

describe('refresh', () => {
  it('picks up changed rules and keeps the last value on screen while it does', async () => {
    const api = installFakeApi([flag('promo', 'v1')]);

    const { result, plugin } = mountComposable(() => useFlag('promo', 'none'));
    await settled(result);
    expect(result.value.value).toBe('v1');

    api.setFlags([flag('promo', 'v2')]);
    const refreshing = result.refresh();
    expect(result.isLoading.value).toBe(false);
    expect(result.value.value).toBe('v1');
    await refreshing;

    await vi.waitFor(() => expect(result.value.value).toBe('v2'));
    expect(result.isLoading.value).toBe(false);
    expect(plugin.runtime.revision.value).toBe(1);
    expect(api.rulesLoads()).toHaveLength(2);
  });

  it('re-evaluates every mounted composable, not just the one that asked', async () => {
    const api = installFakeApi([flag('a', 1), flag('b', 10)]);

    const { result } = mountComposable(() => ({ a: useFlag('a', 0), b: useFlag('b', 0) }));
    await settled(result.a, result.b);

    api.setFlags([flag('a', 2), flag('b', 20)]);
    await result.a.refresh();

    await vi.waitFor(() => expect(result.b.value.value).toBe(20));
    expect(result.a.value.value).toBe(2);
  });
});

describe('reactive keys and context', () => {
  const rules = [
    { clauses: [{ attribute: 'plan', operator: 'equal', value: 'pro' }], value: true },
  ];

  function user(id: string, plan: string): Context {
    const context = Context.single('user', id);
    context.addAttribute(new Attribute('plan', [plan]));
    return context;
  }

  it('shows nothing for the old key while a new key loads', async () => {
    installFakeApi([flag('first', 'one'), flag('second', 'two')]);
    const key = ref('first');

    const { result } = mountComposable(() => useFlag(key, 'default'));
    await settled(result);
    expect(result.value.value).toBe('one');

    key.value = 'second';
    await nextTick();

    expect(result.key.value).toBe('second');
    expect(result.isLoading.value).toBe(true);
    expect(result.value.value).toBe('default');

    await settled(result);
    expect(result.value.value).toBe('two');
  });

  it('accepts a getter for the key', async () => {
    installFakeApi([flag('first', 'one'), flag('second', 'two')]);
    const key = ref('first');

    const { result } = mountComposable(() => useFlag(() => key.value, 'default'));
    await settled(result);
    key.value = 'second';

    await vi.waitFor(() => expect(result.value.value).toBe('two'));
  });

  it('ignores a slow answer for a key that has been replaced', async () => {
    installFakeApi([flag('first', 'one'), flag('second', 'two')]);
    const key = ref('first');

    const { result, plugin } = mountComposable(() => useFlag(key, 'default'));
    await settled(result);

    const single = plugin.runtime.manager.single.bind(plugin.runtime.manager);
    let releaseFirst: () => void = () => undefined;
    vi.spyOn(plugin.runtime.manager, 'single').mockImplementation(async (name, fallback) => {
      if (name === 'first') {
        await new Promise<void>((resolve) => (releaseFirst = resolve));
      }
      return single(name, fallback);
    });

    key.value = 'first';
    key.value = 'second';
    await flushPromises();
    releaseFirst();

    await vi.waitFor(() => expect(result.value.value).toBe('two'));
  });

  it('re-evaluates when the plugin context changes, and never shows the old answer for the new one', async () => {
    installFakeApi([flag('beta', false, rules)]);
    const context = ref<Context | undefined>(user('u-1', 'pro'));

    const { result, plugin } = mountComposable(() => useFlag('beta', false), { context });
    await settled(result);
    expect(result.value.value).toBe(true);

    context.value = user('u-2', 'free');
    await nextTick();

    expect(plugin.runtime.isLoading.value).toBe(true);
    expect(result.isLoading.value).toBe(true);
    expect(result.value.value).toBe(false);

    await settled(result);
    expect(result.value.value).toBe(false);
    expect(result.flag.value).not.toBeNull();
  });

  it('does not restart loading for an equal context built again', async () => {
    const api = installFakeApi([flag('beta', false, rules)]);
    const context = ref<Context | undefined>(user('u-1', 'pro'));

    const { result, plugin } = mountComposable(() => useFlag('beta', false), { context });
    await settled(result);
    const manager = plugin.runtime.manager;

    context.value = user('u-1', 'pro');
    await nextTick();

    expect(plugin.runtime.manager).toBe(manager);
    expect(result.isLoading.value).toBe(false);
    expect(api.rulesLoads()).toHaveLength(1);
  });

  it('follows a context getter and reactive defaults', async () => {
    installFakeApi([]);
    const plan = ref('free');
    const defaults = ref(DefaultsCollection.fromObject({ answer: 'one' }));

    const { plugin } = mountComposable(() => undefined, {
      context: () => user('u-1', plan.value),
      defaults,
    });
    await plugin.runtime.whenReady();
    expect((await plugin.runtime.manager.single('answer')).asString()).toBe('one');

    defaults.value = DefaultsCollection.fromObject({ answer: 'two' });
    await nextTick();
    expect((await plugin.runtime.manager.single('answer')).asString()).toBe('two');

    const before = plugin.runtime.manager;
    plan.value = 'pro';
    await nextTick();
    expect(plugin.runtime.manager).not.toBe(before);
    expect(plugin.runtime.context?.getAttributes().map((attribute) => attribute.getKey())).toEqual([
      'plan',
    ]);
  });

  it('stops watching the context when the app unmounts', async () => {
    installFakeApi([]);
    const context = ref<Context | undefined>(user('u-1', 'pro'));

    const { wrapper, plugin } = mountComposable(() => undefined, { context });
    await plugin.runtime.whenReady();
    const manager = plugin.runtime.manager;

    wrapper.unmount();
    context.value = user('u-2', 'free');
    await nextTick();

    expect(plugin.runtime.manager).toBe(manager);
  });
});

describe('without a plugin', () => {
  it('useZenmanage explains how to install it', () => {
    const probe = defineComponent({
      setup() {
        useZenmanage();
        return () => h('div');
      },
    });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(() => mount(probe)).toThrow('app.use(createZenmanagePlugin(...))');
  });
});

describe('the runtime', () => {
  it('is available through useZenmanage and as $zenmanage', async () => {
    installFakeApi([flag('a', true)]);

    const { result, wrapper, plugin } = mountComposable(() => useZenmanage());

    expect(result).toBe(plugin.runtime);
    expect(wrapper.vm.$zenmanage).toBe(plugin.runtime);
    await plugin.runtime.whenReady();
    expect(plugin.runtime.isReady.value).toBe(true);
  });

  it('works outside a component when the plugin is provided to the app', async () => {
    installFakeApi([flag('a', true)]);
    const plugin = createZenmanagePlugin({
      environmentToken: CLIENT_KEY,
      enableUsageReporting: false,
    });
    const app = createApp({ render: () => null });
    app.use(plugin);

    const flagResult = app.runWithContext(() => useFlag('a', false));
    await settled(flagResult);

    expect(flagResult.value.value).toBe(true);
  });
});
