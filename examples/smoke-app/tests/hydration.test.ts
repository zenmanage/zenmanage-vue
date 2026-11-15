// @vitest-environment jsdom
import { Zenmanage } from '@zenmanage/sdk';
import { buildBootstrapPayload, buildBootstrapScript, createZenmanagePlugin } from '@zenmanage/vue';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { describe, expect, it, vi } from 'vitest';
import { FLAGS, fakeApi } from '../src/api';
import { SmokeApp } from '../src/App';

describe('hydration, from the packed package', () => {
  it('hydrates server markup without a mismatch, starting from the page payload', async () => {
    fakeApi();

    // @zenmanage/sdk refuses a server key in a browser-like environment, so the server's client
    // is assembled by hand here, as it would be in Node.
    const serverApp = createSSRApp(SmokeApp);
    serverApp.use(
      createZenmanagePlugin({
        client: new Zenmanage({
          environmentToken: 'srv_smoke_server_key',
          enableUsageReporting: false,
        }),
      })
    );
    const html = await renderToString(serverApp);
    expect(html).toContain('New checkout (one-page)');

    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);
    document.body.insertAdjacentHTML(
      'beforeend',
      buildBootstrapScript(buildBootstrapPayload(FLAGS as never))
    );

    const warnings: string[] = [];
    vi.spyOn(console, 'warn').mockImplementation((...args) => {
      warnings.push(args.map(String).join(' '));
    });

    const app = createSSRApp(SmokeApp);
    app.use(
      createZenmanagePlugin({
        environmentToken: 'cli_smoke_client_key',
        enableUsageReporting: false,
      })
    );
    app.mount(container);

    expect(warnings).toEqual([]);
    expect(container.textContent).toContain('New checkout (one-page)');
  });
});
