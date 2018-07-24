let html = async(shop, theme_id, getRequestHeaders, postRequestHeaders, db) => {
    const request = require('request-promise');
    const messenger = require('./createAssets.js');
    let theme_liquid = 'layout/theme.liquid';
    let themeLiquid = 'https://' + shop + '/admin/themes/' + theme_id +
        '/assets.json?asset[key]=' + theme_liquid + '&theme_id=' + theme_id;
    let themeResponse, productsResponse, pageResponse, productJSON, pageJSON, blogJSON;
    let scriptsAdded = false;

    try {
        themeResponse = JSON.parse(await request.get(themeLiquid, { headers: getRequestHeaders }));
        let secLiquid = themeResponse.asset.value;
        let temp1, temp2, temp3, temp4, temp5, finalLiquid, productScript, pageScript;
        if (secLiquid) {

            //Load files from database
            let shopParams = {
                TableName: "Dropthemizer-Users",
                Key: {
                    shop: shop
                }
            }
            console.log('Retrieving shop files...');
            let shopData = await db.get(shopParams).promise();
            console.log('Files loaded...Process complete exit(0).\nModifying store files...');

            //Load Mutation Observers et al
            temp1 = secLiquid.substring(0, secLiquid.indexOf('<head>') + 6);
            temp2 = shopData.Item.files.head_script;
            temp3 = secLiquid.substring(secLiquid.indexOf('<head>') + 6, secLiquid.lastIndexOf('</body>'));
            //Load JSON for theme
            temp4 = shopData.Item.files.theme_json;
            temp5 = secLiquid.substring(secLiquid.lastIndexOf('</body>'), secLiquid.length);

            finalLiquid = temp1 + "{% include 'dropthemizer-mutation-script' %}" + temp3 + "{% include 'dropthemizer-themeJSON' %}" + temp5;

            await messenger.createAssets(shop, 'snippets/dropthemizer-mutation-script.liquid', temp2, postRequestHeaders, theme_id);
            await messenger.createAssets(shop, 'snippets/dropthemizer-themeJSON.liquid', temp4, postRequestHeaders, theme_id);

            await messenger.createAssets(shop, 'layout/theme-backup.liquid', secLiquid, postRequestHeaders, theme_id);
            await messenger.createAssets(shop, 'layout/theme.liquid', finalLiquid, postRequestHeaders, theme_id);

            //Work On Products/Pages
            let productLiquid = 'https://' + shop + '/admin/themes/' + theme_id + '/assets.json?asset[key]=templates/product.liquid&theme_id=' + theme_id;
            let pageLiquid = 'https://' + shop + '/admin/themes/' + theme_id + '/assets.json?asset[key]=templates/page.liquid&theme_id=' + theme_id;
            let blogLiquid = 'https://' + shop + '/admin/themes/' + theme_id + '/assets.json?asset[key]=templates/blog.liquid&theme_id=' + theme_id;

            productsResponse = JSON.parse(await request.get(productLiquid, { headers: getRequestHeaders }));
            pageResponse = JSON.parse(await request.get(pageLiquid, { headers: getRequestHeaders }));
            blogResponse = JSON.parse(await request.get(blogLiquid, { headers: getRequestHeaders }));

            //Load JSON-LD Scripts for products/pages
            productScript = shopData.Item.files.products_json;
            pageScript = shopData.Item.files.page_json;
            blogScript = shopData.Item.files.blog_json;

            //create backups
            await messenger.createAssets(shop, 'templates/product-bkp.liquid', productsResponse.asset.value, postRequestHeaders, theme_id);
            await messenger.createAssets(shop, 'templates/page-bkp.liquid', pageResponse.asset.value, postRequestHeaders, theme_id);
            await messenger.createAssets(shop, 'templates/blog-bkp.liquid', blogResponse.asset.value, postRequestHeaders, theme_id);

            productJSON = productsResponse.asset.value + "\n" + "{% include 'dropthemizer-productsJSON' %}";
            pageJSON = pageResponse.asset.value + "\n" + "{% include 'dropthemizer-pageJSON' %}";
            blogJSON = blogResponse.asset.value + "\n" + "{% include 'dropthemizer-blogJSON' %}";

            //Create JSON-LD Assets for Products/pages
            await messenger.createAssets(shop, 'snippets/dropthemizer-productsJSON.liquid', productScript, postRequestHeaders, theme_id);
            await messenger.createAssets(shop, 'snippets/dropthemizer-pageJSON.liquid', pageScript, postRequestHeaders, theme_id);
            await messenger.createAssets(shop, 'snippets/dropthemizer-blogJSON.liquid', blogScript, postRequestHeaders, theme_id);

            await messenger.createAssets(shop, 'templates/product.liquid', productJSON, postRequestHeaders, theme_id);
            await messenger.createAssets(shop, 'templates/page.liquid', pageJSON, postRequestHeaders, theme_id);
            await messenger.createAssets(shop, 'templates/blog.liquid', blogJSON, postRequestHeaders, theme_id);

            //create dropthemizer-worker
            let worker_fetch = shopData.Item.files.dropthemizer_worker;
            await messenger.createAssets(shop, 'assets/dropthemizer-worker.js', worker_fetch, postRequestHeaders, theme_id);

            scriptsAdded = true;
            console.log("complete... exit(0)");
        }
    } catch (error) {
        if (error.message) throw new Error(error.message);
        throw new Error('Could not create assets to support theme.liquid OR could not write to theme.liquid');
    }
    return scriptsAdded;
}

exports.html = html;