import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import { store } from "./store";
import ServiceWorker from "./shared/serviceWorker?url";

if (location.hostname === "localhost") {
  (
    window as unknown as {
      store: typeof store;
    }
  ).store = store;
}

await store.start();

const app = createApp(App);
app.use(router);
app.mount("#app");

if (navigator.serviceWorker && !window.HyalusDesktop) {
  await navigator.serviceWorker.register(ServiceWorker);
}
