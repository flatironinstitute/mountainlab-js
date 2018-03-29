exports.Authenticate=Authenticate;

var JSQWidget=require('./mlscore/mlscore.js').JSQWidget;

function Authenticate(opts,callback) {

	if (opts.passcode) {
		callback('',{passcode:opts.passcode});
		return;
	}
	if (opts.login_method=='google') {
		login_via_google();
		return;
	}
	else if (opts.login_method=='passcode') {
		login_via_passcode();
		return;
	}
	else if (opts.login_method=='anonymous') {
		login_as_anonymous();
		return;
	}

    var logindlg=require('./widgets/altmlloginwidget.html');
    var logindlgElement = $(logindlg).find('.ChooseLoginDlg').clone();
    var loggingIn = false
    $('body').append(logindlgElement)
    $(logindlgElement).find('#google').click(function(){
        loggingIn = true
        logindlgElement.modal('hide')
        login_via_google()
    })
    $(logindlgElement).find('#passcode').click(function(){
        loggingIn = true
        logindlgElement.modal('hide')
        login_via_passcode()
    })
    logindlgElement.on('hide.bs.modal', function(event) {
        if (loggingIn) return
        callback('', {})
    })
    logindlgElement.modal({show:true})

	function login_via_google() {
		var dlg=new GoogleLogInDlg();
		dlg.show(function(tmp) {
			var ret={
				google_id_token:tmp.id_token,
				google_profile:tmp.profile
			}
			callback('',ret);
		});	
	}

	function login_via_passcode() {
		var passcode0=prompt('Enter passcode:');
		callback('',{passcode:passcode0});
	}
}

function GoogleLogInDlg(O) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('GoogleLogInDlg');

	this.show=function(callback) {show(callback);};

	var m_dialog=$('<div id="dialog"></div>');
	var m_label='Sign in using Google';

	function show(callback) {
		//$.getScript("https://apis.google.com/js/platform.js",function() {
		$.getScript("https://apis.google.com/js/api:client.js",function() {
			gapi.load('auth2,signin2',function() {
				gapi.auth2.init({
					client_id: '272128844725-rh0k50hgthnphjnkbb70s0v1efjt0pq3.apps.googleusercontent.com'
				});
				O.div().append('<div id="google-signin2"></div>');
				O.setSize(450,300);

				var W=O.width();
				var H=O.height();
				m_dialog.css('overflow','hidden');
				m_dialog.append(O.div());
				$('body').append(m_dialog);
				m_dialog.dialog({width:W+20,
				              height:H+60,
				              resizable:false,
				              modal:true,
				              title:m_label});

				gapi.signin2.render('google-signin2',{
					onsuccess:on_success,
					onfailure:on_failure
				});
				function on_success(googleUser) {
					var profile = googleUser.getBasicProfile();
					var id_token = googleUser.getAuthResponse().id_token;
					var ret={profile:profile,id_token:id_token};
					O.emit('accepted',ret);
					m_dialog.dialog('close');
					if (callback) callback(ret);
				}
				function on_failure() {
					O.emit('rejected');
					m_dialog.dialog('close');
					if (callback) callback({});
				}
				
			});
		});
	}	
}

