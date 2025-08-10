# 可视化csv文件处理工具

## 前端页面描述

页面右上角有4个按钮，分别是【读取reactions.csv】、【读取reactants.csv】、【读取environment_effects.csv】、【读取attack_effects.csv】按钮
按钮下方一行对应四个tab，分别是【reactions】、【reactants】、【environment_effects】、【attack_effects】
点击tab切换时，会切换到对应的表格中。
页面主体部分是一个表格，表格的列名和reactions.csv文件保持一致。
表格的宽度为屏幕宽度的90%。
表格行数过多时进行分页展示，每一页20行。
表格上方有【新增xx】【保存文件】、【复制csv文本】按钮
【新增】按钮。
- 【新增】按钮在不同tab下应该有不同的名称和含义。
- 【新增反应】在reactions tab下，新增的反应会在reactions.csv文件中新增一行数据。
- 【新增反应物】在reactants tab下，新增的反应会在reactants.csv文件中新增一行数据。
- 【新增环境影响】在environment_effects tab下，新增的反应会在environment_effects.csv文件中新增一行数据。


## 功能描述

### tab公共功能

1、【csv文件读取以及表格数据展示】
1-1、通过前端页面读取本地的csv文件，并以表格的形式展示出来。
1-2、点击【读取csv】按钮后，弹出本地文件的选择框，可以从中选择目标csv文件
1-3、读取目标csv文件后，将文件内容填入表格中。
1-4、表格的列名和csv文件保持一致。
1-5、表格列宽适应csv文件的内容。
2、【“新增”按钮功能】
2-1、点击【新增xx】按钮后，在表格最后一行下面新增一行空白行
2-2、新增的空白行，自动填入id，id值为最后一行的id+1
3、【表格数据编辑】
3-1、表格的每一行数据都可以手动编辑
3-2、表格数据被编辑后，实时修改读取的csv文件的对应字段的数据，回写到对应的文件中。
3-3、保存修改后的文件时，需要保留原始csv文件的前三行（标题行、中文描述、数据类型说明）
4、【复制csv文本】
4-1、点击【复制csv文本】按钮后，将当前tab的表格中的数据以csv文本的形式复制到剪贴板中。
4-2、复制的csv文本中，第一行是标题行，第二行是中文描述，第三行是数据类型说明，从第四行开始是数据行。

### reactions tab

1、部分情况下，reactions.csv文件中某些数据行的reactants列和products列是没有内容，若这两列中没有内容的时候，从reaction_equation列中读取反应方程式，
并将箭头两边的反应物和生成物分别回填到reactants和products列中。
1-1、回填规则：有多个reactants或products时，使用|进行分隔
1-2、回填时不要带上reactants或products前面配平的数字以及后面的沉淀物或气体的箭头符号
2、【表格编辑】
2-1、reactants或products列支持下拉框多选和输入框，选择的范围为reactants.csv文件中的chemical_formula字段。
2-2、reaction_conditon或reaction_effect列支持下拉框多选和输入框，选择的范围为environment_effects.csv文件中的name字段。下拉框多选时，使用|符号进行分隔。
2-3、修改反应方程式时，实时解析并回填到reactants和products列中。
2-4、修改reactants或products列时，实时解析并回填到reaction_equation列中。
2-5、reactants或products列的下拉框中，除了显示chemical_formula字段，还应该显示name_zh字段。
2-6、reaction_conditon和reaction_effect列的下拉框中，除了显示name字段，还应该显示name_zh字段。

### reactants tab

1、【表格展示】
1-1、除了id列外，其他列自适应宽度
2、【表格编辑】
2-1、attack_effects列支持下拉框多选和输入框，选择的范围为attack_effects.csv文件中的name字段。
2-2、attack_effects列的下拉框中，除了显示name字段，还应该显示name_zh字段。

### environment_effects tab

1、【表格展示】
1-1、除了id列外，其他列自适应宽度

### attack_effects tab

1、【表格展示】
1-1、除了id列外，其他列自适应宽度

## 入口文件

- `main.html` - 主入口

## reactions.csv文件相关信息

### 文件格式

CSV文件格式：

- **第0行**：标题行（包含`reaction_equation`和`reactants`列）
- **第1行**：中文描述
- **第2行**：数据类型说明
- **第3行开始**：实际数据内容

### 示例格式

```
id,reaction_equation,reactants,catalyst,reaction_conditon,products,reaction_effect,reaction_type,desc
主键,反应方程式,反应物列表,催化剂,反应条件,产物列表,反应效果,反应类型,描述
int,String,String,String,String,String,String,String,String
1,2H2 + O2 -> 2H2O,,无,加热,2H2O,生成水,化合反应,氢气和氧气反应生成水
2,CH4 + 2O2 -> CO2 + 2H2O,,无,点燃,CO2+2H2O,完全燃烧,氧化反应,甲烷燃烧
```

## reactants.csv文件相关信息

### 文件格式

CSV文件格式：

- **第0行**：标题行
- **第1行**：中文描述
- **第2行**：数据类型说明
- **第3行开始**：实际数据内容

### 示例格式

```
id,name,name_zh,chemical_formula,attack_effects,base_effect_values
主键,名称,中文名称,化学式,攻击效果,基础效果数值
int,String,String,String,String,String
1,Hydrogen,氢气,H₂,Physical Attack|Repel,1|1
2,Water,水,H₂O,Physical Attack|Slow,1|1
```

## environment_effects.csv文件相关信息

### 文件格式

CSV文件格式：

- **第0行**：标题行
- **第1行**：中文描述
- **第2行**：数据类型说明
- **第3行开始**：实际数据内容

### 示例格式

```
id,name,name_zh,base_effect_values,desc
主键,名称,中文名称,基础效果数值,描述
int,String,String,int,String
1,high temperature,高温,1,对火系敌人造成1点全局范围伤害
```

## attack_effects.csv文件相关信息

### 文件格式

CSV文件格式：

- **第0行**：标题行
- **第1行**：中文描述
- **第2行**：数据类型说明
- **第3行开始**：实际数据内容

### 示例格式

```
id,name,name_zh,desc
主键,名称,中文名称,描述
int,String,String,String
1,Physical Attack,物理攻击,对敌人造成物理伤害
```
