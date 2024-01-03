const path = require("node:path");
const { notarize } = require("@electron/notarize");
const dotenv = require("dotenv");

dotenv.config();

module.exports = async (context) => {
  if (context.electronPlatformName === "darwin") {
    console.log("notarizing macOS app");

    let appBundleId = "";
    if (context.packager.appInfo.productName === "Hyalus") {
      appBundleId = "app.hyalus";
    }
    if (context.packager.appInfo.productName === "HyalusDev") {
      appBundleId = "app.hyalus.dev";
    }

    await notarize({
      appBundleId,
      appPath: path.join(context.appOutDir, `${context.packager.appInfo.productName}.app`),
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    });
  }
};
