import {
  createRouter,
  createWebHistory,
  NavigationGuardNext,
  RouteLocationNormalized,
} from "vue-router";
import { store } from "../store";

const requireAuth = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  if (!store.state.value.config.token) {
    return next("/auth");
  }

  next();
};

const requireNoAuth = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  if (store.state.value.config.token) {
    return next("/app");
  }

  next();
};

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      name: "home",
      path: "/",
      component: () => import("../views/HomeView.vue"),
    },
    {
      name: "app",
      path: "/app",
      component: () => import("../views/AppView.vue"),
      beforeEnter: requireAuth,
    },
    {
      name: "auth",
      path: "/auth",
      component: () => import("../views/AuthView.vue"),
      beforeEnter: requireNoAuth,
    },
    {
      name: "settingsAccount",
      path: "/settings/account",
      component: () => import("../views/SettingsAccountView.vue"),
      beforeEnter: requireAuth,
    },
    {
      name: "settingsAppearance",
      path: "/settings/appearance",
      component: () => import("../views/SettingsAppearanceView.vue"),
      beforeEnter: requireAuth,
    },
    {
      name: "settingsMedia",
      path: "/settings/media",
      component: () => import("../views/SettingsMediaView.vue"),
      beforeEnter: requireAuth,
    },
    {
      name: "settingsKeyboard",
      path: "/settings/keyboard",
      component: () => import("../views/SettingsKeyboardView.vue"),
      beforeEnter: requireAuth,
    },
    {
      name: "settingsUpdate",
      path: "/settings/update",
      component: () => import("../views/SettingsUpdateView.vue"),
      beforeEnter: requireAuth,
    },
    {
      name: "settingsNotifications",
      path: "/settings/notifications",
      component: () => import("../views/SettingsNotificationsView.vue"),
      beforeEnter: requireAuth,
    },
    {
      name: "settingsSessions",
      path: "/settings/sessions",
      component: () => import("../views/SettingsSessionsView.vue"),
      beforeEnter: requireAuth,
    },
    {
      name: "settingsDesktop",
      path: "/settings/desktop",
      component: () => import("../views/SettingsDesktopView.vue"),
      beforeEnter: requireAuth,
    },
    {
      name: "channel",
      path: "/channels/:channelId",
      component: () => import("../views/ChannelView.vue"),
      beforeEnter: requireAuth,
    },
    {
      name: "add",
      path: "/add/:username",
      component: () => import("../views/AppView.vue"),
      beforeEnter: (
        to: RouteLocationNormalized,
        from: RouteLocationNormalized,
        next: NavigationGuardNext
      ) => {
        store.state.value.invite = String(to.params.username);
        next("/app");
      },
    },
  ],
});
