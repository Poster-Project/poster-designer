function parse_query_str ( str ) {

    var pairs = str.split('&');
    var result = {};
    pairs.forEach(function(pair) {
            pair = pair.split('=');
            result[pair[0]] = decodeURIComponent(pair[1] || '');
    });

    return JSON.parse(JSON.stringify(result));
}

function cast_query_str (obj){
    return Object.keys(obj).map(key => key + '=' + obj[key]).join('&');
}

module.exports = {
    parse_query_str,
    cast_query_str
}