const getTileLambda = require('./get-lambda.js')
const query_utils = require('./query-utils')

async function invoke_lambda (lambda, params) {

    const result = lambda.invoke({
        rawQueryString : query_utils.cast_query_str(params)
    })

    return await result

}


(async () => {

    const req = invoke_lambda(getTileLambda, {
        x : 0,
        y : 0,
        z : 0
    })

    const raw = await req

    console.log('Final result', raw.body.substring(0,10))

})();
