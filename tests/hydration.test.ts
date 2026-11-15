// @vitest-environment jsdom
import { Context, Zenmanage } from '@zenmanage/sdk';
import { createApp, createSSRApp, defineComponent, h, nextTick, ref } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { describe, expect, it, vi } from 'vitest';
import { buildBootstrapPayload, buildBootstrapScript } from '../src/bootstrap';
import { createZenmanagePlugin } from '../src/plugin';
import { FlagOutput } from './components';
import { flag, installFakeApi } from './fakeApi';
import { CLIENT_KEY } from './helpers';

const Page = defineComponent({
  render: () => [
    h(FlagOutput, { flagKey: 'new-checkout', fallback: false, id: 'a' }),
    h(FlagOutput, { flagKey: 'limit', fallback: 0, id: 'b' }),
  ],
});

/**
 * Renders the page as a server would. `@zenmanage/sdk` refuses a server key in a browser-like
 * environment, so the server's client is assembled by hand, as it would be in Node.
 */
async function serverHtml(): Promise<string> {
  const client = new Zenmanage({
    environmentToken: 'srv_test_server_key',
    enableUsageReporting: false,
  });
  const app = createSSRApp(Page);
  app.use(createZenmanagePlugin({ client }));
  return renderToString(app);
}

/** Hydrates server markup and returns every Vue warning raised while doing so. */
async function hydrate(
  html: string,
  options: Parameters<typeof createZenmanagePlugin>[0]
): Promise<string[]> {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);

  const warnings: string[] = [];
  vi.spyOn(console, 'warn').mockImplementation((...args) => {
    warnings.push(args.map(String).join(' '));
  });

  const app = createSSRApp(Page);
  app.use(createZenmanagePlugin({ enableUsageReporting: false, ...options }));
  app.mount(container);
  await nextTick();

  return warnings;
}

const text = (id: string): string | null | undefined => document.getElementById(id)?.textContent;

describe('hydration', () => {
  it('matches the server markup when the browser starts from the server payload', async () => {
    installFakeApi([flag('new-checkout', true), flag('limit', 7)]);
    const html = await serverHtml();
    expect(html).toContain('true|ready');

    const warnings = await hydrate(html, {
      environmentToken: CLIENT_KEY,
      bootstrap: buildBootstrapPayload({ 'new-checkout': true, limit: 7 }),
    });

    expect(warnings).toEqual([]);
    expect(text('a')).toBe('true|ready');
    await vi.waitFor(() => expect(text('b')).toBe('7|ready'));
  });

  it('hydrates cleanly, then takes the live value when it differs from the server one', async () => {
    const api = installFakeApi([flag('new-checkout', true), flag('limit', 7)]);
    const html = await serverHtml();
    api.setFlags([flag('new-checkout', false), flag('limit', 7)]);

    const warnings = await hydrate(html, {
      environmentToken: CLIENT_KEY,
      bootstrap: buildBootstrapPayload({ 'new-checkout': true, limit: 7 }),
    });

    expect(warnings).toEqual([]);
    expect(text('a')).toBe('true|ready');
    await vi.waitFor(() => expect(text('a')).toBe('false|ready'));
  });

  it('keeps the server value when the browser cannot reach the API', async () => {
    const api = installFakeApi([flag('new-checkout', true), flag('limit', 7)]);
    const html = await serverHtml();
    api.goOffline();

    const warnings = await hydrate(html, {
      environmentToken: CLIENT_KEY,
      bootstrap: buildBootstrapPayload({ 'new-checkout': true, limit: 7 }),
    });
    await vi.waitFor(() => expect(text('b')).toBe('7|ready'));

    expect(warnings).toEqual([]);
    expect(text('a')).toBe('true|ready');
  });

  it('matches the server markup when the payload comes from a script tag', async () => {
    installFakeApi([flag('new-checkout', true), flag('limit', 7)]);
    const html = await serverHtml();
    document.body.insertAdjacentHTML(
      'beforeend',
      buildBootstrapScript(buildBootstrapPayload({ 'new-checkout': true, limit: 7 }))
    );

    const warnings = await hydrate(html, { environmentToken: CLIENT_KEY });

    expect(warnings).toEqual([]);
    expect(text('a')).toBe('true|ready');
  });

  it('warns about a mismatch without a payload, which is what the payload is for', async () => {
    installFakeApi([flag('new-checkout', true), flag('limit', 7)]);
    const html = await serverHtml();

    const warnings = await hydrate(html, { environmentToken: CLIENT_KEY });

    expect(warnings.some((warning) => warning.includes('Hydration'))).toBe(true);
  });

  it('ignores a bootstrapped value of a different type than the composable asks for', async () => {
    installFakeApi([flag('limit', 7)]);
    const container = document.createElement('div');
    document.body.appendChild(container);
    const app = createApp(
      defineComponent({
        render: () => h(FlagOutput, { flagKey: 'limit', fallback: 'none', id: 'c' }),
      })
    );
    app.use(
      createZenmanagePlugin({
        environmentToken: CLIENT_KEY,
        enableUsageReporting: false,
        bootstrap: buildBootstrapPayload({ limit: 7 }),
      })
    );

    app.mount(container);

    expect(text('c')).toBe('none|loading');
  });

  it('hydrates a flag the server answered from a default without a mismatch', async () => {
    installFakeApi([flag('new-checkout', true)]);
    const html = await serverHtml();
    expect(html).toContain('<p id="b">0|ready</p>');

    const warnings = await hydrate(html, {
      environmentToken: CLIENT_KEY,
      bootstrap: buildBootstrapPayload({ 'new-checkout': true, limit: 0 }),
    });

    expect(warnings).toEqual([]);
    await vi.waitFor(() => expect(text('b')).toBe('0|ready'));
  });

  it('hydrates cleanly when the server could not load the rules', async () => {
    installFakeApi([flag('new-checkout', true), flag('limit', 7)]).goOffline();
    const html = await serverHtml();
    expect(html).toContain('<p id="a">false|ready</p>');

    installFakeApi([flag('new-checkout', true), flag('limit', 7)]);
    const warnings = await hydrate(html, {
      environmentToken: CLIENT_KEY,
      bootstrap: buildBootstrapPayload({ 'new-checkout': false, limit: 0 }),
    });

    expect(warnings).toEqual([]);
    await vi.waitFor(() => expect(text('a')).toBe('true|ready'));
    expect(text('b')).toBe('7|ready');
  });

  it('stops showing the server values once the context changes', async () => {
    installFakeApi([flag('new-checkout', true), flag('limit', 7)]);
    const context = ref<Context | undefined>(undefined);
    const container = document.createElement('div');
    document.body.appendChild(container);
    const app = createApp(Page);
    app.use(
      createZenmanagePlugin({
        environmentToken: CLIENT_KEY,
        enableUsageReporting: false,
        bootstrap: buildBootstrapPayload({ 'new-checkout': false, limit: 1 }),
        context,
      })
    );
    app.mount(container);
    await vi.waitFor(() => expect(text('a')).toBe('true|ready'));

    context.value = Context.single('user', 'u-2');
    await nextTick();

    expect(text('a')).toBe('false|loading');
    await vi.waitFor(() => expect(text('a')).toBe('true|ready'));
  });
});
