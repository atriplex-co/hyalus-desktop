registerProcessor(
  "echo-processor",
  class extends AudioWorkletProcessor {
    constructor(init) {
      super(init);

      this.buffer = [];

      this.port.onmessage = ({ data }) => {
        this.buffer.push(...data);
      };
    }
    process([inputs], [outputs]) {
      if (this.buffer.length >= 256) {
        for (let i = 0; i < 128; ++i) {
          outputs[0][i] = this.buffer.shift();
          outputs[1][i] = this.buffer.shift();
        }
      }

      return true;
    }
  }
);
