// The browser half of the Vite SSR example.
import { createSSRApp } from 'vue';
import { createZenmanagePlugin } from '@zenmanage/vue';
import App from './App.vue';

const app = createSSRApp(App);

// With no `bootstrap` option, the plugin reads the server's <script> tag from the page, so the
// first render matches the HTML the server sent. Use a client key (cli_...) here.
app.use(createZenmanagePlugin({ environmentToken: import.meta.env.VITE_ZENMANAGE_CLIENT_KEY }));

app.mount('#app');
