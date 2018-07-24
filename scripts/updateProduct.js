module.exports = {
    update: async function(shop, product_id, images, postRequestHeaders) {
        const request = require('request-promise');
        const util = require('util');
        let productURL = 'https://' + shop + '/admin/products/' + product_id + ".json";

        let product = {
            product: {
                id: product_id,
                images: images
            }
        }

        let productResponse = await request({
            url: productURL,
            method: "PUT",
            headers: postRequestHeaders,
            json: true,
            body: product
        });
        return productResponse;
    }

}