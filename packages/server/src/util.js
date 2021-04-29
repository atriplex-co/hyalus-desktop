const ffmpeg = require("fluent-ffmpeg");

module.exports.ffmpeg = (cmd) => {
  return new Promise((resolve, reject) => {
    cmd
      .on("end", resolve)
      .on("error", (err) => reject(err))
      .run();
  });
};

module.exports.ffprobe = (file) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file, (err, data) => {
      if (err !== null) {
        return reject(err);
      }

      resolve(data);
    });
  });
};
