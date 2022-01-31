/// <reference types="vite/client" />
/// <reference types="emscripten" />

// Vite

declare module "*.vue" {
  import { DefineComponent } from "vue";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// App stuff

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

declare interface MediaStreamTrackProcessorInit {
  track: MediaStreamTrack;
}

declare interface MediaStreamTrackGeneratorInit {
  kind: string;
}

declare interface MediaEncoderInit {
  output(frame: EncodedMediaChunk, info: MediaEncoderOutputInfo): void;
  error(): void;
}

declare interface MediaDecoderInit {
  output(frame: MediaData): void;
  error(): void;
}

declare interface MediaEncoderConfig {
  codec?: string;
  sampleRate?: number;
  numberOfChannels?: number;
  bitrate?: number;
  width?: number;
  height?: number;
  displayWidth?: number;
  displayHeight?: number;
  hardwareAcceleration?: string;
  framerate?: number;
  alpha?: string;
  scalabilityMode?: string;
  bitrateMode?: string;
  latencyMode?: string;
}

declare interface MediaDecoderConfig {
  codec?: string;
  sampleRate?: number;
  numberOfChannels?: number;
  description?: Uint8Array;
  codecWidth?: number;
  codedHeight?: number;
  displayAspectWidth?: number;
  displayAspectHeight?: number;
  colorSpace?: {
    primaries: string;
    transfer: string;
    matrix: string;
  };
  hardwareAcceleration?: string;
  optimizeForLatency?: boolean;
}

declare interface MediaEncoderOutputInfo {
  decoderConfig?: MediaDecoderConfig;
}

declare interface MediaData {
  close(): void;
}

declare interface MediaEncoderEncodeOpts {
  keyFrame?: boolean;
}

declare interface EncodedMediaChunkInit {
  type: string;
  timestamp: number;
  duration: number;
  data: Uint8Array;
}

declare class MediaStreamTrackProcessor {
  constructor(init: MediaStreamTrackProcessorInit);
  readable: ReadableStream<MediaData>;
}

declare class MediaStreamTrackGenerator extends MediaStreamTrack {
  constructor(init: MediaStreamTrackGeneratorInit);
  writable: WritableStream<MediaData>;
}

declare class MediaEncoder {
  constructor(init: MediaEncoderInit);
  configure(config: MediaEncoderConfig): void;
  encode(frame: MediaData, opts?: MediaEncoderEncodeOpts): void;
  state: string;
  encodeQueueSize: number;
}

declare class MediaDecoder {
  constructor(init: MediaDecoderInit);
  configure(config: MediaDecoderConfig): void;
  decode(chunk: EncodedMediaChunk): void;
  state: string;
  decodeQueueSize: number;
}

declare class EncodedMediaChunk {
  constructor(init: EncodedMediaChunkInit);
  type: string;
  timestamp: number;
  duration: number;
  byteLength: number;
  copyTo(buf: Uint8Array): void;
}

declare class VideoEncoder extends MediaEncoder {}
declare class AudioEncoder extends MediaEncoder {}
declare class VideoDecoder extends MediaDecoder {}
declare class AudioDecoder extends MediaDecoder {}

declare class EncodedAudioChunk extends EncodedMediaChunk {}
declare class EncodedVideoChunk extends EncodedMediaChunk {}

// AudioWorklet support

declare interface AudioWorkletProcessorInit {
  processorOptions: {
    wasm?: Uint8Array;
  };
}

declare class AudioWorkletProcessor {
  constructor(init: AudioWorkletProcessorInit);
  port: {
    postMessage(data: unknown): void;
    onmessage: (e: { data: unknown }) => void;
  };
}

declare function registerProcessor(name: string, proc: unknown): void;
