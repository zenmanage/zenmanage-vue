// @vitest-environment jsdom
import { createZenmanagePlugin } from '@zenmanage/vue';
import { createApp } from 'vue';
import { describe, expect, it } from 'vitest';
import { fakeApi } from '../src/api';
import { SmokeApp } from '../src/App';

describe('client-side app, from the packed package', () => {
  it('renders every composable and FlagGate against the real SDK, as zenmanage-vue', async () => {
    const seen = fakeApi();

    const container = document.createElement('div');
    document.body.appendChild(container);
    const app = createApp(SmokeApp);
    app.use(
      createZenmanagePlugin({
        environmentToken: 'cli_smoke_client_key',
        enableUsageReporting: false,
      })
    );
    app.mount(container);
    expect(container.textContent).toContain('Loading...');

    await vi.waitFor(() => expect(container.textContent).toContain('New checkout (one-page)'));
    expect(container.textContent).toContain('API timeout: 2500');
    expect(container.textContent).toContain('Theme: dark');
    expect(container.textContent).toContain('Gate open');

    expect(seen.length).toBeGreaterThan(0);
    for (const request of seen.filter((entry) => entry.agent)) {
      expect(request.agent).toMatch(/^zenmanage-vue\/\d+\.\d+\.\d+/);
    }
  });
});
