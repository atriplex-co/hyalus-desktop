registerProcessor(
  "rnnoise-processor",
  class extends AudioWorkletProcessor {
    constructor(init) {
      super(init);

      this.last = +new Date();
      this.wasm = init.processorOptions.wasm;

      if (this.wasm) {
        (async () => {
          const { instance } = await WebAssembly.instantiate(this.wasm);

          this.pState = instance.exports.rnnoise_create();
          this.pData = instance.exports.malloc(480 * 4); // don't touch this.
          this.inputBuffer = [];
          this.outputBuffer = [];
          this.heap = new Float32Array(instance.exports.memory.buffer);
          this.instance = instance;
        })();
      }
    }

    process([inputs], [outputs]) {
      if (+new Date() - this.last > 50) {
        this.last = +new Date();
        this.port.postMessage(0);
      }

      if (!this.wasm) {
        outputs[0].set(inputs[0]);
        outputs[1].set(inputs[1]);
      }

      if (!this.instance) {
        return true;
      }

      for (let i = 0; i < 128; ++i) {
        this.inputBuffer.push(inputs[0][i]);
      }

      while (this.inputBuffer.length >= 480) {
        for (let i = 0; i < 480; ++i) {
          this.heap[(this.pData >> 2) + i] = this.inputBuffer.shift() * 0x7fff;
        }

        this.instance.exports.rnnoise_process_frame(
          this.pState,
          this.pData,
          this.pData
        );

        for (let i = 0; i < 480; i++) {
          this.outputBuffer.push(this.heap[(this.pData >> 2) + i] / 0x7fff);
        }
      }

      if (this.outputBuffer.length > 128) {
        for (let i = 0; i < 128; ++i) {
          outputs[0][i] = this.outputBuffer.shift();
        }

        outputs[1].set(outputs[0]);
      }

      return true;
    }
  }
);
