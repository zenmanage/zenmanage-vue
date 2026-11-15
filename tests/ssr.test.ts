import { Attribute, Context } from '@zenmanage/sdk';
import { createSSRApp, defineComponent, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { describe, expect, it } from 'vitest';
import { buildBootstrapScript } from '../src/bootstrap';
import { createZenmanagePlugin } from '../src/plugin';
import { FlagOutput, VariantOutput } from './components';
import { flag, installFakeApi } from './fakeApi';

const SERVER_KEY = 'srv_test_server_key';

interface Rendered {
  html: string;
  runtime: ReturnType<typeof createZenmanagePlugin>['runtime'];
}

async function render(
  children: () => unknown[],
  options: Partial<Parameters<typeof createZenmanagePlugin>[0]> = {}
): Promise<Rendered> {
  const plugin = createZenmanagePlugin({
    environmentToken: SERVER_KEY,
    enableUsageReporting: false,
    ...options,
  });
  const app = createSSRApp(defineComponent({ render: () => h('div', children() as never[]) }));
  app.use(plugin);

  return { html: await renderToString(app), runtime: plugin.runtime };
}

describe('server rendering', () => {
  it('renders the real values, for every value type, as ready', async () => {
    installFakeApi([
      flag('new-checkout', true),
      flag('limit', 7),
      flag('theme', { color: 'teal' }),
      flag('variant', 'b'),
    ]);

    const { html } = await render(() => [
      h(FlagOutput, { flagKey: 'new-checkout', fallback: false, id: 'bool' }),
      h(FlagOutput, { flagKey: 'limit', fallback: 0, id: 'num' }),
      h(FlagOutput, { flagKey: 'theme', fallback: { color: 'plain' }, id: 'json' }),
      h(VariantOutput, { flagKey: 'variant', fallback: 'control' }),
    ]);

    expect(html).toContain('<p id="bool">true|ready</p>');
    expect(html).toContain('<p id="num">7|ready</p>');
    expect(html).toContain('<p id="json">{&quot;color&quot;:&quot;teal&quot;}|ready</p>');
    expect(html).toContain('<p id="variant">b|ready</p>');
  });

  it('renders the default for a flag that does not exist', async () => {
    installFakeApi([]);

    const { html } = await render(() => [h(FlagOutput, { flagKey: 'absent', fallback: 'x' })]);

    expect(html).toContain('<p id="out">x|ready</p>');
  });

  it('renders defaults when the API is unreachable', async () => {
    installFakeApi([flag('a', true)]).goOffline();

    const { html } = await render(() => [h(FlagOutput, { flagKey: 'a', fallback: false })]);

    expect(html).toContain('<p id="out">false|ready</p>');
  });

  it('evaluates for the request context', async () => {
    installFakeApi([
      flag('beta', false, [
        { clauses: [{ attribute: 'plan', operator: 'equal', value: 'pro' }], value: true },
      ]),
    ]);
    const pro = Context.single('user', 'u-1');
    pro.addAttribute(new Attribute('plan', ['pro']));

    const forPro = await render(() => [h(FlagOutput, { flagKey: 'beta', fallback: false })], {
      context: pro,
    });
    const anonymous = await render(() => [h(FlagOutput, { flagKey: 'beta', fallback: false })]);

    expect(forPro.html).toContain('true|ready');
    expect(anonymous.html).toContain('false|ready');
  });

  it('shares one client, and so one rules fetch, between requests', async () => {
    const api = installFakeApi([flag('a', true)]);
    const output = () => [h(FlagOutput, { flagKey: 'a', fallback: false })];

    await render(output);
    await render(output);
    await render(output);

    expect(api.rulesLoads()).toHaveLength(1);
  });

  it('refuses a client key, which @zenmanage/sdk itself refuses in Node.js', () => {
    expect(() => createZenmanagePlugin({ environmentToken: 'cli_test_client_key' })).toThrow(
      'Invalid environment token for Node.js runtime'
    );
  });

  it('identifies as zenmanage-vue', async () => {
    const api = installFakeApi([flag('a', true)]);

    await render(() => [h(FlagOutput, { flagKey: 'a', fallback: false })]);

    expect(api.rulesLoads()[0].headers['X-ZEN-CLIENT-AGENT']).toMatch(/^zenmanage-vue\/\d/);
  });
});

describe('the payload for the browser', () => {
  it('holds the flags the page read, and nothing else', async () => {
    installFakeApi([flag('shown', true), flag('internal-kill-switch', true)]);

    const { runtime } = await render(() => [h(FlagOutput, { flagKey: 'shown', fallback: false })]);
    const payload = await runtime.getBootstrapPayload();

    expect(payload.flags).toEqual({ shown: true });
    expect(payload.context).toBeUndefined();
  });

  it('includes a flag the environment does not have, so the browser starts from what was shown', async () => {
    installFakeApi([flag('real', true)]);

    const { runtime } = await render(() => [
      h(FlagOutput, { flagKey: 'real', fallback: false, id: 'a' }),
      h(FlagOutput, { flagKey: 'absent', fallback: 'x', id: 'b' }),
    ]);

    expect((await runtime.getBootstrapPayload()).flags).toEqual({ real: true, absent: 'x' });
  });

  it('holds the value as the page read it, in the type the composable asked for', async () => {
    installFakeApi([flag('on', true)]);

    const { runtime } = await render(() => [h(FlagOutput, { flagKey: 'on', fallback: 'off' })]);

    expect((await runtime.getBootstrapPayload()).flags).toEqual({ on: 'true' });
  });

  it('still describes the page when the rules could not be loaded', async () => {
    installFakeApi([flag('a', true)]).goOffline();

    const { runtime } = await render(() => [h(FlagOutput, { flagKey: 'a', fallback: false })]);

    expect((await runtime.getBootstrapPayload()).flags).toEqual({ a: false });
  });

  it('holds the value the server evaluated, not the default the page asked with', async () => {
    installFakeApi([flag('limit', 7)]);

    const { runtime } = await render(() => [h(FlagOutput, { flagKey: 'limit', fallback: 0 })]);

    expect((await runtime.getBootstrapPayload()).flags).toEqual({ limit: 7 });
  });

  it('can be limited to named flags, from the whole environment', async () => {
    installFakeApi([flag('a', true), flag('b', 'x'), flag('c', 3)]);

    const { runtime } = await render(() => []);
    const payload = await runtime.getBootstrapPayload({ keys: ['a', 'c', 'not-a-flag'] });

    expect(payload.flags).toEqual({ a: true, c: 3 });
  });

  it('carries the context only when asked', async () => {
    installFakeApi([flag('a', true)]);
    const context = Context.single('user', 'u-1', 'Jane');

    const { runtime } = await render(() => [h(FlagOutput, { flagKey: 'a', fallback: false })], {
      context,
    });

    expect((await runtime.getBootstrapPayload()).context).toBeUndefined();
    expect((await runtime.getBootstrapPayload({ includeContext: true })).context).toMatchObject({
      identifier: 'u-1',
    });
  });

  it('serializes into a script tag that is safe to embed', async () => {
    installFakeApi([flag('evil', '</script><script>alert(1)</script>')]);

    const { runtime } = await render(() => [h(FlagOutput, { flagKey: 'evil', fallback: '' })]);
    const script = buildBootstrapScript(await runtime.getBootstrapPayload());

    expect(script.match(/<\/script>/g)).toHaveLength(1);
    expect(script).not.toContain('<script>alert');
  });

  it('is empty for a page that read no flags', async () => {
    installFakeApi([flag('a', true)]);

    const { runtime } = await render(() => []);

    expect((await runtime.getBootstrapPayload()).flags).toEqual({});
  });
});
