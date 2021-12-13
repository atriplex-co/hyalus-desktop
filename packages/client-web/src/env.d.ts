/// <reference types="vite/client" />
/// <reference types="emscripten" />

declare module "*.vue" {
  import { DefineComponent } from "vue";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module "@hyalusapp/rnnoise" {
  export default function (init: RnnoiseModuleInit): RnnoiseModule;
}

declare interface RnnoiseModuleInit {
  locateFile(): string;
  instantiateWasm(
    imports: WebAssembly.Imports,
    cb: (instance: WebAssembly.Instance, module: WebAssembly.Module) => void
  ): void;
}

declare interface RnnoiseModule extends EmscriptenModule {
  _rnnoise_create(): number;
  _rnnoise_process_frame(pState: number, pOut: number, pIn: number): number;
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
