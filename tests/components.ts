import type { FlagValue } from '@zenmanage/sdk';
import { defineComponent, h, type PropType } from 'vue';
import { useFlag, useVariant } from '../src/composables';

/** Renders `value|ready` or `value|loading` for a flag, so a test can read both states. */
export const FlagOutput = defineComponent({
  props: {
    flagKey: { type: String, required: true },
    fallback: {
      type: [Boolean, String, Number, Object, Array] as PropType<FlagValue>,
      required: true,
    },
    id: { type: String, default: 'out' },
  },
  setup(props) {
    const { value, isLoading } = useFlag(props.flagKey, props.fallback);

    return () => {
      const shown =
        typeof value.value === 'object' ? JSON.stringify(value.value) : String(value.value);
      return h('p', { id: props.id }, `${shown}|${isLoading.value ? 'loading' : 'ready'}`);
    };
  },
});

export const VariantOutput = defineComponent({
  props: {
    flagKey: { type: String, required: true },
    fallback: { type: String, required: true },
  },
  setup(props) {
    const { variant, isLoading } = useVariant(props.flagKey, props.fallback);

    return () =>
      h('p', { id: 'variant' }, `${variant.value}|${isLoading.value ? 'loading' : 'ready'}`);
  },
});
