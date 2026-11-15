import { createZenmanagePlugin } from '@zenmanage/vue';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { describe, expect, it } from 'vitest';
import { fakeApi } from '../src/api';
import { SmokeApp } from '../src/App';

describe('server rendering, from the packed package', () => {
  it('renders the evaluated values into the HTML and hands the page flags to the browser', async () => {
    fakeApi();
    const plugin = createZenmanagePlugin({
      environmentToken: 'srv_smoke_server_key',
      enableUsageReporting: false,
    });
    const app = createSSRApp(SmokeApp);
    app.use(plugin);

    const html = await renderToString(app);
    const payload = await plugin.runtime.getBootstrapPayload();

    expect(html).toContain('New checkout (one-page)');
    expect(html).toContain('API timeout: 2500');
    expect(html).toContain('Gate open');
    expect(payload.flags).toEqual({
      'new-checkout': true,
      'checkout-flow': 'one-page',
      'api-timeout-ms': 2500,
      'ui-config': { theme: 'dark', pageSize: 50 },
    });
  });
});
