/// <reference types="vite/client" />
/// <reference types="emscripten" />

declare module "*.vue" {
  import { DefineComponent } from "vue";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare interface Window {
  HyalusDesktop?: {
    close(): void;
    maximize(): void;
    minimize(): void;
    restart(): void;
    quit(): void;
    getSources(): Promise<{
      id: string;
      name: string;
      thumbnail: string;
    }>[];
  };
}
