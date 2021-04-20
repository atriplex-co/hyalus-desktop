import Vue from "vue";
import VueRouter from "vue-router";
import store from "../store";

Vue.use(VueRouter);

const requireAuth = (to, from, next) => {
  if (!store.getters.token) {
    return next("/login");
  }

  next();
};

const requireNoAuth = (to, from, next) => {
  if (store.getters.token) {
    return next("/app");
  }

  next();
};

export default new VueRouter({
  mode: location.protocol === "file:" ? "hash" : "history",
  routes: [
    {
      name: "home",
      path: "/",
      component: () => import("../views/Home"),
    },
    {
      name: "app",
      path: "/app",
      component: () => import("../views/App"),
      beforeEnter: requireAuth,
    },
    {
      name: "login",
      path: "/login",
      component: () => import("../views/Login"),
      beforeEnter: requireNoAuth,
    },
    {
      name: "loginTotp",
      path: "/loginTotp",
      component: () => import("../views/LoginTotp"),
      beforeEnter(to, from, next) {
        if (!store.state.totpLoginTicket && store.state.user) {
          next("/app");
        }

        if (!store.state.totpLoginTicket && !store.state.user) {
          next("/login");
        }

        next();
      },
    },
    {
      name: "register",
      path: "/register",
      component: () => import("../views/Register"),
      beforeEnter: requireNoAuth,
    },
    {
      name: "settings",
      path: "/settings",
      component: () => import("../views/Settings"),
      beforeEnter: requireAuth,
    },
    {
      name: "friends",
      path: "/friends",
      component: () => import("../views/Friends"),
      beforeEnter: requireAuth,
    },
    {
      name: "channel",
      path: "/channels/:channel",
      component: () => import("../views/Channel"),
      beforeEnter: requireAuth,
    },
    {
      name: "channelCall",
      path: "/channels/:channel/call",
      component: () => import("../views/Call"),
      beforeEnter: (to, from, next) => {
        requireAuth(to, from, next);

        if (!store.getters.voice) {
          next(`/channels/${to.params.channel}`);
        }
      },
    },
    {
      name: "invite",
      path: "/invite/:username",
      component: () => import("../views/Invite"),
    },
  ],
});
