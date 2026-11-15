import { createApp, defineComponent, h } from 'vue';
import { createZenmanagePlugin, useVariant } from '@zenmanage/vue';

const App = defineComponent({
  setup() {
    const checkoutFlow = useVariant('checkout-flow', 'control');

    return () =>
      h(
        'div',
        checkoutFlow.variant.value === 'one-page' ? 'One Page Checkout' : 'Multi Page Checkout'
      );
  },
});

const app = createApp(App);
app.use(createZenmanagePlugin({ environmentToken: 'cli_your_client_key_here' }));
app.mount('#app');
