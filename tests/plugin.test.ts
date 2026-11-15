// @vitest-environment jsdom
import { Context, DefaultsCollection, Zenmanage } from '@zenmanage/sdk';
import { createApp, nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { version } from '../package.json';
import { createZenmanagePlugin } from '../src/plugin';
import { buildBootstrapPayload } from '../src/bootstrap';
import { flag, installFakeApi } from './fakeApi';
import { CLIENT_KEY } from './helpers';

function installed(options: Parameters<typeof createZenmanagePlugin>[0]) {
  const plugin = createZenmanagePlugin({ enableUsageReporting: false, ...options });
  const app = createApp({ render: () => null });
  app.use(plugin);
  return { plugin, app, runtime: plugin.runtime };
}

describe('client agent', () => {
  it('identifies the package to the API as zenmanage-vue/<version>, not the base SDK', async () => {
    const api = installFakeApi([flag('a', true)]);

    const { runtime } = installed({ environmentToken: CLIENT_KEY, enableUsageReporting: true });
    await runtime.whenReady();
    await runtime.manager.single('a', false);

    await vi.waitFor(() => expect(api.usageReports()).toHaveLength(1));
    for (const request of [...api.rulesLoads(), ...api.usageReports()]) {
      expect(request.headers['X-ZEN-CLIENT-AGENT']).toBe(`zenmanage-vue/${version}`);
      expect(request.headers['X-ZEN-API-KEY']).toBe(CLIENT_KEY);
    }
  });
});

describe('creating the plugin', () => {
  it('needs a client or a token', () => {
    expect(() => createZenmanagePlugin({})).toThrow(
      'requires either a client or an environmentToken'
    );
  });

  it('passes the endpoint, TTL and logger on to the SDK', async () => {
    const api = installFakeApi([]);
    const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const { runtime } = installed({
      environmentToken: CLIENT_KEY,
      apiEndpoint: 'https://api.example.test',
      cacheTtl: 120,
      logger,
    });
    await runtime.whenReady();

    expect(api.rulesLoads()[0].url).toBe('https://api.example.test/v1/flag-json');
    expect(logger.info).toHaveBeenCalled();
  });

  it('uses the client it is given instead of building one', async () => {
    installFakeApi([flag('a', true)]);
    const client = new Zenmanage({
      environmentToken: CLIENT_KEY,
      enableUsageReporting: false,
    });

    const { runtime } = installed({ client });
    await runtime.whenReady();

    expect(runtime.client).toBe(client);
    expect((await runtime.manager.single('a')).asBool()).toBe(true);
  });

  it('refuses a server key in the browser, because the SDK does', () => {
    expect(() => createZenmanagePlugin({ environmentToken: 'srv_secret' })).toThrow(
      'server key provided'
    );
  });

  it('applies the context and defaults to the manager', async () => {
    installFakeApi([]);
    const context = Context.single('user', 'u-1');
    const defaults = DefaultsCollection.fromObject({ x: 'from-defaults' });

    const { runtime } = installed({ environmentToken: CLIENT_KEY, context, defaults });
    await runtime.whenReady();

    expect(runtime.context).toBe(context);
    expect(runtime.defaults?.get('x')).toBe('from-defaults');
    expect((await runtime.manager.single('x')).asString()).toBe('from-defaults');
  });
});

describe('preloading', () => {
  it('reports loading from the start, then ready', async () => {
    installFakeApi([flag('a', true)]);

    const { runtime } = installed({ environmentToken: CLIENT_KEY });

    expect(runtime.isLoading.value).toBe(true);
    expect(runtime.isReady.value).toBe(false);

    await runtime.whenReady();

    expect(runtime.isLoading.value).toBe(false);
    expect(runtime.isReady.value).toBe(true);
    expect(runtime.error.value).toBeNull();
  });

  it('is ready at once, and fetches nothing, when preload is off', async () => {
    const api = installFakeApi([flag('a', true)]);

    const { runtime } = installed({ environmentToken: CLIENT_KEY, preload: false });

    expect(runtime.isReady.value).toBe(true);
    expect(runtime.isLoading.value).toBe(false);
    await runtime.whenReady();
    expect(api.requests).toHaveLength(0);
  });

  it('records a failed load, calls onError, and still settles whenReady', async () => {
    installFakeApi([]);
    const onError = vi.fn();
    const client = new Zenmanage({ environmentToken: CLIENT_KEY });
    vi.spyOn(client.flags().constructor.prototype, 'all').mockRejectedValue(
      new Error('rules unavailable')
    );

    const { runtime } = installed({ client, onError });
    await expect(runtime.whenReady()).resolves.toBeUndefined();

    expect(runtime.error.value?.message).toBe('rules unavailable');
    expect(runtime.isReady.value).toBe(false);
    expect(runtime.isLoading.value).toBe(false);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'rules unavailable' }));
  });

  it('turns a thrown non-Error into an Error', async () => {
    installFakeApi([]);
    const client = new Zenmanage({ environmentToken: CLIENT_KEY });
    vi.spyOn(client.flags().constructor.prototype, 'all').mockRejectedValue('nope');

    const { runtime } = installed({ client });
    await runtime.whenReady();

    expect(runtime.error.value).toBeInstanceOf(Error);
    expect(runtime.error.value?.message).toBe('nope');
  });

  it('preload() loads again and rejects when the load fails', async () => {
    installFakeApi([flag('a', true)]);
    const { runtime } = installed({ environmentToken: CLIENT_KEY });
    await runtime.whenReady();

    await expect(runtime.preload()).resolves.toBeUndefined();

    vi.spyOn(runtime.manager, 'all').mockRejectedValue(new Error('down'));
    await expect(runtime.preload()).rejects.toThrow('down');
  });

  it('ignores the outcome of a load that a newer one replaced', async () => {
    installFakeApi([]);
    const { runtime } = installed({ environmentToken: CLIENT_KEY });
    await runtime.whenReady();
    let release: (value: never[]) => void = () => undefined;
    vi.spyOn(runtime.manager, 'all').mockImplementationOnce(
      () => new Promise<never[]>((resolve) => (release = resolve))
    );

    const stale = runtime.preload();
    const fresh = runtime.preload();
    await fresh;
    release([]);
    await stale;

    expect(runtime.isReady.value).toBe(true);
  });
});

describe('refresh()', () => {
  it('ignores a refresh that finishes after the manager was replaced', async () => {
    installFakeApi([flag('a', true)]);
    const context = ref<Context | undefined>(Context.single('user', 'u-1'));
    const { runtime } = installed({ environmentToken: CLIENT_KEY, context });
    await runtime.whenReady();
    let release: () => void = () => undefined;
    vi.spyOn(runtime.manager, 'refreshRules').mockImplementation(
      () => new Promise<void>((resolve) => (release = resolve))
    );
    const revision = runtime.revision.value;

    const refreshing = runtime.refresh();
    context.value = Context.single('user', 'u-2');
    await nextTick();
    release();
    await refreshing;

    expect(runtime.revision.value).toBe(revision);
  });
});

describe('the app', () => {
  it('provides the runtime and exposes it as $zenmanage', () => {
    installFakeApi([]);

    const { app, runtime } = installed({ environmentToken: CLIENT_KEY });

    expect(app.config.globalProperties.$zenmanage).toBe(runtime);
    expect(app.runWithContext(() => app._context.provides)).toBeDefined();
  });

  it('can be mounted and unmounted', () => {
    installFakeApi([]);
    const { app } = installed({ environmentToken: CLIENT_KEY });
    const target = document.createElement('div');

    app.mount(target);
    expect(() => app.unmount()).not.toThrow();
  });
});

describe('the bootstrap payload', () => {
  const payload = buildBootstrapPayload(
    { a: true },
    { context: Context.single('user', 'u-1', 'Jane') }
  );

  it('is taken from the bootstrap option, and gives the browser the server context', async () => {
    installFakeApi([]);

    const { runtime } = installed({ environmentToken: CLIENT_KEY, bootstrap: payload });
    await runtime.whenReady();

    expect(runtime.bootstrap).toBe(payload);
    expect(runtime.context?.getIdentifier()).toBe('u-1');
    expect(runtime.defaults?.get('a')).toBe(true);
  });

  it('prefers an explicit context over the one in the payload', async () => {
    installFakeApi([]);
    const context = Context.single('user', 'someone-else');

    const { runtime } = installed({ environmentToken: CLIENT_KEY, bootstrap: payload, context });

    expect(runtime.context).toBe(context);
  });

  it('is read from the page when the option is left out, and skipped with null', () => {
    installFakeApi([]);
    document.body.insertAdjacentHTML(
      'beforeend',
      '<script id="__ZENMANAGE_BOOTSTRAP__" type="application/json">{"version":1,"generatedAt":"x","flags":{"a":1}}</script>'
    );

    expect(installed({ environmentToken: CLIENT_KEY }).runtime.bootstrap?.flags).toEqual({ a: 1 });
    expect(
      installed({ environmentToken: CLIENT_KEY, bootstrap: null }).runtime.bootstrap
    ).toBeNull();
  });

  it('is read from a custom element id', () => {
    installFakeApi([]);
    document.body.insertAdjacentHTML(
      'beforeend',
      '<script id="custom-id" type="application/json">{"version":1,"generatedAt":"x","flags":{"b":2}}</script>'
    );

    expect(
      installed({ environmentToken: CLIENT_KEY, bootstrapElementId: 'custom-id' }).runtime.bootstrap
        ?.flags
    ).toEqual({ b: 2 });
  });
});
