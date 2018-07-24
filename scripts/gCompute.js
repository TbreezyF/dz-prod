//GOOGLE API
let getGoogleData = async(shop, strategy) => {
    const dotenv = require('dotenv').config();
    const GOOGLE_KEY = process.env.GOOGLE_API_KEY;
    const request = require('request-promise');
    const API_URL = 'https://www.googleapis.com/pagespeedonline/v4/runPagespeed?screenshot=true&';
    let gURL = API_URL + 'url=' + 'https://' + shop + '/&strategy=' + strategy + '&key=' + GOOGLE_KEY;
    let gData, response;

    try {
        response = await request.get(gURL);
        gData = JSON.parse(response);
    } catch (error) {
        if (error.message) throw new Error(error.message);
        throw new Error();
    }
    return gData;
}

exports.getGoogleData = getGoogleData;