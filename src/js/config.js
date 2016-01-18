/**
 * config.
 */

module.exports = {
    "name": "Rock! Markdown Editor",
    "version": "0.2.1",
    "updateURL": "https://github.com/superRaytin/rock-markdown-editor/blob/stable/js/update.json",
    "memory": {
        "realtime": true, // 实时预览
        "maxsize": false, // 最大化

        "toolbar": true, // 工具栏
        "console": true, // 状态栏

        "lastSaveDir": "", // 最后一次保存目录路径
        "lastDirectory": "", // 最后一次操作路径
        "currentTabPath": "", // 退出时当前标签信息
        "tabList": null, // 退出时所有文件标签信息
        "historyList": null, // 历史记录列表

        "mail_from": "", // 发送人名称
        "mail_sign": "" // 签名
    },
    "setting": {
        //"animate": true, // 动画
        "theme_code": "default", // 主题
        "theme_preview": "default", // 预览区主题
        "tag_dblclickClose": false, // 双击关闭
        "tag_lock": true, // 锁定标签
        "fileManager": false, // 文件管理器
        // 保存的扩展名 .markdown || .txt || .md
        "extension": "md",
        // 升级方式 tip || auto || never
        "update": "tip",
        // 默认保存方式 current || last || custom
        "savePath": {
            mode: 'current',
            path: ''
        },
        // 邮件选项
        "mail": {
            SSL: true,
            SMTP: '',
            port: 465,
            userName: '',
            password: '',
            showName: '',
            flag: true
        }
    }
};