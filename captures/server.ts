/*
    An express webserver that manages the image capture process
    - Serves the index.html file
    - Accepts POST requests to /capture 
    - Accepts POST requests to /next
    - Accepts POST requests to /record
*/

import express from 'express';
import open from 'open';
import puppeteer from 'puppeteer';
import fs from 'fs';
import {parse} from 'csv-parse';

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

    const save_name = file_name(capture.city_name, capture.state_code)
    const save_dir = `../working-data/captures/${save_name}`

    const puppet = await puppeteer.launch({
        headless:false,
        devtools: true,
        //@ts-ignore
        captureBeyondViewport: false,
        zoomFactor: 0.1,
        defaultViewport: {
            width:6000,
            height:6000,
            isMobile: true,
        }
    })

    // Open Page
    const page = (await puppet.pages())[0]

    // Wait for page to load
    await page.goto (`http://localhost:8080/?lat=${capture.chosen_lat}&lng=${capture.chosen_lng}&zoom=${capture.zoom}`)
    await wait(15)

    // Capture
    verify_dir_exists(save_dir)
    await page.screenshot({path: `${save_dir}/raw.png`});
    await wait(1)

    // Write Data
    const save_data = JSON.stringify(capture, null, 2)
    fs.writeFileSync(`${save_dir}/info.json`, save_data) 
    
    await puppet.close();

}

// Create express app
var app = express();

app.use(express.json());
app.use(express.static(__dirname)); 

app.post('/capture', async function (req, res) {
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

