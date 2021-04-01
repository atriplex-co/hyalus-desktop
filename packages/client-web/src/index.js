import "core-js";
import "regenerator-runtime";
import Vue from "vue";
import App from "./App";
import store from "./store";
import router from "./router";
import "./style.css";

(async () => {
  await store.dispatch("refresh", localStorage.getItem("token"));

  new Vue({
    el: "#app",
    render: (h) => h(App),
    store,
    router,
  });
})();
