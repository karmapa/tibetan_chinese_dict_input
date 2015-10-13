var React=require("react");
var Reflux=require("reflux");
var store=require("./store");

var Listview = React.createClass({
	mixins:[Reflux.listenTo(store,"onStore")]
	,getInitialState:function(){
		return {data:[]};
	}
	,onStore:function(data) {
		this.setState({data:data});
	}
	,renderItem:function(item,idx) {
		return <div>{idx}.{item}</div>
	}
	,render: function() {
		return <div>
			{this.state.data.map(this.renderItem)}
		</div>;
	}
});
module.exports=Listview