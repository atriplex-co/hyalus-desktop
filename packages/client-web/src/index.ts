import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import { store } from "./global/store";
import ServiceWorker from "./shared/serviceWorker?worker";
import { getWorkerUrl } from "./global/helpers";

await store.start();

const app = createApp(App);
app.use(router);
app.mount("#app");

window.dev = {
  store,
  enabled: import.meta.env.DEV,
  start() {
    this.enabled = true;
  },
  stop() {
    this.enabled = false;
    console.clear();
  },
};

const _debug = console.debug.bind(console);
console.debug = (...args) => {
  if (!window.dev.enabled) {
    return;
  }

  _debug(...args);
};

try {
  await navigator.serviceWorker.register(getWorkerUrl(ServiceWorker), {
    type: "module",
    scope: "/",
  });
} catch (e) {
  console.warn("error registering service worker");
  console.warn(e);
}
