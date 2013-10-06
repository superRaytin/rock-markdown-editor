/**
 * contextmenu.
 * User: raytin
 * Date: 13-7-25
 */
var require = global.require,
    window = global.window,
    console = window.console,
    fs = require('fs'),
    iconv = require('iconv-lite');

var source = {};

// 初始化右键菜单
var contextMenuInit = function(){
    var markdown = global.markdown,
        cache = markdown.cache,
        editor = cache.editor;

    var gui = cache.gui,
        clipboard = gui.Clipboard.get();

    function menuMachine(name, option){
        return (source[name] = new gui.MenuItem(option));
    }

    function showToolOrConsole(that, type){
        var footer = $('#J-footer'),
            toolbar = $('#J-toolbar'),
            main = $('#J-tab, #codeMirror, #showdown'),
            fireOnloadLocalData = cache.tempFlag === 'localData';

        // 这一次是 加载本地数据时进来的 取反
        if(fireOnloadLocalData){
            that.checked = !that.checked;
        }

        if(type === 'toolbar'){
            if(that.checked){
                toolbar.removeClass('hide');
                main.css('top', '+=30px');
            }else{
                toolbar.addClass('hide');
                main.css('top', '-=30px');
            }
        }
        else if(type === 'console'){
            if(that.checked){
                footer.removeClass('hide');
                main.css('bottom', '25px');
            }else{
                footer.addClass('hide');
                main.css('bottom', '0px');
            }
        }

        markdown.adjustWorkspace();

        // 保存用户选择的工具栏和状态栏显隐值
        markdown.userFootprint.saveToMemory(type, that.checked);

        if(fireOnloadLocalData){
            delete cache.tempFlag;
        }
    }

    // 自动折行 menu
    var linewrappingMenu = new gui.Menu();
    linewrappingMenu.append(menuMachine('linewrapping', {
        label: '自动折行', //提示通过‘查看’可再次打开
        type: 'checkbox',
        checked: false,
        click: function(){
            editor.options.lineWrapping = !editor.options.lineWrapping;
            editor.refresh();
        }
    }));

    // 工具栏 menu
    var toolbarMenu = new gui.Menu();
    toolbarMenu.append(menuMachine('toolbar', {
        label: '显示工具栏', //提示通过‘查看’可再次打开
        type: 'checkbox',
        checked: true,
        click: function(){
            showToolOrConsole(this, 'toolbar');
        }
    }));

    // 状态栏 menu
    var consoleMenu = new gui.Menu();
    consoleMenu.append(menuMachine('console', {
        label: '显示状态栏', //提示通过‘查看’可再次打开
        type: 'checkbox',
        checked: true,
        click: function(){
            showToolOrConsole(this, 'console');
        }
    }));

    // 文件 menu
    var fileMenu = new gui.Menu();
    fileMenu.append(menuMachine('file-newDoc', {
        label: '新建文档 (Ctrl+N)',
        click: function(){
            $('#J-tool-new').trigger('click');
        }
    }));
    fileMenu.append(menuMachine('file-saveDoc', {
        label: '保存文档 (Ctrl+S)',
        click: function(){
            $('#J-tool-save').trigger('click');
        }
    }));
    fileMenu.append(menuMachine('file-openDoc', {
        label: '打开文件... (Ctrl+O)',
        click: function(){
            $('#J-tool-select').trigger('click');
        }
    }));
    fileMenu.append(menuMachine('file-saveAsDoc', {
        label: '另存为... (Ctrl+Shift+S)',
        click: function(){
            markdown.file.saveAs();
        }
    }));
    fileMenu.append(menuMachine('file-docDir', {
        label: '查看文件目录',
        click: function(){
            markdown.file.viewPath();
        }
    }));
    fileMenu.append(menuMachine('file-docDir', {
        label: '从磁盘删除',
        click: function(){
            markdown.file.delFileFromDisk();
        }
    }));
    fileMenu.append(menuMachine('separator', {
        type: 'separator'
    }));
    fileMenu.append(menuMachine('file-saveAsDoc', {
        label: '关闭 (Alt+C)',
        click: function(){
            markdown.tab.close(markdown.tab.getCurrentTab().id);
        }
    }));
    fileMenu.append(menuMachine('file-saveAsDoc', {
        label: '全部关闭',
        click: function(){
            markdown.tab.closeAll();
        }
    }));
    fileMenu.append(menuMachine('file-saveAsDoc', {
        label: '关闭当前以外所有标签',
        click: function(){
            markdown.tab.closeOthers();
        }
    }));
    fileMenu.append(source.separator);
    fileMenu.append(menuMachine('file-exit', {
        label: '打印 (Ctrl+P)',
        enabled: false,
        click: function(){
            window.print();
        }
    }));
    fileMenu.append(source.separator);
    fileMenu.append(menuMachine('file-exit', {
        label: '退出 (Exit)',
        click: function(){
            cache.guiWin.close();
        }
    }));

    menuMachine('file-clearHistory', {
        label: '清除所有历史记录',
        click: function(){
            markdown.userFootprint.clearHistoryInMenu();
            markdown.userFootprint.clearInMemory('historyList');
        }
    });
    source.file = fileMenu;


    // 编辑 menu
    var editMenu = new gui.Menu();
    editMenu.append(menuMachine('edit-undo', {
        label: '撤消 (Ctrl+Z)',
        click: function(){
            $('#J-tool-undo').trigger('click');
        }
    }));
    editMenu.append(menuMachine('edit-redo', {
        label: '重做 (Ctrl+Y)',
        click: function(){
            $('#J-tool-redo').trigger('click');
        }
    }));
    editMenu.append(source.separator);
    editMenu.append(menuMachine('copy', {
        label: '复制 (Ctrl+C)',
        click: function(){
            clipboard.set(editor.getSelection());
        }
    }));
    editMenu.append(menuMachine('cut', {
        label: '剪切 (Ctrl+X)',
        click: function(){
            clipboard.set(editor.getSelection());
            editor.replaceSelection('');
        }
    }));
    editMenu.append(menuMachine('stick', {
        label: '粘贴 (Ctrl+V)',
        click: function(){
            editor.replaceSelection(clipboard.get());
        }
    }));
    editMenu.append(menuMachine('edit-delete', {
        label: '删除 (Del)',
        click: function(){
            editor.replaceSelection('');
        }
    }));
    editMenu.append(source.separator);
    editMenu.append(menuMachine('edit-selAll', {
        label: '全选 (Ctrl+A)',
        click: function(){
            editor.doc.setSelection({line:0,ch:0}, {line: editor.doc.lineCount(), ch:1000})
        }
    }))
    /*editMenu.append(menuMachine('edit-find', {
        label: '查找 (Ctrl+F)',
        click: function(){
            console.log('打开文件');
        }
    }));*/

    // 插入 menu
    var insertMenu = new gui.Menu();
    insertMenu.append(new gui.MenuItem({
        label: '标题 1 (Ctrl+1)',
        click: function(){
            markdown.toolbar.pre(1, 1, '# ');
        }
    }));
    insertMenu.append(new gui.MenuItem({
        label: '标题 2 (Ctrl+2)',
        click: function(){
            markdown.toolbar.pre(1, 1, '## ');
        }
    }));
    insertMenu.append(new gui.MenuItem({
        label: '标题 3 (Ctrl+3)',
        click: function(){
            markdown.toolbar.pre(1, 1, '### ');
        }
    }));
    insertMenu.append(new gui.MenuItem({
        label: '标题 4 (Ctrl+4)',
        click: function(){
            markdown.toolbar.pre(1, 1, '#### ');
        }
    }));
    insertMenu.append(new gui.MenuItem({
        label: '标题 5 (Ctrl+5)',
        click: function(){
            markdown.toolbar.pre(1, 1, '##### ');
        }
    }));
    insertMenu.append(new gui.MenuItem({
        label: '标题 6 (Ctrl+6)',
        click: function(){
            markdown.toolbar.pre(1, 1, '###### ');
        }
    }));
    insertMenu.append(source.separator);
    insertMenu.append(new gui.MenuItem({
        label: '粗体 (Ctrl+B)',
        click: function(){
            $('#J-tool-bold').trigger('click');
        }
    }));
    insertMenu.append(new gui.MenuItem({
        label: '斜体 (Ctrl+I)',
        click: function(){
            $('#J-tool-italic').trigger('click');
        }
    }));
    insertMenu.append(new gui.MenuItem({
        label: '代码 (Ctrl+K)',
        click: function(){
            $('#J-tool-code').trigger('click');
        }
    }));
    insertMenu.append(new gui.MenuItem({
        label: '引用 (Ctrl+Q)',
        click: function(){
            $('#J-tool-block').trigger('click');
        }
    }));
    insertMenu.append(source.separator);
    insertMenu.append(new gui.MenuItem({
        label: '图片 (Ctrl+G)',
        click: function(){
            $('#J-tool-image').trigger('click');
        }
    }))
    insertMenu.append(new gui.MenuItem({
        label: '链接 (Ctrl+L)',
        click: function(){
            $('#J-tool-link').trigger('click');
        }
    }));
    insertMenu.append(source.separator);
    insertMenu.append(new gui.MenuItem({
        label: '无序列表 (Ctrl+U)',
        click: function(){
            $('#J-tool-list').trigger('click');
        }
    }))
    insertMenu.append(new gui.MenuItem({
        label: '水平标尺 (Ctrl+R)',
        click: function(){
            $('#J-tool-hr').trigger('click');
        }
    }));
    insertMenu.append(source.separator);
    insertMenu.append(new gui.MenuItem({
        label: '时间戳 (Ctrl+T)',
        click: function(){
            $('#J-tool-timestamp').trigger('click');
        }
    }));

    // 查看 menu
    var viewMenu = new gui.Menu(),
        encodeSubMenu = new gui.Menu();

    encodeSubMenu.append(menuMachine('view-encode_utf', {
        label: 'Unicode (UTF-8)',
        type: 'checkbox',
        checked: true,
        click: function(){
            if(!this.checked){
                this.checked = true;
            }
            source['view-encode_gbk'].checked = false;
        }
    }));
    encodeSubMenu.append(menuMachine('view-encode_gbk', {
        label: '简体中文 (GBK)',
        type: 'checkbox',
        click: function(){
            if(!this.checked){
                this.checked = true;
            }
            source['view-encode_utf'].checked = false;
        }
    }));
    viewMenu.append(menuMachine('view-run', {
        label: '运行 (F5)',
        enabled: false,
        click: function(){
            $('#J-tool-run').trigger('click');
        }
    }));
    viewMenu.append(menuMachine('view-realPreview', {
        label: '启用实时预览',
        type: 'checkbox',
        checked: true,
        click: function(){
            $('#J-tool-realtime').trigger('click');
        }
    }));
    viewMenu.append(menuMachine('view-maxsize', {
        label: '最大化编辑器 (F11)',
        type: 'checkbox',
        checked: false,
        click: function(){
            $('#J-tool-maxsize').trigger('click');
        }
    }));
    viewMenu.append(source.separator);
    viewMenu.append(new gui.MenuItem({
        label: '文件编码',
        enabled: false,
        submenu: encodeSubMenu
    }));
    viewMenu.append(source.separator);
    viewMenu.append(source.linewrapping);
    viewMenu.append(source.toolbar);
    viewMenu.append(source.console);

    // 工具 menu
    var toolMenu = new gui.Menu();
    toolMenu.append(menuMachine('tool-previewInBrowser', {
        label: '在浏览器中预览 (Ctrl+F12)',
        click: function(){
            markdown.file.preview();
        }
    }));
    toolMenu.append(menuMachine('tool-exportAsHtml', {
        label: '导出为HTML文件',
        click: function(){
            cache.tabCache.saveType = 'exportHTML';
            $('#J-hi-savePath').trigger('click');
        }
    }));
    toolMenu.append(menuMachine('tool-sendEmailAsHtml', {
        label: '发送邮件 (以当前HTML为内容)',
        click: function(){
            markdown.mail.showDialog();
        }
    }));
    toolMenu.append(source.separator);
    toolMenu.append(new gui.MenuItem({
        label: '设置',
        click: function(){
            $.artDialog({
                title: '设 置',
                lock: true,
                resize: false,
                button: [
                    {
                        value: '保 存',
                        callback: function () {
                            console.log('点击保存')
                            return markdown.rockSettings.saveAllSetting();
                        },
                        focus: true
                    },
                    {
                        value: '取 消',
                        callback: function () {
                            console.log('取消保存')
                        }
                    }
                ],
                initialize: function(){
                    markdown.dialog_commonInit();
                    var dialogParent = $('.d-outer').parent();

                    this.content($('#J-settings').html());
                    dialogParent.hide();
                    $('.dialogWrap').parent().css('padding', 0);

                    // 打开设置界面前先初始化用户选择
                    markdown.rockSettings.init();

                    dialogParent.fadeIn(300);

                    markdown.rockSettings.listen();
                }
            });
        }
    }));

    // 帮助 menu
    var helpMenu = new gui.Menu(),
        docSubMenu = new gui.Menu();

    docSubMenu.append(new gui.MenuItem({
        label: 'markdown语法参考(GFM)',
        click: function(){
            markdown.tab.add('./docs/github.markdown', true);
        }
    }));
    helpMenu.append(menuMachine('help-feedback', {
        label: '问题反馈',
        click: function(){
            gui.Shell.openExternal('https://github.com/superRaytin/Rock_Markdown/issues');
        }
    }));
    helpMenu.append(new gui.MenuItem({
        label: '帮助文档',
        submenu: docSubMenu
    }));
    helpMenu.append(menuMachine('help-site', {
        label: 'Rock MarkDown 网站',
        click: function(){
            gui.Shell.openExternal('https://github.com/superRaytin/Rock_Markdown');
        }
    }));
    helpMenu.append(source.separator);
    helpMenu.append(menuMachine('help-update', {
        label: '检查新版本',
        click: function(){
            markdown.update.init();
        }
    }));
    helpMenu.append(menuMachine('help-changelog', {
        label: '版本日志',
        click: function(){
            markdown.tab.add('./docs/CHANGELOG.md', true);
        }
    }));
    helpMenu.append(source.separator);
    helpMenu.append(menuMachine('help-about', {
        label: '关于 Rock! MarkDown',
        click: function(){
            $.artDialog({
                title: '关于 Rock! MarkDown',
                lock: true,
                resize: false,
                initialize: function(){
                    markdown.dialog_commonInit();

                    var dialogParent = $('.d-outer').parent();

                    this.content($('#J-about-rock').html());
                    $('#J-about-version').text(markdown.settings.version);
                    dialogParent.hide();

                    dialogParent.fadeIn(300);

                    $('#J-about-update').click(function(){
                        markdown.update.init();
                    });
                }
            });
        }
    }));
    helpMenu.append(menuMachine('help-author', {
        label: '关于作者',
        click: function(){
            $.artDialog({
                title: '关于作者',
                lock: true,
                resize: false,
                initialize: function(){
                    markdown.dialog_commonInit();

                    var dialogParent = $('.d-outer').parent();

                    this.content($('#J-about-author').html());
                    dialogParent.hide();

                    dialogParent.fadeIn(300);
                }
            });
        }
    }));

    // 编码区域 menu
    var codeMenu = new gui.Menu();
    codeMenu.append(source.copy);
    codeMenu.append(source.stick);
    codeMenu.append(source.cut);
    codeMenu.append(source['edit-delete']);
    codeMenu.append(source.separator);
    codeMenu.append(source['edit-selAll']);
    codeMenu.append(source.separator);
    codeMenu.append(source['file-saveDoc']);

    var menu = {};
    menu.codeMenu = codeMenu;
    menu.linewrappingMenu = linewrappingMenu;
    menu.toolbarMenu = toolbarMenu;
    menu.consoleMenu = consoleMenu;

    menu.file = fileMenu;
    menu.edit = editMenu;
    menu.insert = insertMenu;
    menu.view = viewMenu;
    menu.tool = toolMenu;
    //menu.history = historyMenu;
    menu.help = helpMenu;

    exports.contextMenuSource = source;

    return menu;
};

exports.init = contextMenuInit;