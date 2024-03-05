"use strict";
import { app, session, protocol, BrowserWindow, nativeImage, Tray, ipcMain, ipcRenderer, shell, Menu, screen, globalShortcut } from "electron";
// window.ipcRenderer = require("electron");
import installExtension, { VUEJS_DEVTOOLS } from "electron-devtools-installer";
const isDevelopment = process.env.NODE_ENV !== "production";
const path = require("path");
const  fs  = require("fs");
const logFilePath = path.join(__dirname, "client.log");
const configPath = app.isPackaged ? path.join(path.dirname(app.getPath("exe")), "./config.json") : path.join(__dirname, ".././config.json");
const configData = fs.readFileSync(configPath);
const config = JSON.parse(configData);
const { join } = require('path');
// import logger from './logger';

let indexHtml = ""; //主页面
let messageUnreadHtml = ""; //未读消息页面
let chatHtml = ""; //音视频窗口
let iconPath = "";
// 创建一个全局变量来保存账号和密码
let accountData = {};
// 线上地址
if (app.isPackaged) {
  iconPath = path.join(path.dirname(app.getPath("exe")), "/resources/app/256.ico");
  indexHtml = config.indexHtml_url + "/client";
  messageUnreadHtml = config.indexHtml_url + "/client/messageReminder.html#/";
  chatHtml = config.indexHtml_url + "/client/audioAsvideo.html#/";
} else {
  iconPath = path.join(__dirname, "../src/assets/256.ico");
  indexHtml = "http://localhost:8086";
  // indexHtml = config.indexHtml_url + "/client";
  messageUnreadHtml = "http://localhost:8086/messageReminder.html#/";
  chatHtml = "http://localhost:8086/audioAsvideo.html#/";
  setTimeout(() => {
    windows.mainWindow.webContents.openDevTools(); //打开控制台
  }, 2000);
}
// setTimeout(() => {
//   windows.mainWindow.webContents.openDevTools(); //打开控制台
// }, 2000);

// // 快捷键注册
function registryShortcut() {
  // 注册全局快捷键
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    windows.mainWindow.webContents.openDevTools();
  });
  globalShortcut.register('Ctrl+Shift+I', () => {
    windows.mainWindow.webContents.openDevTools();
  });
}

// setTimeout(() => {
//   windows.mainWindow.webContents.openDevTools(); //打开控制台
// }, 2000);
console.log("查看配置文件", config);

// 设置代理
// app.commandLine.appendSwitch("proxy-server", "http://39.100.70.118:8021");

app.commandLine.appendSwitch("disable-features", "OutOfBlinkCors", "wm-window-animations-disabled");
//所有窗体
let windows = {
  splashWindow: null, //启动页
  mainWindow: null, //主窗口
  chatWindow: null, //音视频窗口
  messageUnreadWindow: null, //消息未读列表接口
};
// 音视频信息
let mettingInfo = {};

//系统托盘实例
let appTray = null;
let isLogin = false; //是否登录状态
// 设置应用程序的唯一标识符
// app.setAppUserModelId('com.elon.yxtapp');

// // 检测是否为单实例运行
const gotTheLock = app.requestSingleInstanceLock();
console.log("看看这个数值", gotTheLock);

// if (!gotTheLock) {
//   app.quit();
// }
// 创建音视频窗口的方法
function createChatWindow() {
  // 创建聊天窗口
  windows.chatWindow = new BrowserWindow({
    width: 300,
    height: 100,
    frame: false, // 去掉窗口边框
    show: false, // 初始时不显示窗口
    alwaysOnTop:true,
    webPreferences: {
      sandbox: false, // 开启沙盒则preload脚本被禁用，所以得设为false
      preload: path.join(__dirname, "preload.js"),
      webSecurity: false, //禁用同源策略
      nodeIntegration: true, //是否开启在渲染进程中node的环境
      nodeIntegrationInWorker: true,
      contextIsolation: false, //关闭独立加载electron API
      partition: String(+new Date()),
      // devTools: true,
    },
  });
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  windows.chatWindow.setPosition(width - 300, height - 100);

  // 加载聊天窗口的 HTML 内容
  windows.chatWindow.loadURL(chatHtml);

  // 当聊天窗口关闭时隐藏窗口而不是退出应用程序
  windows.chatWindow.on("close", (event) => {
    event.preventDefault();
    windows.chatWindow.hide();
  });
  windows.chatWindow.on("closed", () => {
    // 在窗口对象被关闭时，取消订阅所有与该窗口相关的事件
    // windows.chatWindow ? windows.chatWindow.removeAllListeners() : windows.chatWindow = null;
    windows.chatWindow = null;
  });
}
// 创建主进程
const createMainWindow = () => {
  // Create the browser window.
  windows.mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 1000,
    minHeight: 700,
    show: false, //初始化关闭
    // frame: false, // 无边框
    icon: iconPath, // 窗口图标
    webPreferences: {
      sandbox: false, // 开启沙盒则preload脚本被禁用，所以得设为false
      preload: path.join(__dirname, "preload.js"),
      webSecurity: false, //禁用同源策略
      nodeIntegration: true, //是否开启在渲染进程中node的环境
      enableRemoteModule: true,
      nodeIntegrationInWorker: true,
      contextIsolation: false, //关闭独立加载electron API
      partition: String(+new Date()),
      nativeWindowOpen: true, //  该配置使用chrome原生方法避免白屏窗口出现
      devTools: true,
    },
  });
  windows.mainWindow.setMenu(null); //隐藏菜单栏

  windows.mainWindow.loadURL(indexHtml);

  // 读取保存的账号数据
  const accountPath = join(app.getPath('userData'), 'account.json');
  if (fs.existsSync(accountPath)) {
    const accountContent = fs.readFileSync(accountPath, 'utf-8');
   
    accountData = JSON.parse(accountContent);
    // console.log("读取本都存储的账号",accountData)
  }



  // 主窗口加载完成后显示
  windows.mainWindow.once("ready-to-show", () => {
    console.log("主进程进入到方法中");
    windows.mainWindow.show();
    windows.splashWindow.hide(); //关闭启动页
      // 将账号数据发送给渲染进程
      windows.mainWindow.webContents.send('pong', {type:"accountData", params:accountData});
  });
  // 创建快捷键
  registryShortcut();
  //创建系统托盘
  createAppTray();
  windows.mainWindow.on("close", (event) => {
    console.log("===这是关闭方法===");
    event.preventDefault();
    windows.mainWindow.webContents.send("pong", {
      type: "minimize",
    });
    windows.mainWindow.hide();
 
    // windows.mainWindow = null;

    // appTray ? appTray.destroy() : (appTray = null);
    // appTray = null;
  });
  // 最小化监听
  windows.mainWindow.on("minimize", (event) => {
    console.log("=====最小化====");
    windows.mainWindow.webContents.send("pong", {
      type: "minimize",
    });
  });
  // 恢复窗口
  windows.mainWindow.on("restore", (event) => {
    console.log("====显示出来=====");
    windows.mainWindow.webContents.send("pong", {
      type: "restore",
    });
  });
  windows.mainWindow.on("closed", () => {
    // 在窗口对象被关闭时，取消订阅所有与该窗口相关的事件
    // windows.chatWindow ? windows.mainWindow.removeAllListeners() : windows.chatWindow = null;
    // windows.mainWindow = null;
  });

  // 创建第一个代理会话
  const proxySession1 = session.fromPartition("proxy1");
  proxySession1.setProxy({
    proxyRules: "http://39.100.70.118:8221",
  });

  // 创建第二个代理会话
  const proxySession2 = session.fromPartition("proxy2");
  proxySession2.setProxy({
    proxyRules: "http://39.100.70.118:8222",
  });
};
// 创建消息未读列表
function createMessageUnreadWindow(options) {
  windows.messageUnreadWindow = new BrowserWindow(
    Object.assign(
      {
        width: 240,
        minHeight: 140,
        height: 140,
        frame: false, // 去掉窗口边框
        show: false, // 初始时不显示窗口
        alwaysOnTop:true,
        webPreferences: {
          sandbox: false, // 开启沙盒则preload脚本被禁用，所以得设为false
          preload: path.join(__dirname, "preload.js"),
          webSecurity: false, //禁用同源策略
          nodeIntegration: true, //是否开启在渲染进程中node的环境
          nodeIntegrationInWorker: true,
          contextIsolation: false, //关闭独立加载electron API
          partition: String(+new Date()),
          devTools: true,
        },
      },
      options
    )
  );
  windows.messageUnreadWindow.loadURL(messageUnreadHtml); // 加载对应的菜单栏页面
  // 当聊天窗口关闭时隐藏窗口而不是退出应用程序
  windows.messageUnreadWindow.on("close", (event) => {
    event.preventDefault();
    windows.messageUnreadWindow = null;
  });
  windows.messageUnreadWindow.on("closed", () => {
    // 在窗口对象被关闭时，取消订阅所有与该窗口相关的事件
    // windows.chatWindow ? windows.messageUnreadWindow.removeAllListeners() : windows.chatWindow = null;
    windows.messageUnreadWindow = null;
  });
}

// 创建启动页
function createdSplashWindow() {
  // 创建启动动画窗口
  windows.splashWindow = new BrowserWindow({
    width: 800,
    height: 500,
    frame: false, // 可以去掉窗口边框
    transparent: true, // 设置窗口背景透明
    alwaysOnTop: true, // 确保启动动画窗口始终在最顶层
    webPreferences: {
      nodeIntegration: true, // 如果需要在启动动画界面中使用 Node.js API，需要启用 nodeIntegration
    },
  });

  // 加载启动动画的 HTML 文件
  windows.splashWindow.loadFile("loading.html");
}
/**
 * 创建系统托盘
 */

let isUnread = false; //是否显示未读消息框

function createAppTray() {
  if (windows.mainWindow == null) return;
  //系统托盘
  appTray = new Tray(iconPath);
  //系统托盘的提示文本
  appTray.setToolTip("易信通");
  // const trayContextMenu = Menu.buildFromTemplate(menuList);
  // //系统托盘右键点击事件
  // appTray.on("right-click", () => {
  //   appTray.popUpContextMenu(trayContextMenu); //显示系统托盘菜单
  // });
  const trayContextMenu = Menu.buildFromTemplate([
    {
      label: "关闭",
      click: () => {
        // if (windows.mainWindow != null) {
        //   windows.mainWindow.webContents.send("pong", {
        //     type: "logout",
        //   });
        // }
        app.quit();
      },
    },
  ]);
  //系统托盘右键点击事件
  appTray.on("right-click", () => {
    appTray.popUpContextMenu(trayContextMenu); //显示系统托盘菜单
  });
  //点击系统托盘打开窗口
  appTray.on("click", () => {
    windows.mainWindow.show();
  });
  //鼠标经过托盘图标时，出现自定义系统通知窗口
  if (process.platform !== "darwin") {
    //非mac系统时出现
    // console.log(appTray, "鼠标划过托盘的时候");

    const appTrayBounds = appTray.getBounds(); //获取系统托盘所在位置
    createMessageUnreadWindow({ x: appTrayBounds.x, y: appTrayBounds.y }); //创建 鼠标经过托盘图标时出现的自定义系统通知窗口

    let isLeaveTray = true; //存储鼠标是否离开托盘的状态
    let isLeaveTimer = null;

    appTray.on("mouse-move", () => {
      if (!isLogin) return; //退出登录就不再展示未读列表
      // console.log("进入托盘",isLogin);
      //系统托盘鼠标经过时触发
      // 主进程给im发消息获取未读列表
      if (windows.mainWindow != null) {
        windows.mainWindow.webContents.send("pong", { type: "unread" });
      }

      // 消息列表如果为空那就没有弹框
      if (!isUnread) return;
      const appTrayBounds = appTray.getBounds(); //获取系统托盘所在位置
      let params = {};
      if (isLeaveTray) {
        if (!params.x) {
          params.x = appTrayBounds.x - 220 / 2;
        }
        if (!params.y) {
          params.y = appTrayBounds.y - windows.messageUnreadWindow.getBounds().height;
        }
        if (params.x < 0) {
          params.x = screen.getPrimaryDisplay().bounds.width - params.x;
        }
        if (params.y < 0) {
          params.y = screen.getPrimaryDisplay().bounds.height - params.y;
        }
        windows.messageUnreadWindow.setBounds(params);

        windows.messageUnreadWindow.show(); //显示自定义系统通知窗口
      }
      isLeaveTray = false;

      //检查鼠标是否从托盘离开
      clearInterval(isLeaveTimer);
      isLeaveTimer = setInterval(() => {
        let point = screen.getCursorScreenPoint();
        // 判断鼠标是否再托盘内
        if (!(appTrayBounds.x < point.x && appTrayBounds.y < point.y && point.x < appTrayBounds.x + appTrayBounds.width && point.y < appTrayBounds.y + appTrayBounds.height)) {
          // 判断鼠标是否在弹出菜单内
          let menuBounds = windows.messageUnreadWindow ? windows.messageUnreadWindow.getBounds() : "";
          if (menuBounds && menuBounds.x < point.x && menuBounds.y < point.y && point.x < menuBounds.x + menuBounds.width && point.y < menuBounds.y + menuBounds.height) {
            //  console.log('鼠标在新消息菜单内');
            return;
          }
          // 触发 mouse-leave
          clearInterval(isLeaveTimer);
          windows.messageUnreadWindow.hide(); // 隐藏自定义系统通知窗口
          isLeaveTray = true;
          console.log("鼠标离开系统托盘图标");
        } else {
          // console.log('鼠标在系统托盘图标内');
        }
      }, 100);
    });
  }
}
//  设置主窗口任务栏闪烁、系统托盘图闪烁
let flashTimer = null;
function flashFrame(isFlash) {
  //设置任务栏 窗口 闪烁
  // windows.mainWindow ? windows.mainWindow.flashFrame(isFlash) : "";
  //设置系统托盘闪烁
  if (isFlash) {
    clearInterval(flashTimer);
    let flag = false;
    console.log("查看--electron日志---", appTray);
    flashTimer = setInterval(() => {
      flag = !flag;
      if (flag) {
        appTray ? appTray.setImage(nativeImage.createEmpty()) : "";
      } else {
        appTray ? appTray.setImage(iconPath) : "";
      }
    }, 500);
  } else {
    appTray ? appTray.setImage(iconPath) : "";
    clearInterval(flashTimer);
  }
}
// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([{ scheme: "app", privileges: { secure: true, standard: true } }]);

// Quit when all windows are closed.
// 应用程序关闭之前调用的方法
app.on("window-all-closed", () => {
  console.log("看看是否生效");
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
  app.quit();
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

app.on("ready", async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS_DEVTOOLS);
      // 设置安全策略
      app.commandLine.appendSwitch("disable-features", "OutOfBlinkCors");
    } catch (e) {
      console.error("Vue Devtools failed to install:", e.toString());
    }
  }
  // 核心代码保证应用唯一性
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    app.quit();
  }
  createdSplashWindow(); //启动页
  createMainWindow();
  createChatWindow();
  // 给web传递url地址
  setTimeout(() => {
    if (windows.mainWindow != null) {
      windows.mainWindow.webContents.send("pong", {
        type: "serverUrl",
        params: config,
      });
    }
  }, 2000);
  setTimeout(() => {
    if (windows.mainWindow != null) {
      windows.mainWindow.webContents.send("pong", {
        type: "serverUrl",
        params: config,
      });
    }
  }, 20000);
});

// 注册 beforeQuit 事件的处理函数
app.on("before-quit", async () => {
  // 这里写入需要执行的操作或者保存未完成的工作等
  // 传递信息给web退出登录
  console.log("这是销毁前最后一条消息");
  // await appTray.destroy(); //销毁托盘
  // appTray = null;
  console.log("测试退出时需要处理");
  await app.quit();
  // ipcRenderer.send("pong", "你好 我是主进程");
});
// app.on('will-quit', () => {
//   globalShortcut.unregisterAll();
// });
//当Electron 初始化完成时触发
app.whenReady().then(() => {
  // 注册快捷键
  // if (!isDevelopment) {
  //   registryShortcut();
  // }
  // createMainWindow(); //创建主窗口
  // app.on("activate", () => {
  //   // macOS 应用通常即使在没有打开任何窗口的情况下也继续运行，并且在没有窗口可用的情况下激活应用时会打开新的窗口。
  //   if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  // });
});

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === "win32") {
    process.on("message", (data) => {
      if (data === "graceful-exit") {
        app.quit();
      }
    });
  } else {
    process.on("SIGTERM", () => {
      app.quit();
    });
  }
}

console.log("打印ipcMain实例====>",ipcMain)
ipcMain.on("ping", (e, args) => {
  console.log("这里是主进程ping", args);
  if (args.code) {
    switch (args.code) {
      case "1022": {
        // if(args.unreadMessageNumber == 0){
        //   flashFrame(false); //取消系统托盘闪烁
        // }
        args.unreadMessageNumber == 0 ? flashFrame(false) : flashFrame(true);
        break;
      }
    }
  }
  // 卡片消息查看详情的方法
  if (args.type == "openWeb") {
    shell.openExternal(args.url);
  }
  // 判断系统登录了才开启托盘消息
  if (args.type == "login") {
    const trayContextMenu = Menu.buildFromTemplate([
      {
        label: "设置",
        click: () => {
          if (windows.mainWindow != null) {
            windows.mainWindow.webContents.send("pong", {
              type: "settingsIM",
            });
          }
        },
      },
      {
        label: "关于",
        click: () => {
          windows.mainWindow.show();
          if (windows.mainWindow != null) {
            windows.mainWindow.webContents.send("pong", {
              type: "about",
            });
          }
        },
      },
      {
        label: "退出",
        click: () => {
          if (windows.mainWindow != null) {
            windows.mainWindow.webContents.send("pong", {
              type: "logout",
            });
          }
          app.quit();
        },
      },
    ]);
    //系统托盘右键点击事件
    appTray.on("right-click", () => {
      appTray.popUpContextMenu(trayContextMenu); //显示系统托盘菜单
    });
  }
  // 获取im系统配置
  // if(args.type == 'settings'){
  //     if(args.params.messageRemindState == 0){

  //     }
  // }

  // im收到了音视频
  if (args.type == "audioAsvcideo") {
    console.log("音视频逻辑---》", args.params);
    // 这里拿到音视频的信息
    mettingInfo = args.params;
    // 来视频
    if (mettingInfo.call.callOperate == "CALL") {
      windows.chatWindow.show();
      if (windows.chatWindow != null) {
        windows.chatWindow.webContents.send("pong", {
          type: "videoParams",
          params: args.params,
        });
      }
    } else {
      windows.chatWindow.hide();
    }
  }
  //接听视频
  if (args.type == "answer") {
    windows.chatWindow.hide();
    if (windows.mainWindow != null) {
      windows.mainWindow.webContents.send("pong", {
        type: "answer",
        params: mettingInfo,
      });
    }
  }
  // 挂断视频
  if (args.type == "hangup") {
    windows.chatWindow.hide();
    if (windows.mainWindow != null) {
      windows.mainWindow.webContents.send("pong", {
        type: "hangup",
        params: mettingInfo,
      });
    }
  }
  // 接收到未读消息列表
  if (args.type == "unreadList") {
    if (isLogin == false) return;
    isUnread = true;
    const length = args.params.page.list.length;
    let height = 30 + (length >= 5 ? 350 : length * 70);
    if (length == 2) {
      height = 200;
    }
    if (length == 3) {
      height = 260;
    }
    console.log("看看这些参数", length, height);
    if (length == 0) {
      isUnread = false;
      flashFrame(false);
      windows.messageUnreadWindow.hide();
      return;
    }
    windows.messageUnreadWindow.setSize(240, height);
    if (windows.messageUnreadWindow != null) {
      windows.messageUnreadWindow.webContents.send("pong", {
        type: "unreadList",
        params: args.params,
      });
    }
  }
  // 点击未读消息会话
  if (args.type == "selectSession") {
    if (windows.mainWindow != null) {
      windows.mainWindow.webContents.send("pong", {
        type: "selectSession",
        params: args.params,
      });
    }

    windows.messageUnreadWindow.hide();
    windows.mainWindow.show();
  }
  if (args.type == "login") {
    isLogin = true;
    // 保存账号数据
  accountData = args.params;
  const accountPath = join(app.getPath('userData'), 'account.json');
  fs.writeFileSync(accountPath, JSON.stringify(accountData));
  }
  if (args.type == "logout") {
    isLogin = false;
    windows.messageUnreadWindow.hide();
    windows.chatWindow.hide();
    flashFrame(false);
  }

  // e.sender.send("pong", "你好 我是主进程");
});

// // 处理登录事件
// ipcMain.on('login', (event, account) => {
//   // 保存账号数据
//   accountData = account;
//   const accountPath = join(app.getPath('userData'), 'account.json');
//   writeFileSync(accountPath, JSON.stringify(accountData));

//   // 其他登录处理逻辑...
// });
