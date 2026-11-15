import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { createSmokePlugin, SmokeApp } from '../src/App';

async function flushPromises(times = 3): Promise<void> {
  for (let index = 0; index < times; index += 1) {
    await Promise.resolve();
    await nextTick();
  }
}

describe('zenmanage-vue smoke app', () => {
  it('renders plugin + composable paths in a real package environment', async () => {
    const wrapper = mount(SmokeApp, {
      global: {
        plugins: [createSmokePlugin()],
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain('New checkout (one-page)');
    expect(wrapper.text()).toContain('API timeout: 2500');
  });
});
