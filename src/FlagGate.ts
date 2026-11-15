import { defineComponent } from 'vue';
import { useFlag } from './composables';

/**
 * Renders its default slot while the flag is on. Slots:
 *
 * - `default`: the flag is on (or off, with `invert`)
 * - `disabled`: the flag is off
 * - `loading`: the flag hasn't resolved yet
 */
export const FlagGate = defineComponent({
  name: 'FlagGate',
  props: {
    flagKey: { type: String, required: true },
    defaultValue: { type: Boolean, default: false },
    invert: { type: Boolean, default: false },
  },
  setup(props, { slots }) {
    const { value, isLoading } = useFlag<boolean>(() => props.flagKey, props.defaultValue);

    return () => {
      if (isLoading.value) {
        return slots.loading ? slots.loading() : null;
      }

      const enabled = props.invert ? !value.value : value.value;

      if (!enabled) {
        return slots.disabled ? slots.disabled() : null;
      }

      return slots.default ? slots.default() : null;
    };
  },
});
