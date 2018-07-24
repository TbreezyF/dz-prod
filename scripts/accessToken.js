        // Get Access Token
        let getAccessToken = async(shop, apiKey, apiSecret, code) => {
            const request = require('request-promise');
            let accessToken, response;
            const accessTokenRequestUrl = 'https://' + shop + '/admin/oauth/access_token';
            const accessTokenPayload = {
                client_id: apiKey,
                client_secret: apiSecret,
                code,
            };
            try {
                response = await request.post(accessTokenRequestUrl, { json: accessTokenPayload });
                accessToken = response.access_token;
            } catch (error) {
                if (error.messsage) throw new Error(error.message);
                throw new Error('Access Denied. Access Token was not granted.');
            }
            return accessToken;
        }

        exports.getAccessToken = getAccessToken;