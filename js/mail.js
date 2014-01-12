/**
 * mail.
 * User: raytin
 * Date: 13-8-4
 */
var markdown = global.markdown,
    require = global.require,
    nodeMailer = require('nodemailer'),
    window = global.window,
    localStorage = window.localStorage,
    Showdown = markdown.Showdown,
    console = window.console,
    alertify = window.alertify;

Array.prototype.remove = window.Array.prototype.remove;

var init = {
    checkSetting: function(serve){
        var localSet = serve || localStorage.setting,
            setting, settingMail;

        var tip = function(){
            !serve && markdown.dialog('请在【工具-设置-邮件】中进行设置，并填写完整');
        };

        if(localSet){
            setting = serve || JSON.parse(localSet);
            settingMail = setting.mail;
            if(settingMail){
                if(settingMail.SMTP && settingMail.port && settingMail.userName && settingMail.password){
                    return true;
                }else{
                    tip();
                    return false;
                };
            }else{
                tip();
            }
        }else{
            tip();
        };

        return false;
    },
    pushDefaultValue: function(){
        var localMemory = localStorage.memory,
            memory;
        if(localMemory){
            memory = JSON.parse(localMemory);
            if(memory.mail_sign){
                $('#mail_sign').val(memory.mail_sign);
            }
        }
    },
    listen: function(){
        var that = this;

        $('#J-mail-otherOpts').click(function(){
            $(this).hide().parent().next().removeClass('hide');
        });

        $('.J-getBook').click(function(){
            var localReceivers = localStorage.mail_receivers,
                receivers;

            that.mail_target = $(this).attr('data-type');

            if(localReceivers){
                receivers = JSON.parse(localReceivers);
                if(receivers.length){
                    $.artDialog({
                        title: '历史联系人',
                        lock: true,
                        resize: false,
                        button: [
                            {
                                value: '确 定',
                                callback: function() {
                                    return that.pushToReceive();
                                },
                                focus: true
                            }
                        ],
                        initialize: function(){
                            markdown.dialog_commonInit();

                            var dialog = this,
                                res = [];

                            $.each(receivers, function(i, item){
                                res.push('<div class="dia_content_column"><input type="checkbox" class="contact_item" value="'+ item +'"> ' + item + '<\/div>');
                            });

                            this.content($('#J-receiveBooks').html());

                            var bookWrapper = $('#bookWrapper');
                            bookWrapper.prepend(res.join(''));

                            $('#J-book-clean').click(function(){
                                that.cleanContacts(function(){
                                    alertify.success('清除成功');
                                });

                                dialog.close();
                            });

                            // select all
                            $('#J-selectAll').click(function(){
                                $('.contact_item', bookWrapper).prop('checked', this.checked);
                            });
                        }
                    });
                    return;
                }
            }

            markdown.dialog('悲催地一位联系人都找不到 （︶︿︶）', 'button');
        });
    },
    pushToReceive: function(){
        var mail_reciveUsers = this.mail_target === 'to' ? $('#mail_reciveUsers') : $('#mail_sendCC'),
            checked = $('#bookWrapper .contact_item:checked'),
            res = [];

        if(checked.length){
            checked.each(function(i, item){
                res.push(this.value);
            });

            mail_reciveUsers.val(res.join(', '));
        }
        else{
            alertify.log('未选择任何联系人');
        }
    },
    // 清除联系人
    cleanContacts: function(callback){
        var bookWrapper = $('#bookWrapper');
        var checked = $('.contact_item:checked', bookWrapper);
        var localReceiver = localStorage.mail_receivers;
        var canClean = localReceiver && checked.length;

        if(canClean){
            if(!window.confirm('清除所选联系人，确定吗？')){
                alertify.log('取消清除');
                return;
            }

            localReceiver = JSON.parse(localReceiver);

            checked.each(function(){
                var item = $(this);
                localReceiver.remove(item.val());
            });

            if(localReceiver.length){
                localStorage.mail_receivers = JSON.stringify(localReceiver);
            }
            else{
                delete localStorage.mail_receivers;
            }

            callback && callback();
        }
    },
    saveContacts: function(to){
        to = $.trim(to);
        var localReceiver = localStorage.mail_receivers,
            res = [],
            list;

        if(localReceiver){
            res = JSON.parse(localReceiver);
        }

        if(to.indexOf(',')){
            list = to.split(/\s*,\s*/);
            res.unshift.apply(res, list);
        }else{
            res.unshift(to);
        }

        markdown.common.unique(res);

        localStorage.mail_receivers = JSON.stringify(res);
    },
    showDialog: function(){
        if(!this.checkSetting()) return;

        var that = this;
        $.artDialog({
            title: '发送邮件',
            lock: true,
            resize: false,
            button: [
                {
                    value: '发 送',
                    callback: function() {
                        return that.send();
                    },
                    focus: true
                },
                {
                    value: '取 消',
                    callback: function() {
                        console.log('取消发送')
                    }
                }
            ],
            initialize: function(){
                markdown.dialog_commonInit();

                var dialogParent = $('.d-outer').parent();

                this.content($('#J-sendMail').html());
                dialogParent.hide();
                //$('#sendMailWrapper').parent().css('padding', 0);
                that.pushDefaultValue();
                that.listen();

                dialogParent.fadeIn(300);
            }
        });
    },
    beforeSend: function(){
        var reciveUsers = $('#mail_reciveUsers'),
            sendCC = $('#mail_sendCC'),
            reciveUsersVal = $.trim(reciveUsers.val()),
            sendCCVal = $.trim(sendCC.val()),
            subject = $('#mail_subject'),
            subjectVal = $.trim(subject.val()),
            reg_mailList = /[^\w\-\.@, ]/;

        // 收件人
        if(reciveUsersVal === '' || reg_mailList.test(reciveUsersVal)){
            reciveUsers.addClass('error').focus();
            return false;
        }else{
            reciveUsers.removeClass('error')
        }

        // 抄送
        if(sendCCVal !== '' && reg_mailList.test(sendCCVal)){
            sendCC.addClass('error').focus();
            return false;
        }else{
            sendCC.removeClass('error')
        }

        // 主题
        if(subjectVal === ''){
            subject.addClass('error').focus();
            return false;
        }else{
            subject.removeClass('error');
        }

        return true;
    },
    send: function(){
        if(!this.beforeSend()) return false;

        var localMemory = JSON.parse(localStorage.memory),
            mailSet = JSON.parse(localStorage.setting).mail,
            rockFlag = '\n<br><p style="color:#ccc;">本邮件由 <a style="color:#C0DAF5;" href="http://www.jsfor.com/project/rockmarkdown" target="_blank">Rock! MarkDown</a> 生成并发出</p>';

        var to = $.trim($('#mail_reciveUsers').val()),
            cc = $.trim($('#mail_sendCC').val()),
            from = '<' + mailSet.userName + '>',
            subject = $.trim($('#mail_subject').val()),
            sign = $.trim($('#mail_sign').val()), signHTML;

        if(mailSet.showName != ''){
            from = mailSet.showName + ' ' + from;
        }

        var frameContent = $('#showdown iframe').contents(),
            res = '<!DOCTYPE html>\n<html>\n<head>\n';

        res += frameContent.find('head').html() + '\n<\/head>\n<body>\n';
        res += frameContent.find('body').html();

        // 将签名转换为HTML内容 并插入邮件正文底部
        if(sign !== ''){
            var converser = new Showdown.converter({extensions: 'github'});
            signHTML = converser.makeHtml( sign );

            signHTML = markdown.filtHTML(signHTML);

            res += '\n\n' + signHTML;

            // 记住本次填写的签名
            localMemory['mail_sign'] = sign;
        }else{
            localMemory['mail_sign'] = '';
        }

        if(mailSet.flag === undefined || mailSet.flag){
            res += rockFlag;
        }

        res += '\n<\/body>\n<\/html>';

        // 开始发送邮件
        console.log('send mail ...');
        this.doSend({
            mail: {
                SMTP: mailSet.SMTP,
                SSL: mailSet.SSL === undefined ? true : mailSet.SSL,
                port: mailSet.port,
                userName: mailSet.userName,
                password: mailSet.password
            },
            info: {
                from: from,
                to: to,
                cc: cc,
                subject: subject,
                content: res
            }
        });

        localStorage.memory = JSON.stringify(localMemory);

        return true;
    },
    doSend: function(options, callback){
        //markdown.loading('show', '邮件发送中 ...');
        var mailSet = options.mail,
            mailInfo = options.info;
        console.log(options);
        var smtpTransport2 = nodeMailer.createTransport("SMTP", {
            host: mailSet.SMTP, // hostname
            secureConnection: mailSet.SSL, // use SSL
            port: mailSet.port, // port for secure SMTP
            auth: {
                user: mailSet.userName,
                pass: mailSet.password
            }
        });

        var sendMailOption = {
            from: mailInfo.from,
            to: mailInfo.to,
            subject: mailInfo.subject,
            html: mailInfo.content
        };

        if(mailInfo.cc){
            sendMailOption.cc = mailInfo.cc;
        }

        smtpTransport2.sendMail(sendMailOption, function(err, res){
            if(err){
                markdown.dialog('（︶︿︶） 邮件发送出错：\n' + err, 'button');
                return console.log('（︶︿︶） 邮件发送出错：' + err);
            }

            markdown.dialog('\\^o^/ 邮件发送成功！', 'button');
            console.log('\\^o^/ 邮件发送成功: ' + res.message);

            if(mailInfo.cc){
                init.saveContacts(mailInfo.to + ',' + mailInfo.cc);
            }else{
                init.saveContacts(mailInfo.to);
            }

            //markdown.loading('hide');
            callback && callback();
        });
    },
    test: function(){
        var SMTP = $.trim($('#smtp_hostName').val()),
            SSL = $('#useSSL').is(':checked'),
            port = $.trim($('#smtp_port').val()),
            userName = $.trim($('#smtp_userName').val()),
            password = $.trim($('#smtp_pass').val());

        var mailSetting = {
            mail: {
                SMTP: SMTP,
                SSL: SSL,
                port: port,
                userName: userName,
                password: password
            }
        };

        if(!this.checkSetting(mailSetting)){
            markdown.dialog('→_→ 请将邮件信息填写完整再测试~');
            return;
        }

        var testBtn = $('#J-sendTestMail');
        testBtn.val('测试邮件发送中...请稍候').attr('disabled', true);

        this.doSend({
            mail: mailSetting.mail,
            info: {
                from: '<' + userName + '>',
                to: userName,
                subject: '测试帐户设置成功！【Rock! MarkDown】',
                content: 'Hi:\r\n' +
                    '&nbsp;&nbsp;&nbsp;&nbsp;您正在使用Rock! MarkDown 编辑器进行帐户测试，这是一封测试邮件。'
            }
        }, function(){
            testBtn.val('测试账户设置').removeAttr('disabled');
        });
    }
};

module.exports = init;