import { createApp, defineComponent, h } from 'vue';
import { createZenmanagePlugin, useBooleanFlag } from '@zenmanage/vue';

const App = defineComponent({
  setup() {
    const enabled = useBooleanFlag('new-dashboard', false);

    return () => h('div', enabled.value.value ? 'New Dashboard' : 'Classic Dashboard');
  },
});

const app = createApp(App);
app.use(createZenmanagePlugin({ environmentToken: 'cli_your_client_key_here' }));
app.mount('#app');
