registerProcessor(
  "echo-processor",
  class extends AudioWorkletProcessor {
    buffer = new Float32Array(4096);
    inputIndex = 0;
    outputIndex = 0;
    ready = false;

    constructor(init: AudioWorkletProcessorInit) {
      super(init);

      this.port.onmessage = (e) => {
        const data = e.data as Float32Array;

        for (let i = 0; i < data.length; ++i) {
          this.buffer[this.inputIndex] = data[i];
          ++this.inputIndex;

          if (this.inputIndex === this.outputIndex) {
            this.ready = false;
          }

          if (this.inputIndex === this.buffer.length) {
            this.inputIndex = 0;
            this.ready = true;
          }
        }
      };
    }

    process(_inputs: Float32Array[][], [outputs]: Float32Array[][]) {
      if (!this.ready) {
        return true;
      }

      for (let i = 0; i < 128; ++i) {
        outputs[0][i] = this.buffer[this.outputIndex];
        outputs[1][i] = this.buffer[this.outputIndex + 1];

        this.buffer[this.outputIndex] = 0;
        this.buffer[this.outputIndex + 1] = 0;

        this.outputIndex += 2;

        if (this.outputIndex === this.buffer.length) {
          this.outputIndex = 0;
        }
      }

      return true;
    }
  }
);
