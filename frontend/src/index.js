import { createApp } from "vue";
import App from "./App.vue";
import store from "./store";
import router from "./router";

if (location.hostname === "localhost") {
  window.store = store;
  window.router = router;
}

(async () => {
  if (navigator.serviceWorker && !window.HyalusDesktop) {
    navigator.serviceWorker.register("/serviceWorker.js");
  }

  await store.dispatch("start");

  const app = createApp(App);
  app.use(store);
  app.use(router);
  app.mount("#app");
})();
