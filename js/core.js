// core library for chaiproject framework
// created by @rushabh_mehta
// license: MIT
//


// utility functions
//
// Usage:
// $.rep("string with %(args)s", obj) // replace with values
// $.set_style(css)
// $.set_script(js)
// $.random(n)
// $.set_default(obj, key, value)
// $.is_email(txt)
// $('selector').classList() - get class list of the object

(function($) {
	// python style string replace
	$.index = 'index';
	$.rep = function(s, dict) {
		for(key in dict) {
		    var re = new RegExp("%\\("+ key +"\\)s", "g");
			s = s.replace(re, dict[key]);
		}
	    return s;
	}
	// import css / js files
	$.set_css = function(css) {
		$('head').append('<style type="text/css">'+css+'</style>')
	};
	$.set_js = function(js) {
		$('head').append('<script language="javascript">'+js+'</script>');
	};
	$.random = function(n) {
		return Math.ceil(Math.random()*n)-1;
	};
	$.set_default = function(d, k, v) {
		if(!d[k])d[k]=v;
	};
	$.is_email = function(txt) {
		return txt.search("[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?")!=-1;
	};
	$.fn.classList = function() {
		return this.attr('class').split(/\s+/);
	}
	$.call = function(opts) {
		if(!opts.type) opts.type = 'GET';
		if(!opts.data) opts.data = {};
		
		opts.data._method = opts.method;
		$.ajax({
			url:'server/',
			type: opts.type || 'GET',
			data: opts.data,
			dataType: 'json',
			success: function(data) {
				if(data.error) {
					console.log('Error:' + data.error);
				}
				if(data.log) {
					console.log(data.log);
				}
				opts.success(data);
			}
		});
	}
})(jQuery);

// $.require
// http://plugins.jquery.com/project/require
//
// Usage: $.require('path/to/js')
(function($) {
	$.require = function(file, params) {
		var extn = file.split('.').slice(-1);
		if(!params) params = {};
		
		// get from localstorage if exists
		if(localStorage && localStorage[file]) {
			extn == 'js' && $.set_js(localStorage[file]) || $.set_css(localStorage[file]);
			$._require_loaded[file] = true;
			return $;
		}
		
		if (!$._require_loaded[file]) {
			xhr = $.ajax({
				type: "GET",
				url: file,
				success: params.callback || null,
				dataType: extn=="js" ? "script" : "text",
				cache: params.cache===false?false:true,
				async: false
			});
			$._require_loaded[file] = true;
			
			// js loaded automatically
			if(extn=="css") {
				$.set_css(xhr.responseText);
			}
			
			// add to localStorage
			if(localStorage) localStorage[file] = xhr.responseText;
		}
		return $;
	};
	$._require_loaded = {};
})(jQuery);


// object store wrapper
//
// Usage:
// $.objstore.get(type, name, callback)
// $.objstore.post(obj, callback)
$.objstore = {
	data: {},
	set: function(obj) {
		var d = $.objstore.data;
		if(!d[obj.type])
			d[obj.type] = {}
		d[obj.type][obj.name] = obj;
	},
	get:function(type, name, success, error) {
		var d = $.objstore.data;
		if(d[type] && d[type][name]) {
			success(d[type][name]);
		} else {
			$.call({
				method:"lib.py.objstore.get", 
				data: {"type":type, "name":name}, 
				success: function(obj) {
					if(obj.error) {
						error(obj); 
						return;
					} else {
						$.objstore.set(obj);
						success(obj);					
					}
				}
			});
		}
	},
	insert: function(obj, success) {
		$.objstore.post(obj, success, 'insert');
	},
	update: function(obj, success) {
		$.objstore.post(obj, success, 'update');
	},
	post: function(obj, success, insert_or_update) {
		$.call({
			type: 'POST',
			method: 'lib.py.objstore.' + (insert_or_update || 'insert'),
			data: {obj: JSON.stringify(obj)},
			success: function(response) {
				if(response._log) {
					console.log(response._log);
				}
				success(response);
			}
		});		
	},
	clear: function(type, name) {
		if(d[type] && d[type][name])
			delete d[type][name];
	}
}


// view
// called internally 
// when the hash url is changed
//
// Usage:
// $.view.open(route)
$.view = {
	pages: {},
	type: function(html) {
		if(html.search(/<\!--\s*type:\s*modal\s*-->/)!=-1) {
			return 'modal';
		} else if(html.search(/<\!--\s*type:\s*script\s*-->/)!=-1) {
			return 'script'
		} else {
			return 'page';
		}
	},
	load: function(name, path, callback) {
		if(!$('#'+name).length) {
			if(path) 
				$.view.load_files(name, path, callback);
			else
				$.view.load_object(name, callback);
		}
		callback();
	},
	load_files: function(name, path, callback) {
		var extn = path.split('.').splice(-1)[0];
		if(extn=='js') {
			$.getScript(path, callback);
		} else {
			$.get(path, function(html) {
				switch($.view.type(html)) {
					case 'modal': 
						$.view.make_modal(name, html)
						break;
					case 'page':
						$.view.make_page(name, html);
				}
				callback();
			});
		}
		
	},
	make_modal: function(name, html) {
		$(document.body).append(html);
		$('#'+name).bind('hidden', function() {
			window.history.back();
		})
	},
	make_page: function(name, html, js, css) {
		$('<div>')
			.addClass('content')
			.attr('id', name)
			.appendTo('.main.container')
			.html(html);
			
		if(js) $.set_script(js);
		if(css) $.set_style(css);
		
		$("#"+name).trigger('_make');		
	},
	load_object: function(name, callback) {
		$.objstore.get("page", name, 
			function(obj) {
				$.view.make(obj.name, obj.html, obj.js, obj.css);
				callback();
			}
		);
	},
	show: function(name, path) {
		$.view.load(name, path, function() {
			// make page active
			if($("#"+name).length) {
				if($(".main.container .content#" + name).length) {
					$(".main.container .content.active").removeClass('active');
					$("#"+name).addClass('active');					
				}
			}
			$("#"+name).trigger('_show');
			window.scroll(0, 0);
		});
	},
	
	// get view id from the given route
	// route may have sub-routes separated
	// by `/`
	// e.g. "editpage/mypage"
	get_view_id: function(txt) {
		if(txt[0]=='#') { txt = txt.substr(1); }
		if(txt[0]=='!') { txt = txt.substr(1); }
		txt = txt.split('/')[0];
		if(!txt) txt = $.index;
		return txt;		
	},

	// set location hash
	// if it is not set to the current id
	set_location_hash: function(viewid) {
		var hash = decodeURIComponent(location.hash).split('/')[0];
		
		// add hash on both sides!
		if(hash[0]!='#') hash = '#' + hash;
		if(viewid[0]!='#') viewid = '#' + viewid;
		
		if(hash!=viewid) {
			location.hash = viewid;
		}
	},
	
	open: function(name) {
		var viewid = $.view.get_view_id(name);		
		var viewinfo = $._views[viewid] || {};
		
		$.view.show(viewid, viewinfo.path);
		$.view.set_location_hash(viewid);
	}
}

// bind history change to open
$(window).bind('hashchange', function() {
	$.view.open(decodeURIComponent(location.hash));
});

// logout
// logs out user and reload the page
//
// Usage:
// $.logout();
//    triggers $(document)->logout event
(function($) {
	$.logout = function() {
		$.call({
			method:'lib.py.session.logout',
			type:'POST', 
			success: function(data) {
				$.session = {"user":"guest" ,"userobj":{}}
				$(document).trigger('logout');
			}
		});
		return false;
	}
})(jQuery);

// login
// loads session from server
// and calls $(document)->'login' event
//
$.call({
	method:'lib.py.session.load', 
	success:function(session) {
		$.session = session
		// trigger login
		$(document).trigger('login');
	}
})


// setup pages
// 1. load session
// 2. open default page
// 3. convert hardlinks to softlinks: 
//    eg. file.html becomes #files
$(document).ready(function() {	
	// clear localStorage if version changed
	if(localStorage) {
		if(app.version==-1) 
			localStorage.clear();
		if(localStorage._version && localStorage._version != app.version) {
			localStorage.clear();
		}
	} 
	localStorage._version = app.version;
	
	// open default page
	(function() {
		$content = $('.main.container .content.active');
		if($content.length) {
			// active content is already loaded, just highlight it
			$content.trigger('_show');
		} else {
			$.view.open(location.hash || $.index);
		}
	})()

	// hardlinks to softlinks
	$("body").delegate("a", "click", function() {
		var href = $(this).attr('href');
		if(href && 
			href.substr(0,1)!='#' &&
			href.indexOf('.html')!=-1) {
			location.href = '#' + href.substr(0, href.length-5);
			return false;
		}
		return true;
	})	
});

// app namespace for app globals
var app = {	}

$._views = {
	'editpage': {path:'lib/views/editpage.html'},
	'editprofile': {path:'lib/views/editprofile.js'},
	'register': {path:'lib/views/register.js'},
	'signin': {path:'lib/views/signin.html'},
	'upload': {path:'lib/views/upload.html'},
	'pagelist': {path:'lib/views/pagelist.html'},
	'filelist': {path:'lib/views/filelist.html'},
	'userlist': {path:'lib/views/userlist.html'}
}
