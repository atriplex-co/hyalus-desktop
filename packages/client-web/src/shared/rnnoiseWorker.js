registerProcessor(
  "rnnoise-processor",
  class extends AudioWorkletProcessor {
    constructor(init) {
      super(init);

      (async () => {
        const { instance } = await WebAssembly.instantiate(
          init.processorOptions.wasm
        );

        this.config = {
          instance,
          pState: instance.exports.rnnoise_create(),
          pData: instance.exports.malloc(480 * 4), // don't touch this.
          inputBuffer: [],
          outputBuffer: [],
          heap: new Float32Array(instance.exports.memory.buffer),
        };
      })();
    }

    process([inputs], [outputs]) {
      if (!this.config) {
        return true;
      }

      if (!inputs[0]) {
        this.config.instance.exports.free(this.config.pState);
        this.config.instance.exports.free(this.config.pData);
        return;
      }

      for (let i = 0; i < 128; ++i) {
        this.config.inputBuffer.push(inputs[0][i]);
      }

      while (this.config.inputBuffer.length >= 480) {
        for (let i = 0; i < 480; ++i) {
          this.config.heap[(this.config.pData >> 2) + i] =
            this.config.inputBuffer.shift() * 0x7fff;
        }

        this.config.instance.exports.rnnoise_process_frame(
          this.config.pState,
          this.config.pData,
          this.config.pData
        );

        for (let i = 0; i < 480; i++) {
          this.config.outputBuffer.push(
            this.config.heap[(this.config.pData >> 2) + i] / 0x7fff
          );
        }
      }

      if (this.config.outputBuffer.length > 128) {
        for (let i = 0; i < 128; ++i) {
          outputs[0][i] = this.config.outputBuffer.shift();
        }

        outputs[1].set(outputs[0]);
      }

      return true;
    }
  }
);
