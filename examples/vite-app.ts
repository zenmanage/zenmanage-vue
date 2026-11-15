import { createApp } from 'vue';
import { createZenmanagePlugin } from '@zenmanage/vue';
import App from './App.vue';

// A client-side Vite app. Put the client key (cli_...) in .env as VITE_ZENMANAGE_CLIENT_KEY.
const app = createApp(App);

app.use(
  createZenmanagePlugin({
    environmentToken: import.meta.env.VITE_ZENMANAGE_CLIENT_KEY,
    onError: (error) => console.error('Zenmanage could not load flags', error),
  })
);

app.mount('#app');
