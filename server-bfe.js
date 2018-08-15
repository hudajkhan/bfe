//   Minimal BIBFRAME Editor Node.js server. To run from the command-line:
//   node server-bfe.js

var port = 8000;
var express = require('express'),
http = require('http'),
    url = require('url');
 var request = require('request');
var app = express();

app.use(express.static(__dirname + '/'));


app.get('/qalcgft', function(req,res) {
	var url_parts = url.parse(req.url, true);
	var query = url_parts.query;
	var search = url_parts.search;
  //modify the url in any way you want
  //var newurl = 'http://elr37-dev.library.cornell.edu/qa/search/linked_data/locgenres_ld4l_cache' + search;
  var newurl = 'http://lookup.ld4l.org/qa/search/linked_data/locgenres_ld4l_cache' + search;
  request(newurl).pipe(res);
});



app.listen(port);







console.log('BIBFRAME Editor running on ' + port);
console.log('Press Ctrl + C to stop.');


