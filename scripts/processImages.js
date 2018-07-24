module.exports = {
        run: async function(shop, getRequestHeaders, postRequestHeaders) {
                const request = require('request-promise');
                const imagemin = require('./imgOptimizer.js');
                const update = require('./updateProduct.js');
                let products, productIDs, imageURLs, optimized, uploaded, productCount;

                optimized = false;

                productCount = await getCount();

                products = await getProducts(productCount);

                productIDs = getProductIDs(products);

                imageURLs = getImageURLs(products);

                uploaded = await optimizeImages(imageURLs, productIDs);

                if (uploaded == true) optimized = true;


                async function getProducts(productCount) {
                    let count;
                    let response = {};
                    let products = {};

                    count = Math.ceil(productCount / 250);
                    for (let i = 1; i <= count; i++) {
                        const productsURL = 'https://' + shop + '/admin/products.json?limit=250?page=' + i;
                        if (i == 1) {
                            response = JSON.parse(await request.get(productsURL, { headers: getRequestHeaders }));
                            products = response;
                        } else {
                            response = JSON.parse(await request.get(productsURL, { headers: getRequestHeaders }));
                            products.products = products.products.concat(response.products);
                        }
                    }
                    return products;
                }

                async function getCount() {
                    let count;
                    const countURL = 'https://' + shop + '/admin/products/count.json';

                    count = JSON.parse(await request.get(countURL, { headers: getRequestHeaders })).count;
                    return count;
                }

                async function uploadImages(images, productIDs) {
                    let uploaded, success;
                    success = false;
                    for (let i = 0; i < productIDs.length; i++) {
                        uploaded = await update.update(shop, productIDs[i], images[i], postRequestHeaders);
                        //if (uploaded) console.log(uploaded.product.title + ' updated successfully! / Count = ' + i);
                        if (i == productIDs.length - 1) success = true;
                    }
                    return success;
                }

                async function optimizeImages(urls, productIDs) {
                    let imageData;
                    let result = [];
                    for (let i = 0; i < urls.length; i++) {
                        imageData = await optimizeUrls(urls[i]);
                        result.push(imageData);
                    }

                    return await uploadImages(result, productIDs);
                }

                async function optimizeUrls(urls) {
                    let imageBuffer, result;
                    imageBuffer = await imagemin.optim(urls);
                    result = getBase64(imageBuffer);
                    return result;
                }

                function getBase64(buffer) {
                    let result = [];
                    let imgObj;
                    for (let i = 0; i < buffer.length; i++) {
                        imgObj = {
                            attachment: buffer[i].toString('base64')
                        }
                        result.push(imgObj);
                    }
                    return result;
                }

                function getImageURLs(products) {
                    let urls;
                    let result = [];
                    for (let i = 0; i < products.products.length; i++) {
                        urls = [];
                        for (let j = 0; j < products.products[i].images.length; j++) {
                            urls.push(products.products[i].images[j].src);
                        }
                        result.push(urls);
                    }
                    return result;
                }

                function getProductIDs(products) {
                    let IDs = [];
                    for (let i = 0; i < products.products.length; i++) {
                        IDs.push(products.products[i].id);
                    }
                    return IDs;
                }

                return optimized;
            } //END run function
    } //END module