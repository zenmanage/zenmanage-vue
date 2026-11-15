// @vitest-environment jsdom
import { defineComponent, h, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { FlagGate } from '../src/FlagGate';
import { flag, installFakeApi } from './fakeApi';
import { mountComponent } from './helpers';

function gate(props: Record<string, unknown>, extra: Record<string, () => unknown> = {}) {
  return defineComponent({
    render: () =>
      h(FlagGate, props, {
        default: () => h('span', 'on'),
        disabled: () => h('span', 'off'),
        loading: () => h('span', 'loading'),
        ...extra,
      }),
  });
}

describe('FlagGate', () => {
  it('shows the loading slot, then the default slot for an enabled flag', async () => {
    installFakeApi([flag('promo', true)]);

    const { wrapper } = mountComponent(gate({ flagKey: 'promo' }));
    expect(wrapper.text()).toBe('loading');

    await vi.waitFor(() => expect(wrapper.text()).toBe('on'));
  });

  it('shows the disabled slot for a disabled flag', async () => {
    installFakeApi([flag('promo', false)]);

    const { wrapper } = mountComponent(gate({ flagKey: 'promo' }));

    await vi.waitFor(() => expect(wrapper.text()).toBe('off'));
  });

  it('inverts the flag', async () => {
    installFakeApi([flag('promo', false)]);

    const { wrapper } = mountComponent(gate({ flagKey: 'promo', invert: true }));

    await vi.waitFor(() => expect(wrapper.text()).toBe('on'));
  });

  it('uses defaultValue for a flag that does not exist', async () => {
    installFakeApi([]);

    const enabled = mountComponent(gate({ flagKey: 'missing', defaultValue: true }));
    const disabled = mountComponent(gate({ flagKey: 'missing' }));

    await vi.waitFor(() => expect(enabled.wrapper.text()).toBe('on'));
    await vi.waitFor(() => expect(disabled.wrapper.text()).toBe('off'));
  });

  it('renders nothing for slots it was not given', async () => {
    installFakeApi([flag('on', true), flag('off', false)]);
    const bare = (flagKey: string) =>
      defineComponent({ render: () => h('div', [h(FlagGate, { flagKey })]) });

    const first = mountComponent(bare('on'));
    const second = mountComponent(bare('off'));
    await vi.waitFor(() => expect(first.plugin.runtime.isReady.value).toBe(true));
    await vi.waitFor(() => expect(second.plugin.runtime.isReady.value).toBe(true));

    expect(first.wrapper.text()).toBe('');
    expect(second.wrapper.text()).toBe('');
  });

  it('follows a changing flagKey', async () => {
    installFakeApi([flag('first', true), flag('second', false)]);
    const key = ref('first');
    const Parent = defineComponent({
      render: () =>
        h(FlagGate, { flagKey: key.value }, { default: () => 'on', disabled: () => 'off' }),
    });

    const { wrapper } = mountComponent(Parent);
    await vi.waitFor(() => expect(wrapper.text()).toBe('on'));

    key.value = 'second';

    await vi.waitFor(() => expect(wrapper.text()).toBe('off'));
  });

  it('keeps its content mounted while rules refresh', async () => {
    const api = installFakeApi([flag('promo', true)]);
    let mounts = 0;
    const Child = defineComponent({
      setup() {
        mounts += 1;
        return () => h('span', 'child');
      },
    });
    const Parent = defineComponent({
      render: () => h(FlagGate, { flagKey: 'promo' }, { default: () => h(Child) }),
    });

    const { wrapper, plugin } = mountComponent(Parent);
    await vi.waitFor(() => expect(wrapper.text()).toBe('child'));
    api.setFlags([flag('promo', true)]);
    await plugin.runtime.refresh();

    expect(wrapper.text()).toBe('child');
    expect(mounts).toBe(1);
  });
});
