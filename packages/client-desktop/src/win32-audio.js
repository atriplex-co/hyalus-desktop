const win32Audio = require("@hyalusapp/win32-audio");

win32Audio.start(+process.env.HANDLE, (val) => {
  process.send(val);
});
