var React=require("react");
var actions=require("./actions");
var Controls=React.createClass({
  	add:function() {
		actions.add(Math.random().toString().substr(2,5));
	}
	,clear:function() {
		actions.clear();
	}
	,render:function() {
		return <div>
      		<button onClick={this.add}>Add</button>
      		<button onClick={this.clear}>Clear</button>
      	</div>
	}
});

module.exports=Controls;