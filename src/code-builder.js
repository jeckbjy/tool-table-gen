const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp')
const template = require('art-template')
const zutil = require('./zutil')

// 不同语言的关键字映射关系
var gLangKeyMap = {

}
// 自定义规则,用于获取对应语言的类型
template.defaults.rules.push({
    test:/\${([\w\W]*?)}/,
    use :function(match, code){
        var lang = this.options.lang
        var pos = code.indexOf(' ')
        var key = code.substring(0, pos).trim()
        var val = code.substring(pos).replace(new RegExp('"',"gm"), '').trim()
        var tokens = val.split('|')
        gLangKeyMap[lang] = {}
        var keyMap = gLangKeyMap[lang]
        tokens.forEach(token => {
            var arr = token.split('=')
            keyMap[arr[0].toUpperCase()] = arr[1]
        });
        // console.log('key map', keyMap)

        return {
            code:"",
            output:false
        }
    }
})

// 注册filters

/**
 * 转换成大驼峰命名法
 */
template.defaults.imports.upperCamelCase = (value) => {
    return zutil.upperCamelCase(value)
}

/**
 * 对齐，尚未实现，无法获得上下文
 */
template.defaults.imports.align = (value, param) => {
    console.log('align', value, param)
    return value
}

function build_code(render, table, fullpath, lang_key) {
    var content = {}
    content.Name = table.name
    content.NameUpper = zutil.upperCamelCase(table.name)
    content.NameLower = zutil.lowerCamelCase(table.name)
    content.NameLenMax = 0
    content.TypeLenMax = 0
    content.Fields = []
    table.fields.forEach((field)=>{
        var cfield = {}
        cfield.Name = field.name
        cfield.NameUpper = zutil.upperCamelCase(field.name)
        cfield.Type = field.getType(lang_key)
        cfield.Desc = field.desc
        cfield.Index = field.indexField
        // console.log('field', cfield)

        content.NameLenMax = Math.max(content.NameLenMax, cfield.Name.length)
        content.TypeLenMax = Math.max(content.TypeLenMax, cfield.Type.length)

        content.Fields.push(cfield)
    })

    content.IdType = 'int'
    content.IdName = 'Id'
    if(content.Fields.length > 0) {
        var field = content.Fields[0]
        content.IdType = field.Type
        content.IdName = field.Name
    }

    var data = render(content)
    console.log('  ->save code:', path.basename(fullpath))
    fs.writeFile(fullpath, data, (err)=>{
        if(err) {
            console.log('save code fail!', fullpath)
        }
    })
}

// 构建代码
function build(tables, cfg) {
    console.log('')
    console.log('start build code:')

    var content_mgr = {}
    content_mgr.Tables = []
    tables.forEach((tab)=>{
        var item = {}
        item.Name = tab.name
        item.NameUpper = zutil.upperCamelCase(tab.name)
        // item.IdType = tab.field[0].type
        content_mgr.Tables.push(item)
    })

    cfg.forEach((item)=>{
        var cfg_type = item.type
        var cfg_path = item.path
        var cfg_name = item.name
        var cfg_name_kind = item.name_kind        
        var cfg_tab_tpl = item.tab_tpl
        var cfg_mgr_tpl = item.mgr_tpl
        var cfg_mgr_name = item.mgr_name

        mkdirp.sync(cfg_path)

        // build table code
        if(!fs.existsSync(cfg_tab_tpl)){
            console.log('cannot find table template!', cfg_tab_tpl)            
            return
        }

        // 透传语言类型
        var options = {lang:cfg_type}
        var source = fs.readFileSync(cfg_tab_tpl, 'utf-8')        
        var render = template.compile(source, options)

        // 获取key
        var lang_key = gLangKeyMap[cfg_type]
        if(lang_key == undefined) {
            lang_key = {}
        }

        console.log('=====> '+cfg_type)
        tables.forEach((table)=>{
            var tabname = zutil.buildName(table.name, cfg_name_kind)
            var realname = cfg_name.replace('$name', tabname)
            var fullpath = path.join(cfg_path, realname + "." + cfg_type)
            build_code(render, table, fullpath, lang_key)
        })

        // build manager code
        if(!fs.existsSync(cfg_mgr_tpl)) {
            console.log('cannot open manager code template', cfg_mgr_tpl)
            return
        }

        var source = fs.readFileSync(cfg_mgr_tpl, 'utf-8')
        var render = template.compile(source)
        var fullpath = path.join(cfg_path, cfg_mgr_name + '.'+ cfg_type)
        var data = render(content_mgr)
        console.log('  ->save   mgr:', path.basename(fullpath))
        fs.writeFile(fullpath, data, (err)=>{
            if(err){
                console.log('save table mgr code fail!', fullpath)
            }
        })
    })
}

module.exports = {
    build:build
}