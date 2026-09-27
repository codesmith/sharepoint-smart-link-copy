import { ContextMenuController } from './ContextMenuController.js';

const controller = new ContextMenuController();

chrome.runtime.onInstalled.addListener(() => {
  controller.registerMenu();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  controller.handleMenuClicked(info, tab);
});
