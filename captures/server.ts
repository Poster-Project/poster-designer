/*
    An express webserver that manages the image capture process
    - Serves the index.html file
    - Accepts POST requests to /capture 
    - Accepts POST requests to /next
    - Accepts POST requests to /record
*/

import express from 'express';
import {spawn} from 'child_process'
import open from 'open';
import puppeteer from 'puppeteer';
import fs from 'fs';
import {parse} from 'csv-parse';

const params = {
    launched: false,
    puppet: null as any,
    width : 6000,
    height : 6000,
}

// Types

interface CaptureDescription {
    state: string,
    state_code: string,
    city_name: string,
    latitude: number,
    longitude: number,
    zoom: number,
    chosen_lat: number,
    chosen_lng: number
}


// Utils

async function wait (t : number){
    await new Promise(resolve => setTimeout(resolve, t * 1000));
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

function file_name (city : string, state: string) {
    const small_city = city.replace(/\s/g, '_').toLowerCase()
    const small_state = state.replace(/\s/g, '_').toLowerCase()
    return `${small_city}-${small_state}`;
}

async function launch_puppet() {
    if (params.launched) return
    const puppet = await puppeteer.launch({
        headless:false,
        devtools: true,
        //@ts-ignore
        captureBeyondViewport: true,
        zoomFactor: 0.1,
        args: ['--no-sandbox', '--incognito'],
        defaultViewport: {
            width: params.width,
            height: params.height,
            isMobile: true,
        }
    })
    params.launched = true
    params.puppet = puppet
}

// Features

async function find_next( cities : any[] ) {
    for ( let city of cities ) {
        const save_name = file_name(city[0], city[2])
        const exists = fs.existsSync(`../working-data/positioning/${save_name}.json`)
        if (exists) continue
        return city
    }
}

async function capture_picture ( capture : CaptureDescription ){

    // File values
    const save_name = file_name(capture.city_name, capture.state_code)
    const save_dir = `../working-data/captures/${save_name}`

    // Run Values
    let page_loaded = false
    let page_errored = false
    
    // Start
    console.log(`Loading ${save_name} . . .`)

    // Open Page
    const page = (await params.puppet.pages())[0]

    // Wait for page to load
    let url = `http://localhost:8080/?lat=${capture.chosen_lat}&lng=${capture.chosen_lng}&zoom=${capture.zoom}`
    await page.goto (url, { waitUntil: 'networkidle2' })
        .then(() => {
            page_loaded = true
        })
        .catch(() => {
            page_errored = true
        })
    await wait(5)

    // If errored
    if (page_errored) {
        console.log(`Error loading ${save_name}`)
        return
    }

    // Capture
    verify_dir_exists(save_dir)
    const watchDog = page
      .mainFrame()
      .waitForFunction(`window.innerWidth === ${params.width} && window.innerHeight === ${params.height} `)

    await page.setViewport({width: params.width, height: params.height})
    await watchDog
    await page.screenshot({path: `${save_dir}/raw.png`, fullPage: true})
    await wait(1)

    // Write Data
    const save_data = JSON.stringify(capture, null, 2)
    fs.writeFileSync(`${save_dir}/info.json`, save_data) 

    // Spawn purger if needed
    await wait(1)
    const ls = spawn('python', ['./checkandpurge.py', save_name]);
    ls.stdout.on('data', (data) => {
        console.log(`Purger: ${data}`);
    });
    ls.stderr.on('data', (data) => {
        console.log(`Purger: ${data}`);
    });
    ls.on('close', async (code) => { });
}

// Create express app
var app = express();

app.use(express.json());
app.use(express.static(__dirname)); 

app.post('/capture', async function (req, res) {
    await launch_puppet()
    await capture_picture(req.body)
    res.send('done');
})

app.post('/next', async function (req, res) {
    const cities = await load_CSV('../assets/reference/uscities.csv')
    const next_city = await find_next(cities)
    const response = {
        city_name: next_city[0],
        state_code: next_city[2],
        state: next_city[3],
        latitude: next_city[6],
        longitude: next_city[7],
        zoom: 12,
    }
    res.send(JSON.stringify(response))
})

app.post('/record', async function (req, res) {
    const save_name = file_name(req.body.city_name, req.body.state_code) 
    const output_path = `../working-data/positioning/${save_name}.json`
    fs.writeFileSync(output_path, JSON.stringify(req.body, null, 2))
    res.send('done')
})

app.listen(8080);
console.log('Listening on port 8080');

