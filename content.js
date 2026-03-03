(function () {
    if (window.__FULL_PAGE_SCREENSHOT_INJECTED) {
        return;
    }
    window.__FULL_PAGE_SCREENSHOT_INJECTED = true;

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'START_CAPTURE') {
            startCapture().catch(e => {
                console.error('截图失败:', e);
                restorePage();
            });
        }
    });

    let originalComputedStyles = new Map();
    let originalScrollPos = 0;
    let originalOverflow = '';
    function hideFixedElements() {
        // 隐藏所有的 position: fixed / sticky 元素
        const elements = document.querySelectorAll('*');
        for (let i = 0; i < elements.length; i++) {
            const el = elements[i];
            const style = window.getComputedStyle(el);
            if (style.position === 'fixed' || style.position === 'sticky') {
                // 保存原始样式以便后续恢复
                originalComputedStyles.set(el, {
                    opacity: el.style.opacity,
                    transition: el.style.transition
                });
                // 隐藏元素，去除过渡动画避免闪动
                el.style.transition = 'none';
                el.style.opacity = '0';
            }
        }
    }

    function restorePage() {
        // 恢复页面的滚动条
        document.documentElement.style.overflow = originalOverflow;
        for (const [el, styles] of originalComputedStyles.entries()) {
            el.style.transition = styles.transition;
            el.style.opacity = styles.opacity;
        }
        originalComputedStyles.clear();
        // 恢复原来的滚动位置
        window.scrollTo(0, originalScrollPos);
    }

    const wait = (ms) => new Promise(r => setTimeout(r, ms));

    async function startCapture() {
        originalScrollPos = window.scrollY;
        originalOverflow = document.documentElement.style.overflow;

        // 准备页面
        hideFixedElements();
        document.documentElement.style.overflow = 'hidden';
        window.scrollTo(0, 0);
        await wait(500); // 给页面足够的时间跳到顶部并重排

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const documentHeight = Math.max(
            document.body.scrollHeight, document.body.offsetHeight,
            document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight
        );

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        let canvasSetup = false;
        let scale = 1;

        let yPos = 0;
        while (yPos < documentHeight) {
            window.scrollTo(0, yPos);
            await wait(400); // 等待页面渲染和滚动结束

            const actualY = window.scrollY;

            const response = await new Promise(resolve => {
                chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' }, resolve);
            });

            if (response && response.dataUrl) {
                await new Promise(resolve => {
                    const img = new Image();
                    img.onload = () => {
                        if (!canvasSetup) {
                            scale = img.width / viewportWidth;
                            canvas.width = viewportWidth * scale;
                            canvas.height = documentHeight * scale;
                            canvasSetup = true;
                        }

                        ctx.drawImage(
                            img,
                            0, 0, img.width, img.height, // source
                            0, actualY * scale, img.width, img.height // dest
                        );
                        resolve();
                    };
                    img.src = response.dataUrl;
                });
            }

            // 如果再往下滚也滚不动了，说明已经到底
            if (actualY + viewportHeight >= documentHeight) {
                break;
            }
            yPos += viewportHeight;
        }

        restorePage();
        downloadCanvas(canvas);
    }

    function downloadCanvas(canvas) {
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const date = new Date();
            const pad = (n) => n.toString().padStart(2, '0');
            const str = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
            a.download = `截图_${str}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 'image/png');
    }
})();
