registerProcessor(
  "rnnoise-processor",
  class extends AudioWorkletProcessor {
    constructor(init) {
      super(init);

      this.config = {
        last: +new Date(),
      };

      if (init.processorOptions.wasm) {
        (async () => {
          const { instance } = await WebAssembly.instantiate(
            init.processorOptions.wasm
          );

          this.config.pState = instance.exports.rnnoise_create();
          this.config.pData = instance.exports.malloc(480 * 4); // don't touch this.
          this.config.inputBuffer = [];
          this.config.outputBuffer = [];
          this.config.heap = new Float32Array(instance.exports.memory.buffer);
          this.config.instance = instance;
        })();
      }
    }

    process([inputs], [outputs]) {
      if (+new Date() - this.config.last > 50) {
        this.config.last = +new Date();
        this.port.postMessage(0);
      }

      if (!this.config.instance) {
        outputs[0].set(inputs[0]);
        outputs[1].set(inputs[1]);
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
