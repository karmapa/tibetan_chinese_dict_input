var React=require("react");
var Reflux=require("reflux");
var store=require("./store");

var Definitions=React.createClass({
	mixins:[Reflux.listenTo(store,"onStore")]
	,getInitialState:function() {
		return {def:"search and click on left panel"}
	}
	,onStore:function(def) {
		this.setState({def:def});
	}
	,render : function(){
		return <div>{this.state.def}</div>
	}
})
module.exports=Definitions;