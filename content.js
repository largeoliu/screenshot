(function () {
    if (window.__FULL_PAGE_SCREENSHOT_INJECTED) {
        return;
    }
    window.__FULL_PAGE_SCREENSHOT_INJECTED = true;

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'START_CAPTURE') {
            startCapture().catch(e => {
                console.error('截图失败:', e);
            });
        }
    });

    async function startCapture() {
        // 直接向 background 发送截图当前可见标签页的请求
        const response = await new Promise(resolve => {
            chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' }, resolve);
        });

        if (response && response.dataUrl) {
            downloadDataUrl(response.dataUrl);
        } else {
            console.error('未获取到截图数据');
        }
    }

    function downloadDataUrl(dataUrl) {
        const a = document.createElement('a');
        a.href = dataUrl;
        
        // 生成时间字符串作为文件名
        const date = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        const str = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
        
        a.download = `截图_${str}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
})();
