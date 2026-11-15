import { defineComponent, h } from 'vue';
import {
  createZenmanagePlugin,
  useBooleanFlag,
  useConfig,
  useVariant,
  type ZenmanagePlugin,
} from '@zenmanage/vue';

interface MockFlag {
  asBool: () => boolean;
  asString: () => string;
  asNumber: () => number;
}

interface MockFlagManager {
  withContext: (_context: unknown) => MockFlagManager;
  withDefaults: (_defaults: unknown) => MockFlagManager;
  single: (key: string, defaultValue?: boolean | string | number) => Promise<MockFlag>;
  all: () => Promise<MockFlag[]>;
  refreshRules: () => Promise<void>;
}

interface MockClient {
  flags: () => MockFlagManager;
}

const manager: MockFlagManager = {
  withContext() {
    return this;
  },
  withDefaults() {
    return this;
  },
  async single(key, defaultValue = false) {
    if (key === 'checkout-v2') {
      return {
        asBool: () => true,
        asString: () => 'true',
        asNumber: () => 1,
      };
    }

    if (key === 'checkout-variant') {
      return {
        asBool: () => true,
        asString: () => 'one-page',
        asNumber: () => 0,
      };
    }

    if (key === 'api-timeout-ms') {
      return {
        asBool: () => true,
        asString: () => '2500',
        asNumber: () => 2500,
      };
    }

    if (typeof defaultValue === 'boolean') {
      return {
        asBool: () => defaultValue,
        asString: () => String(defaultValue),
        asNumber: () => Number(defaultValue),
      };
    }

    if (typeof defaultValue === 'number') {
      return {
        asBool: () => Boolean(defaultValue),
        asString: () => String(defaultValue),
        asNumber: () => defaultValue,
      };
    }

    return {
      asBool: () => Boolean(defaultValue),
      asString: () => String(defaultValue),
      asNumber: () => 0,
    };
  },
  async all() {
    return [];
  },
  async refreshRules() {
    return;
  },
};

const client: MockClient = {
  flags: () => manager,
};

export const SmokeApp = defineComponent({
  name: 'SmokeApp',
  setup() {
    const checkoutEnabled = useBooleanFlag('checkout-v2', false);
    const variant = useVariant('checkout-variant', 'control');
    const timeout = useConfig('api-timeout-ms', 1000);

    return () => {
      if (checkoutEnabled.isLoading.value || variant.isLoading.value || timeout.isLoading.value) {
        return h('div', 'Loading...');
      }

      return h('div', [
        h(
          'div',
          checkoutEnabled.value.value
            ? `New checkout (${variant.variant.value})`
            : 'Classic checkout'
        ),
        h('div', `API timeout: ${timeout.value.value}`),
      ]);
    };
  },
});

export function createSmokePlugin(): ZenmanagePlugin {
  return createZenmanagePlugin({
    client: client as never,
    preload: false,
  });
}
