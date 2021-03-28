import "core-js";
import "regenerator-runtime";
import Vue from "vue";
import App from "./App";
import store from "./store";
import router from "./router";
import "./style.css";

(async () => {
  await store.dispatch("refresh", localStorage.getItem("token"));

  const el = document.createElement("div");
  document.body.appendChild(el);

  new Vue({
    el,
    render: (h) => h(App),
    store,
    router,
  });
})();
