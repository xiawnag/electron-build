// /**
//  * The preload script runs before. It has access to web APIs
//  * as well as Electron's renderer process modules and some
//  * polyfilled Node.js functions.
//  *
//  * https://www.electronjs.org/docs/latest/tutorial/sandbox
//  */
// window.addEventListener('DOMContentLoaded', (e) => {
//     console.log("测试这个方法是否进去",e)
//     // const replaceText = (selector, text) => {
//     //   const element = document.getElementById(selector)
//     //   if (element) element.innerText = text
//     // }

//     // for (const type of ['chrome', 'node', 'electron']) {
//     //   replaceText(`${type}-version`, process.versions[type])
//     // }
//   })
// import { ipcMain } from "electron";
// ipcMain.on("send_message_load", (event,arg) => {
//   console.log(arg); // prints "ping"
//   event.reply("asynchronous-reply", "pong");
// });

// const { ipcRenderer } = require('electron')

// window.ipcRenderer = ipcRenderer;
const { ipcRenderer } = require("electron");

window.ipcRenderer = {
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  on: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
  },
};
