require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var tokenizers=require('./tokenizers');
var normalizeTbl=null;
var setNormalizeTable=function(tbl,obj) {
	if (!obj) {
		obj={};
		for (var i=0;i<tbl.length;i++) {
			var arr=tbl[i].split("=");
			obj[arr[0]]=arr[1];
		}
	}
	normalizeTbl=obj;
	return obj;
}
var normalize1=function(token) {
	if (!token) return "";
	token=token.replace(/[ \n\.,，。！．「」：；、]/g,'').trim();
	if (!normalizeTbl) return token;
	if (token.length==1) {
		return normalizeTbl[token] || token;
	} else {
		for (var i=0;i<token.length;i++) {
			token[i]=normalizeTbl[token[i]] || token[i];
		}
		return token;
	}
}
var isSkip1=function(token) {
	var t=token.trim();
	return (t=="" || t=="　" || t=="※" || t=="\n");
}
var normalize_tibetan=function(token) {
	return token.replace(/[།་ ]/g,'').trim();
}

var isSkip_tibetan=function(token) {
	var t=token.trim();
	return (t=="" || t=="　" ||  t=="\n");	
}
var simple1={
	func:{
		tokenize:tokenizers.simple
		,setNormalizeTable:setNormalizeTable
		,normalize: normalize1
		,isSkip:	isSkip1
	}
	
}
var tibetan1={
	func:{
		tokenize:tokenizers.tibetan
		,setNormalizeTable:setNormalizeTable
		,normalize:normalize_tibetan
		,isSkip:isSkip_tibetan
	}
}
module.exports={"simple1":simple1,"tibetan1":tibetan1}
},{"./tokenizers":2}],2:[function(require,module,exports){
var tibetan =function(s) {
	//continuous tsheg grouped into same token
	//shad and space grouped into same token
	if (!s) return {tokens:[],offsets:[]};
	var offset=0;
	var tokens=[],offsets=[];
	s=s.replace(/\r\n/g,'\n').replace(/\r/g,'\n');
	var arr=s.split('\n');

	for (var i=0;i<arr.length;i++) {
		var last=0;
		var str=arr[i];
		str.replace(/[།་ ]+/g,function(m,m1){
			tokens.push(str.substring(last,m1)+m);
			offsets.push(offset+last);
			last=m1+m.length;
		});
		if (last<str.length) {
			tokens.push(str.substring(last));
			offsets.push(offset+last);
		}
		if (i===arr.length-1) break;
		tokens.push('\n');
		offsets.push(offset+last);
		offset+=str.length+1;
	}

	return {tokens:tokens,offsets:offsets};
};
var isSpace=function(c) {
	return (c==" ") ;//|| (c==",") || (c==".");
}
var isCJK =function(c) {return ((c>=0x3000 && c<=0x9FFF) 
|| (c>=0xD800 && c<0xDC00) || (c>=0xFF00) ) ;}
var simple1=function(s) {
	if (!s) return {tokens:[],offsets:[]};
	var offset=0;
	var tokens=[],offsets=[];
	s=s.replace(/\r\n/g,'\n').replace(/\r/g,'\n');
	var arr=s.split('\n');

	var pushtoken=function(t,off) {
		var i=0;
		if (t.charCodeAt(0)>255) {
			while (i<t.length) {
				var c=t.charCodeAt(i);
				offsets.push(off+i);
				tokens.push(t[i]);
				if (c>=0xD800 && c<=0xDFFF) {
					tokens[tokens.length-1]+=t[i]; //extension B,C,D
				}
				i++;
			}
		} else {
			tokens.push(t);
			offsets.push(off);	
		}
	}
	for (var i=0;i<arr.length;i++) {
		var last=0,sp="";
		str=arr[i];
		str.replace(/[_0-9A-Za-z]+/g,function(m,m1){
			while (isSpace(sp=str[last]) && last<str.length) {
				tokens[tokens.length-1]+=sp;
				last++;
			}
			pushtoken(str.substring(last,m1)+m , offset+last);
			offsets.push(offset+last);
			last=m1+m.length;
		});

		if (last<str.length) {
			while (isSpace(sp=str[last]) && last<str.length) {
				tokens[tokens.length-1]+=sp;
				last++;
			}
			pushtoken(str.substring(last), offset+last);
			
		}		
		offsets.push(offset+last);
		offset+=str.length+1;
		if (i===arr.length-1) break;
		tokens.push('\n');
	}

	return {tokens:tokens,offsets:offsets};

};

var simple=function(s) {
	var token='';
	var tokens=[], offsets=[] ;
	var i=0; 
	var lastspace=false;
	var addtoken=function() {
		if (!token) return;
		tokens.push(token);
		offsets.push(i);
		token='';
	}
	while (i<s.length) {
		var c=s.charAt(i);
		var code=s.charCodeAt(i);
		if (isCJK(code)) {
			addtoken();
			token=c;
			if (code>=0xD800 && code<0xDC00) { //high sorragate
				token+=s.charAt(i+1);i++;
			}
			addtoken();
		} else {
			if (c=='&' || c=='<' || c=='?' || c=="," || c=="."
			|| c=='|' || c=='~' || c=='`' || c==';' 
			|| c=='>' || c==':' 
			|| c=='=' || c=='@'  || c=="-" 
			|| c==']' || c=='}'  || c==")" 
			//|| c=='{' || c=='}'|| c=='[' || c==']' || c=='(' || c==')'
			|| code==0xf0b || code==0xf0d // tibetan space
			|| (code>=0x2000 && code<=0x206f)) {
				addtoken();
				if (c=='&' || c=='<'){ // || c=='{'|| c=='('|| c=='[') {
					var endchar='>';
					if (c=='&') endchar=';'
					//else if (c=='{') endchar='}';
					//else if (c=='[') endchar=']';
					//else if (c=='(') endchar=')';

					while (i<s.length && s.charAt(i)!=endchar) {
						token+=s.charAt(i);
						i++;
					}
					token+=endchar;
					addtoken();
				} else {
					token=c;
					addtoken();
				}
				token='';
			} else {
				if (c==" ") {
					token+=c;
					lastspace=true;
				} else {
					if (lastspace) addtoken();
					lastspace=false;
					token+=c;
				}
			}
		}
		i++;
	}
	addtoken();
	return {tokens:tokens,offsets:offsets};
}
module.exports={simple:simple,tibetan:tibetan};
},{}],3:[function(require,module,exports){
var indexOfSorted = function (array, obj, near) { 
  var low = 0,
  high = array.length;
  while (low < high) {
    var mid = (low + high) >> 1;
    if (array[mid]===obj) return mid;
    array[mid] < obj ? low = mid + 1 : high = mid;
  }
  if (near) return low;
  else if (array[low]===obj) return low;else return -1;
};
var indexOfSorted_str = function (array, obj, near) { 
  var low = 0,
  high = array.length;
  while (low < high) {
    var mid = (low + high) >> 1;
    if (array[mid]===obj) return mid;
    //(array[mid].localeCompare(obj)<0) ? low = mid + 1 : high = mid;
    array[mid]<obj ? low=mid+1 : high=mid;
  }
  if (near) return low;
  else if (array[low]===obj) return low;else return -1;
};


var bsearch=function(array,value,near) {
	var func=indexOfSorted;
	if (typeof array[0]=="string") func=indexOfSorted_str;
	return func(array,value,near);
}
var bsearchNear=function(array,value) {
	return bsearch(array,value,true);
}

module.exports=bsearch;
},{}],4:[function(require,module,exports){
// Ksana Database Engine

//   2015/1/2 , 
//   move to ksana-database
//   simplified by removing document support and socket.io support
//   2015/5/18 , add RPC support, move common method to method.js

var localPool={};
var apppath="";
var bsearch=require("./bsearch");
var Kdb=require('ksana-jsonrom');
var kdbs=[]; //available kdb , id and absolute path
var strsep="\uffff";
var kdblisted=false;

var method=require("./method");


var createLocalEngine=function(kdb,opts,cb,context) {
	var engine={kdb:kdb, queryCache:{}, postingCache:{}, cache:{}, TOC:{} };
	if (typeof context=="object") engine.context=context;
	method.setup(engine);
	//speedy native functions
	if (kdb.fs.mergePostings) {
		engine.mergePostings=kdb.fs.mergePostings.bind(kdb.fs);
	}
	var setPreload=function(res) {
		engine.dbname=res[0].name;
		//engine.customfunc=customfunc.getAPI(res[0].config);
		engine.ready=true;
		method.hotfix_segoffset_before20150710(engine);
		method.buildSegnameIndex(engine);
	}
	var preload=method.getPreloadField(opts.preload);
	var opts={recursive:true};
	method.gets.apply(engine,[ preload, opts,function(res){
		setPreload(res);
		cb.apply(engine.context,[engine]);
	}]);
	return engine;
}

 //TODO delete directly from kdb instance
 //kdb.free();
var closeLocal=function(kdbid) {
	var engine=localPool[kdbid];
	if (engine) {
		engine.kdb.free();
		delete localPool[kdbid];
	}
}


var getLocalTries=function(kdbfn,cb) {
	kdbid=kdbfn.replace('.kdb','');
	var tries= ["./"+kdbid+".kdb"
	           ,"../"+kdbid+".kdb"
	];

	for (var i=0;i<kdbs.length;i++) {
		if (kdbs[i][0]==kdbid) {
			tries.push(kdbs[i][1]);
		}
	}
	return tries;;
}

var openLocalReactNative=function(kdbid,opts,cb,context) {

	if (kdbid.indexOf(".kdb")==-1) kdbid+=".kdb";
	new Kdb.open(kdbid,function(err,kdb){
		if (err) {
			cb.apply(context,[err]);
		} else {
			createLocalEngine(kdb,opts,function(engine){
				localPool[kdbid]=engine;
				cb.apply(context||engine.context,[0,engine]);
			},context);
		}
	});
}


var openLocalKsanagap=function(kdbid,opts,cb,context) {
	var kdbfn=kdbid;
	var tries=getLocalTries(kdbfn);

	for (var i=0;i<tries.length;i++) {
		if (fs.existsSync(tries[i])) {
			//console.log("kdb path: "+nodeRequire('path').resolve(tries[i]));
			var kdb=new Kdb.open(tries[i],function(err,kdb){
				if (err) {
					cb.apply(context,[err]);
				} else {
					createLocalEngine(kdb,opts,function(engine){
						localPool[kdbid]=engine;
						cb.apply(context||engine.context,[0,engine]);
					},context);
				}
			});
			return null;
		}
	}
	if (cb) cb.apply(context,[kdbid+" not found"]);
	return null;

}
var openLocalNode=function(kdbid,opts,cb,context) {
	var fs=require('fs');
	var tries=getLocalTries(kdbid);
	for (var i=0;i<tries.length;i++) {
		if (fs.existsSync(tries[i])) {

			new Kdb.open(tries[i],function(err,kdb){
				if (err) {
					cb.apply(context||engine.content,[err]);
				} else {
					createLocalEngine(kdb,opts,function(engine){
						localPool[kdbid]=engine;
						cb.apply(context||engine.context,[0,engine]);
					},context);
				}
			});
			return null;
		}
	}
	if (cb) cb.apply(context,[kdbid+" not found"]);
	return null;
}
var openLocalFile=function(file,opts,cb,context) {	
    var kdbid=file.name.substr(0,file.name.length-4);

		var engine=localPool[kdbid];
		if (engine) {
			cb(0,engine);
			return;
		}

		new Kdb.open(file,function(err,handle){
			createLocalEngine(handle,opts,function(engine){
				localPool[kdbid]=engine;
				cb.apply(context||engine.context,[0,engine]);
			},context);
		});
}

var openLocalHtml5=function(kdbid,opts,cb,context) {	
	var engine=localPool[kdbid];
	var kdbfn=kdbid;
	if (kdbfn.indexOf(".kdb")==-1) kdbfn+=".kdb";
	new Kdb.open(kdbfn,function(err,handle){
		if (err) {
			var remoteurl=window.location.origin+window.location.pathname+kdbid;
			if (kdbid.indexOf("/")>-1) remoteurl=window.location.origin+'/'+kdbid;
			return kde_remote(remoteurl,opts,cb,context);
			//cb.apply(context,[err]);
		} else {
			createLocalEngine(handle,opts,function(engine){
				localPool[kdbid]=engine;
				cb.apply(context||engine.context,[0,engine]);
			},context);
		}
	});
}

var kde_remote=require("./kde_remote");
//omit cb for syncronize open
var open=function(kdbid,opts,cb,context)  {
	if (typeof opts=="function") { //no opts
		if (typeof cb=="object") context=cb;
		cb=opts;
		opts={};
	}

	if (typeof File!=="undefined" && kdbid.constructor===File) {
		return openLocalFile(kdbid,opts,cb,context);
	}

	if (kdbid.indexOf("http")==0) {
		return kde_remote(kdbid,opts,cb,context);
	}
	
	var engine=localPool[kdbid];
	if (engine) {
		if (cb) cb.apply(context||engine.context,[0,engine]);
		return engine;
	}

	var platform=require("./platform").getPlatform();
	if (platform=="node-webkit" || platform=="node") {
		openLocalNode(kdbid,opts,cb,context);
	} else if (platform=="html5" || platform=="chrome"){
		openLocalHtml5(kdbid,opts,cb,context);		
	} else if (platform=="react-native") {
		openLocalReactNative(kdbid,opts,cb,context);	
	} else {
		openLocalKsanagap(kdbid,opts,cb,context);	
	}
}
var setPath=function(path) {
	apppath=path;
	console.log("set path",path)
}
//return kdb names in array of string
var enumKdb=function(cb,context){
	require("./listkdb")(function(files){
		kdbs=files;
		if (cb) cb.call(context, kdbs.map(function(k){return k[0]}) );
	});
}

//return object for each kdb
var listkdb=function(cb,context){
	if (API.rpc) {
		API.rpc.list({},function(databases){
			cb.call(context,databases);
		});
	} else {
		require("./listkdb")(function(files){
			var databases=files.map(function(k){
				var relpath=k[1].match( /([^\/]+?\/[^\/]+?)\.kdb/)[1];
				return {shortname:k[0],folder:relpath.split("/")[0],fullname:relpath};
			});
			cb.call(context,databases);
		});
	}
}

var API={open:open,setPath:setPath, close:closeLocal, enumKdb:enumKdb, bsearch:bsearch,
kdbs:kdbs,listkdb:listkdb};

var platform=require("./platform").getPlatform();
if (platform=="node-webkit" || platform=="node" || platform=="react-native") {
	enumKdb();
} else if (typeof io!=="undefined") {
	API.rpc=require("./rpc_kde"); //for browser only
}
module.exports=API;
},{"./bsearch":3,"./kde_remote":5,"./listkdb":6,"./method":7,"./platform":8,"./rpc_kde":10,"fs":undefined,"ksana-jsonrom":"ksana-jsonrom"}],5:[function(require,module,exports){
var pool={};
var strsep="\uffff";
var method=require("./method");
var verbose=false;

var getRemote=function(path,opts,cb) {

	if (typeof opts==="function") {
		cb=opts;
		opts={};
	}

	opts=opts||{};
	
	var $kde=require("./rpc_kde");

	var engine=this;
	var kdbid=engine.kdb;
	kdbid=kdbid.substr(window.location.origin.length+1).replace(".kdb","");	

	if (typeof opts=="function") {
		cb=opts;
		opts={recursive:false};
	}
	opts.recursive=opts.recursive||false;
	if (typeof path=="string") path=[path];

	if (path[0] instanceof Array) { //multiple paths
		var paths=[],output=[];
		for (var i=0;i<path.length;i++) {
			var cachepath=path[i].join(strsep);
			var data=engine.cache[cachepath];
			if (typeof data!="undefined") {
				paths.push(null);//  place holder for LINE 28
				output.push(data); //put cached data into output
			} else{
				engine.fetched++;
				paths.push(path[i]); //need to ask server
				output.push(null); //data is unknown yet
			}
		}
		//now ask server for unknown datum
		engine.traffic++;
		var newopts={recursive:!!opts.recursive, address:opts.address,
			key:paths,db:kdbid};
		$kde.get(newopts,function(datum){
			//merge the server result with cached 
			for (var i=0;i<output.length;i++) {
				if (datum[i] && paths[i]) {
					var cachekey=paths[i].join(strsep);
					engine.cache[cachekey]=datum[i];
					output[i]=datum[i];
				}
			}
			if (cb) cb.apply(engine.context,[output]);	
		});
	} else { //single path
		var cachepath=path.join(strsep);
		var data=engine.cache[cachepath];
		if (typeof data!="undefined") {
			if (cb) cb.apply(engine.context,[data]);
			return data;//in cache , return immediately
		} else {
			engine.traffic++;
			engine.fetched++;
			var opts={key:path,recursive:!!opts.recursive,db:kdbid};
			$kde.get(opts,function(data){
				engine.cache[cachepath]=data;
				if (cb) cb.apply(engine.context,[data]);	
			});
		}
	}
}

var createRemoteEngine=function(kdb,opts,cb,context) {

	var engine={kdb:kdb, queryCache:{}, postingCache:{}, cache:{}, TOC:{}, fetched:0, traffic:0};
	if (typeof context=="object") engine.context=context;
	method.setup(engine);
	engine.get=getRemote;

	var setPreload=function(res) {
		engine.dbname=res[0].name;
		//engine.customfunc=customfunc.getAPI(res[0].config);
		engine.ready=true;
		method.hotfix_segoffset_before20150710(engine);
		method.buildSegnameIndex(engine);
	}
	var preload=method.getPreloadField(opts.preload);
	var opts={recursive:true};
	if (verbose) console.time("preload Remote");
	method.gets.apply(engine,[ preload, opts,function(res){
		setPreload(res);
		if (verbose) console.timeEnd("preload Remote");
		cb.apply(engine.context,[engine]);
	}]);
	return engine;
}

var openRemote=function(kdbid,opts,cb,context) {
	if (typeof opts=="function") {
		cb=opts;
		context=cb;
		opts={};
	}

	var engine=pool[kdbid];
	if (engine) {
		if (cb) cb.apply(context||engine.context,[0,engine]);
		return engine;
	}
	if (verbose) console.log("open remote",kdbid);

	createRemoteEngine(kdbid,opts,function(engine){
		pool[kdbid]=engine;
		cb.apply(context||engine.context,[0,engine]);
	},context);

	pool[kdbid]=engine;
}

var close=function(kdbid) {
	var engine=pool[kdbid];
	if (engine) {
		delete pool[kdbid];
	}
}

module.exports=openRemote;
},{"./method":7,"./rpc_kde":10}],6:[function(require,module,exports){
/* return array of dbid and absolute path*/
//var html5fs=require("./html5fs");

var listkdb_html5=function(cb,context) {
	kfs.readDir(function(kdbs){
			cb.call(this,kdbs);
	},context||this);		
}
var listkdb_rpc=function() {
	var fs=require("fs");
	var path=require("path");
	var dir=process.cwd();
	var files=fs.readdirSync(dir);
	var output=filterkdb(files,dir);
	return output;
}
var filterkdb=function(files,parent){
	var output=[];
	var fs=require("fs");
	var path=require("path");
	files.map(function(f){
		var subdir=parent+path.sep+f;
		var stat=fs.statSync(subdir);
		if (stat.isDirectory()) {
			var subfiles=fs.readdirSync(subdir);
			for (var i=0;i<subfiles.length;i++) {
				var file=subfiles[i];
				var idx=file.indexOf(".kdb");
				if (idx>-1&&idx==file.length-4) {
					var fn=subdir+path.sep+file;
					fn=fn.replace(/\\/g,"/");
					output.push([ file.substr(0,file.length-4), fn]);
				}
			}
		}
	});
	return output;
}	

var listkdb_node=function(cb,context){
	var fs=require("fs");
	var path=require("path")
	var parent=path.resolve(process.cwd(),"..");
	var files=fs.readdirSync(parent);
	var output=filterkdb(files,parent);

	if (cb) cb.call(context,output);
	return output;
}
var fileNameOnly=function(fn) {
	var at=fn.lastIndexOf("/");
	if (at>-1) return fn.substr(at+1);
	return fn;
}
var listkdb_ksanagap=function(cb,context) {
	var output=[];

	var formatoutput=function(apps) {
		for (var i=0;i<apps.length;i++) {
			var app=apps[i];
			if (app.files) for (var j=0;j<app.files.length;j++) {
				var file=app.files[j];
				if (file.substr(file.length-4)==".kdb") {
					output.push([app.dbid,fileNameOnly(file)]);
				}
			}
		};	
		cb.call(context,output);	
	}
	if (kfs.listApps.length==1) {
		formatoutput(JSON.parse(kfs.listApps()));
	} else {
		kfs.listApps(function(apps){
			formatoutput(JSON.parse(apps));
		});
	}
}
var listkdb=function(cb,context) {
	var platform=require("./platform").getPlatform();
	var files=[];
	if (platform=="node" || platform=="node-webkit") {
		listkdb_node(cb,context);
	} else if (platform=="chrome") {
		listkdb_html5(cb,context);
	} else {
		listkdb_ksanagap(cb,context);
	}
}

listkdb.sync=listkdb_rpc;
module.exports=listkdb;
},{"./platform":8,"fs":undefined,"path":undefined}],7:[function(require,module,exports){
var bsearch=require("./bsearch");
var gets=function(paths,opts,cb) { //get many data with one call

	if (!paths) return ;
	if (typeof paths=='string') {
		paths=[paths];
	}
	var engine=this, output=[];

	var makecb=function(path){
		return function(data){
				if (!(data && typeof data =='object' && data.__empty)) output.push(data);
				engine.get(path,opts,taskqueue.shift());
		};
	};

	var taskqueue=[];
	for (var i=0;i<paths.length;i++) {
		if (typeof paths[i]=="null") { //this is only a place holder for key data already in client cache
			output.push(null);
		} else {
			taskqueue.push(makecb(paths[i]));
		}
	};

	taskqueue.push(function(data){
		output.push(data);
		cb.apply(engine.context||engine,[output,paths]); //return to caller
	});

	taskqueue.shift()({__empty:true}); //run the task
}


var localengine_get=function(path,opts,cb,context) {
	var engine=this;
	if (typeof opts=="function") {
		context=cb;
		cb=opts;
		opts={recursive:false};
	}
	if (!path) {
		if (cb) cb.apply(context,[null]);
		return null;
	}

	if (typeof cb!="function") {
		return engine.kdb.get(path,opts);
	}

	if (typeof path=="string") {
		return engine.kdb.get([path],opts,cb,context);
	} else if (typeof path[0] =="string") {
		return engine.kdb.get(path,opts,cb,context);
	} else if (typeof path[0] =="object") {
		return gets.apply(engine,[path,opts,cb,context]);
	} else {
		engine.kdb.get([],opts,function(data){
			cb.apply(context,[data]);//return top level keys
		},context);
	}
};	
var getFileRange=function(i) {
	var engine=this;

	var filesegcount=engine.get(["filesegcount"]);

	if (filesegcount) {
		if (i==0) {
			return {start:0,end:filesegcount[0]-1};
		} else {
			return {start:filesegcount[i-1],end:filesegcount[i]-1};
		}
	}
	//old buggy code
	var filenames=engine.get(["filenames"]);
	var fileoffsets=engine.get(["fileoffsets"]);
	var segoffsets=engine.get(["segoffsets"]);
	var segnames=engine.get(["segnames"]);
	var filestart=fileoffsets[i], fileend=fileoffsets[i+1]-1;

	var start=bsearch(segoffsets,filestart,true);
	//if (segOffsets[start]==fileStart) start--;
	
	//work around for jiangkangyur
	//while (segNames[start+1]=="_") start++;

  //if (i==0) start=0; //work around for first file
	var end=bsearch(segoffsets,fileend,true);
	return {start:start,end:end};
}

var absSegToFileSeg=function(absoluteseg) {
	var filesegcount=this.get("filesegcount");
	var s=absoluteseg;
	var file=0;
	while (s>=filesegcount[file]) {
		file++;
	}
	if (file) {
		s=Math.abs(filesegcount[file-1]-s);	
	} else {
		s=absoluteseg;
	}
	
	return {file:file,seg:s};
}

var fileSegToAbsSeg=function(file,seg) {
	if (file==0)return seg;
	return this.get("filesegcount")[file-1]+(seg);
}

//var vposToFileSeg=function(engine,vpos) {
//    var segoffsets=engine.get("segoffsets");
//    var fileoffsets=engine.get(["fileoffsets"]);
//    var segnames=engine.get("segnames");
//    var fileid=bsearch(fileoffsets,vpos+1,true);
//    fileid--;
//    var segid=bsearch(segoffsets,vpos+1,true);
//	var range=engine.getFileRange(fileid);
//	segid-=range.start;
//    return {file:fileid,seg:segid};
//}
var indexOfSorted_str = function (array, obj, near) { 
  var low = 0,
  high = array.length;
  while (low < high) {
    var mid = (low + high) >> 1;
    if (array[mid]==obj) return mid;
    (array[mid].localeCompare(obj)<0) ? low = mid + 1 : high = mid;
  }
  if (near) return low;
  else if (array[low]==obj) return low;else return -1;
};
var searchSeg=function(segname,near) {
	var i=bsearch(this.get("segnames"),segname,near);
	if (i>-1) {
		var fileseg=absSegToFileSeg.apply(this,[i]);
		return {file:fileseg.file,seg:fileseg.seg,absseg:i};
	}
	return null;
}

//return array of object of nfile nseg given segname
var findSeg=function(segname,max) {
	meta=this.get("meta");
	if (meta.sortedSegNames) {
		return findSeg_sorted(segname);
	}
	var segnames=this.get("segnames");
	var out=[];
	for (var i=0;i<segnames.length;i++) {
		if (segnames[i]==segname) {
			var fileseg=absSegToFileSeg.apply(this,[i]);
			out.push({file:fileseg.file,seg:fileseg.seg,absseg:i});
			if (out.length>=max) break;
		}
	}
	return out;
}
var findFile=function(filename) {
	var filenames=this.get("filenames");
	for (var i=0;i<filenames.length;i++) {
		if (filenames[i]===filename) return i;
	}
	return -1;
}

var getFileSegOffsets=function(i) {
	var segoffsets=this.get("segoffsets");
	var range=getFileRange.apply(this,[i]);
	return segoffsets.slice(range.start,range.end+1);	
}
var absSegFromVpos=function(vpos) { 
	var segoffsets=this.get(["segoffsets"]);
	var i=bsearch(segoffsets,vpos,true);
	if (segoffsets[i]>vpos && segoffsets[i-1]<vpos) {
		return i-1;
	}
	return i;
}

var fileSegFromVpos=function(vpos) { 
	var seg=absSegFromVpos.call(this,vpos);
	return absSegToFileSeg.call(this,seg);
}
var fileSegToVpos=function(f,s) {
	var segoffsets=this.get(["segoffsets"]);
	var seg=fileSegToAbsSeg.call(this,f,s);
	return segoffsets[seg-1]||0;
}
var absSegToVpos=function(seg) {
	var segoffsets=this.get("segoffsets");
	return segoffsets[seg]||0;	
}
var getFileSegNames=function(i) {
	var range=getFileRange.apply(this,[i]);
	var segnames=this.get("segnames");
	return segnames.slice(range.start,range.end+1);
}

var getPreloadField=function(user) {
	var preload=[["meta"],["filenames"],["fileoffsets"],["segnames"],
	["segoffsets"],["filesegcount"]];

	//,["txtid"],["txtid_idx"],["txtid_invert"]];
	//["tokens"],["postingslen"] kse will load it

	if (user && user.length) { //user supply preload
		for (var i=0;i<user.length;i++) {
			if (preload.indexOf(user[i])==-1) {
				preload.push(user[i]);
			}
		}
	}
	return preload;
}


var segOffset=function(segname) {
	var engine=this;
	if (arguments.length>1) throw "argument : segname ";

	var segNames=engine.get("segnames");
	var segOffsets=engine.get("segoffsets");

	var i=segNames.indexOf(segname);
	return (i>-1)?segOffsets[i]:0;
}
var fileOffset=function(fn) {
	var engine=this;
	var filenames=engine.get("filenames");
	var offsets=engine.get("fileoffsets");
	var i=filenames.indexOf(fn);
	if (i==-1) return null;
	return {start: offsets[i], end:offsets[i+1]};
}

var folderOffset=function(folder) {
	var engine=this;
	var start=0,end=0;
	var filenames=engine.get("filenames");
	var offsets=engine.get("fileoffsets");
	for (var i=0;i<filenames.length;i++) {
		if (filenames[i].substring(0,folder.length)==folder) {
			if (!start) start=offsets[i];
			end=offsets[i];
		} else if (start) break;
	}
	return {start:start,end:end};
}
var getTOCNames=function() {
	return engine.get("meta").tocs;
}
var buildToc = function(toc) {
	if (!toc || !toc.length || toc.built) return;
	var depths=[];
 	var prev=0;
 	if (toc.length>1) {
 		toc[0].o=true;//opened
 	}
 	for (var i=0;i<toc.length;i++) delete toc[i].n;
	for (var i=0;i<toc.length;i++) {
	    var depth=toc[i].d||toc[i].depth;
	    if (prev>depth) { //link to prev sibling
	      if (depths[depth]) toc[depths[depth]].n = i;
	      for (var j=depth;j<prev;j++) depths[j]=0;
	    }
    	depths[depth]=i;
    	prev=depth;
	}
	toc.built=true;
	return toc;
}
var getDefaultTOC=function(opts,cb,context) {
	var toc=this.TOC["_"];
	if (toc) {
		cb.call(context,toc);
		return toc;
	}

	var out=[{t:"root",d:0,vpos:1}];
	var fileoffsets=this.get("fileoffsets");
	var segoffsets=this.get("segoffsets");
	var segnames=this.get("segnames");
	var filenames=this.get("filenames");
	var depth=1;
	//TODO , convert file folder structure to depth
	for (var i=0;i<filenames.length;i++){
		var fn=filenames[i];
		fn=fn.substr(0,fn.lastIndexOf("."));
		out.push({t:fn,d:depth, vpos:fileoffsets[i]});
		var range=getFileRange.apply(this,[i]);
		for (var j=range.start;j<range.end+1;j++) {
			out.push({t:segnames[j],d:depth+1, vpos:segoffsets[j-1]||1});
		}
	}
	this.TOC["_"]=out;
  cb.call(context,out);
	return out;		
}
var getTOC=function(opts,cb,context) {
	var engine=this;
	opts=opts||{};
	var tocname=opts.tocname;
	var rootname=opts.rootname||opts.tocname;
	if (!tocname) return getDefaultTOC.call(this,opts,cb,context);

	var toc=engine.TOC[tocname];
	if (toc) {
		cb.call(context,toc);
		return toc;
	}

	var keys=[["fields",tocname],["fields",tocname+"_depth"],["fields",tocname+"_vpos"]];
	engine.get(keys,{recursive:true},function(){
	  var texts=engine.get(["fields",tocname]);
	  var depths=engine.get(["fields",tocname+"_depth"]);
	  var vpos=engine.get(["fields",tocname+"_vpos"]);

	  var out=[{d:0,t:rootname}];
	  if (texts) for (var i=0;i<texts.length;i++) {
	    out.push({t:texts[i],d:depths[i], vpos:vpos[i]});
	  }

	  engine.TOC[tocname]=out;
	  out=buildToc(out);
	  cb.call(context,out);
	  return out; 		
	});
}

var nextSeg=function(segid) {
	var segnames=this.get(["segnames"]);
	var i=segnames.indexOf(segid);
	if (i>-1 && i<segnames.length) {
		return segnames[i+1];
	} else return segid;
}
var prevSeg=function(segid) {
	var segnames=this.get(["segnames"]);
	var i=segnames.indexOf(segid);
	if (i>0) {
		return segnames[i-1];
	} else return segid;
}
//return file seg of first txtid

var txt2absseg=function(txtid) {
	var absseg=this.txtid[txtid];
	if (!absseg) return null;
	if (typeof absseg[0]==="number") absseg=absseg[0];
	return absseg;
}
var txtid2fileSeg=function(txtid) {
	var absseg=txt2absseg.call(this,txtid);
	if (!absseg) return;
	return absSegToFileSeg.call(this,absseg);
}

var vpos2txtid=function(vpos){
	var absseg=this.absSegFromVpos(vpos);
	var segnames=this.get("segnames");
	return segnames[absseg];
}

var nextTxtid=function(txtid) {
	var absseg=txt2absseg.call(this,txtid);
	if (!absseg) return;
	var segnames=this.get("segnames");
	return segnames[absseg];
}
var prevTxtid=function(txtid) {
	var absseg=txt2absseg.call(this,txtid);
	if (!absseg) return;
	var segnames=this.get("segnames");
	return segnames[absseg-2];
}
var txtid2vpos=function(txtid) {
	var absseg=txt2absseg.call(this,txtid);
	if (!absseg) return;
	var segoffsets=this.get("segoffsets");
	return segoffsets[absseg];

}
var setup=function(engine) {
	engine.get=localengine_get;
	engine.segOffset=segOffset;
	engine.fileOffset=fileOffset;
	engine.folderOffset=folderOffset;
	engine.getFileSegNames=getFileSegNames;
	engine.getFileSegOffsets=getFileSegOffsets;
	engine.getFileRange=getFileRange;
	engine.findSeg=findSeg;
	engine.searchSeg=searchSeg;
	engine.findFile=findFile;
	engine.absSegToFileSeg=absSegToFileSeg;
	engine.fileSegToAbsSeg=fileSegToAbsSeg;
	engine.fileSegFromVpos=fileSegFromVpos;
	engine.absSegFromVpos=absSegFromVpos;
	engine.absSegToVpos=absSegToVpos;
	engine.fileSegToVpos=fileSegToVpos;
	engine.getTOC=getTOC;
	engine.getTOCNames=getTOCNames;
	engine.nextSeg=nextSeg;
	engine.prevSeg=prevSeg;
	engine.txtid2vpos=txtid2vpos;
	engine.vpos2txtid=vpos2txtid;
	engine.txtid2fileSeg=txtid2fileSeg;
	engine.nextTxtid=nextTxtid;
	engine.prevTxtid=prevTxtid;
}
var hotfix_segoffset_before20150710=function(engine) {
	var so=engine.get("segoffsets");
	if (so.length>2 && so[so.length-1]===so[so.length-2]) {
		so.unshift(1);
		so.pop();
		console.log("old segoffsets, better rebuild your kdb")
	}
}
var buildSegnameIndex=function(engine){
	/* replace txtid,txtid_idx, txtid_invert , save 400ms load time */
	var segnames=engine.get("segnames");
	var segindex={};
	for (var i=0;i<segnames.length;i++) {
		var segname=segnames[i];
		segindex[segname]=i;
	}
	engine.txtid=segindex;
}
module.exports={setup:setup,getPreloadField:getPreloadField,gets:gets
	,hotfix_segoffset_before20150710:hotfix_segoffset_before20150710
	,buildSegnameIndex:buildSegnameIndex};
},{"./bsearch":3}],8:[function(require,module,exports){
var getPlatform=function() {
	if (typeof ksanagap=="undefined") {
		try {
			require("react-native");
			platform="react-native";
		} catch (e) {
			if (typeof process=="undefined") {
				platform="chrome";
			} else {
				platform="node";		
			}
		}
	} else {
		platform=ksanagap.platform;
	}
	return platform;
}
module.exports={getPlatform:getPlatform};
},{"react-native":undefined}],9:[function(require,module,exports){
/*
	this is for browser, a simple wrapper for socket.io rpc
	
	for each call to server, create a unique id
	when server return, get the slot by unique id, and invoke callbacks.
*/
function GUID () {
  var S4 = function ()    {    return Math.floor(        Math.random() * 0x10000  ).toString(16);  };
  return (   S4() + S4() + "-" + S4() + "-" +  S4() + "-" + S4() + "-" +S4() + S4() + S4()    );
}

var RPCs={}; //*  key: unique calling id  */

var socket = io.connect(window.location.host);

var returnfromserver=function(res) {
	var slot=RPCs[res.fid];
	
	if (!slot) {
		throw "invalid fid "+res.fid;
		return;
	}
	
	if (res.success) {
		if (slot.successCB)  slot.successCB(res.err,res.response);
	} else {
		if (slot.errorCB)  slot.errorCB(res.err,res.response);
	}
	delete RPCs[res.fid]; //drop the slot
}

var pchost={
	exec: function(successCB, errorCB, service, action, params) {
		var fid=GUID();
		//create a slot to hold
		var slot={  fid:fid, successCB:successCB, errorCB:errorCB ,params:params, action:action, service:service};
		RPCs[fid]=slot;
		socket.emit('rpc',  { service: service, action:action, params: params , fid:fid });
	}
}

socket.on( 'rpc', returnfromserver );	 
window.host=pchost;
module.exports=pchost;
},{}],10:[function(require,module,exports){
var host=require("./rpc");

var makeinf=function(name) {
	return (
		function(opts,callback) {
			host.exec(callback,0,"kde",name,opts);
		});
}

var API={};
//TODO , create a cache object on client side to save network trafic on
//same getRaw
API.get=makeinf("get");
API.list=makeinf("list");

//API.closeAll=makeinf("closeAll");
//exports.version='0.0.13'; //this is a quick hack

host.exec(function(err,data){
	//console.log('version',err,data)
	exports.version=data;
},0,"kde","version",{});


module.exports=API;
},{"./rpc":9}],11:[function(require,module,exports){

/* emulate filesystem on html5 browser */
/* emulate filesystem on html5 browser */

var getFileSize=function(fn,cb) {
	var reader = new FileReader();
	reader.onload = function(){
		cb(reader.result.length);
	};
	reader.readAsDataURL(fn);
}
var read=function(handle,buffer,offset,length,position,cb) {//buffer and offset is not used
	var xhr = new XMLHttpRequest();
	xhr.open('GET', handle.url , true);
	var range=[position,length+position-1];
	xhr.setRequestHeader('Range', 'bytes='+range[0]+'-'+range[1]);
	xhr.responseType = 'arraybuffer';
	xhr.send();
	xhr.onload = function(e) {
		var that=this;
		setTimeout(function(){
			cb(0,that.response.byteLength,that.response);
		},0);
	}; 
}
var close=function(handle) {}
var fstatSync=function(handle) {
	throw "not implement yet";
}
var fstat=function(handle,cb) {
	throw "not implement yet";
}
var _openLocal=function(file,cb) {
	var handle={};
	handle.url=URL.createObjectURL(file);
	handle.fn=file.name.substr(file.name.indexOf("#")+1);
	handle.file=file;
	cb(handle);
}
var _open=function(fn_url,cb) {
		var handle={};
		if (fn_url.indexOf("filesystem:")==0){
			handle.url=fn_url;
			handle.fn=fn_url.substr( fn_url.lastIndexOf("/")+1);
		} else {
			handle.fn=fn_url;
			var url=API.files.filter(function(f){ return (f[0]==fn_url)});
			if (url.length) handle.url=url[0][1];
			else cb(null);
		}
		cb(handle);
}
var open=function(fn_url,cb) {
	if (typeof File !=="undefined" && fn_url.constructor ===File) {
		_openLocal.call(this,fn_url,cb);
		return;
	}

	if (!API.initialized) {init(1024*1024,function(){
		_open.apply(this,[fn_url,cb]);
	},this)} else _open.apply(this,[fn_url,cb]);
}
var load=function(filename,mode,cb) {
	open(filename,mode,cb,true);
}
function errorHandler(e) {
	console.error('Error: ' +e.name+ " "+e.message);
}
var readdir=function(cb,context) {
	 var dirReader = API.fs.root.createReader();
	 var out=[],that=this;
		dirReader.readEntries(function(entries) {
			if (entries.length) {
				for (var i = 0, entry; entry = entries[i]; ++i) {
					if (entry.isFile) {
						out.push([entry.name,entry.toURL ? entry.toURL() : entry.toURI()]);
					}
				}
			}
			API.files=out;
			if (cb) cb.apply(context,[out]);
		}, function(){
			if (cb) cb.apply(context,[null]);
		});
}
var initfs=function(grantedBytes,cb,context) {
	webkitRequestFileSystem(PERSISTENT, grantedBytes,  function(fs) {
		API.fs=fs;
		API.quota=grantedBytes;
		readdir(function(){
			API.initialized=true;
			cb.apply(context,[grantedBytes,fs]);
		},context);
	}, errorHandler);
}
var init=function(quota,cb,context) {
	navigator.webkitPersistentStorage.requestQuota(quota, 
			function(grantedBytes) {
				initfs(grantedBytes,cb,context);
		}, errorHandler 
	);
}


var API={
	read:read
	,readdir:readdir
	,open:open
	,close:close
	,fstatSync:fstatSync
	,fstat:fstat
	,getFileSize:getFileSize
}
module.exports=API;
},{}],12:[function(require,module,exports){
/*
	KDB version 3.0 GPL
	yapcheahshen@gmail.com
	2013/12/28
	asyncronize version of yadb

  remove dependency of Q, thanks to
  http://stackoverflow.com/questions/4234619/how-to-avoid-long-nesting-of-asynchronous-functions-in-node-js

  2015/1/2
  moved to ksanaforge/ksana-jsonrom
  add err in callback for node.js compliant
*/
var Kfs=null;

if (typeof ksanagap=="undefined") {
	try {
		require("react-native");
		Kfs=require("./kdbfs_ios");
	} catch(e) {
		Kfs=require('./kdbfs');	
	}			
} else {
	if (ksanagap.platform=="ios") {
		Kfs=require("./kdbfs_ios");
	} else if (ksanagap.platform=="node-webkit") {
		Kfs=require("./kdbfs");
	} else if (ksanagap.platform=="chrome") {
		Kfs=require("./kdbfs");
	} else {
		Kfs=require("./kdbfs_android");
	}
		
}


var DT={
	uint8:'1', //unsigned 1 byte integer
	int32:'4', // signed 4 bytes integer
	utf8:'8',  
	ucs2:'2',
	bool:'^', 
	blob:'&',
	utf8arr:'*', //shift of 8
	ucs2arr:'@', //shift of 2
	uint8arr:'!', //shift of 1
	int32arr:'$', //shift of 4
	vint:'`',
	pint:'~',	

	array:'\u001b',
	object:'\u001a' 
	//ydb start with object signature,
	//type a ydb in command prompt shows nothing
}
var verbose=0, readLog=function(){};
var _readLog=function(readtype,bytes) {
	console.log(readtype,bytes,"bytes");
}
if (verbose) readLog=_readLog;
var strsep="\uffff";
var Create=function(path,opts,cb) {
	/* loadxxx functions move file pointer */
	// load variable length int
	if (typeof opts=="function") {
		cb=opts;
		opts={};
	}

	
	var loadVInt =function(opts,blocksize,count,cb) {
		//if (count==0) return [];
		var that=this;

		this.fs.readBuf_packedint(opts.cur,blocksize,count,true,function(o){
			//console.log("vint");
			opts.cur+=o.adv;
			cb.apply(that,[o.data]);
		});
	}
	var loadVInt1=function(opts,cb) {
		var that=this;
		loadVInt.apply(this,[opts,6,1,function(data){
			//console.log("vint1");
			cb.apply(that,[data[0]]);
		}])
	}
	//for postings
	var loadPInt =function(opts,blocksize,count,cb) {
		var that=this;
		this.fs.readBuf_packedint(opts.cur,blocksize,count,false,function(o){
			//console.log("pint");
			opts.cur+=o.adv;
			cb.apply(that,[o.data]);
		});
	}
	// item can be any type (variable length)
	// maximum size of array is 1TB 2^40
	// structure:
	// signature,5 bytes offset, payload, itemlengths
	var getArrayLength=function(opts,cb) {
		var that=this;
		var dataoffset=0;

		this.fs.readUI8(opts.cur,function(len){
			var lengthoffset=len*4294967296;
			opts.cur++;
			that.fs.readUI32(opts.cur,function(len){
				opts.cur+=4;
				dataoffset=opts.cur; //keep this
				lengthoffset+=len;
				opts.cur+=lengthoffset;

				loadVInt1.apply(that,[opts,function(count){
					loadVInt.apply(that,[opts,count*6,count,function(sz){						
						cb({count:count,sz:sz,offset:dataoffset});
					}]);
				}]);
				
			});
		});
	}

	var loadArray = function(opts,blocksize,cb) {
		var that=this;
		getArrayLength.apply(this,[opts,function(L){
				var o=[];
				var endcur=opts.cur;
				opts.cur=L.offset;

				if (opts.lazy) { 
						var offset=L.offset;
						for (var i=0;i<L.sz.length;i++) {
							var sz=L.sz[i];
							o[o.length]=strsep+offset.toString(16)
								   +strsep+sz.toString(16);
							offset+=sz;
						};
				} else {
					var taskqueue=[];
					for (var i=0;i<L.count;i++) {
						taskqueue.push(
							(function(sz){
								return (
									function(data){
										if (typeof data=='object' && data.__empty) {
											 //not pushing the first call
										}	else o.push(data);
										opts.blocksize=sz;
										load.apply(that,[opts, taskqueue.shift()]);
									}
								);
							})(L.sz[i])
						);
					}
					//last call to child load
					taskqueue.push(function(data){
						o.push(data);
						opts.cur=endcur;
						cb.apply(that,[o]);
					});
				}

				if (opts.lazy) cb.apply(that,[o]);
				else {
					taskqueue.shift()({__empty:true});
				}
			}
		])
	}		
	// item can be any type (variable length)
	// support lazy load
	// structure:
	// signature,5 bytes offset, payload, itemlengths, 
	//                    stringarray_signature, keys
	var loadObject = function(opts,blocksize,cb) {
		var that=this;
		var start=opts.cur;
		getArrayLength.apply(this,[opts,function(L) {
			opts.blocksize=blocksize-opts.cur+start;
			load.apply(that,[opts,function(keys){ //load the keys
				if (opts.keys) { //caller ask for keys
					keys.map(function(k) { opts.keys.push(k)});
				}

				var o={};
				var endcur=opts.cur;
				opts.cur=L.offset;
				if (opts.lazy) { 
					var offset=L.offset;
					for (var i=0;i<L.sz.length;i++) {
						//prefix with a \0, impossible for normal string
						o[keys[i]]=strsep+offset.toString(16)
							   +strsep+L.sz[i].toString(16);
						offset+=L.sz[i];
					}
				} else {
					var taskqueue=[];
					for (var i=0;i<L.count;i++) {
						taskqueue.push(
							(function(sz,key){
								return (
									function(data){
										if (typeof data=='object' && data.__empty) {
											//not saving the first call;
										} else {
											o[key]=data; 
										}
										opts.blocksize=sz;
										if (verbose) readLog("key",key);
										load.apply(that,[opts, taskqueue.shift()]);
									}
								);
							})(L.sz[i],keys[i-1])

						);
					}
					//last call to child load
					taskqueue.push(function(data){
						o[keys[keys.length-1]]=data;
						opts.cur=endcur;
						cb.apply(that,[o]);
					});
				}
				if (opts.lazy) cb.apply(that,[o]);
				else {
					taskqueue.shift()({__empty:true});
				}
			}]);
		}]);
	}

	//item is same known type
	var loadStringArray=function(opts,blocksize,encoding,cb) {
		var that=this;
		this.fs.readStringArray(opts.cur,blocksize,encoding,function(o){
			opts.cur+=blocksize;
			cb.apply(that,[o]);
		});
	}
	var loadIntegerArray=function(opts,blocksize,unitsize,cb) {
		var that=this;
		loadVInt1.apply(this,[opts,function(count){
			var o=that.fs.readFixedArray(opts.cur,count,unitsize,function(o){
				opts.cur+=count*unitsize;
				cb.apply(that,[o]);
			});
		}]);
	}
	var loadBlob=function(blocksize,cb) {
		var o=this.fs.readBuf(this.cur,blocksize);
		this.cur+=blocksize;
		return o;
	}	
	var loadbysignature=function(opts,signature,cb) {
		  var blocksize=opts.blocksize||this.fs.size; 
			opts.cur+=this.fs.signature_size;
			var datasize=blocksize-this.fs.signature_size;
			//basic types
			if (signature===DT.int32) {
				opts.cur+=4;
				this.fs.readI32(opts.cur-4,cb);
			} else if (signature===DT.uint8) {
				opts.cur++;
				this.fs.readUI8(opts.cur-1,cb);
			} else if (signature===DT.utf8) {
				var c=opts.cur;opts.cur+=datasize;
				this.fs.readString(c,datasize,'utf8',cb);
			} else if (signature===DT.ucs2) {
				var c=opts.cur;opts.cur+=datasize;
				this.fs.readString(c,datasize,'ucs2',cb);	
			} else if (signature===DT.bool) {
				opts.cur++;
				this.fs.readUI8(opts.cur-1,function(data){cb(!!data)});
			} else if (signature===DT.blob) {
				loadBlob(datasize,cb);
			}
			//variable length integers
			else if (signature===DT.vint) {
				loadVInt.apply(this,[opts,datasize,datasize,cb]);
			}
			else if (signature===DT.pint) {
				loadPInt.apply(this,[opts,datasize,datasize,cb]);
			}
			//simple array
			else if (signature===DT.utf8arr) {
				loadStringArray.apply(this,[opts,datasize,'utf8',cb]);
			}
			else if (signature===DT.ucs2arr) {
				loadStringArray.apply(this,[opts,datasize,'ucs2',cb]);
			}
			else if (signature===DT.uint8arr) {
				loadIntegerArray.apply(this,[opts,datasize,1,cb]);
			}
			else if (signature===DT.int32arr) {
				loadIntegerArray.apply(this,[opts,datasize,4,cb]);
			}
			//nested structure
			else if (signature===DT.array) {
				loadArray.apply(this,[opts,datasize,cb]);
			}
			else if (signature===DT.object) {
				loadObject.apply(this,[opts,datasize,cb]);
			}
			else {
				console.error('unsupported type',signature,opts)
				cb.apply(this,[null]);//make sure it return
				//throw 'unsupported type '+signature;
			}
	}

	var load=function(opts,cb) {
		opts=opts||{}; // this will served as context for entire load procedure
		opts.cur=opts.cur||0;
		var that=this;
		this.fs.readSignature(opts.cur, function(signature){
			loadbysignature.apply(that,[opts,signature,cb])
		});
		return this;
	}
	var CACHE=null;
	var KEY={};
	var ADDRESS={};
	var reset=function(cb) {
		if (!CACHE) {
			load.apply(this,[{cur:0,lazy:true},function(data){
				CACHE=data;
				cb.call(this);
			}]);	
		} else {
			cb.call(this);
		}
	}

	var exists=function(path,cb) {
		if (path.length==0) return true;
		var key=path.pop();
		var that=this;
		get.apply(this,[path,false,function(data){
			if (!path.join(strsep)) return (!!KEY[key]);
			var keys=KEY[path.join(strsep)];
			path.push(key);//put it back
			if (keys) cb.apply(that,[keys.indexOf(key)>-1]);
			else cb.apply(that,[false]);
		}]);
	}

	var getSync=function(path) {
		if (!CACHE) return undefined;	
		var o=CACHE;
		for (var i=0;i<path.length;i++) {
			var r=o[path[i]];
			if (typeof r=="undefined") return null;
			o=r;
		}
		return o;
	}
	var get=function(path,opts,cb,context) {
		if (typeof path=='undefined') path=[];
		if (typeof path=="string") path=[path];
		//opts.recursive=!!opts.recursive;
		if (typeof opts=="function") {
			context=cb;
			cb=opts;
			opts={};
		}
		var context=context||this;
		var that=this;
		if (typeof cb!='function') return getSync(path);

		reset.apply(this,[function(){
			var o=CACHE;
			if (path.length==0) {
				if (opts.address) {
					cb.apply(context,[[0,that.fs.size]]);
				} else {
					cb.apply(context,[Object.keys(CACHE)]);
				}
				return;
			} 
			
			var pathnow="",taskqueue=[],newopts={},r=null;
			var lastkey="";

			for (var i=0;i<path.length;i++) {
				var task=(function(key,k){

					return (function(data){
						if (!(typeof data=='object' && data.__empty)) {
							if (typeof o[lastkey]=='string' && o[lastkey][0]==strsep) o[lastkey]={};
							o[lastkey]=data; 
							o=o[lastkey];
							r=data[key];
							KEY[pathnow]=opts.keys;								
						} else {
							data=o[key];
							r=data;
						}

						if (typeof r==="undefined") {
							taskqueue=null;
							cb.apply(context,[r]); //return empty value
						} else {							
							if (parseInt(k)) pathnow+=strsep;
							pathnow+=key;
							if (typeof r=='string' && r[0]==strsep) { //offset of data to be loaded
								var p=r.substring(1).split(strsep).map(function(item){return parseInt(item,16)});
								var cur=p[0],sz=p[1];
								newopts.lazy=!opts.recursive || (k<path.length-1) ;
								newopts.blocksize=sz;newopts.cur=cur,newopts.keys=[];
								lastkey=key; //load is sync in android
								if (opts.address && taskqueue.length==1) {
									ADDRESS[pathnow]=[cur,sz];
									taskqueue.shift()(null,ADDRESS[pathnow]);
								} else {
									load.apply(that,[newopts, taskqueue.shift()]);
								}
							} else {
								if (opts.address && taskqueue.length==1) {
									taskqueue.shift()(null,ADDRESS[pathnow]);
								} else {
									taskqueue.shift().apply(that,[r]);
								}
							}
						}
					})
				})
				(path[i],i);
				
				taskqueue.push(task);
			}

			if (taskqueue.length==0) {
				cb.apply(context,[o]);
			} else {
				//last call to child load
				taskqueue.push(function(data,cursz){
					if (opts.address) {
						cb.apply(context,[cursz]);
					} else{
						var key=path[path.length-1];
						o[key]=data; KEY[pathnow]=opts.keys;
						cb.apply(context,[data]);
					}
				});
				taskqueue.shift()({__empty:true});			
			}

		}]); //reset
	}
	// get all keys in given path
	var getkeys=function(path,cb) {
		if (!path) path=[]
		var that=this;

		get.apply(this,[path,false,function(){
			if (path && path.length) {
				cb.apply(that,[KEY[path.join(strsep)]]);
			} else {
				cb.apply(that,[Object.keys(CACHE)]); 
				//top level, normally it is very small
			}
		}]);
	}

	var setupapi=function() {
		this.load=load;
//		this.cur=0;
		this.cache=function() {return CACHE};
		this.key=function() {return KEY};
		this.free=function() {
			CACHE=null;
			KEY=null;
			this.fs.free();
		}
		this.setCache=function(c) {CACHE=c};
		this.keys=getkeys;
		this.get=get;   // get a field, load if needed
		this.exists=exists;
		this.DT=DT;
		
		//install the sync version for node
		//if (typeof process!="undefined") require("./kdb_sync")(this);
		//if (cb) setTimeout(cb.bind(this),0);
		var that=this;
		var err=0;
		if (cb) {
			setTimeout(function(){
				cb(err,that);	
			},0);
		}
	}
	var that=this;
	var kfs=new Kfs(path,opts,function(err){
		if (err) {
			setTimeout(function(){
				cb(err,0);
			},0);
			return null;
		} else {
			that.size=this.size;
			setupapi.call(that);			
		}
	});
	this.fs=kfs;
	return this;
}

Create.datatypes=DT;

if (module) module.exports=Create;
//return Create;

},{"./kdbfs":13,"./kdbfs_android":14,"./kdbfs_ios":15,"react-native":undefined}],13:[function(require,module,exports){
/* node.js and html5 file system abstraction layer*/
try {
	var fs=require("fs");
	var Buffer=require("buffer").Buffer;
} catch (e) {
	var fs=require('./html5read');
	var Buffer=function(){ return ""};
	var html5fs=true; 	
}
var signature_size=1;
var verbose=0, readLog=function(){};
var _readLog=function(readtype,bytes) {
	console.log(readtype,bytes,"bytes");
}
if (verbose) readLog=_readLog;

var unpack_int = function (ar, count , reset) {
   count=count||ar.length;
  var r = []
  //var r=new Uint32Array(count);
  var i = 0, v = 0,n=0;
  do {
	var shift = 0;
	do {
	  v += ((ar[i] & 0x7F) << shift);
	  shift += 7;	  
	} while (ar[++i] & 0x80);
	r.push(v);
	//r[n++]=v;
	if (reset) v=0;
	count--;
  } while (i<ar.length && count);

  //var rr=r.subarray(0,n);
  return {data:r, adv:i };
}
var Open=function(path,opts,cb) {
	opts=opts||{};

	var readSignature=function(pos,cb) {
		var buf=new Buffer(signature_size);
		var that=this;
		fs.read(this.handle,buf,0,signature_size,pos,function(err,len,buffer){
			if (html5fs) var signature=String.fromCharCode((new Uint8Array(buffer))[0])
			else var signature=buffer.toString('utf8',0,signature_size);
			cb.apply(that,[signature]);
		});
	}

	//this is quite slow
	//wait for StringView +ArrayBuffer to solve the problem
	//https://groups.google.com/a/chromium.org/forum/#!topic/blink-dev/ylgiNY_ZSV0
	//if the string is always ucs2
	//can use Uint16 to read it.
	//http://updates.html5rocks.com/2012/06/How-to-convert-ArrayBuffer-to-and-from-String

	var decodeutf8 = function (utftext) {
		var string = "";
		var i = 0;
		var c=0,c1 = 0, c2 = 0 , c3=0;
		for (var i=0;i<utftext.length;i++) {
			if (utftext.charCodeAt(i)>127) break;
		}
		if (i>=utftext.length) return utftext;

		while ( i < utftext.length ) {
			c = utftext.charCodeAt(i);
			if (c < 128) {
				string += utftext[i];
				i++;
			} else if((c > 191) && (c < 224)) {
				c2 = utftext.charCodeAt(i+1);
				string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
				i += 2;
			} else {
				c2 = utftext.charCodeAt(i+1);
				c3 = utftext.charCodeAt(i+2);
				string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
				i += 3;
			}
		}
		return string;
	}

	var decodeule16buffer=function(buf) {
		if (typeof TextDecoder!=="undefined") {
			var decoder=new TextDecoder("utf-16le");
			return decoder.decode(buf)
		} else {
			return String.fromCharCode.apply(null, new Uint16Array(buffer));
		}
	}
	var readString= function(pos,blocksize,encoding,cb) {
		encoding=encoding||'utf8';
		var buffer=new Buffer(blocksize);
		var that=this;
		fs.read(this.handle,buffer,0,blocksize,pos,function(err,len,buffer){
			readLog("string",len);
			if (html5fs) {
				if (encoding=='utf8') {
					var str=decodeutf8(String.fromCharCode.apply(null, new Uint8Array(buffer)))
				} else { //ucs2 is 3 times faster
					var str=decodeule16buffer(buffer);
				}
				cb.apply(that,[str]);
			} 
			else cb.apply(that,[buffer.toString(encoding)]);	
		});
	}

	//work around for chrome fromCharCode cannot accept huge zarray
	//https://code.google.com/p/chromium/issues/detail?id=56588
	var buf2stringarr=function(buf,enc) {
		if (typeof TextDecoder!=="undefined") {
			//TextDecoder is two times faster
			if (enc==="ucs2") enc="utf-16le";
			var decoder=new TextDecoder(enc);
			return decoder.decode(buf).split("\0");
		} else{
			if (enc=="utf8") 	var arr=new Uint8Array(buf);
			else var arr=new Uint16Array(buf);
			var i=0,codes=[],out=[],s="";
			while (i<arr.length) {
				if (arr[i]) {
					codes[codes.length]=arr[i];
				} else {
					s=String.fromCharCode.apply(null,codes);
					if (enc=="utf8") out[out.length]=decodeutf8(s);
					else out[out.length]=s;
					codes=[];				
				}
				i++;
			}
			
			s=String.fromCharCode.apply(null,codes);
			if (enc=="utf8") out[out.length]=decodeutf8(s);
			else out[out.length]=s;

			return out;			
		}
	}
	var readStringArray = function(pos,blocksize,encoding,cb) {
		var that=this,out=null;
		if (blocksize==0) return [];
		encoding=encoding||'utf8';
		var buffer=new Buffer(blocksize);

		//if (blocksize>1000000) console.time("readstringarray");
		fs.read(this.handle,buffer,0,blocksize,pos,function(err,len,buffer){
			if (html5fs) {
				readLog("stringArray",buffer.byteLength);

				if (encoding=='utf8') {
					out=buf2stringarr(buffer,"utf8");
				} else { //ucs2 is 3 times faster
					out=buf2stringarr(buffer,"ucs2");
				}
			} else {
				readLog("stringArray",buffer.length);
				out=buffer.toString(encoding).split('\0');
			}
			//if (blocksize>1000000) console.timeEnd("readstringarray");
			cb.apply(that,[out]);
		});
	}
	var readUI32=function(pos,cb) {
		var buffer=new Buffer(4);
		var that=this;
		fs.read(this.handle,buffer,0,4,pos,function(err,len,buffer){
			readLog("ui32",len);
			if (html5fs){
				//v=(new Uint32Array(buffer))[0];
				var v=new DataView(buffer).getUint32(0, false)
				cb(v);
			}
			else cb.apply(that,[buffer.readInt32BE(0)]);	
		});		
	}

	var readI32=function(pos,cb) {
		var buffer=new Buffer(4);
		var that=this;
		fs.read(this.handle,buffer,0,4,pos,function(err,len,buffer){
			readLog("i32",len);
			if (html5fs){
				var v=new DataView(buffer).getInt32(0, false)
				cb(v);
			}
			else  	cb.apply(that,[buffer.readInt32BE(0)]);	
		});
	}
	var readUI8=function(pos,cb) {
		var buffer=new Buffer(1);
		var that=this;

		fs.read(this.handle,buffer,0,1,pos,function(err,len,buffer){
			readLog("ui8",len);
			if (html5fs)cb( (new Uint8Array(buffer))[0]) ;
			else  			cb.apply(that,[buffer.readUInt8(0)]);	
			
		});
	}
	var readBuf=function(pos,blocksize,cb) {
		var that=this;
		var buf=new Buffer(blocksize);
		fs.read(this.handle,buf,0,blocksize,pos,function(err,len,buffer){
			readLog("buf",len);
			var buff=new Uint8Array(buffer)
			cb.apply(that,[buff]);
		});
	}
	var readBuf_packedint=function(pos,blocksize,count,reset,cb) {
		var that=this;
		readBuf.apply(this,[pos,blocksize,function(buffer){
			cb.apply(that,[unpack_int(buffer,count,reset)]);	
		}]);
		
	}
	var readFixedArray_html5fs=function(pos,count,unitsize,cb) {
		var func=null;
		if (unitsize===1) {
			func='getUint8';//Uint8Array;
		} else if (unitsize===2) {
			func='getUint16';//Uint16Array;
		} else if (unitsize===4) {
			func='getUint32';//Uint32Array;
		} else throw 'unsupported integer size';

		fs.read(this.handle,null,0,unitsize*count,pos,function(err,len,buffer){
			readLog("fix array",len);
			var out=[];
			if (unitsize==1) {
				out=new Uint8Array(buffer);
			} else {
				for (var i = 0; i < len / unitsize; i++) { //endian problem
				//	out.push( func(buffer,i*unitsize));
					out.push( v=new DataView(buffer)[func](i,false) );
				}
			}

			cb.apply(that,[out]);
		});
	}
	// signature, itemcount, payload
	var readFixedArray = function(pos ,count, unitsize,cb) {
		var func=null;
		var that=this;
		
		if (unitsize* count>this.size && this.size)  {
			console.log("array size exceed file size",this.size)
			return;
		}
		
		if (html5fs) return readFixedArray_html5fs.apply(this,[pos,count,unitsize,cb]);

		var items=new Buffer( unitsize* count);
		if (unitsize===1) {
			func=items.readUInt8;
		} else if (unitsize===2) {
			func=items.readUInt16BE;
		} else if (unitsize===4) {
			func=items.readUInt32BE;
		} else throw 'unsupported integer size';
		//console.log('itemcount',itemcount,'buffer',buffer);

		fs.read(this.handle,items,0,unitsize*count,pos,function(err,len,buffer){
			readLog("fix array",len);
			var out=[];
			for (var i = 0; i < items.length / unitsize; i++) {
				out.push( func.apply(items,[i*unitsize]));
			}
			cb.apply(that,[out]);
		});
	}

	var free=function() {
		//console.log('closing ',handle);
		fs.closeSync(this.handle);
	}
	var setupapi=function() {
		var that=this;
		this.readSignature=readSignature;
		this.readI32=readI32;
		this.readUI32=readUI32;
		this.readUI8=readUI8;
		this.readBuf=readBuf;
		this.readBuf_packedint=readBuf_packedint;
		this.readFixedArray=readFixedArray;
		this.readString=readString;
		this.readStringArray=readStringArray;
		this.signature_size=signature_size;
		this.free=free;

		if (html5fs) {
			var fn=path;
			if (this.handle.file) {
				//local file
				fs.getFileSize(this.handle.file,function(size){
					that.size=size;
					if (cb) setTimeout(cb.bind(that),0);
				})
			} else if (fs&& fs.fs && fs.fs.root) {
				if (path.indexOf("filesystem:")==0) fn=path.substr(path.lastIndexOf("/"));
				//Google File system
				fs.fs.root.getFile(fn,{},function(entry){
				  entry.getMetadata(function(metadata) { 
					that.size=metadata.size;
					if (cb) setTimeout(cb.bind(that),0);
					});
				});				
			}
		} else {
			var stat=fs.fstatSync(this.handle);
			this.stat=stat;
			this.size=stat.size;		
			if (cb)	setTimeout(cb.bind(this,0),0);	
		}
	}

	var that=this;
	if (html5fs) {
		fs.open(path,function(h){
			if (!h) {
				if (cb)	setTimeout(cb.bind(null,"file not found:"+path),0);	
			} else {
				that.handle=h;
				that.html5fs=true;
				setupapi.call(that);
				that.opened=true;				
			}
		})
	} else {
		if (fs.existsSync(path)){
			this.handle=fs.openSync(path,'r');//,function(err,handle){
			this.opened=true;
			setupapi.call(this);
		} else {
			if (cb)	setTimeout(cb.bind(null,"file not found:"+path),0);	
			return null;
		}
	}
	return this;
}
module.exports=Open;
},{"./html5read":11,"buffer":undefined,"fs":undefined}],14:[function(require,module,exports){
/*
  JAVA can only return Number and String
	array and buffer return in string format
	need JSON.parse
*/
var verbose=0;

var readSignature=function(pos,cb) {
	if (verbose) console.debug("read signature");
	var signature=kfs.readUTF8String(this.handle,pos,1);
	if (verbose) console.debug(signature,signature.charCodeAt(0));
	cb.apply(this,[signature]);
}
var readI32=function(pos,cb) {
	if (verbose) console.debug("read i32 at "+pos);
	var i32=kfs.readInt32(this.handle,pos);
	if (verbose) console.debug(i32);
	cb.apply(this,[i32]);	
}
var readUI32=function(pos,cb) {
	if (verbose) console.debug("read ui32 at "+pos);
	var ui32=kfs.readUInt32(this.handle,pos);
	if (verbose) console.debug(ui32);
	cb.apply(this,[ui32]);
}
var readUI8=function(pos,cb) {
	if (verbose) console.debug("read ui8 at "+pos); 
	var ui8=kfs.readUInt8(this.handle,pos);
	if (verbose) console.debug(ui8);
	cb.apply(this,[ui8]);
}
var readBuf=function(pos,blocksize,cb) {
	if (verbose) console.debug("read buffer at "+pos+ " blocksize "+blocksize);
	var buf=kfs.readBuf(this.handle,pos,blocksize);
	var buff=JSON.parse(buf);
	if (verbose) console.debug("buffer length"+buff.length);
	cb.apply(this,[buff]);	
}
var readBuf_packedint=function(pos,blocksize,count,reset,cb) {
	if (verbose) console.debug("read packed int at "+pos+" blocksize "+blocksize+" count "+count);
	var buf=kfs.readBuf_packedint(this.handle,pos,blocksize,count,reset);
	var adv=parseInt(buf);
	var buff=JSON.parse(buf.substr(buf.indexOf("[")));
	if (verbose) console.debug("packedInt length "+buff.length+" first item="+buff[0]);
	cb.apply(this,[{data:buff,adv:adv}]);	
}


var readString= function(pos,blocksize,encoding,cb) {
	if (verbose) console.debug("readstring at "+pos+" blocksize " +blocksize+" enc:"+encoding);
	if (encoding=="ucs2") {
		var str=kfs.readULE16String(this.handle,pos,blocksize);
	} else {
		var str=kfs.readUTF8String(this.handle,pos,blocksize);	
	}	 
	if (verbose) console.debug(str);
	cb.apply(this,[str]);	
}

var readFixedArray = function(pos ,count, unitsize,cb) {
	if (verbose) console.debug("read fixed array at "+pos+" count "+count+" unitsize "+unitsize); 
	var buf=kfs.readFixedArray(this.handle,pos,count,unitsize);
	var buff=JSON.parse(buf);
	if (verbose) console.debug("array length"+buff.length);
	cb.apply(this,[buff]);	
}
var readStringArray = function(pos,blocksize,encoding,cb) {
	if (verbose) console.log("read String array at "+pos+" blocksize "+blocksize +" enc "+encoding); 
	encoding = encoding||"utf8";
	var buf=kfs.readStringArray(this.handle,pos,blocksize,encoding);
	//var buff=JSON.parse(buf);
	if (verbose) console.debug("read string array");
	var buff=buf.split("\uffff"); //cannot return string with 0
	if (verbose) console.debug("array length"+buff.length);
	cb.apply(this,[buff]);	
}
var mergePostings=function(positions,cb) {
	var buf=kfs.mergePostings(this.handle,JSON.stringify(positions));
	if (!buf || buf.length==0) return cb([]);
	else return cb(JSON.parse(buf));
}

var free=function() {
	//console.log('closing ',handle);
	kfs.close(this.handle);
}
var Open=function(path,opts,cb) {
	opts=opts||{};
	var signature_size=1;
	var setupapi=function() { 
		this.readSignature=readSignature;
		this.readI32=readI32;
		this.readUI32=readUI32;
		this.readUI8=readUI8;
		this.readBuf=readBuf;
		this.readBuf_packedint=readBuf_packedint;
		this.readFixedArray=readFixedArray;
		this.readString=readString;
		this.readStringArray=readStringArray;
		this.signature_size=signature_size;
		this.mergePostings=mergePostings;
		this.free=free;
		this.size=kfs.getFileSize(this.handle);
		if (verbose) console.log("filesize  "+this.size);
		if (cb)	cb.call(this);
	}

	this.handle=kfs.open(path);
	this.opened=true;
	setupapi.call(this);
	return this;
}

module.exports=Open;
},{}],15:[function(require,module,exports){
/*
  JSContext can return all Javascript types.
*/
var verbose=0,async=!!kfs.async;

var readSignature=function(pos,cb) {
	if (verbose)  ksanagap.log("read signature at "+pos);
	if (async) {
		var that=this;
		kfs.readUTF8String(this.handle,pos,1,function(signature){
			cb.call(that,signature);
		});
	} else {
		
		var signature=kfs.readUTF8String(this.handle,pos,1);
		if (verbose)  ksanagap.log(signature+" "+signature.charCodeAt(0));
		cb.apply(this,[signature]);
	}
}
var readI32=function(pos,cb) {
	if (async) {
		var that=this;
		kfs.readInt32(this.handle,pos,function(i32){
			cb.call(that,i32);
		});
	} else {	
		if (verbose)  ksanagap.log("read i32 at "+pos);
		var i32=kfs.readInt32(this.handle,pos);
		if (verbose)  ksanagap.log(i32);
		cb.apply(this,[i32]);	
	}
}
var readUI32=function(pos,cb) {
	if (async) {
		var that=this;
		kfs.readUInt32(this.handle,pos,function(ui32){
			cb.call(that,ui32);
		});
	} else {	
		if (verbose)  ksanagap.log("read ui32 at "+pos);
		var ui32=kfs.readUInt32(this.handle,pos);
		if (verbose)  ksanagap.log(ui32);
		cb.apply(this,[ui32]);
	}
}
var readUI8=function(pos,cb) {
	if (async) {
		var that=this;
		kfs.readUInt8(this.handle,pos,function(ui8){
			cb.call(that,ui8);
		});
	} else {
		if (verbose)  ksanagap.log("read ui8 at "+pos); 
		var ui8=kfs.readUInt8(this.handle,pos);
		if (verbose)  ksanagap.log(ui8);
		cb.apply(this,[ui8]);
	}
}
var readBuf=function(pos,blocksize,cb) {
	if (async) {
		var that=this;
		kfs.readBuf(this.handle,pos,blocksize,function(buf){
			cb.call(that,buf);
		});
	} else {

		if (verbose)  ksanagap.log("read buffer at "+pos);
		var buf=kfs.readBuf(this.handle,pos,blocksize);
		if (verbose)  ksanagap.log("buffer length"+buf.length);
		cb.apply(this,[buf]);	
	}
}
var readBuf_packedint=function(pos,blocksize,count,reset,cb) {
	if (async) {
		var that=this;
		kfs.readBuf_packedint(this.handle,pos,blocksize,count,reset,function(buf){
			if (typeof buf.data=="string") {
				buf.data=eval("["+buf.data.substr(0,buf.data.length-1)+"]");
			}			
			cb.call(that,buf);
		});
	} else {

		if (verbose)  ksanagap.log("read packed int fast, blocksize "+blocksize+" at "+pos);var t=new Date();
		var buf=kfs.readBuf_packedint(this.handle,pos,blocksize,count,reset);
		if (verbose)  ksanagap.log("return from packedint, time" + (new Date()-t));
		if (typeof buf.data=="string") {
			buf.data=eval("["+buf.data.substr(0,buf.data.length-1)+"]");
		}
		if (verbose)  ksanagap.log("unpacked length"+buf.data.length+" time" + (new Date()-t) );
		cb.apply(this,[buf]);
	}
}


var readString= function(pos,blocksize,encoding,cb) {
	if (verbose)  ksanagap.log("readstring at "+pos+" blocksize "+blocksize+" "+encoding);var t=new Date();
	if (encoding=="ucs2") {
		if (async) {
			var that=this;
			kfs.readULE16String(this.handle,pos,blocksize,function(str){
				cb.call(that,str);
			});
			return;
		} else {
			var str=kfs.readULE16String(this.handle,pos,blocksize);
		}
		
	} else {
		if (async) {
			var that=this;
			kfs.readUTF8String(this.handle,pos,blocksize,function(str){
				cb.call(that,str);
			});
			return;	
		} else {
			var str=kfs.readUTF8String(this.handle,pos,blocksize);	
		}
	}
	if (verbose)  ksanagap.log(str+" time"+(new Date()-t));
	cb.apply(this,[str]);	
}

var readFixedArray = function(pos ,count, unitsize,cb) {
	if (async) {
		var that=this;
		kfs.readFixedArray(this.handle,pos,count,unitsize,function(buf){
			cb.call(that,buf);
		});
	} else {

		if (verbose)  ksanagap.log("read fixed array at "+pos); var t=new Date();
		var buf=kfs.readFixedArray(this.handle,pos,count,unitsize);
		if (verbose)  ksanagap.log("array length "+buf.length+" time"+(new Date()-t));
		cb.apply(this,[buf]);		
	}

}
var readStringArray = function(pos,blocksize,encoding,cb) {
	//if (verbose)  ksanagap.log("read String array "+blocksize +" "+encoding); 
	encoding = encoding||"utf8";

	if (async) {
		var that=this;
		kfs.readStringArray(this.handle,pos,blocksize,encoding,function(buf){
			if (typeof buf=="string") buf=buf.split("\0");
			cb.call(that,buf);
		});
	} else {
		if (verbose)  ksanagap.log("read string array at "+pos);var t=new Date();
		var buf=kfs.readStringArray(this.handle,pos,blocksize,encoding);
		if (typeof buf=="string") buf=buf.split("\0");
		//var buff=JSON.parse(buf);
		//var buff=buf.split("\uffff"); //cannot return string with 0
		if (verbose)  ksanagap.log("string array length"+buf.length+" time"+(new Date()-t));
		cb.apply(this,[buf]);
	}
}

var mergePostings=function(positions,cb) {
	if (kfs.async) {
		kfs.mergePostings(this.handle,positions,function(buf){
			if (typeof buf=="string") {
				buf=eval("["+buf.substr(0,buf.length-1)+"]");
			}
			cb(buf);
		});
	} else {
		var buf=kfs.mergePostings(this.handle,positions,cb);
		if (typeof buf=="string") {
			buf=eval("["+buf.substr(0,buf.length-1)+"]");
		}
		cb(buf);
	}		
	
}
var free=function() {
	////if (verbose)  ksanagap.log('closing ',handle);
	kfs.close(this.handle);
}
var Open=function(path,opts,cb) {
	opts=opts||{};
	var signature_size=1;
	var setupapi=function() { 
		this.readSignature=readSignature;
		this.readI32=readI32;
		this.readUI32=readUI32;
		this.readUI8=readUI8;
		this.readBuf=readBuf;
		this.readBuf_packedint=readBuf_packedint;
		this.readFixedArray=readFixedArray;
		this.readString=readString;
		this.readStringArray=readStringArray;
		this.signature_size=signature_size;
		this.mergePostings=mergePostings;
		this.free=free;
		if (kfs.getFileSize.length==1) {
			this.size=kfs.getFileSize(this.handle);
			if (cb)	cb.call(this);	
		} else {
			var that=this;
			kfs.getFileSize(this.handle,function(size){
				that.size=size;
				if (cb)	cb.call(that);
			});
		}		
	}

	if (kfs.open.length==1) {
		this.handle=kfs.open(path);
		this.opened=true;
		setupapi.call(this);
		return this;		
	} else { //react-native
		var that=this;
		this.async=true;
		kfs.open(path,function(handle){
			that.opened=true;
			that.handle=handle;
			setupapi.call(that);
		});
	}
}

module.exports=Open;
},{}],16:[function(require,module,exports){
/*
  TODO
  and not

*/

// http://jsfiddle.net/neoswf/aXzWw/
var plist=require('./plist');
function intersect(I, J) {
  var i = j = 0;
  var result = [];

  while( i < I.length && j < J.length ){
     if      (I[i] < J[j]) i++; 
     else if (I[i] > J[j]) j++; 
     else {
       result[result.length]=l[i];
       i++;j++;
     }
  }
  return result;
}

/* return all items in I but not in J */
function subtract(I, J) {
  var i = j = 0;
  var result = [];

  while( i < I.length && j < J.length ){
    if (I[i]==J[j]) {
      i++;j++;
    } else if (I[i]<J[j]) {
      while (I[i]<J[j]) result[result.length]= I[i++];
    } else {
      while(J[j]<I[i]) j++;
    }
  }

  if (j==J.length) {
    while (i<I.length) result[result.length]=I[i++];
  }

  return result;
}

var union=function(a,b) {
	if (!a || !a.length) return b;
	if (!b || !b.length) return a;
    var result = [];
    var ai = 0;
    var bi = 0;
    while (true) {
        if ( ai < a.length && bi < b.length) {
            if (a[ai] < b[bi]) {
                result[result.length]=a[ai];
                ai++;
            } else if (a[ai] > b[bi]) {
                result[result.length]=b[bi];
                bi++;
            } else {
                result[result.length]=a[ai];
                result[result.length]=b[bi];
                ai++;
                bi++;
            }
        } else if (ai < a.length) {
            result.push.apply(result, a.slice(ai, a.length));
            break;
        } else if (bi < b.length) {
            result.push.apply(result, b.slice(bi, b.length));
            break;
        } else {
            break;
        }
    }
    return result;
}
var OPERATION={'include':intersect, 'union':union, 'exclude':subtract};

var boolSearch=function(opts) {
  opts=opts||{};
  ops=opts.op||this.opts.op;
  this.docs=[];
	if (!this.phrases.length) return;
	var r=this.phrases[0].docs;
  /* ignore operator of first phrase */
	for (var i=1;i<this.phrases.length;i++) {
		var op= ops[i] || 'union';
		r=OPERATION[op](r,this.phrases[i].docs);
	}
	this.docs=plist.unique(r);
	return this;
}
module.exports={search:boolSearch}
},{"./plist":20}],17:[function(require,module,exports){
var indexOfSorted = function (array, obj, near) { 
  var low = 0,
  high = array.length;
  while (low < high) {
    var mid = (low + high) >> 1;
    if (array[mid]==obj) return mid;
    array[mid] < obj ? low = mid + 1 : high = mid;
  }
  if (near) return low;
  else if (array[low]==obj) return low;else return -1;
};
var indexOfSorted_str = function (array, obj, near) { 
  var low = 0,
  high = array.length;
  while (low < high) {
    var mid = (low + high) >> 1;
    if (array[mid]==obj) return mid;
    (array[mid].localeCompare(obj)<0) ? low = mid + 1 : high = mid;
  }
  if (near) return low;
  else if (array[low]==obj) return low;else return -1;
};


var bsearch=function(array,value,near) {
	var func=indexOfSorted;
	if (typeof array[0]=="string") func=indexOfSorted_str;
	return func(array,value,near);
}
var bsearchNear=function(array,value) {
	return bsearch(array,value,true);
}

module.exports=bsearch;
},{}],18:[function(require,module,exports){
var plist=require("./plist");
var fetchtext=require("./fetchtext");
var getPhraseWidths=function (Q,phraseid,vposs) {
	var res=[];
	for (var i in vposs) {
		res.push(getPhraseWidth(Q,phraseid,vposs[i]));
	}
	return res;
}
var getPhraseWidth=function (Q,phraseid,vpos) {
	var P=Q.phrases[phraseid];
	var width=0,varwidth=false;
	if (P.width) return P.width; // no wildcard
	if (P.termid.length<2) return P.termlength[0];
	var lasttermposting=Q.terms[P.termid[P.termid.length-1]].posting;

	for (var i in P.termid) {
		var T=Q.terms[P.termid[i]];
		if (T.op=='wildcard') {
			width+=T.width;
			if (T.wildcard=='*') varwidth=true;
		} else {
			width+=P.termlength[i];
		}
	}
	if (varwidth) { //width might be smaller due to * wildcard
		var at=plist.indexOfSorted(lasttermposting,vpos);
		var endpos=lasttermposting[at];
		if (endpos-vpos<width) width=endpos-vpos+1;
	}

	return width;
}
/* return [vpos, phraseid, phrasewidth, optional_tagname] by slot range*/
var hitInRange=function(Q,startvpos,endvpos) {
	var res=[];
	if (!Q || !Q.rawresult || !Q.rawresult.length) return res;
	for (var i=0;i<Q.phrases.length;i++) {
		var P=Q.phrases[i];
		if (!P.posting) continue;
		var s=plist.indexOfSorted(P.posting,startvpos);
		var e=plist.indexOfSorted(P.posting,endvpos);
		//work around to include last item
		if (s===e&& e==P.posting.length-1) e++;
		var r=P.posting.slice(s,e);
		//console.log("s,e",s,e,"r",r)
		var width=getPhraseWidths(Q,i,r);

		res=res.concat(r.map(function(vpos,idx){ return [vpos,width[idx],i] }));
	}
	// order by vpos, if vpos is the same, larger width come first.
	// so the output will be
	// <tag1><tag2>one</tag2>two</tag1>
	//TODO, might cause overlap if same vpos and same width
	//need to check tag name
	res.sort(function(a,b){return a[0]==b[0]? b[1]-a[1] :a[0]-b[0]});

	return res;
}

var realHitInRange=function(Q,startvpos,endvpos,text){
	var hits=hitInRange(Q,startvpos,endvpos);
	return calculateRealPos(Q,startvpos,text,hits);
}
var tagsInRange=function(Q,renderTags,startvpos,endvpos) {
	var res=[];
	if (typeof renderTags=="string") renderTags=[renderTags];

	renderTags.map(function(tag){
		var starts=Q.engine.get(["fields",tag+"_start"]);
		var ends=Q.engine.get(["fields",tag+"_end"]);
		if (!starts) return;

		var s=plist.indexOfSorted(starts,startvpos);
		var e=s;
		while (e<starts.length && starts[e]<endvpos) e++;
		var opentags=starts.slice(s,e);

		s=plist.indexOfSorted(ends,startvpos);
		e=s;
		while (e<ends.length && ends[e]<endvpos) e++;
		var closetags=ends.slice(s,e);

		opentags.map(function(start,idx) {
			res.push([start,closetags[idx]-start,tag]);
		})
	});
	// order by vpos, if vpos is the same, larger width come first.
	res.sort(function(a,b){return a[0]==b[0]? b[1]-a[1] :a[0]-b[0]});

	return res;
}

/*
given a vpos range start, file, convert to filestart, fileend
   filestart : starting file
   start   : vpos start
   showfile: how many files to display
   showpage: how many pages to display

output:
   array of fileid with hits
*/
var getFileWithHits=function(engine,Q,range) {
	var fileOffsets=engine.get("fileoffsets");
	var out=[],filecount=100;
	var start=0 , end=Q.byFile.length;
	Q.excerptOverflow=false;
	if (range.start) {
		var first=range.start ;
		var last=range.end;
		if (!last) last=Number.MAX_SAFE_INTEGER;
		for (var i=0;i<fileOffsets.length;i++) {
			//if (fileOffsets[i]>first) break;
			if (fileOffsets[i]>last) {
				end=i;
				break;
			}
			if (fileOffsets[i]<first) start=i;
		}		
	} else {
		start=range.filestart || 0;
		if (range.maxfile) {
			filecount=range.maxfile;
		} else if (range.showseg) {
			throw "not implement yet"
		}
	}

	var fileWithHits=[],totalhit=0;
	range.maxhit=range.maxhit||1000;

	for (var i=start;i<end;i++) {
		if(Q.byFile[i].length>0) {
			totalhit+=Q.byFile[i].length;
			fileWithHits.push(i);
			range.nextFileStart=i;
			if (fileWithHits.length>=filecount) {
				Q.excerptOverflow=true;
				break;
			}
			if (totalhit>range.maxhit) {
				Q.excerptOverflow=true;
				break;
			}
		}
	}
	if (i>=end) { //no more file
		Q.excerptStop=true;
	}
	return fileWithHits;
}
var calculateRealPos=function(Q,vpos,text,hits) {
	var out=[];
	var tokenized=Q.tokenize(text);
	var tokens=tokenized.tokens;
	var offsets=tokenized.offsets;
	var i=0,j=0,end=0;
	var hitstart=0,hitend=0,textnow=0;
	//console.log("text",text,'len',text.length,"hits",hits)
	while (i<tokens.length) {
		//console.log("textnow",textnow,"token",tokens[i],"vpos",vpos)
		if (vpos===end && out.length) {
			var len=textnow-out[out.length-1][0];
			out[out.length-1][1]=len;
		}

		var skip=Q.isSkip(tokens[i]);
		if (!skip && j<hits.length && vpos===hits[j][0]) {
			out.push([textnow, null ,hits[j][2]]);
			end=vpos+hits[j][1];
			j++;
		}
		textnow+=tokens[i].length;
		if (!skip) vpos++;
		i++;
	}
	if (vpos===end && out.length) {
		var len=textnow-out[out.length-1][0];
		out[out.length-1][1]=textnow-out[out.length-1][0];
	}

	return out;
}
var resultlist=function(engine,Q,opts,cb) {
	var output=[];
	if (!Q.rawresult || !Q.rawresult.length) {
		cb(output);
		return;
	}
	if (opts.range) {
		if (opts.range.maxhit && !opts.range.maxfile) {
			opts.range.maxfile=opts.range.maxhit;
			opts.range.maxseg=opts.range.maxhit;
		}
		if (!opts.range.maxseg) opts.range.maxseg=100;
		if (!opts.range.end) {
			opts.range.end=Number.MAX_SAFE_INTEGER;
		}

		if (opts.range.from) {
			opts.range.start=engine.txtid2vpos(engine.nextTxtid(opts.range.from));
		}
	}
	var fileWithHits=getFileWithHits(engine,Q,opts.range);
	if (!fileWithHits.length) {
		cb(output);
		return;
	}

	var output=[],files=[];//temporary holder for segnames
	for (var i=0;i<fileWithHits.length;i++) {
		var nfile=fileWithHits[i];
		var segoffsets=engine.getFileSegOffsets(nfile);
		//console.log("file",nfile,"segoffsets",segoffsets)
		var segnames=engine.getFileSegNames(nfile);
		files[nfile]={segoffsets:segoffsets};

		var segwithhit=plist.groupbyposting2(Q.byFile[ nfile ],  segoffsets);
		segwithhit.shift();
		//if (segoffsets[0]==1)
		//segwithhit.shift(); //the first item is not used (0~Q.byFile[0] )
		for (var j=0; j<segwithhit.length;j++) {
			var segoffset=segoffsets[j];
			if (!segwithhit[j].length) continue;
			//var offsets=segwithhit[j].map(function(p){return p- fileOffsets[i]});
			
			if (segoffset<opts.range.start) continue;
			if (segoffset>opts.range.end) break;

			output.push(  {file: nfile, seg:j,  segname:segnames[j]});
			if (output.length>opts.range.maxseg) break;
		}
	}
	var segpaths=output.map(function(p){
		return ["filecontents",p.file,p.seg];
	});
	//prepare the text
	engine.get(segpaths,function(segs){
		var seq=0;
		if (segs) for (var i=0;i<segs.length;i++) {
			var startvpos=files[output[i].file].segoffsets[output[i].seg];
			var endvpos=files[output[i].file].segoffsets[output[i].seg+1]||engine.get("meta").vsize;
			//console.log(startvpos,endvpos)
			var hl={};

			if (opts.nohighlight) {
				hl.text=segs[i];
				hl.hits=hitInRange(Q,startvpos,endvpos);
				hl.realHits=calculateRealPos(Q,startvpos,hl.text,hl.hits);
				//console.log("text",hl.text,"startvpos",startvpos,"endvpos",endvpos);
				//console.log("hits",hl.hits,"realhits",hl.realHits);
			} else {
				var o={nocrlf:true,nospan:true,
					text:segs[i],startvpos:startvpos, endvpos: endvpos, 
					Q:Q,fulltext:opts.fulltext};
				hl=highlight(Q,o);
			}
			if (hl.text) {
				output[i].text=hl.text;
				output[i].hits=hl.hits;
				output[i].realHits=hl.realHits;
				output[i].seq=seq;
				seq+=hl.hits.length;

				output[i].start=startvpos;				
			} else {
				output[i]=null; //remove item vpos less than opts.range.start
			}
		} 
		output=output.filter(function(o){return o!=null});
		cb(output);
	});
}
var injectTag=function(Q,opts){
	var hits=opts.hits;
	var tags=opts.tags;
	if (!tags) tags=[];
	var hitclass=opts.hitclass||'hl';
	var output='',O=[],j=0,k=0;
	var surround=opts.surround||5;

	var tokens=Q.tokenize(opts.text).tokens;
	var vpos=opts.vpos;
	var i=0,previnrange=!!opts.fulltext ,inrange=!!opts.fulltext;
	var hitstart=0,hitend=0,tagstart=0,tagend=0,tagclass="";
	while (i<tokens.length) {
		var skip=Q.isSkip(tokens[i]);
		var hashit=false;
		inrange=opts.fulltext || (j<hits.length && vpos+surround>=hits[j][0] ||
				(j>0 && j<=hits.length &&  hits[j-1][0]+surround*2>=vpos));	

		if (previnrange!=inrange) {
			output+=opts.abridge||"...";
		}
		previnrange=inrange;
		var token=tokens[i];
		if (opts.nocrlf && token=="\n") token="";

		if (inrange && i<tokens.length) {
			if (skip) {
				output+=token;
			} else {
				var classes="";	

				//check hit
				if (j<hits.length && vpos==hits[j][0]) {
					var nphrase=hits[j][2] % 10, width=hits[j][1];
					hitstart=hits[j][0];
					hitend=hitstart+width;
					j++;
				}

				//check tag
				if (k<tags.length && vpos==tags[k][0]) {
					var width=tags[k][1];
					tagstart=tags[k][0];
					tagend=tagstart+width;
					tagclass=tags[k][2];
					k++;
				}

				if (vpos>=hitstart && vpos<hitend) classes=hitclass+" "+hitclass+nphrase;
				if (vpos>=tagstart && vpos<tagend) classes+=" "+tagclass;

				if (classes || !opts.nospan) {
					output+='<span vpos="'+vpos+'"';
					if (classes) {
						classes+= (tagstart==vpos)?" "+tagclass+"-first":"";
						classes+= (tagend-1==vpos)?" "+tagclass+"-last":"";
						classes=' class="'+classes+'"';
					}
						
					output+=classes+'>';
					output+=token+'</span>';
				} else {
					output+=token;
				}
			}
		}
		if (!skip) vpos++;
		i++; 
	}

	O.push(output);
	output="";

	return O.join("");
}
var highlight=function(Q,opts) {
	if (!opts.text) return {text:"",hits:[]};
	var opt={text:opts.text,
		hits:null,abridge:opts.abridge,vpos:opts.startvpos,
		fulltext:opts.fulltext,renderTags:opts.renderTags,nospan:opts.nospan,nocrlf:opts.nocrlf,
	};

	opt.hits=hitInRange(opts.Q,opts.startvpos,opts.endvpos);
	return {text:injectTag(Q,opt),hits:opt.hits};
}

var addspan=function(text,startvpos){
	engine=this;
	var output="";
	var tokens=engine.analyzer.tokenize(text).tokens;
	var isSkip=engine.analyzer.isSkip;
	var vpos=startvpos;
	for (var i=0;i<tokens.length;i++) {
		output+='<span vpos="'+(vpos)+'">'+tokens[i]+"</span>";
		if (!isSkip(tokens[i])) vpos++;
	}		
	return output;
}
var addtoken=function(text,startvpos) {
	engine=this;
	var output=[];
	var tokens=engine.analyzer.tokenize(text).tokens;
	var isSkip=engine.analyzer.isSkip;
	var vpos=startvpos;
	for (var i=0;i<tokens.length;i++) {
		output.push([tokens[i],vpos]);
		if (!isSkip(tokens[i])) vpos++;
	}		
	return output;
}


var highlightFile=function(Q,fileid,opts,cb) {
	if (typeof opts=="function") {
		cb=opts;
	}

	if (!Q || !Q.engine) return cb(null);

	var segoffsets=Q.engine.getFileSegOffsets(fileid);
	var output=[];	
	//console.log(startvpos,endvpos)
	Q.engine.get(["filecontents",fileid],true,function(data){
		if (!data) {
			console.error("wrong file id",fileid);
		} else {
			for (var i=0;i<data.length-1;i++ ){
				var startvpos=segoffsets[i];
				var endvpos=segoffsets[i+1];
				var segnames=Q.engine.getFileSegNames(fileid);
				var seg=fetchtext.segSync(Q.engine, fileid,i+1);
				var opt={text:seg.text,hits:null,tag:'hl',vpos:startvpos,
					fulltext:true,nospan:opts.nospan,nocrlf:opts.nocrlf};
				var segname=segnames[i+1];
				opt.hits=hitInRange(Q,startvpos,endvpos);
				var pb='<pb n="'+segname+'"></pb>';
				var withtag=injectTag(Q,opt);
				output.push(pb+withtag);
			}			
		}

		cb.apply(Q.engine.context,[{text:output.join(""),file:fileid}]);
	})
}
var highlightSeg=function(Q,fileid,segid,opts,cb,context) {
	if (typeof opts=="function") {
		cb=opts;
	}

	if (!Q || !Q.engine) return cb.apply(context,[null]);
	var segoffsets=Q.engine.getFileSegOffsets(fileid);
	var startvpos=segoffsets[segid];
	var endvpos=segoffsets[segid+1];
	var segnames=Q.engine.getFileSegNames(fileid);

	fetchtext.seg(Q.engine,fileid,segid,function(res){
		var opt={text:res.text,hits:null,vpos:startvpos,fulltext:true,
			nospan:opts.nospan,nocrlf:opts.nocrlf};
			opt.hits=hitInRange(Q,startvpos,endvpos);
			if (opts.renderTags) {
				opt.tags=tagsInRange(Q,opts.renderTags,startvpos,endvpos);
			}

		var segname=segnames[segid];
		cb.apply(context||Q.engine.context,[{text:injectTag(Q,opt),rawtext:res.text,
			tags:opt.tags,seg:segid,file:fileid,hits:opt.hits,segname:segname}]);
	});
}

var highlightRange=function(Q,start,end,opts,cb,context){
	fetchtext.range.call(Q.engine,start,end,function(text){
		var opt={text:text,fulltext:true,nospan:true};
		opt.hits=hitInRange(Q,start,end);

		if (opts.renderTags) {
			opt.tags=tagsInRange(Q,opts.renderTags,start,end);
		}
		opt.vpos=start-1; //getPageRange +1 , 
		var highlighted=injectTag(Q,opt);
		//console.log(highlighted)
		cb.apply(context||Q.engine.context,[{text:highlighted,rawtext:text,tags:opt.tags,hits:opt.hits}]);
	})
}


module.exports={resultlist:resultlist, 
	hitInRange:hitInRange, 
	realHitInRange:realHitInRange, 
	highlightSeg:highlightSeg,
	highlightFile:highlightFile,
	highlightRange:highlightRange,
};
},{"./fetchtext":19,"./plist":20}],19:[function(require,module,exports){
var indexOfSorted=require("./plist").indexOfSorted;

var getSeg=function(engine,fileid,segid,opts,cb,context) {
	if (typeof opts=="function") {
		context=cb;
		cb=opts;
		opts={};
	}

	var fileOffsets=engine.get("fileoffsets");
	var segpaths=["filecontents",fileid,segid];
	var segnames=engine.getFileSegNames(fileid);
	var vpos=engine.fileSegToVpos(fileid,segid);

	engine.get(segpaths,function(text){
		var out=text;
		if (opts.span) out=addspan.apply(engine,[text,vpos]);
		else if(opts.token) out=addtoken.apply(engine,[text,vpos]);
		cb.apply(context||engine.context,[{text:out,file:fileid,seg:segid,segname:segnames[segid]}]);
	});
}

var getSegSync=function(engine,fileid,segid) {
	var fileOffsets=engine.get("fileoffsets");
	var segpaths=["filecontents",fileid,segid];
	var segnames=engine.getFileSegNames(fileid);

	var text=engine.get(segpaths);
	return {text:text,file:fileid,seg:segid,segname:segnames[segid]};
}

var getKeyByTagName=function(tagname) {
	var out=[];
	out.push(["fields",tagname]);
	out.push(["fields",tagname+"_vpos"]);
	out.push(["fields",tagname+"_sorted"]);
	out.push(["fields",tagname+"_sorted_idx"]);
	return out;
}
var getPage=function(engine,pageid,cb,context) {
	getPageRange(engine,pageid,function(res){
		getRange.call(engine,res.start,res.end,function(pagetext){
			res.text=pagetext;
			cb.call(context,res);
		});
	})
}
var getPageRange=function(engine,pageid,cb,context) {
	var keys=getKeyByTagName("pb");
	engine.get(keys,function(data){
		var vals=data[0], vpos=data[1], sorted=data[2],sorted_idx=data[3];
		var i=indexOfSorted(sorted,pageid);
		var idx=sorted_idx[i];
		var res={start:vpos[idx]+1,end:vpos[idx+1],text:""};
		if (vals[idx]==pageid) {
			var nextpageid=vals[idx+1];
			if (!nextpageid) res.end=engine.get("meta").vsize;
		} else {//always return top page
			res={start:0,end:vpos[0],text:""};
		}
		cb.call(context,res);
	})
}

var getRange=function(start,end,cb,context){
	var fseg=this.fileSegFromVpos(start);
	var fseg_end=this.fileSegFromVpos(end);
	var keys=[];
	for (var f=fseg.file;f<fseg_end.file+1;f++){
		var range=this.getFileRange(f);

		var from=0, to=range.end-range.start;
		if (f===fseg.file) from=fseg.seg;
		if (f===fseg_end.file) to=fseg_end.seg;
		
		for (var s=from;s<to+1;s++){
			keys.push(["filecontents",f,s]);
		}
	}
	var startsegvpos=this.fileSegToVpos(fseg.file,fseg.seg);
	var endsegvpos=this.fileSegToVpos(fseg_end.file,fseg_end.seg);
	//console.log(fseg,startsegvpos,endsegvpos);
	var startvpos=start-startsegvpos;
	var lastvpos=end-endsegvpos;

	//console.log(start,end,startvpos,lastvpos);
	var combinetext=function(text,idx,texts) {
		var out=text;
		if (idx==0 || idx===texts.length-1) {
			var tokenized=this.analyzer.tokenize(text);
			var now=0;
			out=tokenized.tokens.map(function(t){
				if (!this.analyzer.isSkip(t))now++;
				if (now<startvpos && idx===0) return "";
				else if (now>lastvpos && idx===texts.length-1) return "";
				else return t;
			}.bind(this)).join("");
		}
		return out;
	}
	this.get(keys,function(data){
		cb(data.map(combinetext.bind(this)).join(""));
	}.bind(this));
}

var getFile=function(engine,fileid,cb) {
	var filename=engine.get("filenames")[fileid];
	var segnames=engine.getFileSegNames(fileid);
	var filestart=engine.get("fileoffsets")[fileid];
	var offsets=engine.getFileSegOffsets(fileid);
	var pc=0;
	engine.get(["filecontents",fileid],true,function(data){
		var text=data.map(function(t,idx) {
			if (idx==0) return ""; 
			var pb='<pb n="'+segnames[idx]+'"></pb>';
			return pb+t;
		});
		cb({texts:data,text:text.join(""),segnames:segnames,filestart:filestart,offsets:offsets,file:fileid,filename:filename}); //force different token
	});
}

module.exports=	{file:getFile,seg:getSeg,segSync:getSegSync,range:getRange,page:getPage,pageRange:getPageRange};
},{"./plist":20}],20:[function(require,module,exports){

var unpack = function (ar) { // unpack variable length integer list
  var r = [],
  i = 0,
  v = 0;
  do {
	var shift = 0;
	do {
	  v += ((ar[i] & 0x7F) << shift);
	  shift += 7;
	} while (ar[++i] & 0x80);
	r[r.length]=v;
  } while (i < ar.length);
  return r;
}

/*
   arr:  [1,1,1,1,1,1,1,1,1]
   levels: [0,1,1,2,2,0,1,2]
   output: [5,1,3,1,1,3,1,1]
*/

var groupsum=function(arr,levels) {
  if (arr.length!=levels.length+1) return null;
  var stack=[];
  var output=new Array(levels.length);
  for (var i=0;i<levels.length;i++) output[i]=0;
  for (var i=1;i<arr.length;i++) { //first one out of toc scope, ignored
    if (stack.length>levels[i-1]) {
      while (stack.length>levels[i-1]) stack.pop();
    }
    stack.push(i-1);
    for (var j=0;j<stack.length;j++) {
      output[stack[j]]+=arr[i];
    }
  }
  return output;
}
/* arr= 1 , 2 , 3 ,4 ,5,6,7 //token posting
  posting= 3 , 5  //tag posting
  out = 3 , 2, 2
*/
var countbyposting = function (arr, posting) {
  if (!posting.length) return [arr.length];
  var out=[];
  for (var i=0;i<posting.length;i++) out[i]=0;
  out[posting.length]=0;
  var p=0,i=0,lasti=0;
  while (i<arr.length && p<posting.length) {
    if (arr[i]<=posting[p]) {
      while (p<posting.length && i<arr.length && arr[i]<=posting[p]) {
        out[p]++;
        i++;
      }      
    } 
    p++;
  }
  out[posting.length] = arr.length-i; //remaining
  return out;
}

var groupbyposting=function(arr,gposting) { //relative vpos
  if (!gposting.length) return [arr.length];
  var out=[];
  for (var i=0;i<=gposting.length;i++) out[i]=[];
  
  var p=0,i=0,lasti=0;
  while (i<arr.length && p<gposting.length) {
    if (arr[i]<gposting[p]) {
      while (p<gposting.length && i<arr.length && arr[i]<gposting[p]) {
        var start=0;
        if (p>0) start=gposting[p-1];
        out[p].push(arr[i++]-start);  // relative
      }      
    } 
    p++;
  }
  //remaining
  while(i<arr.length) out[out.length-1].push(arr[i++]-gposting[gposting.length-1]);
  return out;
}
var groupbyposting2=function(arr,gposting) { //absolute vpos
  if (!arr || !arr.length) return [];
  if (!gposting.length) return [arr.length];
  var out=[];
  for (var i=0;i<=gposting.length;i++) out[i]=[];
  
  var p=0,i=0,lasti=0;
  while (i<arr.length && p<gposting.length) {
    if (arr[i]<gposting[p]) {
      while (p<gposting.length && i<arr.length && arr[i]<gposting[p]) {
        var start=0;
        if (p>0) start=gposting[p-1]; //absolute
        out[p].push(arr[i++]);
      }      
    } 
    p++;
  }
  //remaining
  while(i<arr.length) out[out.length-1].push(arr[i++]-gposting[gposting.length-1]);
  return out;
}
var groupbyblock2 = function(ar, ntoken,slotshift,opts) {
  if (!ar.length) return [{},{}];
  
  slotshift = slotshift || 16;
  var g = Math.pow(2,slotshift);
  var i = 0;
  var r = {}, ntokens={};
  var groupcount=0;
  do {
    var group = Math.floor(ar[i] / g) ;
    if (!r[group]) {
      r[group] = [];
      ntokens[group]=[];
      groupcount++;
    }
    r[group].push(ar[i] % g);
    ntokens[group].push(ntoken[i]);
    i++;
  } while (i < ar.length);
  if (opts) opts.groupcount=groupcount;
  return [r,ntokens];
}
var groupbyslot = function (ar, slotshift, opts) {
  if (!ar.length)
	return {};
  
  slotshift = slotshift || 16;
  var g = Math.pow(2,slotshift);
  var i = 0;
  var r = {};
  var groupcount=0;
  do {
	var group = Math.floor(ar[i] / g) ;
	if (!r[group]) {
	  r[group] = [];
	  groupcount++;
	}
	r[group].push(ar[i] % g);
	i++;
  } while (i < ar.length);
  if (opts) opts.groupcount=groupcount;
  return r;
}
/*
var identity = function (value) {
  return value;
};
var sortedIndex = function (array, obj, iterator) { //taken from underscore
  iterator || (iterator = identity);
  var low = 0,
  high = array.length;
  while (low < high) {
	var mid = (low + high) >> 1;
	iterator(array[mid]) < iterator(obj) ? low = mid + 1 : high = mid;
  }
  return low;
};*/

var indexOfSorted = function (array, obj) { 
  var low = 0,
  high = array.length-1;
  while (low < high) {
    var mid = (low + high) >> 1;
    array[mid] < obj ? low = mid + 1 : high = mid;
  }
  return low;
};
var plhead=function(pl, pltag, opts) {
  opts=opts||{};
  opts.max=opts.max||1;
  var out=[];
  if (pltag.length<pl.length) {
    for (var i=0;i<pltag.length;i++) {
       k = indexOfSorted(pl, pltag[i]);
       if (k>-1 && k<pl.length) {
        if (pl[k]==pltag[i]) {
          out[out.length]=pltag[i];
          if (out.length>=opts.max) break;
        }
      }
    }
  } else {
    for (var i=0;i<pl.length;i++) {
       k = indexOfSorted(pltag, pl[i]);
       if (k>-1 && k<pltag.length) {
        if (pltag[k]==pl[i]) {
          out[out.length]=pltag[k];
          if (out.length>=opts.max) break;
        }
      }
    }
  }
  return out;
}
/*
 pl2 occur after pl1, 
 pl2>=pl1+mindis
 pl2<=pl1+maxdis
*/
var plfollow2 = function (pl1, pl2, mindis, maxdis) {
  var r = [],i=0;
  var swap = 0;
  
  while (i<pl1.length){
    var k = indexOfSorted(pl2, pl1[i] + mindis);
    var t = (pl2[k] >= (pl1[i] +mindis) && pl2[k]<=(pl1[i]+maxdis)) ? k : -1;
    if (t > -1) {
      r[r.length]=pl1[i];
      i++;
    } else {
      if (k>=pl2.length) break;
      var k2=indexOfSorted (pl1,pl2[k]-maxdis);
      if (k2>i) {
        var t = (pl2[k] >= (pl1[i] +mindis) && pl2[k]<=(pl1[i]+maxdis)) ? k : -1;
        if (t>-1) r[r.length]=pl1[k2];
        i=k2;
      } else break;
    }
  }
  return r;
}

var plnotfollow2 = function (pl1, pl2, mindis, maxdis) {
  var r = [],i=0;
  
  while (i<pl1.length){
    var k = indexOfSorted(pl2, pl1[i] + mindis);
    var t = (pl2[k] >= (pl1[i] +mindis) && pl2[k]<=(pl1[i]+maxdis)) ? k : -1;
    if (t > -1) {
      i++;
    } else {
      if (k>=pl2.length) {
        r=r.concat(pl1.slice(i));
        break;
      } else {
        var k2=indexOfSorted (pl1,pl2[k]-maxdis);
        if (k2>i) {
          r=r.concat(pl1.slice(i,k2));
          i=k2;
        } else break;
      }
    }
  }
  return r;
}
/* this is incorrect */
var plfollow = function (pl1, pl2, distance) {
  var r = [],i=0;

  while (i<pl1.length){
    var k = indexOfSorted(pl2, pl1[i] + distance);
    var t = (pl2[k] === (pl1[i] + distance)) ? k : -1;
    if (t > -1) {
      r.push(pl1[i]);
      i++;
    } else {
      if (k>=pl2.length) break;
      var k2=indexOfSorted (pl1,pl2[k]-distance);
      if (k2>i) {
        t = (pl2[k] === (pl1[k2] + distance)) ? k : -1;
        if (t>-1) {
           r.push(pl1[k2]);
           k2++;
        }
        i=k2;
      } else break;
    }
  }
  return r;
}
var plnotfollow = function (pl1, pl2, distance) {
  var r = [];
  var r = [],i=0;
  var swap = 0;
  
  while (i<pl1.length){
    var k = indexOfSorted(pl2, pl1[i] + distance);
    var t = (pl2[k] === (pl1[i] + distance)) ? k : -1;
    if (t > -1) { 
      i++;
    } else {
      if (k>=pl2.length) {
        r=r.concat(pl1.slice(i));
        break;
      } else {
        var k2=indexOfSorted (pl1,pl2[k]-distance);
        if (k2>i) {
          r=r.concat(pl1.slice(i,k2));
          i=k2;
        } else break;
      }
    }
  }
  return r;
}
var pland = function (pl1, pl2, distance) {
  var r = [];
  var swap = 0;
  
  if (pl1.length > pl2.length) { //swap for faster compare
    var t = pl2;
    pl2 = pl1;
    pl1 = t;
    swap = distance;
    distance = -distance;
  }
  for (var i = 0; i < pl1.length; i++) {
    var k = indexOfSorted(pl2, pl1[i] + distance);
    var t = (pl2[k] === (pl1[i] + distance)) ? k : -1;
    if (t > -1) {
      r.push(pl1[i] - swap);
    }
  }
  return r;
}
var combine=function (postings) {
  var out=[];
  for (var i in postings) {
    out=out.concat(postings[i]);
  }
  out.sort(function(a,b){return a-b});
  return out;
}

var unique = function(ar){
   if (!ar || !ar.length) return [];
   var u = {}, a = [];
   for(var i = 0, l = ar.length; i < l; ++i){
    if(u.hasOwnProperty(ar[i])) continue;
    a.push(ar[i]);
    u[ar[i]] = 1;
   }
   return a;
}



var plphrase = function (postings,ops) {
  var r = [];
  for (var i=0;i<postings.length;i++) {
  	if (!postings[i])  return [];
  	if (0 === i) {
  	  r = postings[0];
  	} else {
      if (ops[i]=='andnot') {
        r = plnotfollow(r, postings[i], i);  
      }else {
        r = pland(r, postings[i], i);  
      }
  	}
  }
  
  return r;
}
//return an array of group having any of pl item
var matchPosting=function(pl,gupl,start,end) {
  start=start||0;
  end=end||-1;
  if (end==-1) end=Math.pow(2, 53); // max integer value

  var count=0, i = j= 0,  result = [] ,v=0;
  var docs=[], freq=[];
  if (!pl) return {docs:[],freq:[]};
  while( i < pl.length && j < gupl.length ){
     if (pl[i] < gupl[j] ){ 
       count++;
       v=pl[i];
       i++; 
     } else {
       if (count) {
        if (v>=start && v<end) {
          docs.push(j);
          freq.push(count);          
        }
       }
       j++;
       count=0;
     }
  }
  if (count && j<gupl.length && v>=start && v<end) {
    docs.push(j);
    freq.push(count);
    count=0;
  }
  else {
    while (j==gupl.length && i<pl.length && pl[i] >= gupl[gupl.length-1]) {
      i++;
      count++;
    }
    if (v>=start && v<end) {
      docs.push(j);
      freq.push(count);      
    }
  } 
  return {docs:docs,freq:freq};
}

var trim=function(arr,start,end) {
  var s=indexOfSorted(arr,start);
  var e=indexOfSorted(arr,end);
  return arr.slice(s,e+1);
}
var plist={};
plist.unpack=unpack;
plist.plphrase=plphrase;
plist.plhead=plhead;
plist.plfollow2=plfollow2;
plist.plnotfollow2=plnotfollow2;
plist.plfollow=plfollow;
plist.plnotfollow=plnotfollow;
plist.unique=unique;
plist.indexOfSorted=indexOfSorted;
plist.matchPosting=matchPosting;
plist.trim=trim;

plist.groupbyslot=groupbyslot;
plist.groupbyblock2=groupbyblock2;
plist.countbyposting=countbyposting;
plist.groupbyposting=groupbyposting;
plist.groupbyposting2=groupbyposting2;
plist.groupsum=groupsum;
plist.combine=combine;
module.exports=plist;
},{}],21:[function(require,module,exports){
/*
var dosearch2=function(engine,opts,cb,context) {
	opts
		nfile,npage  //return a highlighted page
		nfile,[pages] //return highlighted pages 
		nfile        //return entire highlighted file
		abs_npage
		[abs_pages]  //return set of highlighted pages (may cross file)

		filename, pagename
		filename,[pagenames]

		excerpt      //
	    sortBy       //default natural, sortby by vsm ranking

	//return err,array_of_string ,Q  (Q contains low level search result)
}

*/
/* TODO sorted tokens */
var plist=require("./plist");
var boolsearch=require("./boolsearch");
var excerpt=require("./excerpt");
var parseTerm = function(engine,raw,opts) {
	if (!raw) return;
	var res={raw:raw,variants:[],term:'',op:''};
	var term=raw, op=0;
	var firstchar=term[0];
	var termregex="";
	if (firstchar=='-') {
		term=term.substring(1);
		firstchar=term[0];
		res.exclude=true; //exclude
	}
	term=term.trim();
	var lastchar=term[term.length-1];
	term=engine.analyzer.normalize(term);
	
	if (term.indexOf("%")>-1) {
		var termregex="^"+term.replace(/%+/g,".+")+"$";
		if (firstchar=="%") 	termregex=".+"+termregex.substr(1);
		if (lastchar=="%") 	termregex=termregex.substr(0,termregex.length-1)+".+";
	}

	if (termregex) {
		res.variants=expandTerm(engine,termregex);
	}

	res.key=term;
	return res;
}
var expandTerm=function(engine,regex) {
	var r=new RegExp(regex);
	var tokens=engine.get("tokens");
	var postingsLength=engine.get("postingslength");
	if (!postingsLength) postingsLength=[];
	var out=[];
	for (var i=0;i<tokens.length;i++) {
		var m=tokens[i].match(r);
		if (m) {
			out.push([m[0],postingsLength[i]||1]);
		}
	}
	out.sort(function(a,b){return b[1]-a[1]});
	return out;
}
var isWildcard=function(raw) {
	return !!raw.match(/[\*\?]/);
}

var isOrTerm=function(term) {
	term=term.trim();
	return (term[term.length-1]===',');
}
var orterm=function(engine,term,key) {
		var t={text:key};
		if (engine.analyzer.simplifiedToken) {
			t.simplified=engine.analyzer.simplifiedToken(key);
		}
		term.variants.push(t);
}
var orTerms=function(engine,tokens,now) {
	var raw=tokens[now];
	var term=parseTerm(engine,raw);
	if (!term) return;
	orterm(engine,term,term.key);
	while (isOrTerm(raw))  {
		raw=tokens[++now];
		var term2=parseTerm(engine,raw);
		orterm(engine,term,term2.key);
		for (var i in term2.variants){
			term.variants[i]=term2.variants[i];
		}
		term.key+=','+term2.key;
	}
	return term;
}

var getOperator=function(raw) {
	var op='';
	if (raw[0]=='+') op='include';
	if (raw[0]=='-') op='exclude';
	return op;
}
var parsePhrase=function(q) {
	var match=q.match(/(".+?"|'.+?'|\S+)/g)
	match=match.map(function(str){
		var n=str.length, h=str.charAt(0), t=str.charAt(n-1)
		if (h===t&&(h==='"'|h==="'")) str=str.substr(1,n-2)
		return str;
	})
	return match;
}
var tibetanNumber={
	"\u0f20":"0","\u0f21":"1","\u0f22":"2",	"\u0f23":"3",	"\u0f24":"4",
	"\u0f25":"5","\u0f26":"6","\u0f27":"7","\u0f28":"8","\u0f29":"9"
}
var parseNumber=function(raw) {
	var n=parseInt(raw,10);
	if (isNaN(n)){
		var converted=[];
		for (var i=0;i<raw.length;i++) {
			var nn=tibetanNumber[raw[i]];
			if (typeof nn !="undefined") converted[i]=nn;
			else break;
		}
		return parseInt(converted,10);
	} else {
		return n;
	}
}
var parseWildcard=function(raw) {
	var n=parseNumber(raw) || 1;
	var qcount=raw.split('?').length-1;
	var scount=raw.split('*').length-1;
	var type='';
	if (qcount) type='?';
	else if (scount) type='*';
	return {wildcard:type, width: n , op:'wildcard'};
}

var newPhrase=function() {
	return {termid:[],posting:[],raw:'',termlength:[]};
} 
var parseQuery=function(q,sep) {
	if (sep && q.indexOf(sep)>-1) {
		var match=q.split(sep);
	} else {
		var match=q.match(/(".+?"|'.+?'|\S+)/g)
		match=match.map(function(str){
			var n=str.length, h=str.charAt(0), t=str.charAt(n-1)
			if (h===t&&(h==='"'|h==="'")) str=str.substr(1,n-2)
			return str
		})
		//console.log(input,'==>',match)		
	}
	return match;
}
var loadPhrase=function(phrase) {
	/* remove leading and ending wildcard */
	var Q=this;
	var cache=Q.engine.postingCache;
	if (cache[phrase.key]) {
		phrase.posting=cache[phrase.key];
		return Q;
	}
	if (phrase.termid.length==1) {
		if (!Q.terms.length){
			phrase.posting=[];
		} else {
			cache[phrase.key]=phrase.posting=Q.terms[phrase.termid[0]].posting;	
		}
		return Q;
	}

	var i=0, r=[],dis=0;
	while(i<phrase.termid.length) {
	  var T=Q.terms[phrase.termid[i]];
		if (0 === i) {
			r = T.posting;
		} else {
		    if (T.op=='wildcard') {
		    	T=Q.terms[phrase.termid[i++]];
		    	var width=T.width;
		    	var wildcard=T.wildcard;
		    	T=Q.terms[phrase.termid[i]];
		    	var mindis=dis;
		    	if (wildcard=='?') mindis=dis+width;
		    	if (T.exclude) r = plist.plnotfollow2(r, T.posting, mindis, dis+width);
		    	else r = plist.plfollow2(r, T.posting, mindis, dis+width);		    	
		    	dis+=(width-1);
		    }else {
		    	if (T.posting) {
		    		if (T.exclude) r = plist.plnotfollow(r, T.posting, dis);
		    		else r = plist.plfollow(r, T.posting, dis);
		    	}
		    }
		}
		dis += phrase.termlength[i];
		i++;
		if (!r) return Q;
  }
  phrase.posting=r;
  cache[phrase.key]=r;
  return Q;
}
var trimSpace=function(engine,query) {
	if (!query) return "";
	var i=0;
	var isSkip=engine.analyzer.isSkip;
	while (i<query.length && isSkip(query[i])) i++;
	return query.substring(i);
}
var getSegWithHit=function(fileid,offsets) {
	var Q=this,engine=Q.engine;
	var segWithHit=plist.groupbyposting2(Q.byFile[fileid ], offsets);
	if (segWithHit.length) segWithHit.shift(); //the first item is not used (0~Q.byFile[0] )
	var out=[];
	segWithHit.map(function(p,idx){if (p.length) out.push(idx)});
	return out;
}
var segWithHit=function(fileid) {
	var Q=this,engine=Q.engine;
	var offsets=engine.getFileSegOffsets(fileid);
	return getSegWithHit.apply(this,[fileid,offsets]);
}
var isSimplePhrase=function(phrase) {
	var m=phrase.match(/[\?%^]/);
	return !m;
}

// 發菩提心   ==> 發菩  提心       2 2   
// 菩提心     ==> 菩提  提心       1 2
// 劫劫       ==> 劫    劫         1 1   // invalid
// 因緣所生道  ==> 因緣  所生   道   2 2 1
var splitPhrase=function(engine,simplephrase,bigram) {
	var bigram=bigram||engine.get("meta").bigram||[];
	var tokens=engine.analyzer.tokenize(simplephrase).tokens;
	var loadtokens=[],lengths=[],j=0,lastbigrampos=-1;
	while (j+1<tokens.length) {
		var token=engine.analyzer.normalize(tokens[j]);
		var nexttoken=engine.analyzer.normalize(tokens[j+1]);
		var bi=token+nexttoken;
		var i=plist.indexOfSorted(bigram,bi);
		if (bigram[i]==bi) {
			loadtokens.push(bi);
			if (j+3<tokens.length) {
				lastbigrampos=j;
				j++;
			} else {
				if (j+2==tokens.length){ 
					if (lastbigrampos+1==j ) {
						lengths[lengths.length-1]--;
					}
					lastbigrampos=j;
					j++;
				}else {
					lastbigrampos=j;	
				}
			}
			lengths.push(2);
		} else {
			if (!bigram || lastbigrampos==-1 || lastbigrampos+1!=j) {
				loadtokens.push(token);
				lengths.push(1);				
			}
		}
		j++;
	}

	while (j<tokens.length) {
		var token=engine.analyzer.normalize(tokens[j]);
		loadtokens.push(token);
		lengths.push(1);
		j++;
	}

	return {tokens:loadtokens, lengths: lengths , tokenlength: tokens.length};
}
/* host has fast native function */
var fastPhrase=function(engine,phrase,cb) {
	var phrase_term=newPhrase();
	//var tokens=engine.analyzer.tokenize(phrase).tokens;
	var splitted=splitPhrase(engine,phrase);

	var paths=postingPathFromTokens(engine,splitted.tokens);
//create wildcard

	phrase_term.width=splitted.tokenlength; //for excerpt.js to getPhraseWidth

	engine.get(paths,{address:true},function(postingAddress){ //this is sync
		phrase_term.key=phrase;
		var postingAddressWithWildcard=[];
		for (var i=0;i<postingAddress.length;i++) {
			postingAddressWithWildcard.push(postingAddress[i]);
			if (splitted.lengths[i]>1) {
				postingAddressWithWildcard.push([splitted.lengths[i],0]); //wildcard has blocksize==0 
			}
		};
		engine.mergePostings(postingAddressWithWildcard,function(r){
			engine.postingCache[phrase]=r;
			cb(phrase_term);
		});
		
	});
}
var slowPhrase=function(engine,terms,phrase) {
	var j=0,tokens=engine.analyzer.tokenize(phrase).tokens;
	var phrase_term=newPhrase();
	var termid=0;
	while (j<tokens.length) {
		var raw=tokens[j], termlength=1;
		if (isWildcard(raw)) {
			if (phrase_term.termid.length==0)  { //skip leading wild card
				j++
				continue;
			}
			terms.push(parseWildcard(raw));
			termid=terms.length-1;
			phrase_term.termid.push(termid);
			phrase_term.termlength.push(termlength);
		} else if (isOrTerm(raw)){
			var term=orTerms.apply(this,[tokens,j]);
			if (term) {
				terms.push(term);
				termid=terms.length-1;
				j+=term.key.split(',').length-1;					
			}
			j++;
			phrase_term.termid.push(termid);
			phrase_term.termlength.push(termlength);
		} else {
			var phrase="";
			while (j<tokens.length) {
				if (!(isWildcard(tokens[j]) || isOrTerm(tokens[j]))) {
					phrase+=tokens[j];
					j++;
				} else break;
			}

			var splitted=splitPhrase(engine,phrase);
			for (var i=0;i<splitted.tokens.length;i++) {
				var term=parseTerm(engine,splitted.tokens[i]);
				if (!term) continue;
				var termidx=terms.map(function(a){return a.key}).indexOf(term.key);
				if (termidx==-1) {
					terms.push(term);
					termid=terms.length-1;
				} else {
					termid=termidx;
				}				
				phrase_term.termid.push(termid);
				phrase_term.termlength.push(splitted.lengths[i]);
			}
		}
		j++;
	}
	phrase_term.key=phrase;
	//remove ending wildcard
	var P=phrase_term , T=null;
	do {
		T=terms[P.termid[P.termid.length-1]];
		if (!T) break;
		if (T.wildcard) P.termid.pop(); else break;
	} while(T);		
	return phrase_term;
}


var newQuery =function(engine,query,opts,cb) {
	var Q=engine.queryCache[query];
	if (Q) {
		cb(Q);
		return;
	}

	opts=opts||{};
	query=trimSpace(engine,query);

	var phrases=query,phrases=[];
	if (typeof query=='string' && query) {
		phrases=parseQuery(query,opts.phrase_sep || "");
	}
	
	var phrase_terms=[], terms=[],variants=[],operators=[];
	var pc=0;//phrase count
	var that=this,taskqueue=[];
	for  (var i=0;i<phrases.length;i++) {
		var op=getOperator(phrases[pc]);
		if (op) phrases[pc]=phrases[pc].substring(1);

		/* auto add + for natural order ?*/
		//if (!opts.rank && op!='exclude' &&i) op='include';
		operators.push(op);

		taskqueue.push(function(data){

			if (typeof data=='object' && data.__empty) {
				//not pushing the first call
			} else {
				if (engine.mergePostings || data.termid.length!=0) {
					phrase_terms.push(data);
					pc++;
				}
			}

			if (isSimplePhrase(phrases[pc]) && engine.mergePostings ) {
				
				fastPhrase(engine,phrases[pc],function(res){
					taskqueue.shift()(res);
				});
			} else {
				taskqueue.shift()(slowPhrase(engine,terms,phrases[pc] ));
			}
		});
	}

	//last call to child load
	taskqueue.push(function(data){
		if (engine.mergePostings || (data.termid && data.termid.length!=0))  {
			phrase_terms.push(data);
			pc++;
		}
		opts.op=operators;
		cb.call(that,Q);
	});


	var Q={dbname:engine.dbname,engine:engine,opts:opts,query:query,
		phrases:phrase_terms,terms:terms,segWithHit:segWithHit,rawresult:[]};
	Q.tokenize=function() {return engine.analyzer.tokenize.apply(engine,arguments);}
	Q.isSkip=function() {return engine.analyzer.isSkip.apply(engine,arguments);}
	Q.normalize=function() {return engine.analyzer.normalize.apply(engine,arguments);}	

	//invoke task queue
	taskqueue.shift()({__empty:true});
}
var postingPathFromTokens=function(engine,tokens) {
	var alltokens=engine.get("tokens");

	var tokenIds=tokens.map(function(t){ return 1+alltokens.indexOf(t)});
	var postingid=[];
	for (var i=0;i<tokenIds.length;i++) {
		postingid.push( tokenIds[i]); // tokenId==0 , empty token
	}
	return postingid.map(function(t){return ["postings",t]});
}
var loadPostings=function(engine,tokens,cb) {
	var toloadtokens=tokens.filter(function(t){
		return !engine.postingCache[t.key]; //already in cache
	});
	if (toloadtokens.length==0) {
		cb();
		return;
	}
	var postingPaths=postingPathFromTokens(engine,tokens.map(function(t){return t.key}));
	engine.get(postingPaths,function(postings){
		postings.map(function(p,i) { tokens[i].posting=p });
		if (cb) cb();
	});
}
var groupBy=function(Q,posting) {
	phrases.forEach(function(P){
		var key=P.key;
		var docfreq=docfreqcache[key];
		if (!docfreq) docfreq=docfreqcache[key]={};
		if (!docfreq[that.groupunit]) {
			docfreq[that.groupunit]={doclist:null,freq:null};
		}		
		if (P.posting) {
			var res=matchPosting(engine,P.posting);
			P.freq=res.freq;
			P.docs=res.docs;
		} else {
			P.docs=[];
			P.freq=[];
		}
		docfreq[that.groupunit]={doclist:P.docs,freq:P.freq};
	});
	return this;
}
var groupByFolder=function(engine,filehits) {
	var files=engine.get("filenames");
	var prevfolder="",hits=0,out=[];
	for (var i=0;i<filehits.length;i++) {
		var fn=files[i];
		var folder=fn.substring(0,fn.indexOf('/'));
		if (prevfolder && prevfolder!=folder) {
			out.push(hits);
			hits=0;
		}
		hits+=filehits[i].length;
		prevfolder=folder;
	}
	out.push(hits);
	return out;
}
var phrase_intersect=function(engine,Q) {
	var intersected=null;
	var fileoffsets=Q.engine.get("fileoffsets");
	var empty=[],emptycount=0,hashit=0;
	for (var i=0;i<Q.phrases.length;i++) {
		var byfile=plist.groupbyposting2(Q.phrases[i].posting,fileoffsets);
		if (byfile.length) byfile.shift();
		if (byfile.length) byfile.pop();
		byfile.pop();
		if (intersected==null) {
			intersected=byfile;
		} else {
			for (var j=0;j<byfile.length;j++) {
				if (!(byfile[j].length && intersected[j] && intersected[j].length)) {
					intersected[j]=empty; //reuse empty array
					emptycount++;
				} else hashit++;
			}
		}
	}

	Q.byFile=intersected;
	Q.byFolder=groupByFolder(engine,Q.byFile);
	var out=[];
	//calculate new rawposting
	for (var i=0;i<Q.byFile.length;i++) {
		if (Q.byFile[i].length) out=out.concat(Q.byFile[i]);
	}
	Q.rawresult=out;
	countFolderFile(Q);
}
var countFolderFile=function(Q) {
	Q.fileWithHitCount=0;
	Q.byFile.map(function(f){if (f.length) Q.fileWithHitCount++});
			
	Q.folderWithHitCount=0;
	Q.byFolder.map(function(f){if (f) Q.folderWithHitCount++});
}

var main=function(engine,q,opts,cb){

	var starttime=new Date();
	var meta=engine.get("meta");
	if (meta.normalize && engine.analyzer.setNormalizeTable) {
		meta.normalizeObj=engine.analyzer.setNormalizeTable(meta.normalize,meta.normalizeObj);
	}
	if (typeof opts=="function") cb=opts;
	opts=opts||{};
	
	newQuery(engine,q,opts,function(Q){ 
		if (!Q) {
			engine.searchtime=new Date()-starttime;
			engine.totaltime=engine.searchtime;
			if (engine.context) cb.apply(engine.context,["empty result",{rawresult:[]}]);
			else cb("empty result",{rawresult:[]});
			return;
		};
		engine.queryCache[q]=Q;
		if (Q.phrases.length) {
			
			loadPostings(engine,Q.terms,function(){
				if (!Q.phrases[0].posting) {
					engine.searchtime=new Date()-starttime;
					engine.totaltime=engine.searchtime;
					cb.apply(engine.context,["no such posting",{rawresult:[]}]);
					return;			
				}
				
				if (!Q.phrases[0].posting.length) { //
					Q.phrases.forEach(loadPhrase.bind(Q));
				}
				if (Q.phrases.length==1) {
					Q.rawresult=Q.phrases[0].posting;
				} else {
					phrase_intersect(engine,Q);
				}
				var fileoffsets=Q.engine.get("fileoffsets");
				//console.log("search opts "+JSON.stringify(opts));

				if (!Q.byFile && Q.rawresult && Q.rawresult.length && !opts.nogroup) {
					Q.byFile=plist.groupbyposting2(Q.rawresult, fileoffsets);
					Q.byFile.shift();Q.byFile.pop();
					Q.byFolder=groupByFolder(engine,Q.byFile);

					countFolderFile(Q);
				}

				if (opts.range) {
					engine.searchtime=new Date()-starttime;
					excerpt.resultlist(engine,Q,opts,function(data) { 
						//console.log("excerpt ok");
						Q.excerpt=data;
						engine.totaltime=new Date()-starttime;
						cb.apply(engine.context,[0,Q]);
					});
				} else {
					engine.searchtime=new Date()-starttime;
					engine.totaltime=new Date()-starttime;
					cb.apply(engine.context,[0,Q]);
				}
			});
		} else { //empty search
			engine.searchtime=new Date()-starttime;
			engine.totaltime=new Date()-starttime;
			cb.apply(engine.context,[0,Q]);
		};
	});
}

main.splitPhrase=splitPhrase; //just for debug
module.exports=main;
},{"./boolsearch":16,"./excerpt":18,"./plist":20}],"ksana-analyzer":[function(require,module,exports){
/* 
  custom func for building and searching ydb

  keep all version
  
  getAPI(version); //return hash of functions , if ver is omit , return lastest
	
  postings2Tree      // if version is not supply, get lastest
  tokenize(text,api) // convert a string into tokens(depends on other api)
  normalizeToken     // stemming and etc
  isSpaceChar        // not a searchable token
  isSkipChar         // 0 vpos

  for client and server side
  
*/
var configs=require("./configs");
var config_simple="simple1";
var optimize=function(json,config) {
	config=config||config_simple;
	return json;
}

var getAPI=function(config) {
	config=config||config_simple;
	var func=configs[config].func;
	func.optimize=optimize;
	if (config=="simple1") {
		//add common custom function here
	} else if (config=="tibetan1") {

	} else throw "config "+config +"not supported";

	return func;
}

module.exports={getAPI:getAPI};
},{"./configs":1}],"ksana-database":[function(require,module,exports){
module.exports=require("./kde");
},{"./kde":4}],"ksana-jsonrom":[function(require,module,exports){
module.exports={
	open:require("./kdb")
}

},{"./kdb":12}],"ksana-search":[function(require,module,exports){
//
// Ksana Search Engine.

//  need a KDE instance to be functional

var bsearch=require("./bsearch");
var dosearch=require("./search");

var prepareEngineForSearch=function(engine,cb){
	if (engine.get("tokens") && engine.analyzer) {
		cb();
		return;
	}

	engine.get([["tokens"],["postingslength"]],function(){
		if (!engine.analyzer) {
			var analyzer=require("ksana-analyzer");
			var config=engine.get("meta").config;
			engine.analyzer=analyzer.getAPI(config);			
		}
		cb();
	});
}

var openEngine=function(dbid_or_engine,cb,context) {
	var localfile=(typeof File!=="undefined" && dbid_or_engine.constructor==File);
	if (typeof dbid_or_engine=="string" || localfile) {//browser only
		var kde=require("ksana-database");

		kde.open(dbid_or_engine,function(err,engine){

			if (!err) {
				prepareEngineForSearch(engine,function(){
					cb.call(context,engine);
				});
			} else throw err;
		});
	} else {
		prepareEngineForSearch(dbid_or_engine,function(){
			cb.call(context,dbid_or_engine);
		});
	}
}
var _search=function(engine,q,opts,cb,context) {

	openEngine(engine,function(engine){

		if (typeof opts=="function") { //user didn't supply options
			if (typeof cb=="object")context=cb;
			cb=opts;
			opts={};
		}
		if (!opts) opts={};
		opts.q=q;
		opts.dbid=engine;
		return dosearch(engine,q,opts,cb);
	});
}
var fetchtext=require("./fetchtext");
var _highlightSeg=function(engine,fileid,segid,opts,cb,context){
	openEngine(engine,function(engine){
		/*
		if (!opts.q) {
			if (!engine.analyzer) {
				var analyzer=require("ksana-analyzer");
				var config=engine.get("meta").config;
				engine.analyzer=analyzer.getAPI(config);			
			}
			fetchtext.seg(engine,fileid,segid,opts,cb,context);
		} else {
		*/
			_search(engine,opts.q,opts,function(err,Q){
				api.excerpt.highlightSeg(Q,fileid,segid,opts,cb,context);
			});			
		//}		
	});
}


var _highlightRange=function(engine,opts,cb,context){
	openEngine(engine,function(engine){
		if (opts.q) {
			_search(engine,opts.q,opts,function(err,Q){
				api.excerpt.highlightRange(Q,opts.start,opts.end,opts,cb,context);
			});
		} else {
			fetchtext.range.call(engine,opts.start,opts.end,cb,context);
		}		
	})
}

var _highlightPage=function(_engine,opts,cb,context){
	openEngine(_engine,function(engine){
		fetchtext.pageRange(engine,opts.id,function(res){
			if (!res) {
				console.error("error page",opts.page)
				return;
			}
			if (opts.q) {
				_search(engine,opts.q,opts,function(err,Q){
					api.excerpt.highlightRange(Q,res.start,res.end,opts,cb,context);
				});
			} else {
				fetchtext.range.call(engine,res.start,res.end,cb,context);
			}					
		})
	})
}

var _highlightFile=function(engine,fileid,opts,cb,context){
	openEngine(engine,function(engine){
		if (!opts.q) opts.q=""; 
		_search(engine,opts.q,opts,function(err,Q){
			api.excerpt.highlightFile(Q,fileid,opts,cb,context);
		});		
	})
}

var _searchInTag=function(engine,opts,cb,context){

}

var api={
	search:_search
	,highlightSeg:_highlightSeg
	,highlightFile:_highlightFile
	,highlightPage:_highlightPage
	,highlightRange:_highlightRange
	,searchInTag:_searchInTag
	,excerpt:require("./excerpt")	
}
module.exports=api;
},{"./bsearch":17,"./excerpt":18,"./fetchtext":19,"./search":21,"ksana-analyzer":"ksana-analyzer","ksana-database":"ksana-database"}],"ksana-simple-api":[function(require,module,exports){
/*
	TODO : fetch tags
	render tags

*/

var kse=require("ksana-search");
var plist=require("ksana-search/plist");
var kde=require("ksana-database");
var bsearch=kde.bsearch;

//make sure db is opened
var nextUti=function(opts,cb){
	kde.open(opts.db,function(err,db){
		if (err) cb(err);
		else cb(0,db.nextTxtid(opts.uti));
	});		
}
//make sure db is opened
var prevUti=function(opts,cb){
	kde.open(opts.db,function(err,db){
		if (err) cb(err);
		else cb(0,db.prevTxtid(opts.uti));
	});		
}

var _iterate=function(funcname,opts,cb,context) {
	kse.search(opts.db,opts.q,function(err,res){
		var db=res.engine;
		if (err) {
			cb(err);
			return;
		}
		var out=[];
		var next=opts.uti;
		var count=opts.count||10;
		var func=db[funcname];
		for (var i=0;i<count;i++) {
			var next=func(next);
			if (!next) break;
			out.push(next);
		}
		opts.uti=out;
		fetch(opts,cb,context);
	});
}

var next=function(opts,cb,context) {
	_iterate("nextTxtid",opts,cb,context);
}
var prev=function(opts,cb,context) {
	_iterate("prevTxtid",opts,cb,context);
}

var toc=function(opts,cb,context) {
	var that=this;
	kse.search(opts.db,opts.q,{},function(err,res){
		if (err) {
			cb(err);
		} else {
			var tocname=opts.tocname||res.engine.get("meta").tocs[0];
			res.engine.getTOC({tocname:tocname},function(data){
				cb(0,{name:tocname,toc:data,hits:res.rawresult,tocname:tocname});
			});
		}
	});
}

var txtids2key=function(txtids) {
	if (typeof txtids!="object") {
		txtids=[txtids];
	}
	var out=[];
	for (var i=0;i<txtids.length;i++) {
		var fseg=this.txtid2fileSeg(txtids[i]);
		out.push(["filecontents",fseg.file,fseg.seg]);
	}
	return out;
}

var hits2markup=function( Q,file,seg, text){
	var seg1=this.fileSegToAbsSeg(file,seg);
	var vpos=this.absSegToVpos(seg1);
	var vpos2=this.absSegToVpos(seg1+1);
	var hits=kse.excerpt.realHitInRange(Q,vpos,vpos2,text);
	return hits;
}
var fetch=function(opts,cb,context) {
	var that=this;
	if (!opts.uti && !opts.vpos) {
		cb("missing uti or vpos");
		return;
	}
	kse.search(opts.db,opts.q,{},function(err,res){
		if (err) {
			cb(err);
		} else {
			var uti=opts.uti;
			if (!uti) {
				uti=[];
				var vpos=opts.vpos;
				if (typeof vpos!="object") vpos=[vpos];
				for (var i=0;i<vpos.length;i++) {
					var u=res.engine.vpos2txtid(vpos[i]);
					uti.push(u);
				}
			}
			if (typeof uti!=="object") uti=[uti];
			var keys=txtids2key.call(res.engine,uti);
			if (typeof keys[0][1]=="undefined") {
				cb("uti not found: "+uti+" in "+opts.db);
				return;
			}

			res.engine.get(keys,function(data){
				var out=[];
				for (var i=0;i<keys.length;i++) {
					var hits=hits2markup.call(res.engine,res,keys[i][1],keys[i][2],data[i]);
					var vpos=res.engine.txtid2vpos(uti[i]);
					out.push({uti:uti[i],text:data[i],hits:hits,vpos:vpos});
				}
				cb(0,out);
			});
		}
	});	
}

var excerpt2defaultoutput=function(excerpt) {
	var out=[];
	for (var i=0;i<excerpt.length;i++) {
		var ex=excerpt[i];
		var vpos=this.fileSegToVpos(ex.file,ex.seg);
		var txtid=this.vpos2txtid(vpos);
		out.push({uti:txtid,text:ex.text,hits:ex.realHits});
	}
	return out;
}
//use startfrom to specifiy starting posting
var excerpt=function(opts,cb,context) {
	var that=this;
	if (!opts.q) {
		cb("missing q");
		return;
	}
	kse.search(opts.db,opts.q,{nohighlight:true,range:{from:opts.from}},
		function(err,res){
		if (err) {
			cb(err);
		} else {
			//console.log(res.rawresult)
			cb(0,excerpt2defaultoutput.call(res.engine,res.excerpt));
		}
	});	
}

var beginWith=function(s,txtids) {
	var out=[];
	for (var i=1;i<s.length;i++) {
		tofind=s.substr(0,i);
		var idx=bsearch(txtids,tofind);
		if (idx>-1) out.push(txtids[idx]);
	}
	return out;
}
var scan=function(opts,cb,context) {
	kse.search(opts.db,opts.q,{},function(err,res){
		if (err) {
			cb(err);
			return;
		}
		var db=res.engine;
		var out=[];
		var segnames=db.get("segnames");
		for (var i=0;i<opts.sentence.length;i++) {
			var q=opts.sentence.substr(i);
			out=out.concat(beginWith(q,segnames));
		}
		cb(0,out);
	});
}

var filterField=function(items,regex,filterfunc) {
	if (!regex) return items;
	var reg=new RegExp(regex);
	var out=[];
	filterfunc=filterfunc|| reg.test.bind(reg);
	for (var i=0;i<items.length;i++) {
		var item=items[i];
		if (filterfunc(item,regex)) {
			out.push(item);
		}
	}
	return out;
}

var groupByField=function(db,rawresult,field,regex,filterfunc,cb) {
	db.get(["fields",field],function(fields){

		db.get([["fields",field+"_vpos"],["fields",field+"_depth"]],function(res){
			var fieldsvpos=res[0],fieldsdepth=res[1];
			if (!rawresult||!rawresult.length) {
				var matches=filterField(fields,regex,filterfunc);
				cb(0,matches,null,fieldsvpos);
			} else {
				var fieldhits= plist.groupbyposting2(rawresult, fieldsvpos);
				fieldhits.shift();
		    var matches=[],hits=[],vpos=[];
		    var reg=new RegExp(regex);
		    filterfunc=filterfunc|| reg.test.bind(reg);
		    var prevdepth=65535,inrange=false;
		    for (var i=0;i<fieldhits.length;i++) {
		      var fieldhit=fieldhits[i];
		      var item=fields[i];

		      //all depth less than prevdepth will considered in range.
		      if (filterfunc(item,regex)) {
		      	inrange=true;
		      	if (prevdepth>fieldsdepth[i]) {
		      		prevdepth=fieldsdepth[i];
		      	}
		      } else if (inrange) {
		      	if (fieldsdepth[i]==prevdepth) {//turn off inrange
		      		inrange=false;
		      		prevdepth=65535;
		      	}
		      }

		      if (!fieldhit || !fieldhit.length) continue;
		      if (inrange) {
		      	matches.push(item);
		      	hits.push(fieldhit);
		      	vpos.push(fieldhit[0]);
		      }
		    }		
				cb(0,matches,hits,vpos);
			};
		});
	});
}

var groupByTxtid=function(db,rawresult,regex,filterfunc,cb) {
	if (!rawresult||!rawresult.length) {
		//no q , filter all field
			var values=db.get("segnames");
			var matches=filterField(values,regex,filterfunc);
			cb(0,matches);
	} else {
		var segoffsets=db.get("segoffsets");
    var seghits= plist.groupbyposting2(rawresult, segoffsets); 
    var txtid=db.get("segnames");
    var matches=[],hits=[];
    var reg=new RegExp(regex);
		 filterfunc=filterfunc|| reg.test.bind(reg);
    for (var i=0;i<seghits.length;i++) {
      var seghit=seghits[i];
      if (!seghit || !seghit.length) continue;
      var item=txtid[i-1];
		  if (filterfunc(item,regex)) {
      	matches.push(item);
      	hits.push(seghit);
      }
    }
    cb(0,matches,hits);
	}
}

var filter=function(opts,cb) {
	kse.search(opts.db,opts.q,{},function(err,res){
		if (err) {
			cb(err);
			return;
		}
		var db=res.engine;
		filterfunc=opts.filterfunc||null;
		if (opts.field) {
			groupByField(db,res.rawresult,opts.field,opts.regex,filterfunc,cb);
		} else {
			groupByTxtid(db,res.rawresult,opts.regex,filterfunc,cb);
		}
	});
}
var listkdb=kde.listkdb;


var fillHits=function(searchable,tofind,cb) {
	var taskqueue=[],out=[];
	for (var i=0;i<searchable.length;i++) {
		(function(dbname){
			taskqueue.push(function(err,data){
				if (typeof data=='object' && data.__empty) {
					//not pushing the first call
				} else {
					searchable.map(function(db){
						if (db.shortname===data.dbname) {
							db.hits=data.rawresult.length;
						}
					})
				}
				kse.search(dbname,tofind,taskqueue.shift(0,data));
			});;
		})(searchable[i].fullname)
	};

	taskqueue.push(function(err,data){

		searchable.sort(function(a,b){
			return b.hits-a.hits;
		});

		cb(searchable);
	});
	taskqueue.shift()(0,{__empty:true});
}
var tryOpen=function(kdbid,cb){
	if ((window.location.protocol==="file:" && typeof process==="undefined") 
	|| typeof io==="undefined" ) {
		cb("local file mode");
		return;
	}
	kde.open(kdbid,function(err){
		cb(err);
	});
}
var renderHits=function(text,hits,func){
  var ex=0,out=[];
  hits=hits||[];
  for (var i=0;i<hits.length;i++) {
    var now=hits[i][0];
    if (now>ex) {
      out.push(func({key:i},text.substring(ex,now)));
    }
    out.push(func({key:"h"+i, className:"hl"+hits[i][2]},text.substr(now,hits[i][1])));
    ex=now+=hits[i][1];
  }
  out.push(func({key:i+1},text.substr(ex)));
  return out;
}  

var get=function(dbname,key,cb) { //low level get
	var db=kde.open(dbname,function(err,db){
		if (err) {
			cb(err);
		} else {
			db.get(key,cb);
		}
	});
}
var vpos2txtid=function(dbname,vpos,cb){
	var db=kde.open(dbname,function(err,db){
		if (err) cb(err);
		else cb(0,db.vpos2txtid(vpos));
	});
}
var txtid2vpos=function(dbname,txtid,cb){
	var db=kde.open(dbname,function(err,db){
		if (err) cb(err);
		else cb(0,db.txtid2vpos(txtid));
	});
}
var API={
	next:next,
	prev:prev,
	nextUti:nextUti,
	prevUti:prevUti,
	vpos2txtid:vpos2txtid,
	txtid2vpos:txtid2vpos,	
	toc:toc,
	fetch:fetch,
	excerpt:excerpt,
	scan:scan,
	filter:filter,
	listkdb:listkdb,
	fillHits:fillHits,
	renderHits:renderHits,
	tryOpen:tryOpen,
	get:get
}
module.exports=API;
},{"ksana-database":"ksana-database","ksana-search":"ksana-search","ksana-search/plist":20}]},{},[]);
