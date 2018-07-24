const request = require('request-promise').defaults({ encoding: null });
const sharp = require('sharp');

module.exports = {
    optim: (urls) => {
        return new Promise((resolve) => {
            getOptimizedImages(urls).then((imageData) => {
                resolve(imageData);
            });
        });
    }
}

async function getOptimizedImages(urls) {
    let imgBuffers = await getImageBuffers(urls);
    let imageData = [];

    for (let i = 0; i < imgBuffers.length; i++) {
        imageData.push(await sharp(imgBuffers[i]).jpeg().toBuffer());
    }
    return imageData;
}

async function getImageBuffers(urls) {
    let result = [];
    for (let i = 0; i < urls.length; i++) {
        result.push(await getImageBuffer(urls[i]));
    }
    return result;
}

function getImageBuffer(url) {
    return new Promise((resolve, reject) => {
        request.get(url, (err, data) => {
            if (err) {
                reject(new Error(err));
            } else {
                resolve(data.body);
            }
        });
    });
}