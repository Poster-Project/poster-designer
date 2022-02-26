const cache_utils = require('./cache-utils')
const query_utils = require('./query-utils')
const zlib = require('zlib')

// Utils

function encode_response (data) {

    //const encoded = zlib.brotliCompressSync(data)
    const response_data = data.toString('base64')

    console.log({response_data_length : response_data.length})
    console.log('Encoded', response_data.substring(0,10))

    return {
        statusCode: 200,
        headers : {
            'Content-Type' : 'application/x-protobuf',
            //'Content-Encoding' : 'br',
            'cache-control' : 'public, max-age=31536000',
            'Access-Control-Allow-Origin' : '*',
            'Access-Control-Allow-Headers' : '*',
            'Access-Control-Allow-Methods' : '*'
        },
        isBase64Encoded: true,
        body: response_data
    }
}

// Actual lambda function

module.exports.invoke = async (event) => {

    // Get query params, expect they are in valid format
    // they specify the tile to fetch
    const query = query_utils.parse_query_str(event.rawQueryString)
    console.log({query, time : Date.now()})

    // See if the objct exists in S3
    let {exists, data} = await cache_utils.read_if_exists(query.x, query.y, query.z)
    console.log({exists})

    // If it does, return it
    if (exists) return encode_response(data)

    // Otherwise, load it
    let {got, api_data} = await cache_utils.load_from_url(query.x, query.y, query.z)
    console.log({got})

    // If failed, return error
    if (!got) return { statusCode: 500 }
    
    // Otherwise, write it to S3
    let {written} = await cache_utils.write_to_s3(query.x, query.y, query.z, api_data)
    console.log({written})

    // If failed, return error
    if (!written) return { statusCode: 500 }

    // Otherwise, return it
    return encode_response(api_data)

};

