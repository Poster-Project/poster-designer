import * as T from './types'
import fs from 'fs'
import express from 'express';
import puppeteer from 'puppeteer';
import { find_next } from './loader';

export default class Server {

    private headless : boolean = false
    private size : number = 10000
    private puppet : any = undefined

    private async launch_puppet () {

        if (this.puppet) return this.puppet

        const puppet = await puppeteer.launch({
            headless: this.headless,
            //@ts-ignore
            captureBeyondViewport: true,
            zoomFactor: 0.1,
            args: ['--no-sandbox', '--incognito'],
            defaultViewport: {
                width: this.size,
                height: this.size,
                isMobile: true,
            }
        })

        this.puppet = puppet
        return puppet
    }

    private async capture_raw ( target : T.raw_poster ) {

        // Open Page
        const puppet = await this.launch_puppet()
        const page = (await puppet.pages())[0]
        page.setDefaultNavigationTimeout(0); 
        await T.wait(1)

        // Describe poster
        const url_params = { ...target }
        const url = `http://localhost:3000/?${T.urlEncode(url_params)}`

        // Do the screenshot
        await page.goto (url, { waitUntil: 'networkidle2' })
        await page.setViewport({width: this.size, height: this.size})
        //@ts-ignore
        await T.waitUntil(() => page.evaluate(() => document._mapLoaded ))
        await T.wait(10)

        // Write Data
        const save_base = `../_local/raw_pictures`
        const file_name = T.style_name(target)
        const save_dir = `${save_base}/${file_name}`
        await page.screenshot({path: save_dir, fullPage: true})

    }

    public start_server () {
        var app = express();
        app.use(express.json());
        app.use(express.static(__dirname + '/../client')); 
        app.use('/capture', this.req_capture.bind(this))
        app.use('/done', this.req_done.bind(this))
        app.use('/next', this.req_loader_next.bind(this))
        app.use('/record', this.req_record.bind(this))

        app.listen(3000)

    }

    private async req_capture ( req:any, res:any ) {
        const target : T.raw_poster = req.body
        await this.capture_raw(target)
        res.send('done')
    }

    private async req_done (req:any, res:any) {
        this.puppet.close()
        res.send('done');
    }

    private async req_loader_next (req:any, res:any) {
        const next = await find_next()
        res.send(JSON.stringify(next))
    }

    private async req_record (req:any, res:any) {
        const to_record : T.raw_poster = req.body
        const save_name = T.name_file(to_record)
        const dir = `../_local/saved_positions/${save_name}.json`
        const hash = T.hashCode(JSON.stringify(to_record))
        fs.writeFileSync(dir, JSON.stringify({...to_record, hash}, null, 2))
        res.send('done')
    }

}

const S = new Server()
S.start_server()