chrome.action.onClicked.addListener(async (tab) => {
  // 当点击图标时，注入 content script 并触发截图开始
  if (!tab.url || !tab.url.startsWith('http')) {
    console.error('无法在当前页面截图');
    return;
  }
  
  try {
    // 注入 content.js
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    
    // 给 content script 发送开始命令
    chrome.tabs.sendMessage(tab.id, { type: 'START_CAPTURE' });
  } catch (err) {
    console.error('注入脚本失败或发送消息失败: ', err);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'CAPTURE_VISIBLE_TAB') {
    chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' }, (dataUrl) => {
      sendResponse({ dataUrl });
    });
    // 返回 true 表示保持消息通道打开直到 sendResponse 被异步调用
    return true; 
  }
});
