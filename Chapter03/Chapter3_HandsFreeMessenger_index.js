var sid = 'ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
var token = '4bXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
var sender = '+31XXXXXXXXXX';

var https = require('https');
var queryString = require('querystring');

exports.handler = function (event, context) {
    try {

        if (event.request.type === "LaunchRequest") {
            onLaunch(function callback(speechletResponse) {
                        context.succeed(buildResponse(speechletResponse));
                     });
        }  else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                     function callback(speechletResponse) {
                         context.succeed(buildResponse(speechletResponse));
                     });
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};


function SendMessage(to, body, callback) {

    var message = {
        To: to,
        From: sender,
        Body: body
    };

    var messageString = queryString.stringify(message);

    var options = {
        host: 'api.twilio.com',
        port: 443,
        path: '/2010-04-01/Accounts/' + sid + '/Messages.json',
        method: 'POST',
        headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(messageString),
                    'Authorization': 'Basic ' + new Buffer(sid + ':' + token).toString('base64')
                 }
    };

    var req = https.request(options, function (res) {
        res.setEncoding('utf-8');
        var responseString = '';
        res.on('data', function (data) {
            responseString += data;
        });

        res.on('end', function () {
			var speechOutput = "Message sent.";
			var shouldEndSession = true;
			callback(buildSpeechletResponse(speechOutput, shouldEndSession));
        });

    });

    req.write(messageString);
    req.end();
}

function onLaunch(callback) {
    var output = "Welcome to HandsFree Messenger.";
    var endSession = false;
    callback(buildSpeechletResponse(output, endSession));
}


function onIntent(intentRequest, callback) {
    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;
    if("SendMessage" === intentName){
        var text = intent.slots.Text.value;
        var recipient = '+31XXXXXXXXXX';
        SendMessage(recipient, text,callback);
    } else {
        throw "Intent not recognized";
    }
}

//-------Helper Methods---------//

function buildSpeechletResponse(output, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(speechletResponse) {
    return {
        version: "1.0",
        response: speechletResponse
    };
}
