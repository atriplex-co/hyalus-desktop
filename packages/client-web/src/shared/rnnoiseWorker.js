import Rnnoise from "@hyalusapp/rnnoise";

registerProcessor(
  "rnnoise-processor",
  class extends AudioWorkletProcessor {
    constructor(init) {
      super(init);

      (async () => {
        const rnnoise = await Rnnoise({
          locateFile() {
            return "";
          },
          async instantiateWasm(imports, cb) {
            const { module, instance } = await WebAssembly.instantiate(
              init.processorOptions.wasm,
              imports
            );

            cb(instance, module);
          },
        });

        this.config = {
          rnnoise,
          pState: rnnoise._rnnoise_create(),
          pData: rnnoise._malloc(480 * 4),
          inputBuffer: [],
          outputBuffer: [],
        };
      })();
    }

    process([inputs], [outputs]) {
      if (!this.config) {
        return true;
      }

      if (!inputs[0]) {
        this.config.rnnoise._free(this.config.pState);
        this.config.rnnoise._free(this.config.pData);
        return;
      }

      for (let i = 0; i < 128; ++i) {
        this.config.inputBuffer.push(inputs[0][i]);
      }

      while (this.config.inputBuffer.length >= 480) {
        for (let i = 0; i < 480; ++i) {
          this.config.rnnoise.HEAPF32[(this.config.pData >> 2) + i] =
            this.config.inputBuffer.shift() * 0x7fff;
        }

        this.config.rnnoise._rnnoise_process_frame(
          this.config.pState,
          this.config.pData,
          this.config.pData
        );

        for (let i = 0; i < 480; i++) {
          this.config.outputBuffer.push(
            this.config.rnnoise.HEAPF32[(this.config.pData >> 2) + i] / 0x7fff
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
