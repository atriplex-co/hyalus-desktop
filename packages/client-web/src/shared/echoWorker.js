const bufferSize = 4096;

registerProcessor(
  "echo-processor",
  class extends AudioWorkletProcessor {
    constructor(init) {
      super(init);

      this.buffer = [];
      this.bufferFilling = true;

      this.port.onmessage = ({ data }) => {
        this.buffer.push(...data);
      };
    }
    process([inputs], [outputs]) {
      if (this.buffer.length < 256) {
        this.bufferFilling = true;
      }

      if (this.bufferFilling && this.buffer.length > bufferSize) {
        this.bufferFilling = false;
      }

      if (!this.bufferFilling) {
        for (let i = 0; i < 128; ++i) {
          outputs[0][i] = this.buffer.shift();
          outputs[1][i] = this.buffer.shift();
        }
      }

      return true;
    }
  }
);
