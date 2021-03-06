/*
View Management
---------------

Manages opening of "Pages" via location.hash (url fragment). Pages can be changed by
changing location.hash or calling:

chai.view.open('page/param')
*/


chai.view = {
	pages: {},
	// sets location.hash
	open: function(route) {
		if(!route) return;
		if(route[0]!='#') route = '#' + route;
		window.location = route;
	},
	// shows view from location.hash
	show_location_hash: function() {
		var route = location.hash;
		if(route=='#') return;
		var viewid = chai.view.get_view_id(route);		

		// go to home if not "index"
		if(viewid=='index' && $.index!='index') {
			viewid = $.index;
		}
		if(route==chai.view.route) {
			// no change
			return;
		}
		chai.view.current_route = location.hash;
		
		var viewinfo = app.views[viewid] || {};
		chai.view.show(viewid, viewinfo.path);
	},	
	show: function(name, path) {
		chai.view.load(name, path, function() {
			// make page active
			var curpage = $("#main .content-wrap.active");
			if(curpage.length) {
				chai.view.pages[curpage.attr('id')].hide();
			}
			app.cur_page = chai.view.pages[name];
			app.cur_page.show();
			
			window.scroll(0, 0);
		});
	},
	load: function(name, path, callback) {
		if(chai.view.pages[name]) {
			callback();
		} else {
			if(path) 
				chai.view.load_files(name, path, callback);
			else
				chai.view.load_virtual(name, callback);			
		}
	},
	load_files: function(name, path, callback) {
		$.get(path, function(html) {
			chai.view.make_page({name:name, html:html}, callback);
		});
	},
	load_virtual: function(name, callback) {
		$.call({
			method: 'lib.chai.cms.page.content',
			data: {
				name: name,
			},
			success: function(data) {
				data.virtual = true;
				data.name = name;
				chai.view.make_page(data, callback);
			}
		});
	},
	make_page: function(obj, callback) {
		chai.view.pages[obj.name] = new PageView(obj);
		callback();
	},

	// get view id from the given route
	// route may have sub-routes separated
	// by `/`
	// e.g. "editpage/mypage"
	get_view_id: function(txt) {
		if(txt[0]=='#') { txt = txt.substr(1); }
		if(txt[0]=='!') { txt = txt.substr(1); }
		txt = txt.split('/')[0];
		if(!txt) txt = $.index || 'index';
		return txt;		
	},
	
	is_same: function(name) {
		if(name[0]!='#') name = '#' + name;
		return name==location.hash;
	}
}

// shortcut
chai.open = chai.view.open;

// bind history change to open
$(window).bind('hashchange', function() {
	chai.view.show_location_hash(decodeURIComponent(location.hash));
});
