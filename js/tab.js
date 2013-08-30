/**
 * tab.
 * User: raytin
 * Date: 13-7-30
 */
var markdown = global.markdown,
    require = global.require,
    window = global.window,
    console = window.console,
    document = window.document,
    fs = require('fs'),
    modPath = require('path'),
    cheerio = require('cheerio'),
    iconv = require('iconv-lite'),
    cache = markdown.cache,
    codeEditor = markdown.codeEditor,
    common = markdown.common,
    settings = markdown.settings;

// 工具栏
var tab = {
    // 标签重置
    reset: function(tabId){
        var editor = cache.editor,
            tabCache = cache.tabCache,
            member = tabCache.member,
            tabMem = member[tabId],
            currentTab = this.getCurrentTab(),
            curTabId = currentTab.id,
            $curTab = $('#' + curTabId);

        editor.setValue('');
        editor.doc.clearHistory();

        // 重置文件标签
        if(tabMem.type === 'file'){
            $('#console_file').text('');
            $curTab.removeAttr('title').find('.tabName').text('新文档 ' + tabId.split('-')[1]);
            document.title = '新文档 ' + tabId.split('-')[1] + ' - ' + settings.name;

            delete cache.tabCache.fileName_tabId[tabMem.path];
        }

        delete member[tabId];

        member[tabId] = {
            modify: false,
            type: 'blank',
            data: '',
            history: {done:[], undone:[]}
        };

        $curTab.find('.modifyflag').addClass('hide');
    },
    select: function(tabId){
        var editor = cache.editor,
            tabCache = cache.tabCache,
            member = tabCache.member,
            tabBar = $('#J-tab'),
            selTab = $('#' + tabId),
            tabItem = tabBar.find('.item'),
            leaveTab = tabBar.find('.on'),
            leaveTabId = leaveTab.attr('id'),
            leaveTabMem = member[leaveTabId],
            curMemTab = member[tabId];

        if(leaveTab.length && leaveTabId === tabId) return;

        var setValueHistory = function(tabMember){
            // 切换标签时 阻止触发修改当前标签的modify状态
            codeEditor.setValue(tabMember.data);

            // 更新历史操作记录
            editor.doc.setHistory(tabMember.history);

            editor.addLineClass(0, 'wrap', 'lining');
        };

        if(tabItem.length > 1){
            // 保存上个选中标签的信息
            leaveTabMem.data = editor.getValue();
            leaveTabMem.history = editor.doc.getHistory();
        }

        tabItem.removeClass('on');
        selTab.addClass('on');

        if(curMemTab.type === 'file' && curMemTab.reload){
            markdown.loadFile(curMemTab.path, function(data){
                curMemTab.data = data;
                setValueHistory(curMemTab);
                delete curMemTab.reload;
            });
        }else{
            setValueHistory(curMemTab);
        }

        // 更新窗口标题与状态栏信息
        $('#console_file').text(curMemTab.path ? curMemTab.path : '');
        if(curMemTab.path){
            document.title = curMemTab.path + ' - ' + settings.name;
        }
        else{
            document.title = tabBar.find('.on .tabName').text() + ' - ' + settings.name;
        }
    },
    close: function(tabId, callback){
        var tabBar = $('#J-tab'),
            tabItems = tabBar.find('.item'),
            delTab = $('#' + tabId),
            tabCache = cache.tabCache,
            member = tabCache.member,
            delTabMember = member[tabId],
            curTabId = markdown.tab.getCurrentTab().id;

        // 文档已修改过 提示保存
        if(delTabMember.modify){
            if(window.confirm('保存文档 "' + delTab.find('.tabName').text() + '" 吗？')){
                if(delTabMember.type === 'blank'){
                    tabCache.delTabId = tabId;
                    cache.tabCache.saveType = 'saveAndClose';
                    $('#J-hi-savePath').trigger('click');
                    return;
                }
                else{
                    //markdown.file.save(tabId);
                    var content = tabId === curTabId ? cache.editor.getValue() : delTabMember.data;
                    markdown.writeToFile(delTabMember.path, content);
                }
            }
        }

        // 只剩一个标签，重置该标签后返回
        if(tabItems.length === 1){
            this.reset(tabId);
            return;
        };

        // 关闭标签的同时删除适配表中对应路径
        if(delTabMember.type === 'file'){
            delete tabCache.fileName_tabId[delTabMember.path];
        }

        // 删除当前标签
        if(delTab.hasClass('on')){
            if(delTab.next().length){
                this.select(delTab.next().attr('id'));
            }
            else if(delTab.prev().length){
                this.select(delTab.prev().attr('id'));
            }
        }

        delTab.remove();
        delete member[tabId];
        tabCache.No--;

        markdown.tabHeightAdjust();

        callback && callback();
    },
    closeAll: function(){
        var member = cache.tabCache.member;
        for(var key in member){
            this.close(key);
        }
    },
    closeOthers: function(){
        var member = cache.tabCache.member,
            currentTab = this.getCurrentTab();

        for(var key in member){
            currentTab.id !== key && this.close(key);
        }
    },
    add: function(path, intro){
        var that = this,
            tabBar = $('#J-tab'),
            tabCache = cache.tabCache,
            member = tabCache.member,
            tabToPend = $('<span class="item"><em class="modifyflag hide">*</em><em class="tabName"></em><i class="icon-remove icon-white" title="关闭"></i></span>'),
            fileName, tabId, callback;

        if(typeof intro === 'function'){
            callback = intro;
            intro = false;
            console.log(88);
        }

        // 最多新建50个标签
        if(tabCache.No > 50){
            markdown.dialog('标签个数已到极限！', 'button');
            return;
        }

        // 新建空文档
        if(!path){
            tabId = 'tab-' + tabCache.uuid;
            tabToPend.find('.tabName').text('新文档 '+ tabCache.blankTab);
            tabToPend.attr('id', tabId);

            // 激活该标签信息存储空间
            member[tabId] = {
                modify: false,
                type: 'blank',
                data: '',
                history: {done:[], undone:[]}
            };

            tabBar.find('.tabInner').append(tabToPend);
            that.select(tabId);

            tabCache.blankTab++;
            tabCache.uuid++;
            tabCache.No++;

            markdown.tabHeightAdjust();
        }
        else{
            tabId = tabCache.fileName_tabId[path];

            // 已打开的文件 直接定位
            if(member[tabId]){
                markdown.tab.select( tabId );
                return;
            }

            // 检查path合法性
            fileName = modPath.basename(path);
            if(!markdown.reg.markdownFile.test(fileName.substr(fileName.lastIndexOf('.') + 1))){
                markdown.dialog('请选择 ".md" ".markdown" 或 ".txt" 格式的文档', 'button');
                return;
            }

            // 不存在该路径的文件
            if(!fs.existsSync(path)){
                markdown.dialog('啊嘞...或许这个文件已经删除了？', 'button');
                return;
            };

            // 未打开过的文件 读取并push到编辑器
            markdown.loadFile(path, function(data, encode){
                tabId = tabCache.fileName_tabId[path] = 'tab-' + tabCache.uuid;

                // 记录下该文件信息
                tabCache.member[tabId] = {
                    type: 'blank',
                    modify: false,
                    data: data,
                    history: {done:[], undone:[]}
                };

                if(intro){
                    tabToPend.find('.tabName').text('新文档 '+ tabCache.blankTab).end().attr('id', tabId);
                    tabCache.blankTab++;
                }else{
                    tabToPend.find('.tabName').text(fileName).end().attr({
                        id: tabId,
                        title: path
                    });
                    tabCache.member[tabId].type = 'file';
                    tabCache.member[tabId].path = path;
                    cache.fileEncode[path] = encode;

                    // 新打开的文件保存至历史文件记录
                    markdown.userFootprint.saveHistory(path);

                    // 最后一次操作路径
                    markdown.userFootprint.saveToMemory('lastDirectory', modPath.dirname(path));
                    console.log('打开文件 ' + path);
                }

                tabCache.uuid++;
                $('#J-hi-select, #J-hi-savePath').val('');

                // 当前标签为blank并且未修改，则在当前标签载入文件内容
                if(tabBar.find('.item').length){
                    var currentTab = markdown.tab.getCurrentTab();
                    if(currentTab.type === 'blank' && !currentTab.modify){
                        var $curTab = $('#' + currentTab.id);
                        $curTab.attr('id', tabId);
                        if(!intro){
                            $('#console_file').text(path);
                            $curTab.attr('title', path).find('.tabName').text(fileName);
                            document.title = path + ' - ' + settings.name;
                        }

                        codeEditor.setValue(data, true);

                        delete cache.tabCache.member[currentTab.id];

                        tabToPend = null;
                        return;
                    }
                }

                tabBar.find('.tabInner').append(tabToPend);

                that.select(tabId);

                cache.editor.doc.clearHistory();
                tabCache.No++;

                markdown.tabHeightAdjust();

                callback && callback();
            });
        };
    },
    // 获取当前标签信息
    getCurrentTab: function(){
        var tabCache = cache.tabCache,
            $curTab = $('#J-tab').find('.on'),
            curTabId = $curTab.attr('id'),
            memTab = tabCache.member[curTabId],
            path = memTab.type === 'blank' ? false : memTab.path;

        return {
            id: curTabId,
            type: memTab.type,
            modify: memTab.modify,
            path: path
        }
    },
    // 获取当前标签 member
    getMemberById: function(tabId){
        return cache.tabCache.member[tabId];
    },
    getDataByPath: function(path, tabId, callback){
        markdown.loadFile(path, function(data){
            cache.tabCache.member[tabId].data = data;
            callback();
        });
    }
};

module.exports = tab;