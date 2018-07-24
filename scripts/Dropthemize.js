module.exports = {
        minify: async(shop, getRequestHeaders, postRequestHeaders) => {

            const messenger = require('./createAssets.js');
            const request = require('request-promise');
            let uglify = require('uglify-js');
            let CleanCSS = require('clean-css');
            let themesURL = 'https://' + shop + '/admin/themes.json';
            let themeData, theme_id;
            let dropthemized = false;

            try {

                themeData = JSON.parse(await request.get(themesURL, { headers: getRequestHeaders }));

                for (let i = 0; i < themeData.themes.length; i++) {
                    if (themeData.themes[i].role == 'main') {
                        theme_id = themeData.themes[i].id;
                        break;
                    }
                }
                if (theme_id) {
                    const assetsURL = 'https://' + shop + '/admin/themes/' + theme_id + '/assets.json';

                    let assets = JSON.parse(await request.get(assetsURL, { headers: getRequestHeaders }));

                    let assetsToMinify = extractAssets(assets);

                    assetsToMinify = await constructAssetObject(assetsToMinify);

                    //create backups
                    let preservedAssets = preserveAssets(assetsToMinify);
                    let backedup = await createBackups(assetsToMinify);

                    if (backedup) {
                        let minified = await minifyAssets(preservedAssets);
                        if (minified) {
                            dropthemized = true;
                        }
                    }
                }
            } catch (error) {
                if (error.message) {
                    console.log(error.message);
                }
                //throw new Error('Something went wrong while trying to minify and backup assets')
            }

            async function minifyAssets(assets) {
                let minified = false;
                let smallAsset;
                for (let i = 0; i < assets.length; i++) {
                    smallAsset = minify(assets[i]);
                    await messenger.createAssets(shop, smallAsset.key, smallAsset.value, postRequestHeaders, theme_id);
                    if (i == assets.length - 1) minified = true;
                }
                return minified;
            }



            function minify(asset) {
                let result;
                if (asset.key.includes('.js')) {
                    result = minifyjs(asset);
                }
                if (asset.key.includes('.css')) {
                    result = minifycss(asset);
                }
                return result;
            }

            function minifyjs(asset) {
                let output;
                output = uglify.minify(asset.value).code;
                asset.value = output;
                //console.log(asset.key + ' has been minified');
                return asset;
            }

            function minifycss(asset) {
                let output;
                let options = { inline: ['all'] };
                output = new CleanCSS(options).minify(asset.value);
                asset.value = output.styles;
                //console.log(asset.key + ' has been minified');
                return asset;
            }


            function preserveAssets(assets) {
                let result = [];
                for (let i = 0; i < assets.length; i++) {
                    result.push({
                        key: assets[i].key,
                        value: assets[i].value
                    });
                }
                return result;
            }

            function extractAssets(assets) {
                let match = 'assets/';
                let assetsToMinify = [];

                for (let i = 0; i < assets.assets.length; i++) {
                    let assetsKey = assets.assets[i].key;
                    let keylength = assetsKey.length;
                    let js = assetsKey.substring(keylength - 3, keylength);
                    let css = assetsKey.substring(keylength - 4, keylength);
                    if (assetsKey.includes(match) && (js == '.js' || css == '.css') && !assetsKey.includes('theme.')) {
                        //Only Minify assets that are not backup copies
                        if (!assetsKey.includes('-bkp') && !assetsKey.includes('backup')) {
                            assetsToMinify.push(assets.assets[i].key);
                        }
                    }
                }

                return assetsToMinify;
            }

            async function constructAssetObject(assets) {
                let assetData, assetFileURL;
                let result = [];
                for (let i = 0; i < assets.length; i++) {
                    assetFileURL = 'https://' + shop + '/admin/themes/' + theme_id + '/assets.json?asset[key]=' + assets[i] + '&theme_id=' + theme_id;
                    assetData = JSON.parse(await request.get(assetFileURL, { headers: getRequestHeaders }));
                    result.push({
                        key: assets[i],
                        value: assetData.asset.value
                    });
                }
                return result;
            }

            async function createBackups(assets) {
                let backedup = false;
                let key;
                for (let i = 0; i < assets.length; i++) {
                    //Just incase something somehow sifts through first backup check/Don't overwrite backups
                    if (assets[i].key.includes('bkp') || assets[i].key.includes('backup')) continue;
                    if (assets[i].key.includes('.js')) {
                        key = assets[i].key.substring(0, assets[i].key.indexOf('.js')) + '-bkp.js';
                        assets[i].key = key;
                    } else {
                        key = assets[i].key.substring(0, assets[i].key.indexOf('.css')) + '-bkp.css';
                        assets[i].key = key;

                    }
                    await messenger.createAssets(shop, assets[i].key, assets[i].value, postRequestHeaders, theme_id);
                    if (i == assets.length - 1) backedup = true;
                }
                return backedup;
            }
            return { dropthemized: dropthemized, theme_id: theme_id };
        },
        htmlAsync: async(shop, theme_id, getRequestHeaders, postRequestHeaders, db) => {
            const htmlScripts = require('./htmlScripts.js');
            let success;
            try {
                success = await htmlScripts.html(shop, theme_id, getRequestHeaders, postRequestHeaders, db);
            } catch (error) {
                if (error.message) throw new Error(error.message);
                throw new Error();
            }
            return success;
        }

    } //END Module.exports