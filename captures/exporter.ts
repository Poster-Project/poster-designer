/*
    Export all positiong data to pngs
*/
    

import fs from 'fs';
//@ts-ignore
import fetch from 'node-fetch';

async function do_export () {

    let positions = fs.readdirSync('../working-data/positioning')
    let captures = fs.readdirSync('../working-data/captures')

    while (true){
        
        // Do exports
        for (let pos of positions) {

            let id = pos.split('.')[0]

            if ( ! captures.includes(id)) {
        
                const data = fs.readFileSync(`../working-data/positioning/${pos}`)
                
                await fetch(`http://localhost:8080/capture`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: data
                })
            }
        }

        // See if all where successfull
        
        positions = fs.readdirSync('../working-data/positioning')
        captures = fs.readdirSync('../working-data/captures')
        let all_valid = true
        for (let pos of positions) {
            let id = pos.split('.')[0]
            if ( ! captures.includes(id)) {
                all_valid = false
            }
        }
        if (all_valid) break

    }

}

do_export()