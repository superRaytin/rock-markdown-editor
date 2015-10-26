/**
 * contextmenu.
 * User: raytin
 * Date: 13-7-25
 */
var require = global.require,
    window = global.window,
    console = window.console,
    process = global.process,
    fs = require('fs'),
    iconv = require('iconv-lite');

var aaa = {
    init: function() {
        var markdown = global.markdown;
        var cache = markdown.cache;
        var editor = cache.editor;
        var gui  = cache.gui;
        var clipboard = gui.Clipboard.get();
        
        var source = {};

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

        var separatorFactory = function() {
            var menuItem = new gui.MenuItem({
                type: 'separator'
            });
            return menuItem;
        }

        var clearHistoryMenuFactory = function() {
            var menuItem = new gui.MenuItem({
                label: '清除所有历史记录',
                click: function(){
                    markdown.userFootprint.clearHistoryInMenu();
                    markdown.userFootprint.clearInMemory('historyList');
                }
            });
            return menuItem;
        }

        var toolbarMenuFactory = function() {
            var menuItem = new gui.MenuItem({
                label: '显示工具栏', //提示通过‘查看’可再次打开
                type: 'checkbox',
                checked: true,
                click: function(){
                    showToolOrConsole(this, 'toolbar');
                }
            });
            return menuItem;
        }

        var consoleMenuFactory = function() {
            var menuItem = new gui.MenuItem({
                label: '显示状态栏', //提示通过‘查看’可再次打开
                type: 'checkbox',
                checked: true,
                click: function(){
                    showToolOrConsole(this, 'console');
                }
            });
            return menuItem;
        }

        source.separatorFactory = separatorFactory;
        source.clearHistoryMenuFactory = clearHistoryMenuFactory;
        source.toolbarMenuFactory = toolbarMenuFactory;
        source.consoleMenuFactory = consoleMenuFactory;

        var menu = new gui.Menu({type: 'menubar'});

        menu.createMacBuiltin("Rock! Markdown Editor", {
            hideWindow: true
        });

        // 文件 menu
        var fileMenu = new gui.Menu();
        fileMenu.append(new gui.MenuItem({
            label: '新建文档 (Ctrl+N)',
            click: function(){
                $('#J-tool-new').trigger('click');
            }
        }));
        fileMenu.append(new gui.MenuItem({
            label: '保存文档 (Ctrl+S)',
            click: function(){
                $('#J-tool-save').trigger('click');
            }
        }));
        fileMenu.append(new gui.MenuItem({
            label: '打开文件... (Ctrl+O)',
            click: function(){
                $('#J-tool-select').trigger('click');
            }
        }));
        fileMenu.append(new gui.MenuItem({
            label: '另存为... (Ctrl+Shift+S)',
            click: function(){
                markdown.file.saveAs();
            }
        }));
        fileMenu.append(new gui.MenuItem({
            label: '查看文件目录',
            click: function(){
                markdown.file.viewPath();
            }
        }));
        fileMenu.append(new gui.MenuItem({
            label: '从磁盘删除',
            click: function(){
                markdown.file.delFileFromDisk();
            }
        }));
        fileMenu.append(new gui.MenuItem({
            type: 'separator'
        }));
        fileMenu.append(new gui.MenuItem({
            label: '关闭 (Alt+C)',
            click: function(){
                markdown.tab.close(markdown.tab.getCurrentTab().id);
            }
        }));
        fileMenu.append(new gui.MenuItem({
            label: '全部关闭',
            click: function(){
                markdown.tab.closeAll();
            }
        }));
        fileMenu.append(new gui.MenuItem({
            label: '关闭当前以外所有标签',
            click: function(){
                markdown.tab.closeOthers();
            }
        }));
        fileMenu.append(separatorFactory());
        fileMenu.append(new gui.MenuItem({
            label: '打印 (Ctrl+P)',
            enabled: false,
            click: function(){
                window.print();
            }
        }));
        fileMenu.append(separatorFactory());
        fileMenu.append(new gui.MenuItem({
            label: '退出 (Exit)',
            click: function(){
                cache.guiWin.close();
            }
        }));

        source.file = fileMenu;

        menu.append(new gui.MenuItem({
            label: '文件',
            submenu: fileMenu
        }));

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
        insertMenu.append(separatorFactory());
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
        insertMenu.append(separatorFactory());
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
        insertMenu.append(separatorFactory());
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
        insertMenu.append(separatorFactory());
        insertMenu.append(new gui.MenuItem({
            label: '时间戳 (Ctrl+T)',
            click: function(){
                $('#J-tool-timestamp').trigger('click');
            }
        }));

        menu.append(new gui.MenuItem({
            label: '插入',
            submenu: insertMenu
        }));

        // 查看 menu
        var viewMenu = new gui.Menu(),
            encodeSubMenu = new gui.Menu();

        encodeSubMenu.append(new gui.MenuItem({
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
        encodeSubMenu.append(new gui.MenuItem({
            label: '简体中文 (GBK)',
            type: 'checkbox',
            click: function(){
                if(!this.checked){
                    this.checked = true;
                }
                source['view-encode_utf'].checked = false;
            }
        }));
        viewMenu.append(new gui.MenuItem({
            label: '运行 (F5)',
            enabled: false,
            click: function(){
                $('#J-tool-run').trigger('click');
            }
        }));
        viewMenu.append(new gui.MenuItem({
            label: '启用实时预览',
            type: 'checkbox',
            checked: true,
            click: function(){
                $('#J-tool-realtime').trigger('click');
            }
        }));
        viewMenu.append(new gui.MenuItem({
            label: '最大化编辑器 (F11)',
            type: 'checkbox',
            checked: false,
            click: function(){
                $('#J-tool-maxsize').trigger('click');
            }
        }));
        viewMenu.append(separatorFactory());
        viewMenu.append(new gui.MenuItem({
            label: '文件编码',
            enabled: false,
            submenu: encodeSubMenu
        }));
        viewMenu.append(separatorFactory());
        viewMenu.append(toolbarMenuFactory());
        viewMenu.append(consoleMenuFactory());

        menu.append(new gui.MenuItem({
            label: '查看',
            submenu: viewMenu
        }));

        // 工具 menu
        var toolMenuItems = new gui.Menu();
        toolMenuItems.append(new gui.MenuItem({
            label: '在浏览器中预览 (Ctrl+F12)',
            click: function(){
                markdown.file.preview();
            }
        }));
        toolMenuItems.append(new gui.MenuItem({
            label: '导出为HTML文件',
            click: function(){
                cache.tabCache.saveType = 'exportHTML';
                $('#J-hi-savePath').trigger('click');
            }
        }));
        toolMenuItems.append(new gui.MenuItem({
            label: '发送邮件 (以当前HTML为内容)',
            click: function(){
                markdown.mail.showDialog();
            }
        }));
        toolMenuItems.append(separatorFactory());
        toolMenuItems.append(new gui.MenuItem({
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

        menu.append(new gui.MenuItem({
            label: '工具',
            submenu: toolMenuItems
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
        helpMenu.append(new gui.MenuItem({
            label: '问题反馈',
            click: function(){
                gui.Shell.openExternal('https://github.com/superRaytin/Rock_Markdown/issues');
            }
        }));
        helpMenu.append(new gui.MenuItem({
            label: '帮助文档',
            submenu: docSubMenu
        }));
        helpMenu.append(new gui.MenuItem({
            label: 'Rock Markdown 网站',
            click: function(){
                gui.Shell.openExternal('https://github.com/superRaytin/Rock_Markdown');
            }
        }));
        helpMenu.append(separatorFactory());
        helpMenu.append(new gui.MenuItem({
            label: '检查新版本',
            click: function(){
                markdown.update.init();
            }
        }));
        helpMenu.append(new gui.MenuItem({
            label: '版本日志',
            click: function(){
                markdown.tab.add('./docs/CHANGELOG.md', true);
            }
        }));
        helpMenu.append(separatorFactory());
        helpMenu.append(new gui.MenuItem({
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
        helpMenu.append(new gui.MenuItem({
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

        menu.append(new gui.MenuItem({
            label: '帮助',
            submenu: helpMenu
        }));
        
        
        
        this.contextMenuSource = source;

        gui.Window.get().menu = menu;
    },

    contextMenuSource: {}
};

exports.init = aaa.init;
exports.contextMenuSource = aaa.contextMenuSource;