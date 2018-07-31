const request = require('request-promise');
module.exports = {
    bill: async function(shop, postRequestHeaders) {
        const chargeURL = 'https://' + shop + '/admin/application_charges.json';
        let chargeCreated, charge;

        const charge_payload = {
            application_charge: {
                name: 'Dropthemizer Pro - JSON-LD and Performance Optimization',
                price: 29.99,
                return_url: 'https://4471d911.ngrok.io/shopify/charge/handler/',
                test: true
            }
        };

        try {
            chargeCreated = await request({
                url: chargeURL,
                method: "POST",
                headers: postRequestHeaders,
                json: true,
                body: charge_payload
            });

            charge = chargeCreated.application_charge;
            return charge;
        } catch (error) {
            if (error.message) {
                throw new Error(error.message);
            }
            throw new Error('Could not create charge on request to shopify.');
        }
    },

    isAccepted: async function(shop, charge_id, getRequestHeaders) {
        let chargeURL = 'https://' + shop + '/admin/application_charges/' + charge_id + '.json';

        let charge = JSON.parse(await request.get(chargeURL, { headers: getRequestHeaders }));

        return charge;
    },
    activate: async function(shop, charge, postRequestHeaders) {
        let charged;
        let activateURL = 'https://' + shop + '/admin/application_charges/' + charge.application_charge.id + '/activate.json';
        try {
            charged = await request({
                url: activateURL,
                method: "POST",
                headers: postRequestHeaders,
                json: true,
                body: charge
            });

            if (charged.application_charge.status == 'active') {
                //console.log('\n' + shop + ' has been successfully charged for Dropthemizer ');
            }

        } catch (error) {
            if (error.message) {
                throw new Error(error.message);
            }
            throw new Error('Could not confirm/activate charge!');
        }
    }
}