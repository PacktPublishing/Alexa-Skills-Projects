var https = require('https');
var firebaseHost = "pleasefillyourownfirebasehost.firebaseio.com";


exports.handler = (event, context, callback) => {
    try {
        if (event.request.type === "IntentRequest") {
            if ("OneShotFetchTemperatureIntent" === event.request.intent.name) {
                    fbGet("/Temperature").then(res => {
                        context.succeed(buildResponse(buildSpeechletResponse("The temperature is . . " + res + " . degrees", true)));
                    })
            } else {
                throw "Invalid intent";
            }
        }
    }
    catch(e) {
        context.fail("Exception: " + e);
    }
};


function fbGet(key){
  return new Promise((resolve, reject) => {
    var options = {
      hostname: firebaseHost,
      port: 443,
      path: key + ".json",
      method: 'GET'
    };
    var req = https.request(options, function (res) {
      res.setEncoding('utf8');
      var body = '';
      res.on('data', function(chunk) {
        body += chunk;
      });
      res.on('end', function() {
        resolve(JSON.parse(body))
      });
    });
    req.end();
    req.on('error', reject);
  });
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