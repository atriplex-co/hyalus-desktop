import Vue from "vue";
import App from "./App";
import store from "./store";
import router from "./router";
import "./style.css";

Vue.config.productionTip = false;

console.log("%c[!] Console is for developers.", `color:#f55;`);
console.log("%c[!] Pasting here may comprimise security!", `color:#f55;`);

(async () => {
  await store.dispatch("refresh", localStorage.token);

  new Vue({
    el: "#app",
    render: (h) => h(App),
    store,
    router,
  });
})();

// if service workers are supported & not on desktop.
if (navigator.serviceWorker && typeof process === "undefined") {
  navigator.serviceWorker.register("/service-worker.js");
}

window._commit = _commit;
