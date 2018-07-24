module.exports = {
    set: async function(shop, db) {
        const fs = require('fs');
        const path = require('path');
        try {
            console.log('creating files...');
            let theme_json = fs.readFileSync(path.resolve(__dirname, '../snippets/theme-json-ld.html')).toString();
            let page_json = fs.readFileSync(path.resolve(__dirname, '../snippets/page-json-ld.html')).toString();
            let products_json = fs.readFileSync(path.resolve(__dirname, '../snippets/products-json-ld.html')).toString();
            let blog_json = fs.readFileSync(path.resolve(__dirname, '../snippets/blog-json-ld.html')).toString();
            let head_script = fs.readFileSync(path.resolve(__dirname, '../snippets/headScript.html')).toString();
            let dropthemizer_worker = fs.readFileSync(path.resolve(__dirname, '../scripts/dropthemizer-worker.js')).toString();

            let returnJSON = theme_json;

            let obj = {
                theme_json: theme_json,
                products_json: products_json,
                page_json: page_json,
                blog_json: blog_json,
                head_script: head_script,
                dropthemizer_worker: dropthemizer_worker
            };

            var params = {
                TableName: "Dropthemizer-Users",
                Key: {
                    "shop": shop
                },
                UpdateExpression: "set files = :f",
                ExpressionAttributeValues: {
                    ":f": obj
                },
                ReturnValues: "UPDATED_NEW"
            };

            console.log("Uploading files to database...");

            let data = await db.update(params).promise();
            console.log("files uploaded successfully exit(0).\n");
            if (returnJSON) {
                return returnJSON;
            }
        } catch (err) {
            console.log(err);
        }
    }
}