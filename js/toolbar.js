/**
 * toolbar.
 * User: raytin
 * Date: 13-7-30
 */
var markdown = global.markdown,
    cache = markdown.cache,
    codeEditor = markdown.codeEditor,
    common = markdown.common;

var toolbar = {
    undo: function(e, item){
        cache.editor.doc.undo();
        codeEditor.focus();
    },
    redo: function(e, item){
        cache.editor.doc.redo();
        codeEditor.focus();
    },
    maxsize: function(e, item){
        var preview = $('#showdown'),
            isMax = preview.hasClass('hide'),
            codeInput = $('#codeMirror'),
            run = $('#J-tool-run'),
            scrollElement = markdown.cache.editor.getScrollerElement();

        if(preview.is(':animated')) return;

        // 分屏
        if(isMax){
            // 重新对预览区渲染
            cache.realtime && codeEditor.onChange();

            // 分屏动作 非实时才点亮运行按钮
            if(!cache.realtime){
                run.removeClass('disable');
                markdown.syncWidthContext('view-run', 1);
            }

            item.removeClass('on');
            preview.removeClass('hide');
            preview.animate({
                left: '50%'
            }, 300, function(){
                codeInput.removeClass('rightzero');
                scrollElement.style.width = codeInput.width() + 'px';
            });

        }
        // 最大化
        else{
            run.addClass('disable');
            markdown.syncWidthContext('view-run', 0);
            item.addClass('on');

            codeInput.addClass('rightzero');
            preview.addClass('hide').css('left', '105%');

            scrollElement.style.width = codeInput.width() + 'px';
        }
    },
    realtime: function(e, item){
        var run = $('#J-tool-run'),
            preview = $('#showdown');

        // 取消实时预览
        if(item.hasClass('on')){
            cache.realtime = false;
            item.removeClass('on');

            // 分屏模式才点亮运行按钮
            if(!preview.hasClass('hide')){
                run.removeClass('disable');
                markdown.syncWidthContext('view-run', 1);
            }
        }
        else{
            cache.realtime = true;
            item.addClass('on');
            run.addClass('disable');
            markdown.syncWidthContext('view-run', 0);
        }
    },
    run: function(e, item){
        codeEditor.onChange();
        codeEditor.focus();
    },
    wrap: function(e, item){
        var editor = cache.editor,
            selcon = editor.getSelection(),
            target = item.attr('tar'),
            addch = item.attr('id') === 'J-tool-bold' ? 2 : 1;

        if(selcon){
            target = target + selcon + target;
        }else{
            target = target + target;
        }

        codeEditor.push(target, addch);
    },
    pre: function(e, item, tar){
        var editor = cache.editor,
            selcon = editor.getSelection(),
            target = tar || (item.attr('tar') + ' ');

        if(selcon){
            target = target + selcon;
        }

        codeEditor.push(target);
    },
    // 清除当前行
    delline: function(){
        var editor = cache.editor,
            selcon = editor.getSelection(),
            cursor = editor.doc.getCursor();

        // 有选中内容当作剪切操作
        if(selcon){
            markdown.cache.clipboard.set(selcon);
            editor.replaceSelection('');
        }
        else{
            editor.doc.removeLine(cursor.line);

            editor.focus();
            editor.doc.setCursor({
                line: cursor.line,
                ch: 0
            });
        }
    },
    // 替换当前选中内容
    replace: function(e, item){
        var target = item.attr('tar');

        if(target === 'timestamp'){
            target = common.formatDate(new Date(), 'yyyy/MM/dd hh:mm:ss');
        }

        codeEditor.push(target);
    },
    showPop: function(e, item, type){
        var msgBox = $('#J-msgBox'),
            boxCon = msgBox.find('.content');

        if(msgBox.is(':visible')){
            msgBox.hide();

            if(boxCon.attr('type') === type) return;
        }

        var tmp = item.attr('tmp'),
            model = $('#J-boxTemplate-' + tmp),
            top = parseInt($('#J-tab').offset().top),
            left, modelwid;

        boxCon.attr('type', type).html(model.html());
        modelwid = msgBox.width();
        left = e.clientX - modelwid/2;

        msgBox.css({
            left: left + 'px',
            top: top + 5 + 'px'
        }).fadeIn(200, function(){
                msgBox.show();
            });
        $('#input1').focus();
    },
    // 插入链接
    link: function(e, item){
        if(e.clientX){
            this.showPop(e, item, 'link');
        }
        // 通过trigger方式触发 事件对象没有位置信息
        else{
            codeEditor.push('[Rock Text](http://jsfor.com/ "title text")');
        }
    },
    // 插入链接
    image: function(e, item){
        if(e.clientX){
            this.showPop(e, item, 'image');
        }
        // 通过trigger方式触发 事件对象没有位置信息
        else{
            codeEditor.push('![Rock MarkDown Editor](logo.png)');
        }
    },
    // 新建文档
    new: function(e, item){
        markdown.tab.add();
    },
    // 保存文档
    save: function(e, item){
        console.log('按下ctrl+S');
        markdown.file.save();
        alertify.success('保存成功');
    },
    // 选择文件
    select: function(e, item){
        $('#J-hi-select').trigger('click');
    },
    // 重载文件
    reload: function(e, item){
        markdown.tab.reload();
    }
};

module.exports = toolbar;