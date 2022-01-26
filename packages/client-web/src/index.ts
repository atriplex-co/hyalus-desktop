import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import { store } from "./global/store";
import _ServiceWorker from "./shared/serviceWorker?worker";
import { getWorkerUrl, isDesktop } from "./global/helpers";

if (!isDesktop) {
  const ServiceWorker = getWorkerUrl(_ServiceWorker);
  const swReg = (await navigator.serviceWorker.getRegistrations())[0];

  if (swReg && swReg.active?.scriptURL !== ServiceWorker) {
    await swReg.unregister();
  }

  await navigator.serviceWorker.register(ServiceWorker, {
    type: "module",
    scope: "/",
  });
}

await store.start();

const app = createApp(App);
app.use(router);
app.mount("#app");

window.dev = {
  store,
  enabled: location.hostname === "localhost",
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
