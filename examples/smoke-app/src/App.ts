import { defineComponent, h } from 'vue';
import { FlagGate, useBooleanFlag, useConfig, useFlag, useVariant } from '@zenmanage/vue';

export const SmokeApp = defineComponent({
  name: 'SmokeApp',
  setup() {
    const checkout = useBooleanFlag('new-checkout', false);
    const variant = useVariant('checkout-flow', 'control');
    const timeout = useConfig('api-timeout-ms', 1000);
    const ui = useFlag('ui-config', { theme: 'light', pageSize: 20 });

    return () => {
      if (checkout.isLoading.value || variant.isLoading.value || timeout.isLoading.value) {
        return h('div', 'Loading...');
      }

      return h('div', [
        h(
          'p',
          { id: 'checkout' },
          checkout.value.value ? `New checkout (${variant.variant.value})` : 'Classic checkout'
        ),
        h('p', { id: 'timeout' }, `API timeout: ${timeout.value.value}`),
        h('p', { id: 'ui' }, `Theme: ${ui.value.value.theme}`),
        h(
          FlagGate,
          { flagKey: 'new-checkout' },
          {
            default: () => h('p', { id: 'gate' }, 'Gate open'),
            disabled: () => h('p', 'Gate closed'),
          }
        ),
      ]);
    };
  },
});
