exports.handler = (event, context, callback) => {
    switch (event.request.type) {
        case "LaunchRequest":
        context.succeed(
          generateResponse(
            buildSpeechletResponse("Welcome to Hello World Greeter.", false)
          )
        )
            break;
        case "IntentRequest":
            switch (event.request.intent.name) {
                case "GreetHelloWorld":
                    context.succeed(
          generateResponse(
            buildSpeechletResponse("Hello World", true)
          )
        )
                    break;
            }
            break;
    }
}


buildSpeechletResponse = (outputText, shouldEndSession) => {

  return {
    outputSpeech: {
      type: "PlainText",
      text: outputText
    },
    shouldEndSession: shouldEndSession
  }

}

generateResponse = (speechletResponse) => {

  return {
    version: "1.0",
    response: speechletResponse
  }

}
