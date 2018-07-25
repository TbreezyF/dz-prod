module.exports = {
        image: async(shop) => {
                return new Promise(function(resolve) {
                    const puppeteer = require('puppeteer');
                    const imagemin = require('./imgOptimizer.js');
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
                        const buffer = await imagemin.gen(Buffer.from(base64, 'base64'));
                        const result = buffer.toString('base64');
                        await browser.close();
                        resolve(result);
                    })();
                });
            } //END Image
    } //END Module