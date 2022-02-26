const aws = require('aws-sdk');
const request = require('request')
const s3 = new aws.S3();

const bucket = process.env.BUCKET;
const api_key = process.env.API_KEY;
const source_url = process.env.SOURCE_URL;

// Utilities

function get_path_for_tile (x,y,z) {
    return `/tile-cache/${x}-${y}-${z}.pbf`
}

// Public functions

async function load_from_url (x,y,z) {

    const target = source_url  
        .replace('{x}', x)
        .replace('{y}', y)
        .replace('{z}', z)
        .replace('{key}', api_key)

    return new Promise((resolve, reject) => {

        request(target, { encoding: null, method: 'GET'}, (err, res, body) => {
            if (err) {
                resolve({got: false, api_data: undefined})
            } else {
                console.log('Recieved from url: ', body.toString().substring(0,10))
                resolve({got: true, api_data: body})
            }
        })

    })

}

async function read_if_exists (x,y,z) {

    return new Promise((resolve, reject) => {
            
        const path = get_path_for_tile(x,y,z)

        s3.getObject({Bucket: bucket, Key: path}, (err, data) => {
            if (err) {
                resolve({exists : false, data: undefined})
            } else {
                resolve({exists: true, data: data.Body})
            }
        })

    })

}

async function write_to_s3 (x,y,z, data) {
    
    return new Promise((resolve, reject) => {
            
        const path = get_path_for_tile(x,y,z)

        s3.putObject({
            Bucket: bucket,
            Key: path,
            Body: data
        }, (err, data) => {
            if (err) {
                resolve({written : false})
            } else {
                resolve({written: true})
            }
        })

    })


}

module.exports = {
    read_if_exists,
    load_from_url,
    write_to_s3
}