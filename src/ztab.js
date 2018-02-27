const zutil = require('./zutil')

const JOIN_SEP = '|'

const TYPE_INT = 'INT'
const TYPE_BOOL = 'BOOL'
const TYPE_LONG = 'LONG'
const TYPE_FLOAT = 'FLOAT'
const TYPE_STRING = 'STRING'
const TYPE_ARRAY = 'ARRAY'
const TYPE_ARRAY2 = 'ARRAY2'
const TYPE_MAP = 'MAP'
const TYPE_ENUM = 'ENUM'
const TYPE_DATE = 'DATE'
const TYPE_CLOCK = 'CLOCK'

const gTypeMap = {
    'INT': 'int',
    'BOOL': 'bool',
    'LONG': 'long',
    'FLOAT': 'float',
    'STRING': 'string',
    'ARRAY': '$type[]',
    'ARRAY2': '$type[][]',
    'MAP': 'map<$key,$val>',
    'ENUM': 'int',
    'DATE': 'string',
    'CLOCK': 'string',
}

function getDefault(type) {
    switch (type) {
        case TYPE_BOOL:
            return "false";
        case TYPE_INT:
        case TYPE_LONG:
        case TYPE_FLOAT:
            return "0";
        default:
            return "";
    }
}

function isNumberType(type) {
    switch (type) {
        case TYPE_INT:
        case TYPE_BOOL:
        case TYPE_LONG:
        case TYPE_FLOAT:
            return true;
        default:
            return false;
    }
}

function isBasicType(type) {
    switch (type) {
        case TYPE_INT:
        case TYPE_BOOL:
        case TYPE_LONG:
        case TYPE_FLOAT:
        case TYPE_STRING:
            return true;
        default:
            return false;
    }
}

/** 
 * 头信息
 */
class Field {
    constructor(index, name, type, desc) {
        this.rawName = name
        this.rawType = type

        this.index = index // 原始head列索引
        this.indexField = -1 // field索引
        this.name = isNumberType(type) ? zutil.trimNumber(name) : name
        // this.nameCamel = zutil.upperCamelCase(name)
        this.desc = desc // 描述信息
        this.type = type // 去除附加信息的类型
        this.typek = '' // key类型
        this.typev = '' // value类型
        this.enum = null // 枚举映射关系
        this.array = null // 同名数组索引信息
        this.error = this.setType(type)
    }

    pushArrayIndex(index) {
        if (this.array == null) {
            this.array = []
            // // replace type
            // this.typek = this.type
            // this.type = TYPE_ARRAY
        }
        this.array.push(index)
    }

    changeArrayType() {
        this.typek = this.type
        this.type = TYPE_ARRAY
        this.desc = zutil.trimNumber(this.desc)
    }

    isType(t) {
        return this.type == t
    }

    setType(type) {
        // parse enum
        var tokens = type.split(/[\[\]\<\>:,\|]/).filter(String);
        if (tokens.length == 0) {
            return 'empty type:' + this.index
        }

        for (var i = 0; i < tokens.length; i++) {
            tokens[i] = tokens[i].toUpperCase()
        }

        var key = tokens[0]
        if (gTypeMap[key] == undefined) {
            return 'unknown type:' + type
        }

        this.type = key
        // 默认
        this.typek = TYPE_INT
        this.typev = TYPE_INT
        if (tokens.length == 1) {
            return ''
        }

        // console.log('key', key)
        // parse
        switch (key) {
            case TYPE_ARRAY:
            case TYPE_ARRAY2:
                var typek = tokens[1]
                if (!isBasicType(typek)) {
                    return 'bad array type:' + type
                }
                this.typek = typek
                this.typev = typek
                break
            case TYPE_MAP:
                if (tokens.length > 2) {
                    var typek = tokens[1]
                    var typev = tokens[2]
                    if (!isBasicType(typek) || !isBasicType(typek)) {
                        return 'bad map type:' + type
                    }
                    this.typek = typek
                    this.typev = typev
                } else {
                    var typek = tokens[1]
                    if (!isBasicType(typek)) {
                        return 'bad map type:' + type
                    }
                    this.typek = typek
                    this.typev = typek
                }
                break
            case TYPE_ENUM:
                // key-val map
                if (tokens.length % 2 != 1) {
                    return 'bad enum count:' + type
                }

                this.enum = {}
                for (var i = 1; i < tokens.length; i += 2) {
                    var k = tokens[i]
                    var v = tokens[i + 1]
                    // console.log('enum', k, v)
                    if (!zutil.isNumber(v)) {
                        return 'bad enum type:' + v + " in" + type
                    }
                    this.enum[k] = v
                }
                // console.log('enum:', this.enum)
                break
            default:
                return 'not support type:' + type
        }

        return ''
    }

    getBasicType(langKey, key) {
        var result = langKey[key]
        if (result == undefined) {
            result = gTypeMap[key]
        }

        return result
    }

    getType(langKey) {
        var pattern = this.getBasicType(langKey, this.type)

        switch (this.type) {
            case TYPE_ARRAY:
            case TYPE_ARRAY2:
                return pattern.replace('$type', this.getBasicType(langKey, this.typek))
            case TYPE_MAP:
                var r1 = pattern.replace('$key', this.getBasicType(langKey, this.typek))
                var r2 = r1.replace('$val', this.getBasicType(langKey, this.typev))
                return r2
            default:
                return pattern
        }
    }
}

/**
 * 支持的类型:
 * 基础类型:int,bool,long,float,string,
 * 复合类型:date(yy-mm-dd hh:mm:ss),clock时分秒，(hh:mm:ss)，enum类型
 * 容器类型:array,array2二维数组,map
 * 同名列或前缀同名列(_1)的非字符串数组,会合并成一列为数组
 * 文件至少三行：第一行名字，第二行类型，第三行注释
 */
class Table {
    constructor(name, file) {
        this.file = file // 文件名
        this.name = name // 表明
        this.data = [] // cells数据
        this.head = [] // 每列头信息
        this.fields = [] // 合并数组后的头信息
        this.error = ""  // 错误信息
    }

    push(row) {
        // 解析一行
        this.data.push(row)
    }

    throwError(info) {
        this.error = 'error in table[' + this.name + '], ' + info
        return false
    }

    build() {
        if (this.data.length < 3) {
            return this.throwError("head to short,lenght=" + this.data.length.toString())
        }

        // check id duplicate
        var idMap = {}
        for (var i = 3; i < this.data.length; i++) {
            var id = this.data[i][0]
            if (idMap[id]) {
                return this.throwError("duplicate id" + id)
            }

            idMap[id] = true
        }

        // build head        
        var enumList = []
        var needMergeArray = false

        var nameMap = {}
        var colMax = this.data[0].length
        for (var i = 0; i < colMax; i++) {
            var name = this.data[0][i].trim()
            var type = this.data[1][i].toUpperCase().trim()
            var desc = this.data[2][i].trim()
            desc = desc.replace(/[\r\n]/g,'');
            this.data[2][i] = desc

            if (name == undefined || name == "") {
                return this.throwError('empty name')
            }

            if (type == undefined || type == "") {
                return this.throwError('empty type')
            }

            var field = new Field(this.head.length, name, type, desc)
            if (field.error != '') {
                return this.throwError(field.error)
            }

            this.head.push(field)

            if (field.isType(TYPE_ENUM)) {
                enumList.push(i)
            }

            var nameField = nameMap[field.name]
            if (nameField != undefined) {
                // 要求类型必须一致，并且必须是数值类型，同名的会合并成一列
                if (nameField.type != field.type) {
                    return this.throwError('array must be same type!col=' + i)
                }

                if (!isNumberType(field.type)) {
                    return this.throwError('same name, array must be number type!' + field.type)
                }

                // 存在则需要合并成数组
                nameField.pushArrayIndex(i)
                needMergeArray = true
            } else {
                // 不存在，则为新的field
                nameMap[field.name] = field
                field.indexField = this.fields.length                
                this.fields.push(field)
            }
        }

        // convert default data
        for (var i = 0; i < this.head.length; i++) {
            // convert data
            var def = getDefault(this.head[i].type).toString()            
            for (var j = 3; j < this.data.length; j++) {
                var cell = this.data[j][i]
                if (typeof cell === 'undefined') {
                    this.data[j][i] = def
                } else {
                    cell = cell.replace(/[\r\n]/g,'');                     
                    this.data[j][i] = cell.toString()
                }
            }
        }

        // 校验是否有enum需要转化
        for (var i = 0; i < enumList.length; i++) {
            var field_index = enumList[i]
            var field = this.head[field_index]
            // convert enum
            for (var r = 3; r < this.data.length; r++) {
                var cell = this.data[r][field_index]
                this.data[r][field_index] = field.enum[cell.toUpperCase()]
            }
        }

        // check merge array,not support string,because split by comma(,)
        if (needMergeArray) {
            this.buildArray()
        }

        return true
    }

    buildArray() {
        // concat data
        var newData = new Array(this.data.length)
        for (var i = 0; i < this.data.length; i++) {
            var line = new Array(this.fields.length)
            newData[i] = line
        }

        // 
        var rowMax = this.data.length
        for (var i = 0; i < this.fields.length; i++) {
            var field = this.fields[i]

            if (field.array != null) {
                field.changeArrayType()
                for (var j = 3; j < rowMax; j++) {
                    newData[j][i] = this.joinField(j, field)
                }
            } else {
                for (var j = 3; j < rowMax; j++) {
                    newData[j][i] = this.data[j][i]
                }
            }

            newData[0][i] = field.name
            newData[1][i] = field.type
            newData[2][i] = field.desc
        }

        this.data = newData
    }

    joinField(row, field) {
        var arr = []
        arr.push(this.data[row][field.index])
        field.array.forEach(index => {
            arr.push(this.data[row][index])
        });

        return arr.join(JOIN_SEP)
    }

    toJson() {
        // to array or object??
        var obj = {}

        // convert
        for(var i = 3; i < this.data.length; i++) {
            var line = {}
            for(var j = 0; j < this.fields.length; j++){
                var field = this.fields[j]
                line[field.name] = this.toJsonField(field.type, this.data[i][j])
            }
            var id = this.data[i][0]
            obj[id] = line
        }

        return obj
    }

    toJsonField(type, data) {
        switch(type) {
            case TYPE_ARRAY:
                return zutil.convertToArray(data)
            case TYPE_ARRAY2:
                return zutil.convertToArray2(data)
            case TYPE_MAP:
                return zutil.convertToMap(data)
            default:
                return data
        }
    }
}

function New(name, file) {
    table = new Table(name, file)
    return table
}

module.exports = {
    New
}