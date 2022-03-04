let map = undefined
let recorded_sizing = {}
let is_sizing = false

const queryString = window.location.search
const parameters = new URLSearchParams(queryString)
    
const sent_lat = +parameters.get('lat') || -74.0059413
const sent_lng = +parameters.get('lng') || 40.7127837
const sent_zoom = +parameters.get('zoom') || 12

const keys = {
    LEFTSHIFT: 16,
    KEY_S: 83,
    KEY_N: 78,
    KEY_I: 73,
    RETURN: 13
}

function describe ( ) {
    a = ol.proj.toLonLat( map.getView().getCenter() )
    return {
        lng : a[0],
        lat : a[1],
        zoom : map.getView().A.zoom
    }
}

function jump_to ( lat, lng, zoom ) {
    console.log( 'jump_to', lat, lng, zoom, ol.proj.fromLonLat([lat, lng ]) )
    map.getView().setCenter(ol.proj.fromLonLat([lat, lng ]))
    map.getView().setZoom(zoom);
}

function run () {

    // Setup Map
    const MapView = new ol.View({
        constrainResolution: true,
        center: ol.proj.fromLonLat([sent_lat, sent_lng]),
        zoom: sent_zoom,
        controls: []
    })
    map = new ol.Map({ target: 'map', view: MapView })
    olms.apply(map, '/buildings.json');
    map.getControls().forEach(function(control) { map.removeControl(control)}, this);

    // Do listen for loading

    var numInFlightTiles = 0;
    map.getLayers().forEach(function (layer) {
        console.log(layer)
        var source = layer.getSource();
        if (source instanceof ol.source.TileImage) {
            source.on('tileloadstart', function () {++numInFlightTiles; console.log(numInFlightTiles)})
            source.on('tileloadend', function () {--numInFlightTiles;  console.log(numInFlightTiles)})
        }
    })

    map.on('postrender', function (evt) {
        if (!evt.frameState)
            return;

        var numHeldTiles = 0;
        var wanted = evt.frameState.wantedTiles;
        for (var layer in wanted)
            if (wanted.hasOwnProperty(layer))
                numHeldTiles += Object.keys(wanted[layer]).length;

        var ready = numInFlightTiles === 0 && numHeldTiles === 0;
        if (map.get('ready') !== ready)
            map.set('ready', ready);
    });

    map.set('ready', false);

    function whenMapIsReady(callback) {
        if (map.get('ready'))
            callback();
        else
            map.once('change:ready', whenMapIsReady.bind(null, callback));
    }

    setTimeout(() => {
        whenMapIsReady(() => {
            document._mapLoaded = true
            console.log('done')
        })
    }, 100)


    // Load functionality on keypress
    window.onkeydown = function(e) {

        // Log info on I
        if (e.keyCode == keys.KEY_I) {
            console.log(describe())
        }

        // Left-shift allows you to enter a lat-lng to teleport to
        if (e.keyCode == keys.LEFTSHIFT) {

            // set map position basted on prompt
            let center = prompt("Where to?")
            let [a,b] = center.split(',')
            
            let lat = a.replace(/[^0-9\.\-]/g, '')
            let lng = b.replace(/[^0-9\.\-]/g, '')

            if (a.includes('S')) { lat = -(+lat) }
            if (b.includes('W')) { lng = -(+lng) }

            jump_to(+lat, +lng, describe().zoom)
        }

        // S allows you to take a picture of the current view
        if (e.keyCode == keys.KEY_S) {

            const d = describe();

            fetch('/capture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    state: 'debug',
                    state_code: 'NAN',
                    city_name: 'debugsville',
                    chosen_lat: d.lat,
                    chosen_lng: d.lng,
                    zoom: d.zoom + 1
                })
            });
        }

        // N jumps to next city that needs charting
        if (e.keyCode == keys.KEY_N) {
            fetch('/next', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }).then(res => res.json()).then(data => {
                document.getElementById('finder').style.display = 'block'
                recorded_sizing = data
                is_sizing = true
                console.log(data)
                jump_to(+data.latitude, +data.longitude, data.zoom)
            });
        }

        // Record the current view as valid
        if (e.keyCode == keys.RETURN) {

            const center = describe()
            const name = prompt("Any special name?")

            if ( is_sizing ) {

                is_sizing = false
                document.getElementById('finder').style.display = 'none'

                // Record the current view as valid for the api
                fetch('/record', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        ...recorded_sizing,
                        chosen_lat: center.lat,
                        chosen_lng: center.lng,
                        custom_name : name,
                        zoom: 16 + (center.zoom-11)
                    })
                })
            }
        }

        // Zoom in and out
        if (e.key == '-') {
            map.getView().setZoom(describe().zoom - 1);
        }
        if (e.key == '=') {
            map.getView().setZoom(describe().zoom + 1);
        }
    };




}

setTimeout(run, 50)
