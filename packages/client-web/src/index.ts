import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import { store } from "./store";
import ServiceWorker from "./shared/serviceWorker?url";
import { idbDel } from "./util";

try {
  await store.start();
} catch {
  await idbDel("config");
  location.reload();
}

const app = createApp(App);
app.use(router);
app.mount("#app");

if (navigator.serviceWorker && !window.HyalusDesktop) {
  await navigator.serviceWorker.register(ServiceWorker);
}

window.debugEnabled = location.hostname === "localhost";

window.debugStart = () => {
  window.debugEnabled = true;
  window.debugStore = store;
};

window.debugStop = () => {
  window.debugEnabled = false;
  delete window.debugStore;

  console.clear();
};

const _debug = console.debug.bind(console);
console.debug = (...args) => {
  if (!window.debugEnabled) {
    return;
  }

  _debug(...args);
};
