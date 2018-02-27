var config = {
    //
    xlsx: {
        // 多个路径,或文件名
        path:[],
    },
    //
    gdoc: {
        auth : {
            client_id:"",
            client_secret:"",
            redirect_uri:"",
            access_token:"",
            refresh_token:"",
        },
        spreadsheet_key:[],
    },
    //
    output: {
        path:"./build/output/",
        templates:["./templates/"],
        data:[
            // {type:'tsv', path:'', name:'$name', name_kind:'raw'},
        ],
        code:[
            // 简单的只需要配置type,其他会默认生成
            // 输出文件名可以用$name表示,name_kind:默认raw，upper会转化成大驼峰命名法
            // {type:'go', path:'', name:'Table_$name', name_kind:'upper', tab_tpl:'', mgr_tpl:'', mgr_name:''},
            // {type:'cs', path:'', name:'Table_$name', name_kind:'upper', tab_tpl:'', mgr_tpl:'', mgr_name:''},
        ]
    },
    // 默认合并数组时分隔符
    array_join:'|'
}

module.exports = config
