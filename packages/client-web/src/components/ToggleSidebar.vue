<template>
    <div class="visible" v-on:click="commit">   
<svg
   fill="currentColor"
   viewBox="0 0 20 20">
   <!--
   I just want to add, I hate that this is how you do things, like it is objectively horrible that
   a language exists where you cannot pull a picture from a file and treat it as if it was inline.
   This is the kind of backwards-ass garbage that makes me hate things like JS and its frameworks
   -->
  <path
     d="M 17.089,5.83 H 2.911 a 0.834,0.834 0 0 1 0,-1.668 h 14.178 a 0.834,0.834 0 0 1 0,1.668 z"
     id="path871"
     inkscape:connector-curvature="0" />
  <path
     d="M 17.089,10.834 H 2.911 a 0.834,0.834 0 0 1 0,-1.668 h 14.178 a 0.834,0.834 0 0 1 0,1.668 z"
     id="path873"
     inkscape:connector-curvature="0" />
  <path
     d="M 17.089,15.838 H 2.911 a 0.834,0.834 0 0 1 0,-1.668 h 14.178 a 0.834,0.834 0 0 1 0,1.668 z"
     id="path875"
     inkscape:connector-curvature="0" />
</svg>    </div>
</template>

<script>
export default {
  methods: {
    commit() {
        this.$store.commit('toggleSidebar')
      }
  },
};
</script>
