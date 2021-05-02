<template>
  <Modal>
    <div class="w-96">
      <div class="p-4 space-y-4">
        <div class="flex items-center space-x-2">
          <GroupIcon
            class="w-8 h-8 p-2 text-gray-400 rounded-full bg-gray-750"
          />
          <p class="text-xl font-bold text-gray-200">
            Create group
          </p>
        </div>
        <div class="space-y-4">
          <div
            class="flex items-center p-3 space-x-3 text-sm text-gray-200 border border-gray-700 rounded-md bg-gray-750"
            v-if="error"
          >
            <ErrorIcon class="w-6 h-6" />
            <p>{{ error }}</p>
          </div>
          <div class="space-y-2">
            <p class="text-sm text-gray-500">Name</p>
            <input
              class="w-full px-4 py-2 text-gray-400 bg-gray-900 border rounded-sm border-gray-750 focus:outline-none focus:border-gray-650"
              type="text"
              v-model="name"
            />
          </div>
          <div class="space-y-2">
            <p class="text-sm text-gray-500">Friends</p>
            <div class="bg-gray-900 border rounded-md border-gray-750">
              <input
                class="w-full px-4 py-2 -m-px text-gray-400 bg-transparent border rounded-sm border-gray-750 focus:outline-none focus:border-gray-650"
                type="text"
                placeholder="Search for friends"
                v-model="search"
                @input="updateSearch"
              />
              <div class="h-48 overflow-auto">
                <div class="p-3 space-y-3" v-if="friends.length">
                  <div
                    class="flex items-center justify-between"
                    v-for="friend in friends"
                    v-bind:key="friend.id"
                  >
                    <div class="flex items-center space-x-4">
                      <UserAvatar
                        class="w-8 h-8 rounded-full"
                        :id="friend.user.avatar"
                      />
                      <div>
                        <p class="font-bold">{{ friend.user.name }}</p>
                        <p class="text-xs text-gray-400">
                          @{{ friend.user.username }}
                        </p>
                      </div>
                    </div>
                    <Checkbox v-model="friend.selected" />
                  </div>
                </div>
                <div
                  class="flex flex-col items-center justify-center w-full h-full space-y-4 text-gray-500"
                  v-else
                >
                  <GroupIcon class="w-8 h-8" />
                  <p>No more friends to add</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        class="flex items-center justify-end p-4 space-x-2 text-sm bg-gray-900"
      >
        <p
          class="px-4 py-2 text-gray-500 cursor-pointer"
          @click="$emit('close')"
        >
          Cancel
        </p>
        <p
          class="px-4 py-2 text-white rounded-md shadow-sm cursor-pointer bg-primary-500"
          @click="createGroup"
        >
          Create
        </p>
      </div>
    </div>
  </Modal>
</template>

<script>
export default {
  props: ["selected"],
  data() {
    const friends = [];

    this.$store.getters.friends
      .filter((friend) => friend.accepted)
      .map((friend) => {
        friends.push({
          ...friend,
          selected: friend.user.id === this.selected,
        });
      });

    return {
      error: null,
      name: "",
      search: "",
      friends,
    };
  },
  methods: {
    updateSearch() {
      //
    },
    async createGroup() {
      try {
        await this.$store.dispatch("createGroup", {
          name: this.name,
          users: this.friends.filter((f) => f.selected).map((f) => f.user.id),
        });
      } catch (e) {
        console.log(e);
        this.error = e.response?.data?.error || e.message;
        return;
      }

      this.$emit("close");
    },
  },
  components: {
    Modal: () => import("./Modal"),
    GroupIcon: () => import("../icons/Group"),
    UserAvatar: () => import("./UserAvatar"),
    ErrorIcon: () => import("../icons/Error"),
    Checkbox: () => import("../components/Checkbox"),
  },
};
</script>
