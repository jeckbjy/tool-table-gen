function upperCamelCase(value) {
    var ret = "";
    var upper = true;
    for (var i = 0; i < value.length; i++) {
        var ch = value.charAt(i)
        if (ch == '_' || ch == '-') {
            upper = true
            continue
        }

        if (upper) {
            upper = false
            ret += ch.toUpperCase()
        } else {
            ret += ch
        }
    }
    return ret;
}

function lowerCamelCase(value) {
    var upper = upperCamelCase(value)
    return upper.charAt(0).toLowerCase() + upper.substring(1)
}

/**
 * 去除以_xx结尾的数字
 */
function trimNumber(name) {
    if (!isDigit(name.charAt(name.length - 1))) {
        return name
    }

    var pos = name.lastIndexOf('_')
    if (pos == -1) {
        return name
    }

    // check must number
    var num = name.substring(pos + 1)
    for (var i = 0; i < num.length; i++) {
        ch = num.charAt(i)
        if (!isDigit(ch)) {
            return name
        }
    }

    return name.substring(0, pos)
}

/**
 * 被其中任意标点符号分隔,用于Array,Map解析
 */
function splitPunct(str) {
    var tokens = str.split(/[\[\]\<\>()|:,]/).filter(String);
    return tokens
}

/**
 * 将str分割成数组，以标点符号分隔
 * @param {string} str 
 */
function convertToArray(str) {
    return splitPunct(str)
}

/**
 * 将str分割成二维数组，有两种方式,严格要求分隔符
 * mode 1:(a1,a2,a3),(b1,b2,b3),(c1,c2,c3)
 * mode 2:a1,a2,a2|b1,b2,b3|c1,c2,c3
 * @param {string} str 
 */
function convertToArray2(str) {
    // two level split
    if (str.startsWith('(')) {
        // mode 1:(a1,a2,a3),(b1,b2,b3),(c1,c2,c3)        
        var tokens = str.split(')').filter(String)
        return tokens.map((v) => {
            v = v.replace('(', '')
            return splitPunct(v)
        })
    } else {
        // mode 2:a1,a2,a2|b1,b2,b3|c1,c2,c3        
        var tokens = str.split('|').filter(String)
        return tokens.map((v) => {
            return splitPunct(v)
        })
    }
}

/**
 * 将str分隔成Map,以标点符号分隔
 * @param {string} str 
 */
function convertToMap(str) {
    // key-val
    var tokens = splitPunct(str)
    var obj = {}
    for (var i = 1; i < tokens.length; i += 2) {
        var key = tokens[i - 1]
        var val = tokens[i]
        obj[key] = val
    }

    return obj
}

/**
 * 转换名字格式
 * @param {string} name 
 * @param {string} kind 
 */
function buildName(name, kind) {
    switch (kind) {
        case 'upper':
            return upperCamelCase(name)
        default:
            return name
    }
}

/**
 * 实现Object的深度合并,注意并不是完成拷贝，array会合并成一个
 * @param {Object} dst 
 * @param {Object} src 
 */
function deepCopy(dst, src) {
    for (var k in src) {
        var datas = src[k]
        var datad = dst[k]

        var types = typeof datas
        var typed = typeof datad

        // 类型不同，直接覆盖
        if (Array.isArray(datas) && Array.isArray(datad)) {
            dst[k] = datad.concat(datas)
        } else if (typed === 'object' && types === 'object') {
            deepCopy(datad, datas)
        } else {
            dst[k] = datas
        }
    }
}

function isEmpty(str) {
    if (str === null || str === undefined || str === '') {
        return true
    }

    return false
}

function isNumber(str) {
    // console.log(str, typeof(str))
    for (var i = 0; i < str.length; i++) {
        if (!isDigit(str.charAt(i))) {
            return false
        }
    }

    return true
}

// Test for punctuation characters
function isPunct(aChar) {
    return (isGraph(aChar) && !(isAlnum(aChar)));
}

// Test for printable characters (only good up to char 127)
function isGraph(aChar) {
    myCharCode = aChar.charCodeAt(0);

    if ((myCharCode > 32) && (myCharCode < 127)) {
        return true;
    }

    return false;
}

// Test for letters and digits
function isAlnum(aChar) {
    return (isDigit(aChar) || isAlpha(aChar));
}

// Test for digits
function isDigit(aChar) {
    myCharCode = aChar.charCodeAt(0);

    if ((myCharCode > 47) && (myCharCode < 58)) {
        return true;
    }

    return false;
}

// Test for letters (only good up to char 127)
function isAlpha(aChar) {
    myCharCode = aChar.charCodeAt(0);

    if (((myCharCode > 64) && (myCharCode < 91)) ||
        ((myCharCode > 96) && (myCharCode < 123))) {
        return true;
    }

    return false;
}

module.exports = {
    upperCamelCase,
    lowerCamelCase,
    trimNumber,
    convertToArray,
    convertToArray2,
    convertToMap,
    deepCopy,
    buildName,
    isEmpty,
    isNumber,
    isPunct,
    isGraph,
    isAlnum,
    isDigit,
    isAlpha
}