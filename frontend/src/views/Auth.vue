<template>
  <div>
    <video
      src="../assets/video/ink.mp4"
      class="w-screen h-screen object-cover"
      autoplay
      muted
      loop
      :style="{
        filter: `hue-rotate(${
          colorTheme === 'red'
            ? 254.1176470584
            : colorTheme === 'orange'
            ? 275.2941176466
            : colorTheme === 'amber'
            ? 296.4705882348
            : colorTheme === 'yellow'
            ? 317.647058823
            : colorTheme === 'lime'
            ? 338.8235294112
            : colorTheme === 'green'
            ? 0
            : colorTheme === 'emerald'
            ? 21.1764705882
            : colorTheme === 'teal'
            ? 42.3529411764
            : colorTheme === 'cyan'
            ? 63.5294117646
            : colorTheme === 'sky'
            ? 84.7058823528
            : colorTheme === 'blue'
            ? 105.882352941
            : colorTheme === 'indigo'
            ? 127.0588235292
            : colorTheme === 'violet'
            ? 148.2352941174
            : colorTheme === 'purple'
            ? 169.4117647056
            : colorTheme === 'fuchsia'
            ? 190.5882352938
            : colorTheme === 'pink'
            ? 211.764705882
            : colorTheme === 'rose'
            ? 232.9411764702
            : 0
        }deg)`,
      }"
    />
    <div
      class="
        fixed
        inset-0
        flex-1 flex
        items-center
        justify-center
        h-full
        backdrop-blur
      "
    >
      <div
        class="
          flex flex-col
          w-full
          max-w-sm
          border
          rounded-md
          bg-gray-800
          border-gray-700
          shadow-2xl
        "
      >
        <div
          class="
            py-6
            border-b border-gray-700
            space-y-4
            flex flex-col
            items-center
          "
        >
          <AppIcon class="w-16 h-16" />
          <p class="text-3xl font-bold" v-if="stage === 'login'">
            Sign in to Hyalus
          </p>
          <p class="text-3xl font-bold" v-if="stage === 'loginTotp'">
            2FA Verification
          </p>
          <p class="text-3xl font-bold" v-if="stage === 'register'">
            Create an account
          </p>
        </div>
        <div
          class="
            flex
            items-center
            p-4
            space-x-4
            text-gray-300
            border-b
            rounded-md
            bg-gray-800
            border-gray-700
          "
          v-if="error"
        >
          <ErrorIcon class="w-8 h-8" />
          <p class="flex-1">{{ error }}</p>
        </div>
        <div class="flex flex-col items-center p-8">
          <form @submit.prevent="submit" class="w-full text-gray-300">
            <div class="space-y-4">
              <div
                class="space-y-2"
                v-if="['login', 'register'].indexOf(stage) !== -1"
              >
                <p>Username</p>
                <input
                  class="
                    w-full
                    px-4
                    py-2
                    text-gray-400
                    bg-gray-900
                    border
                    rounded-sm
                    border-gray-700
                    focus:outline-none focus:border-gray-600
                  "
                  type="text"
                  autocomplete="username"
                  v-model="username"
                />
              </div>
              <div
                class="space-y-2"
                v-if="['login', 'register'].indexOf(stage) !== -1"
              >
                <p>Password</p>
                <input
                  class="
                    w-full
                    px-4
                    py-2
                    text-gray-400
                    bg-gray-900
                    border
                    rounded-sm
                    border-gray-700
                    focus:outline-none focus:border-gray-600
                  "
                  type="password"
                  autocomplete="current-password"
                  v-model="password"
                />
              </div>
              <div class="space-y-2" v-if="stage === 'register'">
                <p>Confirm password</p>
                <input
                  class="
                    w-full
                    px-4
                    py-2
                    text-gray-400
                    bg-gray-900
                    border
                    rounded-sm
                    border-gray-700
                    focus:outline-none focus:border-gray-600
                  "
                  type="passwordConfirm"
                  autocomplete="current-password"
                  v-model="passwordConfirm"
                />
              </div>
              <div class="space-y-2" v-if="stage === 'loginTotp'">
                <p>Code</p>
                <input
                  class="
                    w-full
                    px-4
                    py-2
                    text-gray-400
                    bg-gray-900
                    border
                    rounded-sm
                    border-gray-700
                    focus:outline-none focus:border-gray-600
                  "
                  type="totpCode"
                  autocomplete="current-password"
                  v-model="totpCode"
                  autofocus
                />
              </div>
            </div>
            <button
              class="
                w-full
                p-2
                mt-8
                text-white
                transition
                rounded-md
                bg-primary-500
                hover:bg-primary-600
                focus:outline-none
              "
            >
              <p v-if="stage === 'login'">Sign in</p>
              <p v-if="stage === 'loginTotp'">Verify</p>
              <p v-if="stage === 'register'">Create</p>
            </button>
          </form>
          <p
            class="
              mt-4
              transition
              text-primary-500
              hover:text-primary-600
              cursor-pointer
            "
            v-if="stage === 'login'"
            @click="
              error = '';
              stage = 'register';
            "
          >
            Register
          </p>
          <p
            class="
              mt-4
              transition
              text-primary-500
              hover:text-primary-600
              cursor-pointer
            "
            v-if="stage === 'register'"
            @click="
              error = '';
              stage = 'login';
            "
          >
            Sign in
          </p>
          <p
            class="
              mt-4
              transition
              text-primary-500
              hover:text-primary-600
              cursor-pointer
            "
            v-if="stage === 'loginTotp'"
            @click="
              error = '';
              stage = 'login';
            "
          >
            Cancel
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import ErrorIcon from "../icons/Error.vue";
import AppIcon from "../icons/App.vue";
import { ref, computed } from "vue";
import { useStore } from "vuex";

const store = useStore();
const stage = ref("login");
const username = ref("");
const password = ref("");
const passwordConfirm = ref("");
const totpCode = ref("");
const error = ref("");
const colorTheme = computed(() => store.getters.localConfig.colorTheme);

const submit = async () => {
  if (stage.value === "login") {
    try {
      await store.dispatch("login", {
        username: username.value,
        password: password.value,
      });
    } catch (e) {
      console.log(e);
      error.value = e.response?.data?.error || e.message;
      return;
    }

    if (store.getters.loginKeys) {
      error.value = "";
      stage.value = "loginTotp";
    }
  }

  if (stage.value === "loginTotp") {
    try {
      await store.dispatch("login", {
        totpCode: totpCode.value,
      });
    } catch (e) {
      console.log(e);
      error.value = e?.response?.data?.error || e.message;
    }
  }

  if (stage.value === "register") {
    if (password.value !== passwordConfirm.value) {
      error.value = "Passwords don't match";
      return;
    }

    try {
      await store.dispatch("register", {
        username: username.value,
        password: password.value,
      });
    } catch (e) {
      console.log(e);
      error.value = e?.response?.data?.error || e.message;
    }
  }
};
</script>
