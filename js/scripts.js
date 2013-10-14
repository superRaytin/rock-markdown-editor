/**
 * scripts.
 * User: raytin
 * Date: 13-7-14
 */
var fs = require('fs'),
    modPath = require('path'),
    cheerio = require('cheerio'),
    iconv = require('iconv-lite'),
    settings = require('./js/config');

global.$ = $;

$(function(){
    var cache = {
        editor: null,
        //menuSource: {}, 菜单源
        tabCache: {
            No: 1, // 标签个数
            blankTab: 1, // 空文档个数
            uuid: 1, // 序号
            fileName_tabId: {}, // 文件名称与tabId适配
            member: {}
        },
        // 文件编码适配（用于记录每个打开文件的读取编码，存储写入时用读取时的编码）
        fileEncode: {},
        realtime: true //默认实时预览
    };

    var codeEditor = {
        // 初始化编辑器
        codeMirrorInit: function(type){
            cache.editor = CodeMirror(document.getElementById('codeMirror'),
                {
                    mode: type,
                    autofocus: true,
                    lineNumbers: true,
                    theme: 'lesser-dark',
                    extraKeys: {
                        'Ctrl-1' : function(instance){
                            $('#J-tool-h1').trigger('click');
                        },
                        'Ctrl-2' : function(instance){
                            $('#J-tool-h2').trigger('click');
                        },
                        'Ctrl-3' : function(instance){
                            $('#J-tool-h3').trigger('click');
                        },
                        'Ctrl-4' : function(instance){
                            markdown.toolbar.pre(1, 1, '#### ');
                        },
                        'Ctrl-5' : function(instance){
                            markdown.toolbar.pre(1, 1, '##### ');
                        },
                        'Ctrl-6' : function(instance){
                            markdown.toolbar.pre(1, 1, '###### ');
                        },
                        'Ctrl-K' : function(instance){
                            $('#J-tool-code').trigger('click');
                        },
                        'Ctrl-Q' : function(instance){
                            $('#J-tool-block').trigger('click');
                        },
                        'Ctrl-B' : function(instance){
                            $('#J-tool-bold').trigger('click');
                        },
                        'Ctrl-I' : function(instance){
                            $('#J-tool-italic').trigger('click');
                        },
                        'Ctrl-U' : function(instance){
                            $('#J-tool-list').trigger('click');
                        },
                        'Ctrl-L' : function(instance){
                            $('#J-tool-link').trigger('click');
                        },
                        'Ctrl-G' : function(instance){
                            $('#J-tool-image').trigger('click');
                        },
                        'Ctrl-R' : function(instance){
                            $('#J-tool-hr').trigger('click');
                        },
                        'Ctrl-T' : function(instance){
                            $('#J-tool-timestamp').trigger('click');
                        },
                        'Ctrl-X' : function(instance){
                            $('#J-tool-delline').trigger('click');
                        },
                        'F5' : function(instance){
                            $('#J-tool-run').trigger('click');
                        }
                    }
                }
            );

            return cache.editor;
        },
        onChange: function(){
            var converser = new Showdown.converter({extensions: 'github'});
            var editor = cache.editor,
                inputValue = editor.getValue(),
                html = converser.makeHtml( inputValue );

            markdown.pushToFrame(html);
        },
        focus: function(addch){
            var editor = cache.editor,
                cursor = editor.doc.getCursor(),
                dealedCursor = typeof addch === 'undefined' ? cursor : {line: cursor.line, ch: cursor.ch - addch};

            editor.focus();
            editor.doc.setCursor(dealedCursor);
        },
        push: function(content, addch){
            cache.editor.replaceSelection(content);

            // 插入完成让编辑器获得焦点，并定位焦点位置
            this.focus(addch);
        },
        setValue: function(value, clearHistory){
            cache.preventEditorChange = true;
            cache.editor.setValue(value);
            cache.preventEditorChange = false;

            clearHistory && cache.editor.doc.clearHistory();
        }
    };

    var common = {
        $$: function(id){
            return document.getElementById(id);
        },
        resizeWindow : function(){
            var wrapper = $('#wrapper'),
                win = $(window),
                dosize = function(){
                    var winHeight = win.height();
                    wrapper.height(winHeight);

                    markdown.adjustWorkspace();

                    markdown.tabHeightAdjust();
                };

            dosize();
            // 监听窗口尺寸变化
            !cache.bindWindowResize && win.resize(function(){
                cache.bindWindowResize = true;
                dosize();
            });
        },
        // 日期时间格式化
        formatDate: function(date, format){
            if(arguments.length == 0){
                date = new Date();
                format = 'yyyy/MM/dd hh:mm:ss';
            }

            var o = {
                "M+" : date.getMonth() + 1, //month
                "d+" : date.getDate(),    //day
                "h+" : date.getHours(),   //hour
                "m+" : date.getMinutes(), //minute
                "s+" : date.getSeconds(), //second
                "q+" : Math.floor((date.getMonth() + 3) / 3), //quarter
                "S" : date.getMilliseconds() //millisecond
            };

            if(/(y+)/.test(format)){
                format = format.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
            };

            for(var k in o){
                if(new RegExp("(" + k + ")").test(format))
                    format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length));
            };
            return format;
        },
        // 数组去重
        unique : function(arr){
            var obj = {},
                len = arr.length;

            if( len < 2 ){ return arr };

            for( var i = 0 ; i < len ; i++ ){
                var cur = arr[i];
                !obj[cur] && ( obj[cur] = true );
            };

            arr.length = 0;

            for( var name in obj ){
                arr[arr.length] = name;
            };

            return arr;
        }
    };

    var markdown = {
        cache: cache,
        codeEditor: codeEditor,
        common: common,
        settings: settings,
        Showdown: Showdown,
        //reg
        reg: {
            markdownFile: /^(txt|md|markdown)$/,
            script: /<script([^>])*>(.*<\/script>)*/g
        },
        // 记录用户足迹
        userFootprint: {
            // 新打开的文件保存至历史文件记录
            saveHistory: function(path){
                var memory = window.localStorage.memory ? JSON.parse(window.localStorage.memory) : {},
                    historyList = memory.historyList || (memory.historyList = []);


                // 历史记录中已有此文件 则将此文件提至前面
                if(historyList.contains(path)){
                    historyList.remove(path);
                }
                // 大于10条用 先进先出原则
                else if(historyList.length >= 10){
                    historyList.pop();
                }

                historyList.unshift(path);

                window.localStorage.memory = JSON.stringify(memory);
            },
            // 保存本地存储下memory一级项
            saveToMemory: function(key, value){
                var memory = window.localStorage.memory ? JSON.parse(window.localStorage.memory) : {};
                memory[key] = value;
                window.localStorage.memory = JSON.stringify(memory);
            },
            // 获取 memory中子项
            getItemInMemory: function(key){
                var localMemory = window.localStorage.memory,
                    memory, res = false;

                if(localMemory){
                    memory = JSON.parse(localMemory);
                    res = memory[key];
                }

                return res;
            },
            // 清除本地存储下memory一级项
            clearInMemory: function(key){
                var memory = window.localStorage.memory ? JSON.parse(window.localStorage.memory) : {};
                delete memory[key];
                window.localStorage.memory = JSON.stringify(memory);
            },
            // 清除文件菜单里的历史记录项
            clearHistoryInMenu: function(){
                var memory = window.localStorage.memory ? JSON.parse(window.localStorage.memory) : {},
                    historyList = memory.historyList,
                    historyLen;
                var file = cache.menuSource.file;

                if(historyList && historyList.length){
                    historyLen = historyList.length;
                    for(var end = file.items.length - 2, stop = end - historyLen - 1; end > stop; end--){
                        file.removeAt(end);
                    }
                }else{
                    markdown.dialog('无历史记录啊亲~');
                }
            },
            // 将某一项写入localStorage
            updateToLocal: function(type, key, value, belong){
                var firstClass = window.localStorage[type] ? JSON.parse(window.localStorage[type]) : {},
                    forDeal = firstClass;

                // 归属于某一父项设置
                if(belong){
                    forDeal = firstClass[belong] || (firstClass[belong] = {});
                }

                forDeal[key] = value;
                window.localStorage.setting = JSON.stringify(firstClass);
            }
        },
        // 设置
        rockSettings: {
            // 显示界面之前初始化
            init: function(){
                var localSetting = localStorage.setting,
                    setting = localSetting ? $.extend(true, settings.setting, JSON.parse(localSetting)) : settings.setting;

                console.log(setting);
                // 加载设置项 push到设置各表单值
                $('#dialogWrap').find('.column_checkbox, .column_radio, .column_select, .column_input').each(function(){
                    var that = $(this),
                        name = that.attr('data-name'),
                        value = this.value,
                        belong = that.attr('data-belong'),
                        type = that.attr('type') ? that.attr('type') : this.tagName.toLowerCase(),
                        valueInSet = belong ? setting[belong][name] : setting[name];

                    if(!name) return;

                    if(type === 'checkbox'){
                        this.checked = valueInSet;
                    }
                    else if(type === 'radio'){
                        if(valueInSet === value){
                            this.checked = true;
                        }
                        if(value === 'custom'){
                            that.next().find('.column_input').val( setting[belong].path );
                        }
                    }
                    else if(type === 'select'){
                        this.checked = valueInSet;
                    }
                    else if(type === 'text' || type === 'password'){
                        this.value = valueInSet;
                    }
                });
            },
            // 监听设置中的用户交互
            listen: function(){
                    var space = this,
                        dialogWrap = $('#dialogWrap'),
                        tabCon = dialogWrap.find('.tab_content');

                    var userSet = this.userSet;

                    // tab切换
                    dialogWrap.find('.tab_tigger_item').on('click', function(e){
                        var that = $(this),
                            index = that.index();

                        if(that.hasClass('on')) return;
                        $('.tab_tigger_item').eq(index).addClass('on').siblings().removeClass('on');
                        $('.tab_content_item').eq(index).removeClass('hide').siblings().addClass('hide');
                    });

                    // 自定义保存目录
                    dialogWrap.find('.J-filePath_custom').click(function(){
                        var setting_savePath = userSet.setting.savePath,
                            input = $(this),
                            hiddenFile = input.next();

                        hiddenFile.trigger('click').on('change', function(){
                            if(this.value != ''){
                                input.val(this.value);
                                setting_savePath.mode = 'custom';
                                setting_savePath.path = this.value;
                            }
                        });
                    });
                    /*$('#filePath_custom').click(function(){
                        $('.J-filePath_custom').trigger('click');
                    });*/

                    // checkbox | radio | select
                    tabCon.find('.column_checkbox, .column_radio, .column_select').on('change', function(e){
                        var that = $(this),
                            name = that.attr('data-name'),
                            noclick = that.attr('data-noclick'),
                            belong = that.attr('data-belong'),
                            value = this.value;

                        if(!name || noclick) return;

                        if(that.is(':checkbox')){
                            value = this.checked;
                        }

                        console.log('change:crs')
                        if(belong){
                            userSet.setting[belong][name] = value;
                            //space.saveItem(name, this.checked, belong);
                        }else{
                            userSet.setting[name] = value;
                            //space.saveItem(name, this.checked);
                        }
                    });

                    // 测试帐户设置
                    $('#J-sendTestMail').click(function(){
                        markdown.mail.test();
                    });
            },
            userSet : {
                setting: {
                    savePath: {},
                    mail: {}
                }
            },
            // 验证
            validate: function(){
                var setting = this.userSet.setting,
                    res = true;
                var group_mail = $('.group_mail');
                // 验证邮件填写规范
                group_mail.find('.column_input').each(function(){
                    var that = $(this),
                        value = $.trim(this.value),
                        name = that.attr('data-name'),
                        belong = that.attr('data-belong');

                    //if(value != ''){
                        switch (name){
                            case 'SMTP':
                                if(value != '' && !/^[\w\-]+(\.[\w\-]+)+$/.test(value)){
                                    res = false;
                                    that.addClass('error').focus();
                                    return false;
                                }else{
                                    setting[belong][name] = value;
                                }
                                break;
                            case 'port':
                                if(value != '' && !/^\d+$/.test(value)){
                                    res = false;
                                    that.addClass('error').focus();
                                    return false;
                                }else{
                                    setting[belong][name] = value;
                                }
                                break;
                            case 'userName':
                                if(value != '' && !/^([\w\.-]+)@[\w\-]+(\.[\w\-]+)+$/.test(value)){
                                    res = false;
                                    that.addClass('error').focus();
                                    return false;
                                }else{
                                    setting[belong][name] = value;
                                }
                                break;
                            case 'password':
                                setting[belong][name] = value;
                                break;
                        }
                    /*}else{
                        that.removeClass('error');
                    }*/
                });

                if(!res){
                    $('.tab_tigger_item').eq(2).trigger('click');
                }

                return res;
            },
            // 保存所有设置
            saveAllSetting: function(){
                if(!this.validate()) return false;
                var setting = window.localStorage.setting ? JSON.parse(window.localStorage.setting) : {};

                $.extend(true, setting, this.userSet.setting);
                window.localStorage.setting = JSON.stringify(setting);
                return true;
            },
            // 取得本地设置指定项
            getItemInLocal: function(key, belong){
                var localSet = window.localStorage.setting,
                    setting, res = false;

                if(localSet){
                    setting = JSON.parse(localSet);
                    if(belong && setting[belong]){
                        res = setting[belong][key];
                    }else{
                        res = setting[key];
                    }
                }

                return res;
            },
            // 获取具体的打开时路径
            getDetailPath: function(){
                var mode = markdown.rockSettings.getItemInLocal('mode', 'savePath');
                var currentTab = markdown.tab.getCurrentTab(),
                    res;

                if(mode === 'current'){
                    res = currentTab.path;
                }
                else if(mode === 'last'){
                    res  = markdown.userFootprint.getItemInMemory('lastDirectory');
                }
                else if(mode === 'custom'){
                    res = markdown.rockSettings.getItemInLocal('path', 'savePath');
                }

                console.log('detail path: ' + res);
                return res;
            }
        },
        // 载入文件
        loadFile: function(path, callback){
            var encodings = ['gbk', 'utf-8', 'gb2312', 'ascii', 'binary', 'base64'];
            if(fs.existsSync(path)){
                fs.readFile(path, function(err, data){
                    if(err) return console.log(err);

                    var str = iconv.decode(data, 'utf-8'),
                        encode = 'utf-8';

                    // 编码不对试着用别的编码
                    if(str.indexOf('�') != -1){
                        for(var i = 0, len = encodings.length; i < len; i++){
                            str = iconv.decode(data, encodings[i]);
                            if(str.indexOf('�') == -1){
                                encode = encodings[i];
                                console.log('文件编码： ' + encodings[i]);
                                break;
                            }
                        };
                    }

                    callback(str, encode);
                });
            }
        },
        // 遮罩
        overlay: function(type){
            var dom = $('#overlay');
            if(type === 'show'){
                dom.show();
            }else{
                dom.hide();
            }
        },
        // loading...
        loading: function(type, text){
            type = type || 'show';
            if(arguments.length !== 2){
                text = '正在加载 ...';
            }
            $('#loadingGo')[type === 'show' ? 'removeClass' : 'addClass']('hide').find('.loading-des').text(text);
        },
        // 工作区自适应调整
        adjustWorkspace: function(){
            var codeInput = $('#codeMirror'),
                frame = $('#showdown iframe'),
                scrollElement = cache.editor.getScrollerElement();

            // 编辑器可输入区域高度与窗口保持一致
            scrollElement.style.width = codeInput.width() + 'px';
            scrollElement.style.height = codeInput.height() + 'px';

            if(frame.length){
                frame.height(codeInput.height());
                var iframeBody = frame.contents().find('body');
                iframeBody.removeAttr('style');
                iframeBody.height(Math.max(iframeBody.height(), codeInput.height() - 20));
            }

            cache.editor.refresh();
        },
        // 处理拖拽文件至窗口
        dropFile: function(){
            var wrapper = common.$$('wrapper');

            wrapper.addEventListener("dragover", function(e){
                e.stopPropagation();
                e.preventDefault();
                markdown.overlay('show');
            }, false);

            wrapper.addEventListener("drop", function(e){
                markdown.dealDrop(e);
                return false;
            }, false);
        },
        // 处理拖拽进来的文件
        dealDrop: function(e){
            e.stopPropagation();
            e.preventDefault();

            var file = e.dataTransfer.files[0];
            if(!file) return;

            if( this.reg.markdownFile.test(file.name.substr(file.name.lastIndexOf('.') + 1)) ){
                markdown.tab.add(file.path);
            }else{
                console.log(file.path + ' 文件不符合格式');
                this.dialog('请选择正确的文件格式 .md|.markdown|.txt', 'button');
            }

            markdown.overlay('hide');
        },
        // 更新控制栏字数信息
        updateConsoleWords: function(){
            var editor = this.cache.editor,
                console_words = $('#console_words'),
                console_lines = $('#console_lines');

            // 更新输入总字数
            console_words.html(editor.doc.getValue().length);
            console_lines.html(editor.doc.lineCount());
        },
        // 对即将插入预览区的HTML内容 过滤
        filtHTML: function(html){
            html = html.replace(this.reg.script, '');
            return html;
        },
        // 监听按键
        kibo: function(el){
            var bindEl = el || window.document;

            var kibo = new Kibo(bindEl);
            kibo.down('f11', function(){
                $('#J-tool-maxsize').trigger('click');
            });
            kibo.down('ctrl n', function(){
                $('#J-tool-new').trigger('click');
            });
            kibo.down('ctrl s', function(e){
                if(e.shiftKey){
                    markdown.file.saveAs();
                }else{
                    $('#J-tool-save').trigger('click');
                };
            });
            kibo.down('ctrl o', function(){
                $('#J-tool-select').trigger('click');
            });
            kibo.down('ctrl f12', function(){
                markdown.file.preview();
            });
            kibo.down('alt c', function(){
                markdown.tab.close(markdown.tab.getCurrentTab().id);
            });
            // 主界面禁止ctrl A操作
            !el && kibo.down('ctrl a', function(){
                return false;
            });
        },
        // 将编辑器内容push到iframe
        pushToFrame: function(html){
            var frameWrap = $('#showdown'),
                frame = frameWrap.find('iframe'),
                codeInput = $('#codeMirror'),
                iframeBody = frame.contents().find('body');

            // 创建iframe装载输入内容
            if(!cache.frameInit){
                frame.height(codeInput.height());

                iframeBody.append(markdown.filtHTML(html));

                // 设置iframe中body的高度，作用是感应拖拽文件动作，避免有盲区
                // 拿现有body高度与编辑器高度对比取大的一方，20是body标签的上下margin值之和
                iframeBody.attr('style') && iframeBody.removeAttr('style');
                iframeBody.height(Math.max(iframeBody.height(), codeInput.height() - 20));

                // 初次iframe加载完成之后 监听将文件拖拽至iframe的动作
                markdown.frameInit();

                cache.frameInit = true;
            }
            else{
                iframeBody = frame.contents().find('body');

                // 编辑器内容变化重置iframe body高度
                iframeBody.attr('style') && iframeBody.removeAttr('style');

                iframeBody.html(markdown.filtHTML(html));
                iframeBody.height(Math.max(iframeBody.height(), codeInput.height() - 20));
            }
        },
        // 创建预览区(iframe)后执行的一系列动作
        frameInit: function(){
            // 监听将文件拖拽至iframe的动作
            var frame = $('#showdown iframe'),
                framebody = frame.contents().find('body').get(0);

            framebody.addEventListener("dragover", function(e){
                e.stopPropagation();
                e.preventDefault();
                markdown.overlay('show');
            }, false);

            // 预览区的链接用系统默认工具打开
            framebody.addEventListener('click', function(e){
                if(e.target.tagName == 'A'){
                    e.preventDefault();
                    cache.gui.Shell.openExternal($(e.target).attr('href'));
                }

                // 点击隐藏图片链接填写层
                var msgBox = $('#J-msgBox');
                if(msgBox.is(':visible')){
                    msgBox.hide();
                }
            }, false);

            // 监听按键
            markdown.kibo(framebody);

            //右键
            framebody.addEventListener('contextmenu', function(e){
                var showmenu = new cache.gui.Menu();
                showmenu.append(cache.menuSource['tool-previewInBrowser']);
                showmenu.append(cache.menuSource['tool-exportAsHtml']);
                showmenu.append(cache.menuSource['tool-sendEmailAsHtml']);
                showmenu.popup(parseInt(frame.offset().left + e.clientX), frame.offset().top + e.clientY);
            });
        },
        // 浮动菜单 与 页面交互，同步disable状态
        syncWidthContext: function(name, type){
            type = !!type;
            cache.menuSource[name].enabled = type;
        },
        // 自适应调整标签栏高度
        tabHeightAdjust: function(){
            var tabBar = $('#J-tab'),
                tabTop = parseInt(tabBar.css('top')),
                tabInner = tabBar.find('.tabInner'),
                tabInnerHei = tabInner.height(),
                fix = Math.floor(tabInnerHei/28);
                codeMirror = $('#codeMirror');

            !cache.tabCache.prevHeight && (cache.tabCache.prevHeight = tabInnerHei);

            // tab栏高度有了变化
            if(tabInnerHei != cache.tabCache.prevHeight){
                tabBar.height(29 * fix - 1);
                codeMirror.css('top', tabTop + tabInnerHei + 1);
                $('#showdown').css('top', tabTop + tabInnerHei + 1);
                cache.tabCache.prevHeight = tabInnerHei;
                /*main.animate({
                    top: tabTop + tabInnerHei + 1
                }, 100, function(){
                    can == 1 && markdown.adjustWorkspace();
                    can++;
                });*/
                //$('.CodeMirror-scroll').height(codeMirror.height());
                //$('#showdown').css('top', tabTop + tabInnerHei + 1);
                //cache.editor.refresh();

                this.adjustWorkspace();
            }
        },
        // check input
        checkInput: function(){
            var label = $('#J-box-content label.required'), res = true;

            if(label.length){
                label.each(function(){
                    var input = $(this).next();
                    if($.trim(input.val()) == ''){
                        input.focus();
                        res = false;
                        return false;
                    }
                });
            }

            return res;
        },
        // 对话框
        dialog: function(msg, type){
            var config = {
                title: '提 示',
                content: msg,
                lock: true,
                resize: false,
                initialize: function(){
                    markdown.dialog_commonInit();
                }
            };

            if(type && type === 'button'){
                config.button = [
                    {
                        value: '确定',
                        callback: function(){},
                        focus: true
                    }
                ]
            }
            console.log('dialog: '+msg);
            return $.artDialog(config);
        },
        dialog_commonInit: function(){
            var dialogParent = $('.d-outer').parent();

            $('#wrapper').append(dialogParent).append($('.d-mask'));

            dialogParent.find('.d-button').addClass('custom-appearance');
        },
        // 创建文件 并写入操作
        writeToFile: function(path, content){
            var encode = cache.fileEncode[path] || 'utf-8';
            console.log('写入编码： ' + encode);
            fs.createWriteStream(path, {
                encoding: encode,
                flags: 'w',
                mode: '0666'
            }).write(content);
        },
        // 保存之后 or 打开文件之后
        // 更新标签的信息及窗口标题
        updateTabInfo: function(path, type){
            var currentTab = markdown.tab.getCurrentTab(),
                //path = path ? path : currentTab.path,
                curTabId = currentTab.id,
                $curTab = $('#' + curTabId),
                memTab = markdown.tab.getMemberById(curTabId),
                console_file = $('#console_file'),
                content = cache.editor.getValue();

            if(type === 'open'){
                console_file.text(path);
                $curTab.attr('title', path).find('.tabName').text(modPath.basename(path));
                document.title = path + ' - ' + settings.name;

                memTab.path = path;
                cache.tabCache.fileName_tabId[path] = curTabId;
                memTab.type = 'file';
            }
            else if(type === 'save'){

            }

            $curTab.find('.modifyflag').addClass('hide');

            memTab.modify = false;
            memTab.data = content;
        },
        // 修改了编辑器内容 更新当前标签的mofidy状态
        updateModify: function(){
            var tabCache = cache.tabCache,
                currentTab = markdown.tab.getCurrentTab(),
                curTabId = currentTab.id,
                memTab = tabCache.member[curTabId];

            console.log('editor content has changed.');
            memTab.modify = true;
            $('#' + curTabId).find('.modifyflag').removeClass('hide');
        },
        // 关闭软件之前 先保存信息
        beforeClose: function(){
            var tabCache = cache.tabCache,
                member = tabCache.member,
                curTab = markdown.tab.getCurrentTab(),
                curTabId = curTab.id,
                forMemory = localStorage.memory ? JSON.parse(localStorage.memory) : {},
                fileTabs = [],
                fileTabList = [];

            // 检查标签中有没有需要提示保存的
            for(var key in member){
                var curMem = member[key],
                    name;

                if(curMem.type === "file"){
                    fileTabs.push(curMem);
                    fileTabList.push(curMem.path);
                    name = modPath.basename(curMem.path);
                }else{
                    name = $('#' + key).find('.tabName').text();
                }

                // 提示保存
                if(curMem.modify){
                    if(confirm('保存文档 ' + name + ' 吗？')){
                        if(curMem.type === 'file'){
                            var content = key === curTabId ? cache.editor.getValue() : curMem.data;
                            curMem.modify = false;
                            curMem.data = content;
                            $('#' + key).find('.modifyflag').addClass('hide');
                            markdown.file.writeToFile(curMem.path, content);
                        }else{
                            tabCache.delTabId = key;
                            cache.tabCache.saveType = 'closeApp';
                            $('#J-hi-savePath').trigger('click');
                            return false;
                        }
                    }else{
                        if(curMem.type === 'blank'){
                            curMem.modify = false;
                            markdown.tab.close(key);
                        }
                    }
                }
            }

            // 保存信息
            if(fileTabList.length){
                if(curTab.type === 'blank'){
                    forMemory.currentTabPath = fileTabs[fileTabs.length - 1].path;
                }else{
                    forMemory.currentTabPath = curTab.path;
                }

                forMemory.tabList = fileTabList;
            }
            // 没有文件标签则清空本地数据
            else{
                if(forMemory.tabList) delete forMemory.tabList;
            }

            localStorage.memory = JSON.stringify(forMemory);

            return true;
        },
        // 初始化本地数据
        localDataInit: function(){
            var localMemory = localStorage.memory,
                tabCache = cache.tabCache,
                member = tabCache.member,
                menuSource = cache.menuSource,
                tabBar = $('#J-tab'),
                tabId, memory, tabList, tabToPend, tabName,
                tabClone, currentTabId, currentTabPath, passOn,
                // 内容有变 需要重新保存memory
                resaveMemory = false;

            if(localMemory){
                memory = JSON.parse(localMemory);
                tabList = memory.tabList;

                // 加载最后一次退出的标签列表
                if(tabList && tabList.length){
                    tabClone = $('<span class="item"><em class="modifyflag hide">*</em><em class="tabName"></em><i class="icon-remove icon-white" title="关闭"></i></span>');
                    currentTabPath = memory.currentTabPath;

                    // 查看当前标签的文件是否还存在
                    if(!fs.existsSync(currentTabPath)){
                        passOn = true;
                    }

                    // 遍历标签列表，同时将标签信息放进缓存
                    $.each(tabList.slice(), function(i, path){
                        if(fs.existsSync(path)){
                            // 传递需要首先打开的文件path
                            if(passOn){
                                currentTabPath = path;
                                passOn = false;
                            }

                            tabName = modPath.basename(path);
                            tabToPend = tabClone.clone();
                            tabId = 'tab-' + tabCache.uuid;

                            tabToPend.find('.tabName').text(tabName).end().attr({
                                id: tabId,
                                title: path
                            });

                            tabCache.fileName_tabId[path] = tabId;
                            member[tabId] = {
                                reload: true, // 标识需要重新加载
                                modify: false,
                                type: 'file',
                                path: path,
                                data: '',
                                history: {done:[], undone:[]}
                            };

                            if(currentTabPath === path){
                                tabToPend.addClass('on');
                                currentTabId = tabId;
                                delete member[tabId].reload;
                            }

                            tabBar.find('.tabInner').append(tabToPend);

                            tabCache.uuid++;
                        }
                        // 有文件已经不存在了
                        else{
                            resaveMemory = true;
                            tabList.remove(path);
                        }
                    });

                    if(!passOn){
                        // 只加载一个标签内容 其他标签点击时加载 提升打开速度
                        markdown.loadFile(currentTabPath, function(data){
                            member[currentTabId].data = data;

                            codeEditor.setValue(data, true);
                        });

                        tabCache.No = tabList.length + 1;

                        // 更新窗口标题与状态栏信息
                        $('#console_file').text(currentTabPath);
                        document.title = currentTabPath + ' - ' + settings.name;

                        markdown.tabHeightAdjust();

                        // 设置标识 不需要加载介绍文档
                        cache.doNotLoadIntro = true;
                    }
                    // 上次记录的标签列表文件已全部被删除或改名
                    else{
                        resaveMemory = true;
                        delete memory.currentTabPath;
                        delete memory.tabList;
                    }
                }

                // 应用工具界面（工具栏、状态栏）
                if(memory.toolbar === false){
                    // 标识从加载本地数据时进入
                    cache.tempFlag = 'localData';

                    menuSource['toolbar'].click();
                }
                if(memory.console === false){
                    // 标识从加载本地数据时进入
                    cache.tempFlag = 'localData';

                    menuSource['console'].click();
                }

                // 载入历史记录
                if(memory.historyList){
                    menuSource.file.append(menuSource.separator);
                    $.each(memory.historyList, function(i, item){
                        menuSource.file.append(new cache.gui.MenuItem({
                            label: item,
                            click: function(){
                                markdown.tab.add(item);
                            }
                        }));
                    });
                    menuSource.file.append(menuSource.separator);
                    menuSource.file.append(menuSource['file-clearHistory']);
                }

                // 记录到 localStorage内容有变 重新保存
                if(resaveMemory){
                    localStorage.memory = JSON.stringify(memory);
                }
            }
        },
        update: {
            init: function(){
                $.artDialog({
                    title: '检查新版本',
                    lock: true,
                    resize: false,
                    width: 300,
                    height: 100,
                    button: [
                        {
                            value: '关 闭',
                            focus: true
                        }
                    ],
                    initialize: function(){
                        markdown.dialog_commonInit();

                        this.content($('#J-checkUpdate').html());

                        setTimeout(function(){
                            markdown.update.connect();
                        }, 400)
                    }
                });
            },
            lineMsg: function(msg, noLine){
                if(noLine) return;
                var wrapper = $('#checkUpdateWrapper'),
                    lastLine = wrapper.find('.dia_line:last'),
                    line = $('<div class="dia_line"></div>');

                lastLine.append(' <span class="glyphicon glyphicon-ok"></span>');
                wrapper.append(line.clone().html(msg));
            },
            connect: function(noLine){
                var request = require('request'),
                    that = this;

                that.lineMsg('向服务器发出请求...', noLine);
                request({
                    method: 'get',
                    uri: settings.updateURL
                }, function(err, res, body){
                    if(err){
                        console.log('请求失败');
                        console.log(err);
                        that.lineMsg('更新失败，请检查网络。', noLine);
                        return;
                        //markdown.dialog('更新失败，请检查网络。', 'button');
                    }

                    that.lineMsg('比对版本信息...', noLine);
                    var content = body.replace(/[\s]/gm, '');

                    try{
                        var json = JSON.parse(content).win32,
                            latestVersion = json.latestVersion,
                            latestUrl = json.latestUrl;
                    }catch(e){
                        console.log(e);
                        that.lineMsg('更新过程出现异常。', noLine);
                        return;
                    }

                    // 比对版本
                    if((localStorage.version && localStorage.version === latestVersion) || latestVersion === settings.version){
                        //markdown.dialog('当前已经是最新版本。', 'button');
                        that.lineMsg('当前已经是最新版本。', noLine);
                        console.log('已经是最新。。。');
                    }
                    else{
                        that.lineMsg('找到一个新版本： V' + latestVersion + ' <a href="'+ latestUrl +'">点击下载</a>', noLine);
                        if(noLine && noLine.callback){
                            noLine.callback(latestVersion, latestUrl);
                        }
                    }
                });
            }
        },
        checkVersion: function(){
            var versionTipTime = localStorage.versionTipTime,
                updateType = this.rockSettings.getItemInLocal('update');

            if(!updateType || (updateType && /^(tip|auto)$/.test(updateType))){
                // 7天提醒一次
                if(versionTipTime){
                    var days = (new Date().getTime() - new Date(versionTipTime).getTime())/(1000 * 60 * 60 * 24);
                    var bucket = Math.floor(days);
                    if(bucket < 7) return console.log('距离上次提醒未满7天，不检查不提示');
                }

                markdown.update.connect({
                    callback: function(version, url){
                        $.artDialog({
                            title: '更新提示',
                            lock: true,
                            resize: false,
                            button: [
                                {
                                    value: '立即下载',
                                    callback: function(){
                                        location.href = url;
                                    },
                                    focus: true
                                },
                                {
                                    value: '关 闭',
                                    callback: function(){
                                        localStorage.versionTipTime = markdown.common.formatDate(new Date(), 'yyyy/MM/dd hh:mm:ss');
                                        console.log(markdown.common.formatDate(new Date(), 'yyyy/MM/dd hh:mm:ss'));
                                    }
                                }
                            ],
                            initialize: function(){
                                markdown.dialog_commonInit();

                                this.content($('#J-newVersion').html());
                                $('#newVersionWrapper .new_version').text(version);
                            }
                        });
                    }
                });
            }
        },
        // 监听
        observer: function(){
            markdown.mail = require('./js/mail');
            var contextmenu = require('./js/contextmenu');
            markdown.toolbar = require('./js/toolbar');
            markdown.tab = require('./js/tab');
            markdown.file = require('./js/file');

            var editor = codeEditor.codeMirrorInit('markdown'),
                preview = $('#showdown'),
                toolbar = this.toolbar,
                cache = this.cache,
                menuItem = $('.menu .item'),
                context = contextmenu.init();

            cache.menuSource = contextmenu.contextMenuSource;

            // 初始化本地数据
            this.localDataInit();

            // 文件拖拽
            this.dropFile();

            // 窗口变化
            common.resizeWindow();

            // 菜单项
            $('#codeMirror').on('contextmenu', function(ev){
                ev.preventDefault();
                context.codeMenu.popup(ev.clientX, ev.clientY);
                return false;
            });
            $('#J-toolbar').on('contextmenu', function(ev){
                ev.preventDefault();
                context.toolbarMenu.popup(ev.clientX, ev.clientY);
                return false;
            });
            $('#J-footer').on('contextmenu', function(ev){
                ev.preventDefault();
                context.consoleMenu.popup(ev.clientX, ev.clientY);
                return false;
            });
            menuItem.click(function(e){
                var that = $(this),
                    x = that.offset().left,
                    menuType = that.attr('rel');

                menuType && context[menuType].popup(x, 28);
            });

            // 监听编辑器输入
            editor.on('change',function(ins){
                // 全屏模式不需要实时push
                !preview.hasClass('hide') && cache.realtime && codeEditor.onChange();

                markdown.updateConsoleWords();
                !cache.preventEditorChange && markdown.updateModify();
            });

            // 监听文件拖拽
            editor.on('dragover', function(ins, e){
                e.stopPropagation();
                e.preventDefault();

                // 不阻止编辑器拖文字的动作
                e.dataTransfer.files.length && markdown.overlay('show');
            });

            // 监听光标动作
            editor.on('focus', function(ins, e){
                $('#J-insertArea').removeClass('disable');

                var msgBox = $('#J-msgBox');
                if(msgBox.is(':visible')){
                    msgBox.hide();
                }
            });
            editor.on('blur', function(ins, e){
                $('#J-insertArea').addClass('disable');
            });
            editor.on('cursorActivity', function(){
                var line = editor.doc.getCursor().line,
                    prevLine = cache.prevLine;

                if(prevLine != undefined && prevLine === line) return;

                editor.addLineClass(line, 'wrap', 'lining');

                if(prevLine != undefined){
                    editor.removeLineClass(prevLine, 'wrap', 'lining');
                }

                cache.prevLine = line;
            });

            // 拖拽文件到界面没有drop 再次回到界面时移除遮罩
            $('#overlay').mouseover(function(e){
                $(this).hide();
            });

            // 标签栏按键
            $('#J-tab').delegate('.item', 'click', function(){
                markdown.tab.select($(this).attr('id'));
            }).delegate('.icon-remove', 'click', function(e){
                e.stopPropagation();
                markdown.tab.close($(e.target).parent().attr('id'));
                console.log('xxx');
            }).delegate('.item', 'dblclick', function(e){
                var can = markdown.rockSettings.getItemInLocal('tag_dblclickClose');
                can && markdown.tab.close($(this).attr('id'));
            });

            /*$('#J-tool-test3').click(function(e){
                console.log(cache.tabCache);
            });*/
            $('.toolblock span').click(function(e){
                var that = $(this),
                    type = that.attr('method');

                // 禁用按钮点击无效
                if(that.hasClass('disable')) return;

                if(type){
                    toolbar[type](e, that);
                }
            });

            // A
            $('body').delegate('a', 'click', function(e){
                var that = $(this);
                if(!that.attr('nopen') && that.parents('.ztree').length == 0){
                    e.preventDefault();
                    cache.gui.Shell.openExternal(that.attr('href'));
                }
            });

            // 上传文件 或 选取存储地址
            $('#J-hi-select').change(function(e){
                console.log(this.value);
                markdown.tab.add(this.value);
            });
            $('#J-hi-savePath').change(function(e){
                console.log(this.value);
                var saveType = cache.tabCache.saveType;
                if(saveType === 'saveAndClose'){
                    markdown.file.savePathAndClose(this.value, cache.tabCache.delTabId);
                }
                else if(saveType === 'exportHTML'){
                    markdown.file.exportHTML(this.value);
                }
                else if(saveType === 'closeApp'){
                    //markdown.file.saveToPath(this.value);
                    markdown.file.savePathAndClose(this.value, cache.tabCache.delTabId, function(){
                        cache.guiWin.close();
                    });
                }
                else{
                    markdown.file.saveToPath(this.value);
                }
            });

            // 禁止外部选取操作
            $('html').on('selectstart', function(e){
                e.preventDefault();
            });

            // 监听按键
            markdown.kibo();

            // bootstrap tooltip
            $('.toolblock').find('.item').attr('data-placement', 'bottom').end().tooltip({
                selector: '.item'
            });

            // 插入图片或链接
            $('.bot .btn').click(function(e){
                var content = $(this).parent().prev(),
                    btnType = $(this).attr('method'),
                    msgBox = $('#J-msgBox'),
                    type = $('#J-box-content').attr('type'),
                    url, name, title, replaceStr;

                if(btnType === 'ok'){
                    if(markdown.checkInput()){
                        if(type === 'link'){
                            url = $.trim($('#input1').val());
                            name = $.trim($('#input2').val());
                            titleInput = $.trim($('#input3').val());
                            name == '' && (name = url);
                            title = titleInput != '' ? ' "'+titleInput+'"' : '';
                            replaceStr = '['+ name +']('+ url + title +')';
                        }
                        else if(type === 'image'){
                            url = $.trim($('#input1').val());
                            titleInput = $.trim($('#input2').val());
                            name = titleInput != '' ? titleInput : url;
                            title = titleInput != '' ? ' "' + titleInput + '"' : '';
                            replaceStr = '!['+ name +'](' + url + title +')';
                        }

                        msgBox.fadeOut(200, function(){
                            msgBox.addClass('hide');
                        });

                        codeEditor.push(replaceStr);
                    };
                }else if(btnType === 'cancel'){
                    msgBox.fadeOut(200, function(){
                        msgBox.addClass('hide');
                    });
                }
            });

            // 窗口关闭确认
            cache.guiWin.on('close', function(){
                if(markdown.beforeClose()){
                    this.close(true);
                };
            });


        },
        init: function(){
            global.markdown = markdown;

            var gui = this.cache.gui || (this.cache.gui = require('nw.gui'));
            var guiWin = this.cache.guiWin || (this.cache.guiWin = gui.Window.get());

            // 设置窗口宽高
            //var disX = 100, disY = 50;
            //guiWin.resizeTo(window.screen.availWidth - disX * 2, window.screen.availHeight - disY * 2);
            //guiWin.x = disX;
            //guiWin.y = disY;

            //guiWin.resizeTo(1000, 700);
            //guiWin.x = 0;
            //guiWin.y = 0;
            //guiWin.show();

            this.observer();

            // 初始默认载入readme
            !cache.doNotLoadIntro && markdown.tab.add('./docs/INTRODUCTION.md', true);

            console.log('init ending..');
            setTimeout(function(){
                var can = $('#opening_mask, #opening_canvas'), checked = false;
                 can.fadeOut(600, function(){
                    if(checked) return;
                    can.remove();

                    // 自动检查更新
                    checked = true;
                    markdown.checkVersion();
                });
            }, 1500);
        }
    };
    markdown.init();
});

// 判断数组中是否包含某一项
Array.prototype.contains = function(item){
    var i = this.length;
    while(i--){
        if(this[i] == item) return true;
    }
    return false;
};

// 删除数组中某一项
Array.prototype.remove = function(item){
    var i = this.length;
    while(i--){
        if(this[i] == item){
            this.splice(i, 1);
        };
    }
    return this;
};