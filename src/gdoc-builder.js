const GoogleSpreadsheets = require('google-spreadsheets')
const google = require('googleapis');
const ztab = require('./ztab')
// TODO: use google-auth-library replace googleapis

var gAuth = null

function build(auth_cfg, spreadsheet_key) {
    if(gAuth == null) {
        // console.log(auth_cfg)
        gAuth = new google.auth.OAuth2(auth_cfg.client_id, auth_cfg.client_secret, auth_cfg.redirect_uri)
        gAuth.setCredentials({
            access_token:auth_cfg.access_token,
            refresh_token:auth_cfg.refresh_token
        })
    }

    return new Promise((resolve, reject)=>{
        GoogleSpreadsheets({key:spreadsheet_key, auth:gAuth}, (err, spreadsheet) => {
            if(err) {
                reject(err)
                return
            }

            console.log('')
            console.log('start build gdoc:', "spreadsheet="+spreadsheet.title)            
    
            var promises = []
            for(var i = 0; i < spreadsheet.worksheets.length; i++){
                var worksheet = spreadsheet.worksheets[i]
                var promise = build_worksheet(worksheet, spreadsheet)
                promises.push(promise)
            }
    
            Promise.all(promises)
            .then((tables)=>{
                resolve(tables)
            }).catch((err)=>{
                reject(err)
            })
        })
    })
}

function build_worksheet(worksheet, spreadsheet) {
    return new Promise((resolve, reject) => {
        worksheet.cells(null, (err, result)=>{
            if(err) {
                console.log('process worsheet fail!', worksheet.title)
                // reject()              
                return
            }

            console.log('  ->load sheet:', worksheet.title)            
            var table = ztab.New(worksheet.title, spreadsheet.title)                
            for(var keyRow in result.cells) {
                var rowCells = []                    
                var row = result.cells[keyRow]
                for(var keyCol in row) {
                    rowCells.push(row[keyCol].value)
                }
        
                table.push(rowCells)
            }

            resolve(table)
        })
    })
}

module.exports = {
    build:build
}
