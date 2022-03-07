export interface defined_location {

    // Where is the poster located
    longitude : number
    latitude : number

    // What to call this
    country : string
    region : string
    region_code : string
    city : string
    area : string
}

export interface raw_poster extends defined_location {

    // Hash for exports
    hash : string

    // Zooming level
    zoom : number

    // How to caption it
    caption_method : 'city-regionCode' | 'area' | 'custom',
    caption_string : string

    // Metadata
    date_captured : string

    // Styles exported
    style : string

}

export function name_file (poster : defined_location) {
    const _ = (s:string) => s.replace(/\s/g, '').toLowerCase()
    return `${_(poster.country)}-${_(poster.region_code)}-${_(poster.city)}-${_(poster.area)}`
}

export function style_name (poster : raw_poster) {
    return `${poster.hash}-${poster.style}.png`
}

export async function wait (t : number){
    await new Promise(resolve => setTimeout(resolve, t * 1000));
}

export async function waitUntil( value : () => boolean ){
    while ( !value() ) {
        await wait(1)
    }
}

export function urlEncode (obj : any) {
    var str = [];
    for (var p in obj)
      if (obj.hasOwnProperty(p)) {
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
      }
    return str.join("&");
  }

  export function hashCode (s : string ) {
    var hash = 0, i, chr;
    if (s.length === 0) return hash;
    for (i = 0; i < s.length; i++) {
        chr   = s.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};