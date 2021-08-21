import {
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from "vue-router";
import store from "../store";

const requireAuth = (to, from, next) => {
  if (!store.getters.userKeys) {
    return next("/auth");
  }

  next();
};

const requireNoAuth = (to, from, next) => {
  if (store.getters.userKeys) {
    return next("/app");
  }

  next();
};

const requireVoice = (to, from, next) => {
  if (!store.getters.voice) {
    return next("/app");
  }

  next();
};

const router = createRouter({
  history: window.HyalusDesktop ? createWebHashHistory() : createWebHistory(),
  routes: [
    {
      name: "home",
      path: "/",
      component: () => import("../views/Home.vue"),
    },
    {
      name: "app",
      path: "/app",
      component: () => import("../views/App.vue"),
      beforeEnter: requireAuth,
    },
    {
      name: "auth",
      path: "/auth",
      component: () => import("../views/Auth.vue"),
      beforeEnter: requireNoAuth,
    },
    {
      name: "settingsAccount",
      path: "/settings/account",
      component: () => import("../views/SettingsAccount.vue"),
      beforeEnter: requireAuth,
    },
    {
      name: "settingsAppearance",
      path: "/settings/appearance",
      component: () => import("../views/SettingsAppearance.vue"),
      beforeEnter: requireAuth,
    },
    {
      name: "settingsMedia",
      path: "/settings/media",
      component: () => import("../views/SettingsMedia.vue"),
      beforeEnter: requireAuth,
    },
    {
      name: "settingsKeyboard",
      path: "/settings/keyboard",
      component: () => import("../views/SettingsKeyboard.vue"),
      beforeEnter: requireAuth,
    },
    {
      name: "settingsUpdate",
      path: "/settings/update",
      component: () => import("../views/SettingsUpdate.vue"),
      beforeEnter: requireAuth,
    },
    {
      name: "settingsNotifications",
      path: "/settings/notifications",
      component: () => import("../views/SettingsNotifications.vue"),
      beforeEnter: requireAuth,
    },
    {
      name: "settingsSessions",
      path: "/settings/sessions",
      component: () => import("../views/SettingsSessions.vue"),
      beforeEnter: requireAuth,
    },
    {
      name: "channel",
      path: "/channels/:channelId",
      component: () => import("../views/Channel.vue"),
      beforeEnter: requireAuth,
    },
    {
      name: "call",
      path: "/call",
      component: () => import("../views/Call.vue"),
      beforeEnter: requireVoice,
    },
    {
      name: "add",
      path: "/add/:username",
      beforeEnter: (to, from, next) => {
        store.commit("setUserInvite", to.params.username);
        next("/app");
      },
    },
  ],
});

export default router;
