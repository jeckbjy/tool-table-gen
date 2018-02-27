# tool-table-gen

将gdoc文档，xlsx文档校验并导出成csv,tsv,json等格式，并通过art-template生成不同语言的导入代码

## 处理流程
* 1:将来自gdoc，或者xlsx文件的数据，导出成二维矩阵形式的Table表
    - 一个workbook包含多个sheet时，都会导出，但要求名字必须是字母开始，如果不需要导出,可以加特殊字符前缀，比如@，#
* 2:校验Table并转化
    - 至少包含三行,前三行分别是名字，类型，注释，
    - 首列不能重复
    - enum会自动转化为对应的数字,数据中不能存在未定义映射
    - 名字前缀一样的列会自动合并成一列,命名规则:_+数字结尾，如(xx_1,xx_2)
    - 未定义的数据，会自动转化成默认数值，bool：false,数值：0，其他空字符串
* 3:根据配置将Table导出成对应的数据格式,目前支持csv,tsv,json
* 4:根据配置将Table导出成对应的代码格式,基于art-template实现
    - 数据格式:{Name,NameUpper,NameLower,Fields:[{Name,Type,Desc}]}
    - 扩展语法:${bind type:"long=int64" file="uppername" }用于修改默认类型输出和文件名
## 安装
* npm i

## 使用
* 查看命令: node ./src/zapp.js -h
* 安配置生成文件命令：node ./src/zapp.js -c ${config_path}
* 配置模板，可查看./src/zcfg.js