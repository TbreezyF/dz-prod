module.exports = {
        image: async(shop) => {
                return new Promise(function(resolve) {
                    const puppeteer = require('puppeteer');
                    (async() => {
                        const browser = await puppeteer.launch();
                        const page = await browser.newPage();
                        await page.setViewport({
                            width: 375,
                            height: 667,
                            isMobile: true,
                        });
                        await page.goto('https://' + shop);
                        const base64 = await page.screenshot({ encoding: 'base64' });
                        await browser.close();
                        resolve(base64);
                    })();
                });
            } //END Image
    } //END Module