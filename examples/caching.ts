import { createApp, defineComponent, h } from 'vue';
import { createZenmanagePlugin, useBooleanFlag } from '@zenmanage/vue';

const App = defineComponent({
  setup() {
    const enabled = useBooleanFlag('new-checkout', false);
    return () => h('div', enabled.value.value ? 'Checkout V2' : 'Checkout V1');
  },
});

const app = createApp(App);
app.use(
  createZenmanagePlugin({
    environmentToken: 'cli_your_client_key_here',
    cacheTtl: 3600,
    enableUsageReporting: true,
  })
);
app.mount('#app');
