import Vue from "vue";
import App from "./App";
import store from "./store";
import router from "./router";
import "./style.css";

Vue.config.productionTip = false;

(async () => {
  await store.dispatch("refresh", localStorage.token);

  new Vue({
    el: "#app",
    render: (h) => h(App),
    store,
    router,
  });
})();

//if service workers are supported & not on desktop.
if (navigator.serviceWorker && typeof process === "undefined") {
  navigator.serviceWorker.register("/service-worker.js");
}

//from DefinePlugin.
window._commit = _commit;

const _log = (level, tag, str, ...args) => {
  console[level](
    `%c${tag}%c ${str}`,
    `color:#fff;background:#8B5CF6;padding:2px 4px;border-radius:4px`,
    "color:#ccc",
    ...args
  );
};

const log = {
  info(...args) {
    _log("info", ...args);
  },
  warn(...args) {
    _log("warn", ...args);
  },
  error(...args) {
    _log("error", ...args);
  },
  debug(...args) {
    _log("debug", ...args);
  },
};

window.log = log;

log.info("app", "Console is meant for developers.")
log.info("app", "Pasting here may comprimise security!")