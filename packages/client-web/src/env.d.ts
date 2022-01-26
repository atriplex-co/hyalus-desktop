/// <reference types="vite/client" />
/// <reference types="emscripten" />

declare module "*.vue" {
  import { DefineComponent } from "vue";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare interface HyalusDev {
  store?: unknown;
  enabled: boolean;
  stop(): void;
  start(): void;
}

declare interface HyalusDesktop {
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
}

declare interface Window {
  dev: HyalusDev;
  HyalusDesktop?: HyalusDesktop;
}

// IdleDetector support

declare class IdleDetector {
  constructor();
  static requestPermission(): Promise<string>;
  start(opts: { threshold: number; signal: AbortSignal }): Promise<void>;
  addEventListener(event: string, cb: () => void): void;
  userState: "active" | "idle";
  screenState: "unlocked" | "locked";
}

// WebCodecs support

declare class MediaStreamTrackProcessor {
  constructor(init: MediaStreamTrackProcessorInit);
  readable: ReadableStream<VideoFrame>;
}

declare class MediaStreamTrackGenerator extends MediaStreamTrack {
  constructor(init: MediaStreamTrackGeneratorInit);
  writable: WritableStream<VideoFrame>;
}

declare class VideoEncoder {
  constructor(init: VideoEncoderInit);
  configure(config: VideoEncoderConfig): void;
  encode(frame: VideoFrame): void;
}

declare class VideoDecoder {
  constructor(init: VideoDecoderInit);
  configure(config: VideoDecoderConfig): void;
  decode(chunk: EncodedVideoChunk): void;
}

declare interface MediaStreamTrackProcessorInit {
  track: MediaStreamTrack;
}

declare interface MediaStreamTrackGeneratorInit {
  kind: "audio" | "video";
}

declare interface VideoEncoderInit {
  output(frame: EncodedVideoChunk, info: VideoEncoderOutputInfo): void;
  error(): void;
}

declare interface VideoDecoderInit {
  output(frame: VideoFrame): void;
  error(): void;
}

declare interface VideoEncoderConfig {
  codec: string;
  width: number;
  height: number;
  framerate: number;
  bitrate: number;
}

declare interface VideoDecoderConfig {
  codec: string;
  width: number;
  height: number;
  framerate: number;
  bitrate: number;
}

declare interface VideoEncoderOutputInfo {
  decoderConfig?: VideoDecoderConfig;
}

declare interface VideoFrame {
  close(): void;
}

declare interface EncodedVideoChunk {
  close(): void;
  type: "key" | "delta";
  timestamp: number;
  duration: number;
  byteLength: number;
  copyTo(buf: Uint8Array): void;
}

declare function registerProcessor(name: string, proc: unknown): void;
