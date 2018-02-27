const fs = require('fs');
const path = require('path')
const mkdirp = require('mkdirp')
const zutil = require('./zutil')

/**
 * 格式化生成json格式，不生成头信息，并且自动转化Array和Map格式
 * @param {string} path 
 * @param {table} sheet 
 */
function build_json(fullpath, sheet) {
    var json_obj = sheet.toJson()
    var json_str = JSON.stringify(json_obj, null, 4)
    fs.writeFile(fullpath, json_str,(err)=>{
        if(err) {
            console.log('save json fail!', fullpath)
        }
    })
}

function build_dsv(fullpath, sheet, delimiter) {
    // console.log("dsv path:",path)
    var stream = fs.createWriteStream(fullpath);
    var data = sheet.data
    data.forEach((line,rowIndex) => {
        line.forEach((cell, colIndex)=>{
            // console.log('cell info', cell, typeof(cell))
            // cell = cell.replace(/(\r\n|\n|\r)/gm,"");
            try {
                if(cell.indexOf(delimiter) != -1) {
                    stream.write('"')
                    stream.write(cell)
                    stream.write('"')
                } else {
                    stream.write(cell)
                }
                stream.write(delimiter)
            } catch (error) {
                console.log('cell error!', rowIndex,colIndex, cell, typeof(cell))
            }

        })
        stream.write('\n')
    });
    stream.end()
}

function build_csv(path, sheet) {
    build_dsv(path, sheet, ',')
}

function build_tsv(path, sheet) {
    build_dsv(path, sheet, '\t')
}

function get_func(ext) {
    switch(ext) {
    case "csv":
        return build_csv
    case "tsv":
        return build_tsv
    case "json":
        return build_json
    }

    return null
}

function build(tables, cfg) {
    console.log('')    
    console.log('start build data:')
    cfg.forEach((item)=>{
        var cfg_type = item.type
        var cfg_path = item.path
        var cfg_name = item.name
        var cfg_name_kind = item.name_kind

        var cb = get_func(cfg_type)
        if(cb == null) {
            console.log("cannot output data by data type", cfg_type)
            return
        }
        mkdirp.sync(cfg_path)

        console.log('  =====> '+cfg_type)
        tables.forEach((table)=>{
            var tabname = zutil.buildName(table.name, cfg_name_kind)            
            var realname = cfg_name.replace('$name', tabname)
            var fullpath = path.join(cfg_path, realname + "." + cfg_type)
            console.log('  ->save data:', path.basename(fullpath))
            cb(fullpath, table)
        })
    })
}

module.exports = {
    build
}