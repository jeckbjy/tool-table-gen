const program = require('commander')
// const mkdirp = require('mkdirp')
const xlsx = require('./xlsx-builder')
const gdoc = require('./gdoc-builder')
const dbuilder = require('./data-builder')
const cbuilder = require('./code-builder')
const zconf = require('./zcfg')
const zutil = require('./zutil')
const path = require('path')
const fs = require('fs')
const process = require('process')

function parse_argv() {
    program
        .version('0.0.1')
        .option('-c, --config <n>', 'config path')
        .option('-x, --xlsx <n>', 'xlsx path')
        // .option('-g --gdoc', 'gdoc')
        .option('-s, --spreadsheet_key <n>', "gdoc spreadsheet_key")
        .option('-o, --output <n>', 'output path')        
        .option('-d, --data_type <n>', 'data type array, split by |')
        .option('-e, --code_type <n>', 'code type array, split by |')
        .option('-t, --template <n>', 'template path')
        .parse(process.argv);
    
    // load config
    if(program.config) {
        conf = require(zutil.getAbsolutePath(program.config))
        zutil.deepCopy(zconf, conf)
    }

    if(program.xlsx) {
        zconf.xlsx.path.push(program.xlsx)
    }

    if(program.spreadsheet_key) {
        zconf.gdoc.spreadsheet_key.push(program.spreadsheet_key)
    }

    var output = zconf.output
    if(program.output) {
        output.path = program.output
    }

    if(program.data_type) {
        tokens = program.data_type.split('|').filter(String)
        tokens.forEach((type)=>{
            output.data.push({type:type.trim()})
        })
    }

    if(program.code_type) {
        tokens = program.code_type.split('|').filter(String)
        tokens.forEach((type)=>{
            output.code.push({type:type.trim()})
        })
    }

    if(program.template) {
        tokens = program.template.split('|').filter(String)
        output.templates = output.templates.concat(tokens)
    }

    build_config()
}

// TODO:内置一些语言的默认配置
function build_config() {
    if(!zutil.isEmpty(zconf.array_join)) {
        JOIN_SEP = zconf.array_join
    }
    
    var output = zconf.output
    
    if(!output.path.endsWith('/')) {
        output.path += '/'
    }

    // build data
    output.data.map((item)=>{
        if(zutil.isEmpty(item.path)) {
            item.path = path.join(output.path, 'data-'+item.type)            
        }

        if(zutil.isEmpty(item.name)) {
            item.name = '$name'
        }

        if(zutil.isEmpty(item.name_kind)) {
            item.name_kind = 'raw'
        }

        return item
    })

    // build code
    output.code.map((item)=>{
        if(zutil.isEmpty(item.path)) {
            item.path = path.join(output.path, 'code-'+item.type)
        }

        if(zutil.isEmpty(item.name)) {
            item.name = '$name'
        }

        if(zutil.isEmpty(item.name_kind)) {
            item.name_kind = 'raw'
        }

        if(zutil.isEmpty(item.tab_tpl)) {
            item.tab_tpl = find_tpl(item.type + '_tab.art')
        }

        if(zutil.isEmpty(item.mgr_tpl)) {
            item.mgr_tpl = find_tpl(item.type + '_mgr.art')
        }

        if(zutil.isEmpty(item.mgr_name)) {
            item.mgr_name = 'TableMgr'
        }

        return item
    })
}

function find_tpl(name) {
    var dirs = zconf.output.templates
    // console.log('dirs',dirs)
    for(var i = 0; i < dirs.length; i++){
        var dir = dirs[i]
        var fullpath = path.join(dir, name)
        if(fs.existsSync(fullpath)) {
            return fullpath
        }
    }

    return name
}

function build_tables() {
    var promises = []
    zconf.xlsx.path.forEach((path)=>{
        results = xlsx.build(path)
        promises = promises.concat(results)
    })

    zconf.gdoc.spreadsheet_key.forEach((key)=>{
        results = gdoc.build(zconf.gdoc.auth, key)
        promises = promises.concat(results)
    })

    return promises
}

function check_tables(tables) {
    console.log('')
    console.log('start build tables:', 'count='+tables.length)
    var results = []
    tables.forEach((table)=>{
        console.log('  ->table:', table.name)
        if(table.build()){
            results.push(table)
        } else {
            console.log("build error:",table.error)
        }
    })

    return results
}

/**
 * 1:解析数据源
 * 2:校验数据
 * 3:导出表格
 * 4:导出代码
 */
function main() {
    parse_argv()

    var promises = build_tables()
    Promise.all(promises)
    .then((results)=>{
        var tables = check_tables([].concat.apply([],results))    
        // step 2: build data
        dbuilder.build(tables, zconf.output.data)
        // step 3: build code
        cbuilder.build(tables, zconf.output.code)
    })
    .catch((err)=>{
        console.log(err)
    })
}

function build(table) {
    cbuilder.build()
}

main()
