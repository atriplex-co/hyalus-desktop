registerProcessor(
  "echo-processor",
  class extends AudioWorkletProcessor {
    buffer: number[] = [];

    constructor(init: AudioWorkletProcessorInit) {
      super(init);

      this.buffer = [];

      this.port.onmessage = ({ data }) => {
        this.buffer.push(...(data as number[]));
      };
    }
    process(_inputs: Float32Array[][], [outputs]: Float32Array[][]) {
      if (this.buffer.length >= 256) {
        for (let i = 0; i < 128; ++i) {
          outputs[0][i] = this.buffer.shift() || 0;
          outputs[1][i] = this.buffer.shift() || 0;
        }
      }

      return true;
    }
  }
);
