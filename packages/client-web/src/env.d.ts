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
  kind: "video" | "audio";
}

declare interface EncodedVideoChunk {
  close(): void;
  type: "key" | "delta";
  timestamp: number;
  duration: number;
  byteLength: number;
  copyTo(buf: Uint8Array): void;
}

declare interface EncodedAudioChunk {
  close(): void;
  type: "key" | "delta";
  timestamp: number;
  duration: number;
  byteLength: number;
  copyTo(buf: Uint8Array): void;
}

declare interface VideoEncoderInit {
  output(frame: EncodedVideoChunk, info: VideoEncoderOutputInfo): void;
  error(): void;
}

declare interface VideoDecoderInit {
  output(frame: VideoFrame): void;
  error(): void;
}

declare interface AudioEncoderInit {
  output(frame: EncodedAudioChunk, info: AudioEncoderOutputInfo): void;
  error(): void;
}

declare interface AudioDecoderInit {
  output(frame: AudioData): void;
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
}

declare interface AudioEncoderConfig {
  codec: string;
  sampleRate: number;
  numberOfChannels: number;
  bitrate: number;
}

declare interface AudioDecoderConfig {
  codec: string;
  sampleRate: number;
  numberOfChannels: number;
  description?: Uint8Array;
}

declare interface VideoEncoderOutputInfo {
  decoderConfig?: VideoDecoderConfig;
}

declare interface AudioEncoderOutputInfo {
  decoderConfig?: AudioDecoderConfig;
}

declare interface VideoFrame {
  close(): void;
}

declare interface AudioData {
  close(): void;
}

declare class MediaStreamTrackProcessor {
  constructor(init: MediaStreamTrackProcessorInit);
  readable: ReadableStream<VideoFrame | AudioData>;
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

declare class AudioEncoder {
  constructor(init: AudioEncoderInit);
  configure(config: AudioEncoderConfig): void;
  decode(chunk: EncodedAudioChunk): void;
}

declare class AudioDecoder {
  constructor(init: AudioDecoderInit);
  configure(config: AudioDecoderConfig): void;
  decode(chunk: AudioData): void;
}

// AudioWorklet support

declare function registerProcessor(name: string, proc: unknown): void;
