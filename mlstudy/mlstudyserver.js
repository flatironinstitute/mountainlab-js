var express = require('express');

var app = express();
app.set('port', (process.env.PORT || 5081));
app.use(express.static(__dirname+'/web'));

app.listen(app.get('port'), function() {
	console.info('mlstudy is running on port:: '+app.get('port'), {port:app.get('port')});
});

