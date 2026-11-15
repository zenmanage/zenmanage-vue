import { createApp, defineComponent, h, ref } from 'vue';
import { createZenmanagePlugin, useFlag } from '@zenmanage/vue';

const App = defineComponent({
  setup() {
    // The default decides how the flag is read. An object or array reads a JSON flag.
    const { value: ui, isLoading } = useFlag('ui-config', { theme: 'light', pageSize: 20 });

    // The key can be reactive: the composable re-evaluates when it changes.
    const section = ref('billing');
    const { value: limit } = useFlag(() => `${section.value}-limit`, 100);

    return () =>
      isLoading.value ? h('div', 'Loading...') : h('div', `${ui.value.theme} / ${limit.value}`);
  },
});

const app = createApp(App);
app.use(createZenmanagePlugin({ environmentToken: 'cli_your_client_key_here' }));
app.mount('#app');
