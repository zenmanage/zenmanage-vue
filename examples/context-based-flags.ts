import { createApp, defineComponent, h } from 'vue';
import { Attribute, Context } from '@zenmanage/sdk';
import { createZenmanagePlugin, useBooleanFlag } from '@zenmanage/vue';

const context = new Context('user', 'Jane', 'user-123', [
  new Attribute('country', ['US']),
  new Attribute('plan', ['pro']),
]);

const App = defineComponent({
  setup() {
    const premiumEnabled = useBooleanFlag('premium-banner', false);

    return () => h('div', premiumEnabled.value.value ? 'Premium Banner' : 'Basic Banner');
  },
});

const app = createApp(App);
app.use(
  createZenmanagePlugin({
    environmentToken: 'cli_your_client_key_here',
    context,
  })
);
app.mount('#app');
