# Obsidian Imgbb Plugin

这个插件用于使用Imgbb做为图床.

这个项目从[obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin)模板中创建.
主要参考了[obsidian-image-auto-upload-plugin](https://github.com/renmu123/obsidian-image-auto-upload-plugin)的代码.
与`obsidian-image-auto-upload-plugin`不同, 使用本插件不需要安装PicGo.

**Note:** 这个项目是几个小时搭建完成的,其中代码多是拼凑而来,不具备参考性.

## 开始

1. 安装插件并开启插件, Ribbon会多出一个`Imgbb Plugin Icon`
2. 在设置页面配置`imgbb`的API Key ; 参考: https://api.imgbb.com/
3. 打开一个包含本地连接的笔记.
4. 点击Ribbon栏目`Imgbb Plugin Icon`, 插件会提取所有本地连接的图片地址,并上传到`imgbb`.
  a. 也可以使用命令"imgbb plugin: upload all images"方式
5. 上传过程和完毕有Notice提示.
6. 如果上传成功, 插件会替换`local-image-link`为`remote-image-url`

### Imgbb Plugin Icon

![icon](images/imgbb-ribbon-icon.png)

### Imgbb Plugin Command: upload all images

![icon](images/imgbb-ribbon-cmd.png)

### Imgbb Plugin Setting

![icon](images/imgbb-ribbon-settings-1.png)
![icon](images/imgbb-ribbon-settings-2.png)


## 已知问题

1. 上传到`imgbb`后,不管是使用API返回的`display_url`还是`thumb.url`, 图片总是以缩略图方式展示.