module.exports = {
    image: async(shop) => {
        const AWS = require('aws-sdk');

        AWS.config.update({
            region: "ca-central-1",
            endpoint: "https://lambda.ca-central-1.amazonaws.com"
        });

        let lambda = new AWS.Lambda();

        let payload = JSON.stringify({
            "shop": shop
        });

        let params = {
            FunctionName: 'dropthemizer-screenshotter',
            InvocationType: 'RequestResponse',
            Payload: payload
        };

        console.log('Fetching screenshot from lambda for ' + shop + '...');

        let data = await lambda.invoke(params).promise();

        console.log('Fetch succeeded exit (0)\n');

        return JSON.parse(data.Payload);
    }
}