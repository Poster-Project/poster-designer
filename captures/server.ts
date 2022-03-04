import express from 'express';
import puppeteer from 'puppeteer';
import fs from 'fs';

// Values

const config = {
    useHeadless : true,
    width : 7000,
    height : 7000,
}

const state = {
    launched: false,
    puppet: null as any,
}

// Types

interface CaptureDescription {
    state: string,
    state_code: string,
    city_name: string,
    custom_name: string,
    zoom: number,
    chosen_lat: number,
    chosen_lng: number
}

// Utils

async function wait (t : number){
    await new Promise(resolve => setTimeout(resolve, t * 1000));
}

async function waitUntil( value : () => boolean ){
    while ( !value() ) {
        await wait(1)
    }
}

function verify_dir_exists (path  : string){
    if (fs.existsSync(path)) return
    fs.mkdirSync(path, { recursive: true })
}

async function load_CSV (fileName : string) {
    const f = fs.readFileSync(fileName).toString()
    const without_quotes = f.replace(/"/g, '')
    const lines = without_quotes.split('\n')
    const rows = lines.map(line => line.split(','))
    return rows
}

function file_name (city : string, state: string, custom:string) {
    const small_city = city.replace(/\s/g, '_').toLowerCase()
    const small_state = state.replace(/\s/g, '_').toLowerCase()
    return `${custom}-${small_city}-${small_state}`;
}

async function get_puppet() {
    if (state.launched) return state.puppet
    const puppet = await puppeteer.launch({
        headless: config.useHeadless,
        devtools: true,
        //@ts-ignore
        captureBeyondViewport: true,
        zoomFactor: 0.1,
        args: ['--no-sandbox', '--incognito'],
        defaultViewport: {
            width: config.width,
            height: config.height,
            isMobile: true,
        }
    })
    state.launched = true
    state.puppet = puppet
}

// Features

async function find_next( cities : any[] ) {
    for ( let city of cities ) {
        const save_name = file_name('', city[0], city[2])
        const exists = fs.existsSync(`../working-data/positioning/${save_name}.json`)
        if (exists) continue
        return city
    }
}

async function capture_picture ( capture : CaptureDescription ){

    // File values
    const save_name = file_name(capture.custom_name, capture.city_name, capture.state_code)
    const save_dir = `../working-data/captures/${save_name}`

    // Start
    console.log(`Loading ${save_name} . . .`)

    // Open Page
    const page = (await state.puppet.pages())[0]
    await wait(1)

    // Wait for page to load
    let url = `http://localhost:8080/?lat=${capture.chosen_lng}&lng=${capture.chosen_lat}&zoom=${capture.zoom}`
    await page.goto (url, { waitUntil: 'networkidle2' })
    await page.setViewport({width: config.width, height: config.height})
    //@ts-ignore
    await waitUntil(() => page.evaluate(() => document._mapLoaded ))
    await wait(1)

    // Write Data
    verify_dir_exists(save_dir)
    await page.screenshot({path: `${save_dir}/raw.png`, fullPage: true})
    const save_data = JSON.stringify(capture, null, 2)
    fs.writeFileSync(`${save_dir}/info.json`, save_data) 
}

// Create express app
var app = express();

app.use(express.json());
app.use(express.static(__dirname + '/client')); 

app.post('/capture', async function (req, res) {
    await get_puppet()
    await capture_picture(req.body)
    res.send('done');
})

app.post('/done', async function (req, res) {
    state.puppet.close()
    res.send('done');
})

app.post('/next', async function (req, res) {
    const cities = await load_CSV('../working-data/uscities.csv')
    const next_city = await find_next(cities)
    const response = {
        city_name: next_city[0],
        state_code: next_city[2],
        state: next_city[3],
        latitude: next_city[7],
        longitude: next_city[6],
        zoom: 12,
    }
    res.send(JSON.stringify(response))
})

app.post('/record', async function (req, res) {
    const save_name = file_name(req.body.custom_name, req.body.city_name, req.body.state_code) 
    const output_path = `../working-data/positioning/${save_name}.json`
    fs.writeFileSync(output_path, JSON.stringify(req.body, null, 2))
    res.send('done')
})

app.listen(8080);
console.log('Listening on port 8080');

