const XLSX = require('xlsx');
const path = require('path')
const fs = require('fs')
const table = require('./ztab')

/**
 * filepath:file or directory
 * @param {string} filepath 
 */
function build(filepath) {
    // console.log('build xlsx',filepath)    
    return new Promise((resolve, reject)=>{
        stats = fs.statSync(filepath)
        if(stats.isFile()) {
            var results = build_xlsx(filepath)
            // console.log('xlsx results:', results)
            resolve(results)
        } else if(stats.isDirectory()) {
            // find xlsx or xls from dir
            var results = []
            var files = fs.readdirSync(filepath)
            files.forEach((filename)=>{
                ext = path.extname(filename)
                if(ext != ".xlsx" && ext != ".xls") {
                    return
                }
    
                sub_path = path.join(filepath, filename)
                sub_results = build_xlsx(sub_path)
                results = results.concat(sub_results)
            })
    
            // console.log('xlsx results aaa:', results)            
            resolve(results)
        } else {
            reject("bad xlsx path" + filepath)
            // console.log("bad xlsx path", filepath)
        }
    })
}

/**
 * parse all sheet from xlsx to matrix
 * @param {string} path 
 * @param {function} cb(error, result)
 */
function build_xlsx(filepath) {
    console.log('start build xlsx:'+filepath)
    var results = []
    var workbook = XLSX.readFile(filepath);

    // parse filename when just one sheet
    var filename = ""
    ext = path.extname(filepath)
    filename = path.basename(filepath, ext)

    var regs=/^[A-Z-a-z]$/;
    workbook.SheetNames.forEach((name)=>{
        // ignore sheet, startsWith '#' or '@'
        ch = name.charAt(0)
        // 首字母必须是字母
        if(!regs.test(ch)) {
            console.log('ignore sheet', name)
            return
        }

        sheet = workbook.Sheets[name]
        sheet_tab = parse_sheet(sheet, name, filename)
        if(sheet_tab != null) {
            results.push(sheet_tab);
        } else {
            console.log('bad sheet', name, filename)
        }
    });

    // console.log("build_xlsx", results)
    return results
}

function parse_sheet(sheet, name, filename) {
    console.log('  ->load sheet:', name)
    sheet_ref = sheet['!ref']
    if(typeof sheet_ref === 'undefined') {
        console.log("has empty sheet")
        return null
    }

    var result = table.New(name, filename)

    // to matrix data
    var range = XLSX.utils.decode_range(sheet_ref);
    for(row=range.s.r; row <= range.e.r; row++) {
        cells = [];
        for(col=range.s.c; col <= range.e.c; col++){
            var cell = sheet[XLSX.utils.encode_cell({r:row,c:col})]
            cells.push(cell.w)
        }

        result.push(cells)
    }
    
    return result
}

module.exports = {
    build:build
}