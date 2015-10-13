var Reflux=require("reflux");
var actions=require("./actions");
var store=Reflux.createStore({
	listenables:actions
	,data:[]
	,onShowDef:function(term) {
		var def=dictdata[0].tdefinitions;
		this.trigger(def); 
	}
});

module.exports=store;