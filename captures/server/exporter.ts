import fs from 'fs';
import * as T from './types'
//@ts-ignore
import fetch from 'node-fetch';

const export_styles = ['roads']

async function do_export () {

    let positions = fs.readdirSync('../_local/saved_positions')
    let exports = fs.readdirSync('../_local/raw_pictures')
    
    for (let pos of positions) {

        const content : T.raw_poster = JSON.parse(fs.readFileSync(`../_local/saved_positions/${pos}`).toString())

        for (const style in export_styles) {

            const style_data = { ...content, style : export_styles[style] }
            const export_name = T.style_name(style_data)
            
            if (exports.includes(export_name))  continue
            console.log(`Exporting ${export_name}`)
            
            fetch(`http://localhost:3000/capture`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(style_data)
            })
            
            await T.waitUntil(() => fs.existsSync(`../_local/raw_pictures/${export_name}`))
            await T.wait(2)

        }    
        
    }

    fetch(`http://localhost:3000/done`, {})

}

do_export()