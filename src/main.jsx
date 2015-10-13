var React=require("react");
var TermSearch=require("./termsearch");
var Definitions=require("./definitions");
var styles={
	container : {"display":"flex"},
	leftpanel : {"flex":1},
	rightpanel :{"flex":3}
}
var Maincomponent = React.createClass({
  render: function() {
    return <div  style={styles.container}>
    	<div style={styles.leftpanel}>
      <TermSearch/>
      </div>
      <div style={styles.rightpanel}>
      <Definitions/>
      </div>
    </div>;
  }
});
module.exports=Maincomponent;