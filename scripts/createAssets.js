module.exports = {
    createAssets: async(shop, key, value, postRequestHeaders, theme_id) => {
            const assetURL = 'https://' + shop + '/admin/themes/' + theme_id + '/assets.json';
            const request = require('request-promise');
            let asset, assetContents;

            assetContents = {
                asset: {
                    key: key,
                    value: value
                }
            };

            try {
                asset = await request({
                    url: assetURL,
                    method: "PUT",
                    headers: postRequestHeaders,
                    json: true,
                    body: assetContents
                });

            } catch (error) {
                if (error.message) {
                    throw new Error(error.message);
                }
                throw new Error('Could not create specified asset.');
            }
            return asset;
        } //END createAssets
}