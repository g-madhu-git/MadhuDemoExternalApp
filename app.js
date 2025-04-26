var express = require('express'),
  bodyParser = require('body-parser'),
  path = require('path') 
var app = express();
var crypto = require("crypto");
require('dotenv').config(); //NOT REQ [ADDED  CANVAS_CONSUMER_SECRET as an environment variable on HOST] - Required for LOCALHOST
var consumerSecretApp = process.env.CANVAS_CONSUMER_SECRET;

console.log('consumer secret - '+consumerSecretApp);

app.use(express.static(path.join(__dirname, 'views')));
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded());

app.use(bodyParser.json());
 

app.get('/', function (req, res) {
  res.render('hello');
});

app.post('/', function (req, res) { 
  var bodyArray = req.body.signed_request.split(".");
  var consumerSecret = bodyArray[0];
  var encoded_envelope = bodyArray[1];

  var check = crypto.createHmac("sha256", consumerSecretApp).update(encoded_envelope).digest("base64");

  if (check === consumerSecret) { 
      var envelope = JSON.parse(new Buffer(encoded_envelope, "base64").toString("ascii"));
      console.log("got the session object:");
      console.log(envelope);
      
      // Send Salesforce context to EJS template
      res.render('index', { 
          title: envelope.context.user.userName, 
          req : JSON.stringify(envelope), 
          canvasContext: envelope.context 
      });
  } else {
      res.send("authentication failed");
  } 
});
 
app.listen(3000 , function () {
	console.log ("server is listening!!!");
} );