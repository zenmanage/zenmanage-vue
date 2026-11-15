import { createApp, defineComponent, h } from 'vue';
import { DefaultsCollection } from '@zenmanage/sdk';
import { createZenmanagePlugin, useBooleanFlag, useConfig } from '@zenmanage/vue';

const defaults = DefaultsCollection.fromObject({
  'new-ui': true,
  'api-version': 'v2',
});

const App = defineComponent({
  setup() {
    const newUi = useBooleanFlag('new-ui', false);
    const apiVersion = useConfig('api-version', 'v1');

    return () => h('div', `new-ui=${newUi.value.value} api-version=${apiVersion.value.value}`);
  },
});

const app = createApp(App);
app.use(
  createZenmanagePlugin({
    environmentToken: 'cli_your_client_key_here',
    defaults,
  })
);
app.mount('#app');
