var express = require('express'),
    bodyParser = require('body-parser'),
    path = require('path');
var app = express();
var crypto = require("crypto");
require('dotenv').config(); // To load environment variables like CANVAS_CONSUMER_SECRET
var consumerSecretApp = process.env.CANVAS_CONSUMER_SECRET;

app.use(express.static(path.join(__dirname, 'views')));
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Route for rendering the initial view
app.get('/', function (req, res) {
    res.render('hello');
});

// Route for handling POST request with signed_request
app.post('/', function (req, res) {
    if (!req.body.signed_request) {
        return res.status(400).send("signed_request is required");
    }

    var bodyArray = req.body.signed_request.split(".");
    if (bodyArray.length !== 2) {
        return res.status(400).send("Invalid signed_request format");
    }

    var consumerSecret = bodyArray[0];
    var encoded_envelope = bodyArray[1];
    var check = crypto.createHmac("sha256", consumerSecretApp)
                      .update(encoded_envelope)
                      .digest("base64");

    if (check === consumerSecret) {
        try {
            var json_envelope = new Buffer.from(encoded_envelope, "base64").toString("utf8");
            let parsedJsonEnvelop = JSON.parse(json_envelope);
            res.render('index', {
                firstName: parsedJsonEnvelop.context.user.firstName,
                req: parsedJsonEnvelop,
                canvasContext: parsedJsonEnvelop.context
            });
        } catch (error) {
            console.error("Error parsing json_envelope:", error);
            res.status(500).send("Error processing the signed_request");
        }
    } else {
        console.error("Signature mismatch. Authentication failed.");
        res.status(400).send("Authentication failed");
    }
});

// Salesforce credentials and connection
const jsforce = require('jsforce');
const { CometD } = require('cometd-nodejs-client');

const conn = new jsforce.Connection({
    loginUrl: process.env.SF_LOGIN_URL
});

conn.login(process.env.SF_USER_NAME, process.env.SF_PASSWORD + process.env.SF_TOKEN, (err) => {
    if (err) return console.error('Login error:', err);

    console.log('Logged into Salesforce');

    const cometd = new CometD();

    cometd.configure({
        url: `${conn.instanceUrl}/cometd/60.0/`,
        requestHeaders: {
            Authorization: `Bearer ${conn.accessToken}`
        }
    });

    cometd.handshake(handshakeReply => {
        if (handshakeReply.successful) {
            console.log('Handshake successful');
            cometd.subscribe('/event/Comms_Platform__e', message => {
                const phoneNumber = message.data.payload.PhoneNumber__c;
                console.log('Received phone number event:', phoneNumber);
            });
        } else {
            console.error('Handshake failed:', handshakeReply);
        }
    });
});

app.listen(3000, function () {
    console.log("Server is listening on port 3000!");
});
