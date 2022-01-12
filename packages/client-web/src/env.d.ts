/// <reference types="vite/client" />
/// <reference types="emscripten" />

declare module "*.vue" {
  import { DefineComponent } from "vue";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare class IdleDetector {
  constructor();
  static requestPermission(): Promise<string>;
  start(opts: { threshold: number; signal: AbortSignal }): Promise<void>;
  addEventListener(event: string, cb: () => void): void;
  userState: "active" | "idle";
  screenState: "unlocked" | "locked";
}

declare interface Window {
  debugStart(): void;
  debugStop(): void;
  debugEnabled?: boolean;
  debugStore?: unknown;
  HyalusDesktop?: {
    close(): void;
    maximize(): void;
    minimize(): void;
    restart(): void;
    quit(): void;
    getSources(): Promise<
      {
        id: string;
        name: string;
        thumbnail: string;
      }[]
    >;
    osPlatform: string;
    osRelease: string;
    startWin32AudioCapture(
      handle: number,
      cb: (data: Float32Array) => void
    ): void;
    stopWin32AudioCapture(): void;
    getOpenAtLogin(): Promise<boolean>;
    setOpenAtLogin(val: boolean): Promise<void>;
    getWasOpenedAtLogin(): Promise<boolean>;
  };
  IdleDetector?: IdleDetector;
}

declare function registerProcessor(name: string, proc: unknown): void;
