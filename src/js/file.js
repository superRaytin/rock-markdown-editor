/**
 * file.
 */

var markdown = global.markdown,
    require = global.require,
    window = global.window,
    console = window.console,
    fs = require('fs'),
    modPath = require('path'),
    cheerio = require('cheerio'),
    iconv = require('iconv-lite'),
    http = require('http'),
    cache = markdown.cache,
    common = markdown.common;

// 文件操作
var file = {
    save: function() {
        var currentTab = markdown.tab.getCurrentTab(),
            tabType = currentTab.type,
            savePath = $('#J-hi-savePath'),
            defaultPath = markdown.rockSettings.getDetailPath();

        //if (currentTab.modify) {
        // blank
        if (tabType === 'blank') {
            cache.tabCache.saveType = 'blank';

            if (defaultPath) {
                savePath.attr('nwworkingdir', defaultPath);
            }

            savePath.trigger('click');
        }
        // file
        else if (currentTab.modify) {
            markdown.writeToFile(currentTab.path, cache.editor.getValue());
            markdown.updateTabInfo(currentTab.path, 'save');
        }
        //}
    },
    // 从磁盘删除文件
    delFileFromDisk: function() {
        var currentTab = markdown.tab.getCurrentTab(),
            curTabId = currentTab.id,
            member = cache.tabCache.member[curTabId],
            filePath, fileName;

        if (currentTab.type === 'file') {
            filePath = currentTab.path;
            fileName = modPath.basename(filePath);
            if (fs.existsSync(filePath) && window.confirm('将会从磁盘删除文件 '+ fileName +'，确定吗？')) {
                fs.unlink(filePath, function(err) {
                    if (err) return console.log('删除文件异常： ' + err);
                    console.log('成功删除 ' + filePath);

                    member.modify = false;
                    markdown.tab.close(curTabId);
                });
            }
        }
    },
    // 另存为
    saveAs: function() {
        var savePath = $('#J-hi-savePath'),
            defaultPath = markdown.rockSettings.getDetailPath();

        if (defaultPath) {
            savePath.attr('nwworkingdir', defaultPath);
        }

        cache.tabCache.saveType = 'saveAs';
        savePath.trigger('click');
    },
    // blank 文件存储至指定路径
    saveToPath: function(path, saveTabId) {
        var curTab = markdown.tab.getCurrentTab(),
            curTabId = curTab.id,
            content = cache.editor.getValue(),
            tabCache = cache.tabCache,
            fileName = modPath.basename(path),
            fileNameDotIndex = fileName.lastIndexOf('.'),
            suffix = markdown.rockSettings.getItemInLocal('extension') || 'md';

        if ( fileNameDotIndex == -1 || (fileNameDotIndex != -1 && !/^(md|markdown|txt)$/i.test(fileName.substr(fileNameDotIndex + 1)) )) {
            path = path + '.' + suffix;
        }

        markdown.userFootprint.saveHistory(path);

        // 保存的blank标签并没有高亮
        if (saveTabId) {
            if (curTabId !== saveTabId) {
                content = tabCache.member[saveTabId].data;
            }
        }

        markdown.writeToFile(path, content);
        markdown.updateTabInfo(path, 'open');

        // 场景：当前标签为file，另存为操作，需要删除适配表里 旧文件关联
        if (curTab.type === 'file') {
            delete tabCache.fileName_tabId[curTab.path];
        }

        this.afterSaveToPath(path);
    },
    // 关闭带*号blank标签 点击保存时 —— normalTabIdForClose:关闭的标签ID
    savePathAndClose: function(path, normalTabIdForClose, callback) {
        var curTab = markdown.tab.getCurrentTab(),
            curTabId = curTab.id,
            content = cache.editor.getValue(),
            tabCache = cache.tabCache,
            fileName = modPath.basename(path),
            fileNameDotIndex = fileName.lastIndexOf('.'),
            suffix = markdown.rockSettings.getItemInLocal('extension') || 'md',
            closeTabId = normalTabIdForClose;

        if ( fileNameDotIndex == -1 || (fileNameDotIndex != -1 && !/^(md|markdown|txt)$/i.test(fileName.substr(fileNameDotIndex + 1)) )) {
            path = path + '.' + suffix;
        }

        // 自动关闭的是 其他普通blank标签
        if (curTabId !== closeTabId) {
            content = tabCache.member[closeTabId].data;
        }

        markdown.writeToFile(path, content);

        tabCache.member[closeTabId].modify = false;
        markdown.tab.close(closeTabId);

        this.afterSaveToPath(path);

        callback && callback();
    },
    afterSaveToPath: function(path) {
        // 保存之后清空save file的值
        $('#J-hi-savePath').val('');

        // 保存最后一次保存的目录路径
        markdown.userFootprint.saveToMemory('lastSaveDir', modPath.dirname(path));
        markdown.userFootprint.saveToMemory('lastDirectory', modPath.dirname(path));
        console.log('最后保存的路径：' + path);
    },
    // 查看文件目录
    viewPath: function() {
        var curTab = markdown.tab.getCurrentTab(),
            path = curTab.path;
        if (curTab.type === 'file') {
            cache.gui.Shell.showItemInFolder(path);
        }
    },
    // 导出HTML文件
    exportHTML: function(path) {
        var frameContent = $('#showdown iframe').contents(),
            res = '<!DOCTYPE html>\n<html>\n',
            fileName = modPath.basename(path),
            fileNameDotIndex = fileName.lastIndexOf('.');

        if ( fileNameDotIndex == -1 || (fileNameDotIndex != -1 && !/^(html|htm)$/i.test(fileName.substr(fileNameDotIndex + 1)) )) {
            path = path + '.html';
        }

        res += frameContent.find('html').html();
        res += '\n<\/html>';

        var cheer = cheerio.load(res);
        cheer('body').removeAttr('style');
        cheer('title').text('Rock! MarkDown Editor export');

        markdown.writeToFile(path, cheer.html());
    },
    // 浏览器预览
    preview: function() {
        var frameContent = $('#showdown iframe').contents(),
            headCon = frameContent.find('head').html(),
            bodyCon = frameContent.find('body').html();

        markdown.loadFile('./src/preview.html', function(data) {
            var j = cheerio.load(data),
                locate = window.location.href;

            j('head').html(headCon);
            j('head').find('title').text('Rock! MarkDown Editor preview');
            j('body').html(bodyCon);

            fs.writeFile('./src/preview.html', j.html(), function(e) {
                if (e) return console.log(e);
                console.log('在浏览器中打开');
                cache.gui.Shell.openExternal(locate.substr(0, locate.lastIndexOf('/')) + '/preview.html');
            });
        });
    }
    /*loadZip: function(zipName, savePath, callback) {
        var req = http.request({
            hostname: 'github.com/superRaytin/rock-markdown-editor',
            path: '/project/rock/' + zipName + '.zip',
            method: 'GET'
        }, function(res) {
            console.log('开始下载...');

            var saveFile = fs.createWriteStream(savePath);
            res.pipe(saveFile);

            console.log(saveFile);
            saveFile.on('close', function() {
                console.log(4444);

                console.log('下载完成');
                callback && callback(res);
            });
        });

        req.on('error', function(e) {
            console.log(e);
        });

        req.end();
    }*/
};

module.exports = file;