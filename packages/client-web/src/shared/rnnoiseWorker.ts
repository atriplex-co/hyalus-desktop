interface RnnoiseExports {
  malloc(n: number): number;
  free(n: number): number;
  rnnoise_create(): number;
  rnnoise_process_frame(pState: number, pIn: number, pOut: number): number;
  memory: WebAssembly.Memory;
}

registerProcessor(
  "rnnoise-processor",
  class extends AudioWorkletProcessor {
    last: number;
    wasmState?: {
      pState: number;
      pData: number;
      inputBuffer: number[];
      outputBuffer: number[];
      heap: Float32Array;
      exports: RnnoiseExports;
    };

    constructor(init: AudioWorkletProcessorInit) {
      super(init);

      this.last = +new Date();

      if (init.processorOptions.wasm) {
        (async () => {
          const { instance } = await WebAssembly.instantiate(
            init.processorOptions.wasm as Uint8Array
          );

          const exports = instance.exports as unknown as RnnoiseExports;

          this.wasmState = {
            pState: exports.rnnoise_create(),
            pData: exports.malloc(480 * 4),
            inputBuffer: [],
            outputBuffer: [],
            heap: new Float32Array(exports.memory.buffer),
            exports,
          };
        })();
      }
    }

    process([inputs]: Float32Array[][], [outputs]: Float32Array[][]) {
      if (+new Date() - this.last > 100) {
        this.last = +new Date();
        this.port.postMessage(0);
      }

      if (!this.wasmState) {
        outputs[0].set(inputs[0]);
        outputs[1].set(inputs[1]);
        return true;
      }

      for (let i = 0; i < 128; ++i) {
        this.wasmState.inputBuffer.push(inputs[0][i]);
      }

      while (this.wasmState.inputBuffer.length >= 480) {
        for (let i = 0; i < 480; ++i) {
          this.wasmState.heap[(this.wasmState.pData >> 2) + i] =
            (this.wasmState.inputBuffer.shift() || 0) * 0x7fff;
        }

        this.wasmState.exports.rnnoise_process_frame(
          this.wasmState.pState,
          this.wasmState.pData,
          this.wasmState.pData
        );

        for (let i = 0; i < 480; i++) {
          this.wasmState.outputBuffer.push(
            this.wasmState.heap[(this.wasmState.pData >> 2) + i] / 0x7fff
          );
        }
      }

      if (this.wasmState.outputBuffer.length > 128) {
        for (let i = 0; i < 128; ++i) {
          outputs[0][i] = this.wasmState.outputBuffer.shift() || 0;
        }

        outputs[1].set(outputs[0]);
      }

      return true;
    }
  }
);
