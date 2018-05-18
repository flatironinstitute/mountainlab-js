require('./ml-layout.css');

var sample_html=require('./sample.html');
var MLSCore=require('./mlscore/mlscore.js');
var jsutils=require('./mlscore/jsutils/jsutils.js');
var Authenticate=require('./authenticate.js').Authenticate;
var AltMLSOverviewWindow=require('./widgets/altmlsoverviewwindow.js').AltMLSOverviewWindow;
var AltMLSMainWindow=require('./widgets/altmlsmainwindow.js').AltMLSMainWindow;
var MLWorkspaceMainWindow=require('./widgets/mlworkspacemainwindow.js').MLWorkspaceMainWindow;

$(document).ready(function() {
  var query=parse_url_params();
  main(query);
});


function main(query) {

    // The url query
    query=query||{};

    // Determine whether we are in local mode (i.e., whether we launched this as a desktop Qt GUI)
    var local_mode=(window.mlpipeline_mode=='local'); 

    // Determine whether we are running on localhost (development mode)
    var on_localhost=jsutils.starts_with(window.location.href,'http://localhost');

    if (!local_mode) {
        // Switch to https protocol if needed
        if ((!on_localhost)&&(location.protocol != 'https:')) {
            location.href = 'https:' + window.location.href.substring(window.location.protocol.length);
        }
    }

    var mls_manager=new MLSCore.MLSManager();
    var mls_config=mls_manager.mlsConfig();

    //Set up the DocStorClient, which will either be directed to localhost or the heroku app, depending on how we are running it.
    var DSC=new MLSCore.DocStorClient();
    var docstor_url=mls_config.docstor_url;
    DSC.setDocStorUrl(docstor_url);
    mls_manager.setDocStorClient(DSC);

    function clear_status() {
    	$('body').find('#status_message').remove();
    }
    function show_status(alert_type,message) {
    	clear_status();
    	if (!alert_type) return;
    	var status_message=$('<span id=status_message></span>');
    	$('body').append(status_message);
        status_message.empty();
        if (alert_type) {
            var elmt=$(`<div class="alert alert-${alert_type}">${message}</div>`);
            status_message.append(elmt);
        }
    }
    show_status('info','Logging in...');

    Authenticate({passcode:query.passcode||'',login_method:query.login||''},function(err,login_info) {
        if (err) {
            show_status('warning','Error logging in: '+err);
            return;
        }
        mls_manager.setLoginInfo(login_info);
        DSC.login(login_info,function(err00,result) {
            if (err00) {
                show_status('warning','Error logging in to DocStor: '+err00);
                return;
            }
            show_status(null);
            
            login_info.user_id=result.user_id||'';
            mls_manager.setLoginInfo(login_info);

            var overview_window=null;
            var main_window=null;

            $(window).bind('beforeunload',function() {
                if (main_window) {
                    if (main_window.isDirty()) {
                        return 'Are you sure you want to close without saving changes?';
                    }
                }
            });

            var storage_method=query.storage||'';
            if (!storage_method) {
                if (query.owner) storage_method='docstor';
            }
            if (storage_method=='docstor') {
                DSC.login(login_info,function(err1) {
                    if (err1) {
                        show_status('warning','Error logging in to docstor: '+err1);
                        return;       
                    }
                    if (jsutils.ends_with(query.title,'.mls'))
                    	open_study({storage:'docstor',owner:query.owner,title:query.title});
                    else if (jsutils.ends_with(query.title,'.mlw'))
                    	open_workspace({storage:'docstor',owner:query.owner,title:query.title});
                    else {
                    	show_status('warning','Unexpected file extension: '+query.title);
                        return;       	
                    }
                });
            }
            else {
                show_status(null);
                create_new_overview_window();
                //overview_window.showFullBrowser();
                $('body').append(overview_window.div());
                if (query.mode=='devel') {
                	$('#workspace_stuff').css({visibility:''});
                }
                if (query.mode=='devel') {
                    $('.devel').css({visibility:''});
                }
            }

            function remove_overview_and_main_windows() {
                if (overview_window) {
                    overview_window.div().remove();
                    overview_window=null;
                }
                if (main_window) {
                    main_window.div().remove();
                    main_window=null;
                }
            }

            function create_new_overview_window() {
                remove_overview_and_main_windows();
                overview_window=new AltMLSOverviewWindow();
                overview_window.setMLSManager(mls_manager);
                overview_window.setDocStorClient(DSC);
                overview_window.setLoginInfo(login_info);
                overview_window.refresh();
                JSQ.connect(overview_window,'log_in',overview_window,do_log_in);
                JSQ.connect(overview_window,'open_study',null,function(sender,args) {
                    open_study(args.study);
                });
                JSQ.connect(overview_window,'open_workspace',null,function(sender,args) {
                    open_workspace(args.workspace);
                });
                reset_url();
            }

            function create_new_main_window(window_type) {
                remove_overview_and_main_windows();
                if (window_type=='study')
                	main_window=new AltMLSMainWindow(null);
                else
                	main_window=new MLWorkspaceMainWindow(null);
                main_window.setMLSManager(mls_manager);
                JSQ.connect(main_window,'log_in',main_window,do_log_in);
                JSQ.connect(main_window,'goto_overview',null,function() {
                    //main_window.hide();
                    main_window.div().remove();
                    show_status(null);
                    create_new_overview_window();
                    //overview_window.showFullBrowser();
                    $('body').append(overview_window.div());
                    if (query.mode=='devel') {
	                	$('#workspace_stuff').css({visibility:''});
	                }
                    if (query.mode=='devel') {
                        $('.devel').css({visibility:''});
                    }
                });
                JSQ.connect(main_window,'new_study',null,function() {
                    //main_window.hide();
                    main_window.div().remove();
                    show_status(null);
                    mls_manager.clear();
                    create_new_main_window('study');
                    show_status('','');
                    //main_window.showFullBrowser();
                    $('body').append(main_window.div());
                    if (query.mode=='devel') {
                        $('.devel').css({visibility:''});
                    }
                });
                JSQ.connect(main_window,'new_workspace',null,function() {
                    //main_window.hide();
                    main_window.div().remove();
                    show_status(null);
                    mls_manager.clear();
                    create_new_main_window('workspace');
                    show_status('','');
                    //main_window.showFullBrowser();
                    $('body').append(main_window.div());
                    if (query.mode=='devel') {
                        $('.devel').css({visibility:''});
                    }
                });
            }

            function reset_url() {
                var query=parse_url_params0();
                var querystr='';
                if ('login' in query) {
                    querystr+='login='+query.login;
                }
                if ('passcode' in query) {
                    querystr+='&passcode='+query.passcode;
                }
                if ('mode' in query) {
                    querystr+='&mode='+query.mode;
                }
                try {
                    history.pushState(null, null, '?'+querystr);
                }
                catch(err) {
                    console.log ('Unable to update url');
                }

                function parse_url_params0() {
                    var match,
                    pl     = /\+/g,  // Regex for replacing addition symbol with a space
                    search = /([^&=]+)=?([^&]*)/g,
                    decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
                    query  = window.location.search.substring(1);
                    url_params = {};
                    while (match = search.exec(query))
                        url_params[decode(match[1])] = decode(match[2]);
                    return url_params;
                }
            }

            function do_log_in() {
                Authenticate({},function(err1,login_info2) {
                    if (err1) {
                        alert('Error authenticating: '+err1);
                        return;
                    }
                    login_info=login_info2;
                    DSC.login(login_info2,function(err2,result) {
                        if (err2) {
                            alert('Error logging in to docstor: '+err2);
                            return;
                        }
                        login_info2.user_id=result.user_id||'';
                        if (overview_window) overview_window.setLoginInfo(login_info2);
                        mls_manager.setLoginInfo(login_info2);
                    });
                });
            }

            function open_workspace(workspace0) {
            	open_study(workspace0,'workspace');
            }

            function open_study(study0,mode) {
            	mode=mode||'study';
                if (overview_window) {
                	//overview_window.hide();
                	overview_window.div().remove();
                }
                show_status('info','Opening '+mode+'...');
                if (!study0.storage) study0.storage='docstor';

                if (study0.storage=='docstor') {
                    mls_manager.clear();
                    show_status('info','Opening '+mode+' from docstor...');
                    create_new_main_window(mode);
                    main_window.loadFromDocStor(study0.owner,study0.title,function(err) {
                        if (err) {
                            show_status('warning',err);
                            return;
                        }
                        show_status('','');
                        //main_window.showFullBrowser();
                        $('body').append(main_window.div());
                        if (query.mode=='devel') {
                            $('.devel').css({visibility:''});
                        }
                    });
                }
                else {
                    alert('Unexpected storage method: '+study0.storage);
                }
            }
        });
    });
}

var JSQWidget=require('./mlscore/jsqcore/jsqwidget.js').JSQWidget;

function MessageWidget(O) {
    O=O||this;
    JSQWidget(O);
    O.div().addClass('MessageWidget');

    this.setMessage=function(msg) {m_message=msg; refresh();};
    this.setSubmessage=function(msg) {m_submessage=msg; refresh();};
    this.message=function() {return m_message;};
    this.submessage=function() {return m_submessage;};

    var m_message='';
    var m_submessage;

    function refresh() {
        O.div().html('<h2>'+m_message+'</h2><h3>'+m_submessage+'</h3>');
    }
}

var s_message_widget=new MessageWidget();
function show_full_browser_message(msg,submessage) {
    var X=s_message_widget;
    X.setMessage(msg);
    X.setSubmessage(submessage);
    X.showFullBrowser();
}

function try_parse_json(str) {
    try {
        return JSON.parse(str);
    }
    catch(err) {
        return null;
    }
}

function ends_with(str,str2) {
    return (str.slice(str.length-str2.length)==str2);
}

//window.callbacks={};
//var s_last_cb_code=0;

function parse_url_params() {
	var match;
	var pl     = /\+/g;  // Regex for replacing addition symbol with a space
	var search = /([^&=]+)=?([^&]*)/g;
	var decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); };
	var query  = window.location.search.substring(1);
	var url_params = {};
	while (match = search.exec(query))
		url_params[decode(match[1])] = decode(match[2]);
	return url_params;
}
