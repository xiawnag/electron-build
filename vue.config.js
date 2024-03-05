const { defineConfig } = require("@vue/cli-service");
module.exports = defineConfig({
  transpileDependencies: true,

  pluginOptions: {
    electronBuilder: {
      // assetsPublicPath: "./",
      builderOptions: {
        productName: "易信通", // 应用名称
        extraResources: [{ from: "./config.json", to: "../" }],
        asar: false,
        directories: {
          output: "dist_electron", // 输出文件夹
        },
        win: {
          icon: "./public/256.ico",
        },
        mac: {
          target: "dmg",
          icon: "./public/256.ico",
        },
        linux: {
          target: "deb", // 打包为 deb 安装包
          icon: "./public/256.ico",
        },
        nsis: {
          oneClick: false, // 一键安装
          perMachine: true, // 是否开启安装时权限限制（此电脑或当前用户）
          allowElevation: true, // 允许请求提升。 如果为false，则用户必须使用提升的权限重新启动安装程序。
          allowToChangeInstallationDirectory: true, // 允许修改安装目录
          installerIcon: "./public/256.ico", // 安装图标
          uninstallerIcon: "./public/256.ico", //卸载图标
          installerHeaderIcon: "./public/256.ico", // 安装时头部图标
          createDesktopShortcut: true, // 创建桌面图标
          createStartMenuShortcut: true, // 创建开始菜单图标
        },
      },
      preload: "public/preload.js", //指定preload路径
    },
  },
});
