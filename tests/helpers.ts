import { defineComponent, h } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createZenmanagePlugin } from '../src/plugin';
import type { ZenmanagePlugin, ZenmanagePluginOptions } from '../src/types';

export const CLIENT_KEY = 'cli_test_client_key';

export interface Mounted<T> {
  wrapper: VueWrapper;
  plugin: ZenmanagePlugin;
  result: T;
}

/** Mounts a component whose `setup` runs `setup()`, under a plugin that talks to the fake API. */
export function mountComposable<T>(
  setup: () => T,
  options: Partial<ZenmanagePluginOptions> = {}
): Mounted<T> {
  const plugin = createZenmanagePlugin({
    environmentToken: CLIENT_KEY,
    enableUsageReporting: false,
    ...options,
  });
  let result: T | undefined;

  const Probe = defineComponent({
    setup() {
      result = setup();
      return () => h('div');
    },
  });

  const wrapper = mount(Probe, { global: { plugins: [plugin] } });

  return { wrapper, plugin, result: result as T };
}

export function mountComponent(
  component: ReturnType<typeof defineComponent>,
  options: Partial<ZenmanagePluginOptions> = {}
): { wrapper: VueWrapper; plugin: ZenmanagePlugin } {
  const plugin = createZenmanagePlugin({
    environmentToken: CLIENT_KEY,
    enableUsageReporting: false,
    ...options,
  });

  return { wrapper: mount(component, { global: { plugins: [plugin] } }), plugin };
}

/** Resolves once every composable in `states` has a value. */
export async function settled(...states: Array<{ isLoading: { value: boolean } }>): Promise<void> {
  await vi.waitFor(() => expect(states.every((state) => !state.isLoading.value)).toBe(true));
}
