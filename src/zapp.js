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
const yaml = require('js-yaml');

function parse_argv() {
    program
        .version('0.0.1')
        .option('-c, --config <n>', 'config path')
        .option('-k, --key <n>', 'config key')
        .parse(process.argv);

    load_config(program.config, program.key)
    build_config()
    // console.log(JSON.stringify(zconf, null, 4));    
}

// 拷贝配置文件,数组会覆盖
function copy_conf(dst, src) {
    for (var k in src) {
        var datas = src[k]
        var datad = dst[k]

        var types = typeof datas
        var typed = typeof datad

        if (Array.isArray(datas) && Array.isArray(datad)) {
            dst[k] = datas
            // console.log(k)
            // console.log(dst[k])
        } else if (typed === 'object' && types === 'object') {
            // 继续拷贝
            copy_conf(datad, datas)
        } else {
            dst[k] = datas
        }
    }
}

// 加载配置文件
function load_config(filename, key) {
    // 如何没有指定config,会自动从当前工作目录查找conf.yaml文件
    if(zutil.isEmpty(filename)) {
        filename = './conf.yaml'
    }

    filename = zutil.getAbsolutePath(filename)
    if(!fs.existsSync(filename)) {
        return
    }

    var contents = fs.readFileSync(filename, 'utf8')
    var data = yaml.load(contents)
    // 查找全局配置
    var globalConf = data['conf']
    if (globalConf != undefined) {
        copy_conf(zconf, globalConf)
    }

    if(key == undefined) {
        return
    }

    var specialConf = data[key]
    if(specialConf != undefined) {
        copy_conf(zconf, specialConf)
    }
}

// 解析名字${name|upper} ->$name,upper
function parse_name(item) {
    var name = item.name
    
    item.name_kind = 'raw'
    if(zutil.isEmpty(item.name)) {
        item.name = '$name'
        return
    }

    // $name
    if(name.indexOf('$name') != -1) {
        return
    }

    // ${name|filter}
    var start = name.indexOf("${")
    if(start == -1) {
        return
    }

    var end = name.indexOf("}", start)
    if(end == -1) {
        console.log('parse name format fail!', name)
        return
    }

    item.name = name.substr(0, start) + "$name" + name.substr(end + 1)
    var splitIndex = name.indexOf('|')
    if(splitIndex != -1) {
        item.name_kind = name.substr(splitIndex+1, end - splitIndex -1).trim()
    }

    // console.log("item.name", item.name, item.name_kind)
}

// 设置默认配置
function build_config() {
    if(!zutil.isEmpty(zconf.array_join)) {
        JOIN_SEP = zconf.array_join
    }
    
    var output = zconf.output
    if(output.path == "") {
        output.path = "./build/output/"
    }
    
    if(!output.path.endsWith('/')) {
        output.path += '/'
    }

    // add defaults templates
    output.templates.push(__dirname + "/../templates/")

    // copy data conf
    output.data = []
    output.code = []

    // 合并data配置
    for(var idx in output.data_out) {
        var type = output.data_out[idx]
        var item = {}
        item.type = type
        zutil.deepCopy(item, output.data_tpl[type])
        output.data.push(item)
    }
    delete output.data_out
    delete output.data_tpl
    // 合并code配置
    for(var idx in output.code_out) {
        var type = output.code_out[idx]        
        var item = {}
        item.type = type
        zutil.deepCopy(item, output.code_tpl[type])
        output.code.push(item)
    }
    delete output.code_out
    delete output.code_tpl

    // build data
    output.data.map((item)=>{
        parse_name(item)
        
        if(zutil.isEmpty(item.path)) {
            item.path = path.join(output.path, 'data-'+item.type)            
        }

        return item
    })

    // build code
    output.code.map((item)=>{
        parse_name(item)
        
        if(zutil.isEmpty(item.path)) {
            item.path = path.join(output.path, 'code-'+item.type)
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

// 查找art目标目录
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

// 构建所有table成promises
function build_tables() {
    var promises = []
    zconf.xlsx.path.forEach((path)=>{
        results = xlsx.build(path)
        promises = promises.concat(results)
    })

    zconf.gdoc.spreadsheet_key.forEach((key)=>{
        results = gdoc.build(zconf.gdoc, key)
        promises = promises.concat(results)
    })

    return promises
}

// 检查table合法性
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
