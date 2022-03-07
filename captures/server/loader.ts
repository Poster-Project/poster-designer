import fs from 'fs'
import * as T from './types'

const csv = './uscities.csv'

async function load_CSV (fileName : string) {
    const f = fs.readFileSync(fileName).toString()
    const without_quotes = f.replace(/"/g, '')
    const lines = without_quotes.split('\n')
    const rows = lines.map(line => line.split(','))
    return rows
}

export async function find_next() {

    const rows = await load_CSV(csv)
    const created = fs.readdirSync('../_local/saved_positions')

    for ( let city of rows ) {

        const info : T.defined_location = {
            country : 'USA',
            region : city[3],
            region_code : city[2],
            city : city[1],
            area : city[0],
            longitude : +city[6],
            latitude : +city[7],
        }

        const save_name = T.name_file(info)
    
        if ( created.includes(save_name) ) continue
        return info
    }

}
