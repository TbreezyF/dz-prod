start();

async function start() {
    const dotenv = require('dotenv').config();
    const ejs = require('ejs');
    const express = require('express');
    const app = express();
    const crypto = require('crypto');
    const cookie = require('cookie');
    const nonce = require('nonce')();
    const querystring = require('querystring');
    const bodyParser = require('body-parser');
    const cors = require('cors');
    const request = require('request-promise');
    const chargeMerchant = require('./scripts/createCharge.js');
    const gapi = require('./scripts/gCompute.js');
    const files = require('./scripts/files.js');
    const dash = require('./scripts/loadDash.js');
    const token = require('./scripts/accessToken.js');
    const onflyOptimize = require('./scripts/onflyOptimize.js');
    const processImages = require('./scripts/processImages.js');
    const screenshot = require('./scripts/screenshot.js');
    const path = require('path');
    const AWS = require('aws-sdk');
    let pollData = {};


    let postRequestHeaders, getRequestHeaders, globalFormValues;

    const apiKey = process.env.SHOPIFY_API_KEY;
    const apiSecret = process.env.SHOPIFY_API_SECRET;
    const scopes = ['read_themes', 'write_themes', 'read_products', 'write_products'];
    const APP_URL = "https://53a09147.ngrok.io"; // Replace this with your HTTPS Forwarding address

    //Set up app view engine/static paths
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '/views'))
    app.use(express.static(path.join(__dirname, '/public')));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(cors());

    AWS.config.update({
        region: "ca-central-1",
        endpoint: "https://dynamodb.ca-central-1.amazonaws.com"
    });

    const db = new AWS.DynamoDB.DocumentClient();

    app.get('/', (req, res) => {
        const shop = req.query.shop;
        if (shop) {
            const state = nonce();
            const redirectUri = APP_URL + '/authenticate';
            const installUrl = 'https://' + shop +
                '/admin/oauth/authorize?client_id=' + apiKey +
                '&scope=' + scopes +
                '&state=' + state +
                '&redirect_uri=' + redirectUri;

            res.cookie('state', state);
            res.redirect(installUrl);
        } else {
            return res.status(400).send('400 Error - Missing shop parameter');
        }
    });

    app.get('/authenticate', async(req, res) => {
        const { shop, hmac, code, state } = req.query;
        const stateCookie = cookie.parse(req.headers.cookie).state;

        if (state !== stateCookie) {
            return res.status(403).send('Request origin cannot be verified');
        }

        if (shop && hmac && code) {
            // DONE: Validate request is from Shopify
            const map = Object.assign({}, req.query);
            delete map.signature;
            delete map.hmac;
            const message = querystring.stringify(map);
            const providedHmac = Buffer.from(hmac, 'utf-8');
            const generatedHash = Buffer.from(
                crypto
                .createHmac('sha256', apiSecret)
                .update(message)
                .digest('hex'),
                'utf-8'
            );
            let hashEquals = false;

            try {
                hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac)
            } catch (e) {
                hashEquals = false;
            };

            if (!hashEquals) {
                return res.status(400).send('HMAC validation failed');
            }

            // Request Access Token
            const accessToken = await token.getAccessToken(shop, apiKey, apiSecret, code);
            getRequestHeaders = {
                'X-Shopify-Access-Token': accessToken,
            };
            postRequestHeaders = {
                "Content-Type": "application/json",
                'X-Shopify-Access-Token': accessToken,
            };


            //Render Dropthemizer Homepage

            async function renderDash(res) {
                res.render('dashboard');
                let optimized, subscribed, uninstalled;
                try {
                    //Query DB
                    let queryParams = {
                        TableName: "Dropthemizer-Users",
                        Key: {
                            "shop": shop
                        }
                    }

                    let current_user = await db.get(queryParams).promise();
                    let strategy = 'mobile';

                    if (current_user.Item) {
                        if (current_user.Item.info.optimized) {
                            strategy = 'desktop';
                            subscribed = true;
                            optimized = true;
                        }
                        if (current_user.Item.info.subscribed) {
                            subscribed = true;
                        }
                        if (current_user.Item.info.uninstalled) {
                            uninstalled = true;
                        }
                    }

                    pollData.paymentAccepted = subscribed || false;
                    pollData.fullyOptimized = optimized || false;
                    pollData.uninstalled = uninstalled || false;
                    let gData = await gapi.getGoogleData(shop, strategy);
                    let dashboardData = await dash.loadDash(shop, getRequestHeaders, gData);
                    pollData.dashReady = true;
                    pollData.dashboardData = dashboardData;
                    pollData.screenshot = await screenshot.image(shop);

                    if (current_user.Item) {
                        console.log("User found in database...exit(0).\n");
                    } else {
                        console.log("User not found in database...creating user...");
                        let shopData = JSON.parse(await request.get('https://' + shop + '/admin/shop.json', { headers: getRequestHeaders })).shop;
                        if (shopData) {
                            let shopInfo = getInfo();

                            function getInfo() {
                                let obj = {};
                                if (shopData.name !== "" && shopData.name != "undefined") {
                                    obj.name = shopData.name;
                                }
                                if (shopData.email !== "" && shopData.email != "undefined") {
                                    obj.email = shopData.email;
                                }
                                if (shopData.phone !== "" && shopData.phone != "undefined") {
                                    obj.phone = shopData.phone;
                                }
                                if (shopData.shop_owner !== "" && shopData.shop_owner != "undefined") {
                                    obj.owner = shopData.shop_owner;
                                }
                                if (shopData.domain !== "" && shopData.domain != "undefined") {
                                    obj.domain = shopData.domain;
                                }
                                return obj;
                            }
                            params = {
                                TableName: "Dropthemizer-Users",
                                Item: {
                                    "shop": shop,
                                    "info": shopInfo
                                }
                            }
                            db.put(params, function(err, data) {
                                if (err) {
                                    console.log("Unable to add user. Error JSON:", JSON.stringify(err, null, 2));
                                } else {
                                    console.log("Added user:", shop + '\n');
                                }
                            });
                            /*Install Webhooks */
                            let hooks = ['app/uninstalled', 'themes/publish'];
                            let hookURL = 'https://' + shop + '/admin/webhooks.json';

                            console.log('Creating webhooks for ' + shop + '...');

                            for (let i = 0; i < hooks.length; i++) {
                                let hookLoad = {
                                    webhook: {
                                        topic: hooks[i],
                                        address: "https://" + APP_URL + "/api/hooks/",
                                        format: "json"
                                    }
                                };
                                try {
                                    await request.post(hookURL, {
                                        headers: postRequestHeaders,
                                        body: hookLoad,
                                        json: true
                                    });
                                } catch (err) {
                                    console.log('Webhook already created for ' + hooks[i] + ' exit(1)');
                                }
                            }
                            console.log('webhooks operation complete exit(0).\n')
                        }
                    }
                } catch (err) {
                    console.log(err);
                }

            }

            res.redirect('/dashboard');

            app.get('/dashboard', (req, res) => {
                renderDash(res);
            });

            app.post('/shopify/charge', async(req, res) => {
                let charge;
                globalFormValues = req.body;
                charge = await chargeMerchant.bill(shop, postRequestHeaders);
                res.redirect(charge.confirmation_url);
            });

            app.get('/shopify/charge/handler/', async(req, res) => {
                let charge_id, isAccepted;
                if (req.query) {
                    charge_id = req.query.charge_id;
                    isAccepted = await chargeMerchant.isAccepted(shop, charge_id, getRequestHeaders);

                    if (isAccepted.application_charge.status == 'accepted') {
                        let updateParams = {
                            TableName: "Dropthemizer-Users",
                            Key: {
                                "shop": shop
                            },
                            UpdateExpression: "set info.subscribed = :t",
                            ExpressionAttributeValues: {
                                ":t": true
                            }
                        };
                        await db.update(updateParams).promise();
                        res.redirect('/dropthemize');
                        await chargeMerchant.activate(shop, isAccepted, postRequestHeaders);
                    } else {
                        res.status(404).sendFile('404.html', { root: path.join(__dirname, 'public/pages/') });
                    }

                } else {
                    res.status(404).sendFile('404.html', { root: path.join(__dirname, 'public/pages/') });
                }
            });

            //Beginning of DROPTHEMIZER PAYLOAD - Executes the store optimization
            app.get('/dropthemize', async(req, res) => {
                res.redirect('/dashboard');
                /*TODO: Check DB if files already exists in future*/
                let theme_json = await setThemeFiles();
                if (globalFormValues) {
                    let sameAs = [];
                    if (globalFormValues.facebook && globalFormValues.facebook !== '') {
                        sameAs.push('"https://www.facebook.com/' + globalFormValues.facebook + '"');
                    }
                    if (globalFormValues.instagram && globalFormValues.instagram !== '') {
                        sameAs.push('"https://instagram.com/' + globalFormValues.instagram + '"');
                    }
                    if (globalFormValues.twitter && globalFormValues.twitter !== '') {
                        sameAs.push('"https://twitter.com/' + globalFormValues.twitter + '"');
                    }
                    if (globalFormValues.pinterest && globalFormValues.pinterest !== '') {
                        sameAs.push('"https://www.pinterest.com/' + globalFormValues.pinterest + '"');
                    }
                    if (globalFormValues.gplus && globalFormValues.gplus !== '') {
                        sameAs.push('"https://plus.google.com/' + globalFormValues.gplus + '"');
                    }
                    if (sameAs.length > 1 || globalFormValues.storelogo) {
                        if (sameAs.length > 1)
                            theme_json = theme_json.replace('"sameAs": []', '"sameAs": ' + '[' + sameAs + ']');
                        if (globalFormValues.storelogo) {
                            theme_json = theme_json.replace('"logo": "{{ settings.logo | img_url }}"', '"logo": "' + globalFormValues.storelogo + '"');
                            theme_json = theme_json.replace('"image": "{{ settings.logo | img_url }}"', '"image": "' + globalFormValues.storelogo + '"');

                        }

                        let params = {
                            TableName: "Dropthemizer-Users",
                            Key: {
                                "shop": shop
                            },
                            UpdateExpression: "set files.theme_json = :f",
                            ExpressionAttributeValues: {
                                ":f": theme_json
                            }
                        };
                        console.log('updating theme_json in database...');
                        await db.update(params).promise();
                        console.log('Theme_json updated in database exit(0).\n');

                    }
                }

                await dropthemize();

                async function setThemeFiles() {
                    return await files.set(shop, db);
                }

                async function dropthemize() {
                    const dropthemize = require('./scripts/Dropthemize.js');
                    let htmlScripts, processedImages;
                    console.log('Minifying assets for ' + shop);
                    let minified = await dropthemize.minify(shop, getRequestHeaders, postRequestHeaders);
                    if (minified.dropthemized) {
                        console.log('JS/CSS Files minified successfully\n');
                    }
                    //Make theme scripts load async
                    console.log('Uploading files needed for Dropthemizer to ' + shop);
                    htmlScripts = await dropthemize.htmlAsync(shop, minified.theme_id, getRequestHeaders, postRequestHeaders, db);
                    if (htmlScripts) {
                        console.log('theme.liquid update complete. All Snippets Created Successfully\n');
                    }
                    //Image Optimization
                    console.log('Processing Images for ' + shop + '. This may take a while...');
                    processedImages = await processImages.run(shop, getRequestHeaders, postRequestHeaders);

                    if (processedImages) {
                        console.log('Product Images Processed Successfully exit(0)!');
                    }

                    if (htmlScripts && minified.dropthemized && processedImages) {
                        console.log('\nDONE!');
                        let updateParams = {
                            TableName: "Dropthemizer-Users",
                            Key: {
                                "shop": shop
                            },
                            UpdateExpression: "set info.optimized = :t",
                            ExpressionAttributeValues: {
                                ":t": true
                            }
                        };
                        await db.update(updateParams).promise();
                        pollData.fullyOptimized = true;
                    }
                    //End Dropthemize
                }
            });

            app.get('/api/screenshot/', (req, res) => {
                res.status(200).send(pollData.screenshot);
            });


            app.get('/api/status/', async(req, res) => {
                res.status(200).json({
                    isPayed: pollData.paymentAccepted,
                    optimized: pollData.fullyOptimized,
                    dashReady: pollData.dashReady,
                    dashboardData: pollData.dashboardData,
                    uninstalled: pollData.uninstalled
                });
            });

            app.post('/api/hooks/', async(req, res) => {
                console.log('Hook received. Processing...');
                let topic = req.get('X-Shopify-Topic');
                let dbUpdate;
                try {
                    if (topic) {
                        let hmac = req.get('X-Shopify-Hmac-Sha256');
                        if (hmac) {
                            let providedHmac = Buffer.from(hmac, 'utf-8');
                            let generatedHash = Buffer.from(
                                crypto
                                .createHmac('sha256', apiSecret)
                                .update(req.body)
                                .digest('hex'),
                                'utf-8'
                            );
                            let hashEquals = false;

                            try {
                                hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac)
                            } catch (e) {
                                hashEquals = false;
                            };

                            if (!hashEquals) {
                                return res.status(400).send('HMAC validation failed');
                            } else {
                                if (topic == 'themes/publish') {
                                    console.log('Theme update detected...updating theme files...')
                                    const dropthemize = require('./scripts/Dropthemize.js');
                                    await dropthemize.minify(shop, getRequestHeaders, postRequestHeaders);
                                    await dropthemize.htmlAsync(shop, minified.theme_id, getRequestHeaders, postRequestHeaders, db);
                                    console.log('Update complete. exit(0)\n');
                                }
                                if (topic == 'app/uninstalled') {
                                    pollData.uninstalled = true;
                                    dbUpdate = {
                                        TableName: "Dropthemizer-Users",
                                        Key: {
                                            "shop": shop
                                        },
                                        UpdateExpression: "set info.uninstalled = :t",
                                        ExpressionAttributeValues: {
                                            ":t": true
                                        }
                                    };
                                    await db.update(dbUpdate).promise();
                                }
                                if (topic == 'customers/redact' || 'shop/redact') {
                                    dbUpdate = {
                                        TableName: "Dropthemizer-Users",
                                        Key: {
                                            "shop": shop
                                        },
                                        UpdateExpression: "set info.gdpr = :t",
                                        ExpressionAttributeValues: {
                                            ":t": true
                                        }
                                    };
                                    await db.update(dbUpdate).promise();
                                }
                            }
                        } else {
                            res.status(400).send('Cannot very request origin');
                        }
                    }
                } catch (error) {
                    console.log("ERROR: Unable to respond to hook!")
                }
            });
        } else { // Either Hmac|Shop|Code Parameters were missing during authentication
            res.status(400).send('Required parameters missing');
        }
    });

    let port = process.env.PORT || 8080;

    app.listen(port, () => {
        console.log('Dropthemizer is listening on port ' + port + '!');
    });

    app.get('/api/optimize/', cors(), (req, res) => {
        if (req.query.url) {
            onflyOptimize.process(req.query.url)
                .then(data => {
                    var img = Buffer.from(data, 'base64');
                    res.status(200).send(img);
                })
                .catch(error => {
                    if (error.message) console.log(error.message);
                    res.status(500).end(req.query.url);
                });
        } else {
            res.status(400).sendFile('404.html', { root: path.join(__dirname, 'public/pages/') });
        }
    });
}