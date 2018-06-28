var AWS = require('aws-sdk');
var docClient = new AWS.DynamoDB.DocumentClient();
//questions is an array of json objects
var questions = [
    {
        "World War I began in which year?": [
            "1923",
            "1938",
            "1917",
            "1914"
        ]
    },
    {
        "Adolf Hitler was born in which country?": [
            "France",
            "Austria",
            "Hungary",
            "Germany"
        ]
    },
    {
        "The battle of Hastings was fought in which country?": [
            "France",
            "Russia",
            "England",
            "Norway"
        ]
    }
];

var correctAnswerSlots = [3, 1, 2];


exports.handler = function (event, context) {
    try {
        
        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
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


function onLaunch(launchRequest, session, callback) {
    var paramsGet = {TableName:'factlylaunchcount',
        Key: {
            count: "counter"
        }
    };
            
    docClient.get(paramsGet, function(err, data) {
        if(err) {
            console.log("Error occured:"+err);
        } else {
            var initialLaunchCount = data.Item.launchcounter;
            var updatedCount = initialLaunchCount + 1;
            var paramsUpdate = {TableName:'factlylaunchcount',
                                    Key: {count: "counter"},
                                    AttributeUpdates: {
                                        launchcounter: {
                                                Action: "PUT",
                                                Value: updatedCount
                                            }
                                        }
                                    }
                                }
            docClient.update(paramsUpdate, function(err, data) {
            if(err) {
                    console.log("Error occured:"+err)} 
                else {
                    console.log("Data Put Success:"+data);
                }
                getWelcomeResponse(callback, initialLaunchCount);
            });
    });
}


function onIntent(intentRequest, session, callback) {

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    if ("Answer" === intentName) {
        handleAnswerRequest(intent, session, callback);
    } else if ("AMAZON.StopIntent" === intentName) {
        handleFinishSessionRequest(intent, session, callback);
    } else {
        throw "Invalid intent";
    }
}

// ------- Business logic -------

var ANSWER_COUNT = 4;
var GAME_LENGTH = 3;

function getWelcomeResponse(callback, count) {
    var sessionAttributes = {},
        speechOutput = "You have played Factly "+count.toString()+" times. Factly will ask you " + GAME_LENGTH.toString()
            + " questions, try to get as many right as you can. Just say the number of the answer. Let's begin. ",
        shouldEndSession = false,


        gameQuestions = populateGameQuestions(),
        currentQuestionIndex = 0,
        correctAnswerIndex = correctAnswerSlots[currentQuestionIndex], 
        answers = populateAnswers(gameQuestions, 0),

        
        spokenQuestion = Object.keys(questions[gameQuestions[currentQuestionIndex]])[0],
        repromptText = "Question 1. " + spokenQuestion + " ",

        i;

    for (i = 0; i < ANSWER_COUNT; i++) {
        repromptText += (i+1).toString() + ". " + answers[i] + ". "
    }
    speechOutput += repromptText;
    sessionAttributes = {
        "speechOutput": repromptText,
        "repromptText": repromptText,
        "currentQuestionIndex": currentQuestionIndex,
        "correctAnswerIndex": correctAnswerIndex + 1,
        "questions": gameQuestions,
        "score": 0
    };
    callback(sessionAttributes,
        buildSpeechletResponse(speechOutput, repromptText, shouldEndSession));
}

function populateGameQuestions() {
    var gameQuestions = [];
    var index = questions.length;

    if (GAME_LENGTH > index){
        throw "Invalid Game Length.";
    }

    for (var j = 0; j < GAME_LENGTH; j++){
        gameQuestions.push(j);
    }

    return gameQuestions;
}

function populateAnswers(gameQuestionIndexes, correctAnswerIndex) {
    var answers = questions[gameQuestionIndexes[correctAnswerIndex]][Object.keys(questions[gameQuestionIndexes[correctAnswerIndex]])[0]];

    var index = answers.length;

    if (index < ANSWER_COUNT){
        throw "Not enough answers for question.";
    }

    return answers;
}

function handleFinishSessionRequest(intent, session, callback) {
    callback(session.attributes,
        buildSpeechletResponse("Factly will Exit. Good bye!", "", true));
}

function handleAnswerRequest(intent, session, callback) {
    var speechOutput = "";
    var sessionAttributes = {};
    var gameInProgress = session.attributes && session.attributes.questions;
    var answerSlotValid = isAnswerSlotValid(intent);
    var userGaveUp = intent.name === "DontKnowIntent";

     {
        var gameQuestions = session.attributes.questions,
            correctAnswerIndex = parseInt(session.attributes.correctAnswerIndex),
            currentScore = parseInt(session.attributes.score),
            currentQuestionIndex = parseInt(session.attributes.currentQuestionIndex),
            correctAnswerText = session.attributes.correctAnswerText;

        var speechOutputAnalysis = "";

        if (answerSlotValid && parseInt(intent.slots.Choice.value) == correctAnswerIndex) {
            currentScore++;
            speechOutputAnalysis = "correct. ";
        } else {
            if (!userGaveUp) {
                speechOutputAnalysis = "wrong. ";
            }
            speechOutputAnalysis += "The correct answer is . . . " + correctAnswerIndex;
        }
        // if we reached end of quiz and can exit the game session
        if (currentQuestionIndex == GAME_LENGTH - 1) {
            speechOutput = userGaveUp ? "" : "That answer is . . ";
            speechOutput += speechOutputAnalysis + " . . You got . . . " + currentScore.toString() + " out of "
                + GAME_LENGTH.toString() + " questions correct. Thank you for playing!";
            callback(session.attributes,
                buildSpeechletResponse(speechOutput, "", true));
        } else {
            currentQuestionIndex += 1;
            var spokenQuestion = Object.keys(questions[gameQuestions[currentQuestionIndex]])[0];
            correctAnswerIndex = correctAnswerSlots[currentQuestionIndex];
            var answers = populateAnswers(gameQuestions, currentQuestionIndex),

                questionIndexForSpeech = currentQuestionIndex + 1,
                repromptText = "Question " + questionIndexForSpeech.toString() + ". " + spokenQuestion + " ";
            for (var i = 0; i < ANSWER_COUNT; i++) {
                repromptText += (i+1).toString() + " . " + answers[i] + " . "
            }
            speechOutput += userGaveUp ? "" : "That answer is . . ";
            speechOutput += speechOutputAnalysis + " . . . . Your score is " + currentScore.toString() + ". . ." + repromptText;

            sessionAttributes = {
                "speechOutput": repromptText,
                "repromptText": repromptText,
                "currentQuestionIndex": currentQuestionIndex,
                "correctAnswerIndex": correctAnswerIndex + 1,
                "questions": gameQuestions,
                "score": currentScore
            };
            callback(sessionAttributes,
                buildSpeechletResponse(speechOutput, repromptText, false));
        }
    }
}

function isAnswerSlotValid(intent) {
    var answerSlotFilled = intent.slots && intent.slots.Choice && intent.slots.Choice.value;
    var answerSlotIsInt = answerSlotFilled && !isNaN(parseInt(intent.slots.Choice.value));
    return answerSlotIsInt && parseInt(intent.slots.Choice.value) < (ANSWER_COUNT + 1) && parseInt(intent.slots.Choice.value) > 0;
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