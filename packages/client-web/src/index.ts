import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import { store } from "./store";
import _ServiceWorker from "./shared/serviceWorker?worker";
import { getWorkerUrl } from "./util";

if (!window.HyalusDesktop) {
  const ServiceWorker = getWorkerUrl(_ServiceWorker);
  const swReg = (await navigator.serviceWorker.getRegistrations())[0];

  if (swReg && swReg.active?.scriptURL !== ServiceWorker) {
    await swReg.unregister();
  }

  await navigator.serviceWorker.register(ServiceWorker, {
    type: "module",
  });
}

await store.start();

const app = createApp(App);
app.use(router);
app.mount("#app");

const _debug = console.debug.bind(console);
console.debug = (...args) => {
  if (!window.debugEnabled) {
    return;
  }

  _debug(...args);
};

window.debugStart = () => {
  window.debugEnabled = true;
  window.debugStore = store;
};

window.debugStop = () => {
  window.debugEnabled = false;
  delete window.debugStore;

  console.clear();
};

if (location.hostname === "localhost") {
  window.debugStart();
}
