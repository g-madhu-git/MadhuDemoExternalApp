var express = require('express'),
    bodyParser = require('body-parser'),
    path = require('path');
var app = express();
var crypto = require("crypto");
require('dotenv').config(); // To load environment variables like CANVAS_CONSUMER_SECRET
var consumerSecretApp = process.env.CANVAS_CONSUMER_SECRET;

console.log('consumer secret - ' + consumerSecretApp);

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
    // Ensure the signed_request is present in the body
    if (!req.body.signed_request) {
        return res.status(400).send("signed_request is required");
    }

    // Split the signed request into its components (signature and payload)
    var bodyArray = req.body.signed_request.split(".");
    if (bodyArray.length !== 2) {
        return res.status(400).send("Invalid signed_request format");
    }

    var consumerSecret = bodyArray[0];
    var encoded_envelope = bodyArray[1];

    // Verify the signature with the consumer secret
    var check = crypto.createHmac("sha256", consumerSecretApp)
                      .update(encoded_envelope)
                      .digest("base64");

    // Compare signatures to ensure authenticity
    if (check === consumerSecret) {
        try {
            // Decode and parse the envelope data
            var envelope = JSON.parse(Buffer.from(encoded_envelope, "base64").toString("ascii"));

            console.log("Successfully got the session object:");
            console.log(envelope);

            // Pass the Salesforce context to the EJS template
            res.render('index', {
                firstName: envelope.context.user.firstName,
                req: JSON.stringify(envelope),
                canvasContext: envelope.context
            });
        } catch (error) {
            console.error("Error parsing envelope:", error);
            res.status(500).send("Error processing the signed_request");
        }
    } else {
        console.error("Signature mismatch. Authentication failed.");
        res.status(400).send("Authentication failed");
    }
});

// Start the Express server
app.listen(3000, function () {
    console.log("Server is listening on port 3000!");
});
