
var https = require('https');

exports.handler = (event, context, callback) => {
    try {
        
        if (event.request.type === "LaunchRequest") {
            onLaunch(function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

function onLaunch(callback) {
    getWelcomeResponse(callback);
}


function onIntent(intentRequest, session, callback) {

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    if ("fetchPrice" === intentName) {
        handleRequest(intent, session, callback);
    } else if ("AMAZON.StopIntent" === intentName) {
        handleFinishSessionRequest(intent, session, callback);
    } else {
        throw "Invalid intent";
    }
}

function handleFinishSessionRequest(intent, session, callback) {
    callback(session.attributes,
        buildSpeechletResponse("CryptoOracle will Exit. Good bye!", "", true));
}

function getWelcomeResponse(callback) {
    var sessionAttributes = {},
        speechOutput = " Crypto Oracle can tell you latest prices of the hottest cryptocurrencies",
        shouldEndSession = false,
        repromptText = "";
    callback(sessionAttributes,
        buildSpeechletResponse(speechOutput, repromptText, shouldEndSession));
}

function handleRequest(intent, session, callback) {
    console.log("INSIDE Handle Request");
    var options = {
        host: 'api.coinmarketcap.com',
        port: 443,
        path: '/v1/ticker/' + intent.slots.currencyName.value + "/" ,
        method: 'GET',
        headers: {
        'Content-Type': 'application/json'
        }
    };

    var req = https.request(options, function (res) {
        res.setEncoding('utf-8');
        var responseString = '';
        res.on('data', function (data) {
            responseString += data;
        });

        res.on('end', function () {
            
            var resp = JSON.parse(responseString);
            console.log(resp);
            var sessionAttributes = {},
        speechOutput = "The price of " + intent.slots.currencyName.value + " is . . " + resp[0].price_usd + " dollars",
        shouldEndSession = false,
        repromptText = "";
    callback(sessionAttributes,
        buildSpeechletResponse(speechOutput, repromptText, shouldEndSession));
        });

    });

    req.end();
}

// ------- Helper functions -------


function buildSpeechletResponse(output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}