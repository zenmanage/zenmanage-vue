// A Vite SSR server: evaluate flags while rendering, then embed them for the browser.
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { Attribute, Context } from '@zenmanage/sdk';
import { buildBootstrapScript, createZenmanagePlugin } from '@zenmanage/vue';
import App from './App.vue';

export async function render(userId: string, plan: string): Promise<string> {
  const context = new Context('user', userId, userId, [new Attribute('plan', [plan])]);

  // Server key (srv_...), read from a server-only environment variable.
  const plugin = createZenmanagePlugin({
    environmentToken: process.env.ZENMANAGE_SERVER_KEY ?? 'srv_placeholder',
    context,
  });

  const app = createSSRApp(App);
  app.use(plugin);

  // Composables load their flags while this renders.
  const html = await renderToString(app);

  // The flags the page read, as a <script> tag. The browser's plugin picks it up by itself.
  const bootstrap = buildBootstrapScript(await plugin.runtime.getBootstrapPayload());

  return `<body><div id="app">${html}</div>${bootstrap}</body>`;
}
