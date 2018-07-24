let loadDash = async(shop, getRequestHeaders, gData) => {
    const request = require('request-promise');
    let shopRequestUrl = 'https://' + shop + '/admin/shop.json';
    let shopResponse, shopData, dashboardData;

    try {
        shopResponse = await request.get(shopRequestUrl, { headers: getRequestHeaders });

        shopData = JSON.parse(shopResponse);

        dashboardData = {
            customer_name: shopData.shop.shop_owner,
            speed_score: gData.ruleGroups.SPEED.score,
            image_bytes: gData.pageStats.imageResponseBytes,
            http_resources: gData.pageStats.numberResources,
            roundtrips: gData.pageStats.numRenderBlockingRoundTrips,
            request_bytes: gData.pageStats.totalRequestBytes,
        };
    } catch (error) {
        if (error.message) throw new Error(error.message);
        throw new Error('Could Not Load Dropthemzier Dashboard');
    }
    return dashboardData;
}

exports.loadDash = loadDash;