import { defineComponent, h, nextTick } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { useBooleanFlag, useConfig, useFlag, useVariant, useZenmanage } from '../src/composables';
import { createMockClient, createMockManager, flushPromises, mountWithPlugin } from './test-utils';

describe('composables', () => {
  it('useFlag resolves a boolean value', async () => {
    const manager = createMockManager({ 'new-checkout': true });
    const client = createMockClient(manager);
    const sink: { value?: boolean; loading?: boolean; error?: string | null } = {};

    const component = defineComponent({
      setup() {
        const result = useFlag('new-checkout', false);

        return () => {
          sink.value = result.value.value;
          sink.loading = result.isLoading.value;
          sink.error = result.error.value?.message ?? null;
          return h('div', 'ok');
        };
      },
    });

    mountWithPlugin(component, client);

    await flushPromises();
    await nextTick();

    expect(sink.value).toBe(true);
    expect(sink.loading).toBe(false);
    expect(sink.error).toBeNull();
    expect(manager.single).toHaveBeenCalledWith('new-checkout', false);
  });

  it('useFlag falls back to default when loading fails', async () => {
    const manager = createMockManager();
    manager.single = vi.fn(async () => {
      throw new Error('boom');
    });
    const client = createMockClient(manager);
    const sink: { value?: boolean; error?: string | null } = {};

    const component = defineComponent({
      setup() {
        const result = useFlag('missing-flag', true);

        return () => {
          sink.value = result.value.value;
          sink.error = result.error.value?.message ?? null;
          return h('div', 'ok');
        };
      },
    });

    mountWithPlugin(component, client);

    await flushPromises();
    await nextTick();

    expect(sink.value).toBe(true);
    expect(sink.error).toBe('boom');
  });

  it('useVariant and useConfig return typed values', async () => {
    const manager = createMockManager({
      variant: 'one-page',
      'api-timeout': 2500,
    });
    const client = createMockClient(manager);
    const sink: { variant?: string; timeout?: number } = {};

    const component = defineComponent({
      setup() {
        const variant = useVariant('variant', 'control');
        const config = useConfig('api-timeout', 1000);

        return () => {
          sink.variant = variant.variant.value;
          sink.timeout = config.value.value;
          return h('div', 'ok');
        };
      },
    });

    mountWithPlugin(component, client);

    await flushPromises();
    await nextTick();

    expect(sink.variant).toBe('one-page');
    expect(sink.timeout).toBe(2500);
  });

  it('useBooleanFlag always resolves to boolean output', async () => {
    const manager = createMockManager({ 'new-nav': 1 });
    const client = createMockClient(manager);
    const sink: { enabled?: boolean } = {};

    const component = defineComponent({
      setup() {
        const result = useBooleanFlag('new-nav', false);

        return () => {
          sink.enabled = result.value.value;
          return h('div', 'ok');
        };
      },
    });

    mountWithPlugin(component, client);

    await flushPromises();
    await nextTick();

    expect(sink.enabled).toBe(true);
  });

  it('supports manual refresh from useFlag', async () => {
    const manager = createMockManager({ 'new-checkout': false });
    const client = createMockClient(manager);
    const sink: { value?: boolean; refresh?: () => Promise<void> } = {};

    const component = defineComponent({
      setup() {
        const result = useFlag('new-checkout', false);

        return () => {
          sink.value = result.value.value;
          sink.refresh = result.refresh;
          return h('div', 'ok');
        };
      },
    });

    mountWithPlugin(component, client);
    await flushPromises();

    expect(sink.value).toBe(false);

    manager.single.mockResolvedValueOnce({
      asBool: () => true,
      asString: () => 'true',
      asNumber: () => 1,
      getValue: () => true,
    });

    await sink.refresh?.();
    await flushPromises();

    expect(sink.value).toBe(true);
  });

  it('useZenmanage throws when used outside plugin installation', () => {
    const component = defineComponent({
      setup() {
        useZenmanage();
        return () => h('div', 'nope');
      },
    });

    expect(() => mount(component)).toThrow(
      'Zenmanage Vue composables must be used after app.use(createZenmanagePlugin(...)).'
    );
  });
});
