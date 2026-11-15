import { createApp, defineComponent, h } from 'vue';
import { Context } from '@zenmanage/sdk';
import { createZenmanagePlugin, useBooleanFlag } from '@zenmanage/vue';

const userContext = Context.single('user', 'user-123');

const App = defineComponent({
  setup() {
    const rollout = useBooleanFlag('new-checkout-flow', false);
    return () => h('div', rollout.value.value ? 'Rollout Enabled' : 'Rollout Disabled');
  },
});

const app = createApp(App);
app.use(
  createZenmanagePlugin({
    environmentToken: 'cli_your_client_key_here',
    context: userContext,
  })
);
app.mount('#app');
