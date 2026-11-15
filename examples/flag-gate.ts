import { createApp, defineComponent, h } from 'vue';
import { FlagGate, createZenmanagePlugin } from '@zenmanage/vue';

const App = defineComponent({
  render: () =>
    h(
      FlagGate,
      { flagKey: 'beta-chat' },
      {
        default: () => h('div', 'Beta chat'),
        disabled: () => h('div', 'Classic chat'),
        loading: () => h('div', 'Loading...'),
      }
    ),
});

const app = createApp(App);
app.use(createZenmanagePlugin({ environmentToken: 'cli_your_client_key_here' }));
app.mount('#app');
