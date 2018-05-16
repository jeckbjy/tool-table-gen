// 用于描述配置文件结构
module.exports = {
    // office
    xlsx: {
        path: []
    },
    // google document
    gdoc: {
        client_id:"",
        client_secret:"",
        redirect_uri:"",
        access_token:"",
        refresh_token:"",
        spreadsheet_key:[],
    },
    // 输出配置
    output: {
        // default:./build/output/
        path:"",
        // default:"./templates/"
        templates:[],
        // 需要输出的数据类型,例如['csv', 'tsv', 'json']
        data_out: [],
        // 需要输出的代码类型,例如['go','cs']
        code_out:[],

        // 数据输出模板信息
        data_tpl:{
            // 例如
            // tsv: { path:'', name:'$name', }
        },
        // 代码输出格式,以及模板路径等信息
        code_tpl: {
            // 简单的只需要配置type,其他会默认生成
            // 输出文件名可以用$name表示,name_kind:默认raw，upper会转化成大驼峰命名法
            // go: { path:'', name:'Table_${name|upper}', tab_tpl:'', mgr_tpl:'', mgr_name:''}
            // cs: { path:'', name:'Table_${name|upper}', tab_tpl:'', mgr_tpl:'', mgr_name:''}
        },
        // 最终的数据输出配置
        data: [
            // {type:'tsv', path:'', name:'$name', name_kind:'raw'}
        ],
        // 最终的代码输出配置
        code: [
            // {type:'go', path:'', name:'', tab_tpl:'',mgr_tpl:'',mgr_name:''}
        ]
    },
    
    // 默认合并数组时分隔符
    array_join:'|'
}
