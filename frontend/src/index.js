import { createApp } from "vue";
import App from "./App.vue";
import store from "./store";
import router from "./router";
import { ObserveVisibility } from "vue-observe-visibility";

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

  app.directive("observe-visibility", {
    beforeMount: (el, binding, vnode) => {
      vnode.context = binding.instance;
      ObserveVisibility.bind(el, binding, vnode);
    },
    update: ObserveVisibility.update,
    unmounted: ObserveVisibility.unbind,
  });

  app.use(store);
  app.use(router);

  app.mount("#app");
})();
