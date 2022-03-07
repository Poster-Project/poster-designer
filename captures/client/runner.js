let map = undefined
let sizing = undefined
const keys = {
    LEFTSHIFT: 16,
    KEY_S: 83,
    KEY_N: 78,
    KEY_I: 73,
    RETURN: 13
}

const request = Object.fromEntries(new URLSearchParams(location.search));

// Utils
function default_center () {
    return {
        longitude : request.longitude || -122.3321,
        latitude : request.latitude || 47.6062,
        zoom : request.zoom || 12
    }
}
function default_style () {
    return request.style || 'roads'
}

function describe_map ( ) {
    a = ol.proj.toLonLat( map.getView().getCenter() )
    return {
        longitude : a[0],
        latitude : a[1],
        zoom : map.getView().A.zoom
    }
}
function move_map ( longitude, latitude, zoom ) {
    map.getView().setCenter(ol.proj.fromLonLat([latitude,longitude ]))
    map.getView().setZoom(zoom);
}

// Controlls
function load_new_map ( ) {
    fetch('/next', { method: 'POST', headers: { 'Content-Type': 'application/json' }})
        .then(res => res.json())
        .then(data => {
            document.getElementById('finder').style.display = 'block'
            sizing = data
            move_map(+data.longitude, +data.latitude, 12)
        });
}

async function save_map ( ) {

    // Get current data
    const {longitude, latitude, zoom} = describe_map()

    // Ask questions
    if (prompt('Ready to export (y)?') != 'y') return

    // What caption method do we use?
    const method_1 = `${sizing.city}, ${sizing.region_code}`
    const method_2 = `${sizing.area}, ${sizing.city}`
    const maption = prompt(`Caption method? [1]: "${method_1}", [2]: "${method_2}", [3]: custom`)
    let caption_method = ''
    let caption_string = ''
    if (maption == '1') { 
        caption_method = 'city-regionCode'
        caption_string = method_1
    }
    else if (maption == '2') {
        caption_method = 'area'
        caption_string = method_2
    }
    else {
        caption_method = 'custom'
        caption_string = prompt('Enter caption:')
    }

    // Record the current view as valid for the api
    await fetch('/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({
            ...sizing,
            longitude: longitude,
            latitude: latitude,
            zoom : 5 + zoom,
            caption_method: caption_method,
            caption_string: caption_string,
            date_created: new Date().toISOString(),
            style: default_style(),
        })
    })
    
    document.getElementById('finder').style.display = 'none'
}




// Running the site
function run () {

    const {longitude, latitude, zoom} = default_center()
    const style = default_style()

    // Setup Map
    const MapView = new ol.View({
        constrainResolution: true,
        center: ol.proj.fromLonLat([longitude, latitude]),
        zoom: zoom,
        controls: []
    })
    map = new ol.Map({ target: 'map', view: MapView })
    olms.apply(map, `/${style}.json`);
    map.getControls().forEach(function(control) { map.removeControl(control)}, this);

    // Do listen for loading
    setTimeout(() => {

        const layer = map.getLayers().getArray()[0]
        let rendered = false
        layer.on('postrender', () => rendered = true)

        const wait = () => {
            if (!rendered) document._mapLoaded = true
            else setTimeout(wait, 4000)
            rendered = false
        }
        setTimeout(wait, 4000)

    }, 100)


    // Load functionality on keypress
    window.onkeydown = function(e) {

        // N jumps to next city that needs charting
        if (e.keyCode == keys.KEY_N) 
            load_new_map()
            
        // Record the current view as valid
        if (e.keyCode == keys.RETURN)
            save_map()
        // Zoom in and out
        if (e.key == '-') {
            map.getView().setZoom(describe_map().zoom - 1);
        }
        if (e.key == '=') {
            map.getView().setZoom(describe_map().zoom + 1);
        }
    };

}

setTimeout(run, 50)
