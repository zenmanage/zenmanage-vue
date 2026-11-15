import { createApp } from 'vue';
import App from './App.vue';
import { createZenmanagePlugin } from '@zenmanage/vue';

const app = createApp(App);

app.use(
  createZenmanagePlugin({
    environmentToken: import.meta.env.VITE_ZENMANAGE_ENVIRONMENT_TOKEN,
    preload: true,
  })
);

app.mount('#app');
