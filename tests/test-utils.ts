import type { App, Plugin } from 'vue';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import type { ZenmanagePluginOptions } from '../src/types';
import { createZenmanagePlugin } from '../src/plugin';

type FlagPrimitive = boolean | string | number;

export interface MockFlag {
  asBool: () => boolean;
  asString: () => string;
  asNumber: () => number;
  getValue: () => FlagPrimitive;
}

export interface MockManager {
  withContext: ReturnType<typeof vi.fn>;
  withDefaults: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  all: ReturnType<typeof vi.fn>;
  refreshRules: ReturnType<typeof vi.fn>;
}

export interface MockClient {
  flags: ReturnType<typeof vi.fn>;
}

export function createMockFlag(value: FlagPrimitive): MockFlag {
  return {
    asBool: () => Boolean(value),
    asString: () => String(value),
    asNumber: () => Number(value),
    getValue: () => value,
  };
}

export function createMockManager(seed: Record<string, FlagPrimitive> = {}): MockManager {
  const single = vi.fn(async (key: string, defaultValue?: FlagPrimitive) => {
    if (Object.prototype.hasOwnProperty.call(seed, key)) {
      return createMockFlag(seed[key]);
    }

    if (defaultValue !== undefined) {
      return createMockFlag(defaultValue);
    }

    throw new Error(`Flag not found: ${key}`);
  });

  const manager: MockManager = {
    withContext: vi.fn(),
    withDefaults: vi.fn(),
    single,
    all: vi.fn(async () => Object.keys(seed).map((key) => createMockFlag(seed[key]))),
    refreshRules: vi.fn(async () => undefined),
  };

  manager.withContext.mockReturnValue(manager);
  manager.withDefaults.mockReturnValue(manager);

  return manager;
}

export function createMockClient(manager: MockManager): MockClient {
  return {
    flags: vi.fn(() => manager),
  };
}

export function mountWithPlugin(component: ReturnType<typeof defineComponent>, client: MockClient) {
  const plugin = createZenmanagePlugin({
    client: client as never,
    preload: false,
  });

  return mount(component, {
    global: {
      plugins: [plugin as unknown as Plugin],
    },
  });
}

export function mountWithOptions(
  component: ReturnType<typeof defineComponent>,
  options: ZenmanagePluginOptions
) {
  const plugin = createZenmanagePlugin(options);

  return mount(component, {
    global: {
      plugins: [plugin as unknown as Plugin],
    },
  });
}

export function probeComponent(renderText: () => string) {
  return defineComponent({
    name: 'ProbeComponent',
    setup() {
      return () => h('div', { 'data-testid': 'probe' }, renderText());
    },
  });
}

export async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

export function appInstallingPlugin(plugin: Plugin): App {
  const app = {
    provide: vi.fn(),
    config: { globalProperties: {} },
    use: vi.fn(),
  } as unknown as App;

  (plugin as { install: (app: App) => void }).install(app);

  return app;
}
