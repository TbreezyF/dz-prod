module.exports = {
    process: async function(url) {
        const imagemin = require('./imgOptimizer.js');
        let urlToArray = [];
        let image;

        urlToArray.push(url);
        image = await imagemin.optim(urlToArray);
        return image[0].toString('base64');
    }
}