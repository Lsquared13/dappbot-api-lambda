const { AWS, sqsQueue } = require('../env');
const { addAwsPromiseRetries } = require('../common');

const sqs = new AWS.SQS({apiVersion: '2012-11-05'});

function promiseSendMessage(method, body) {
    let maxRetries = 5;
    let params = {
        QueueUrl: sqsQueue,
        MessageBody: body,
        MessageAttributes: {
            Method: {
                DataType: 'String',
                StringValue: method
            }
        }
    };
    return addAwsPromiseRetries(() => sqs.sendMessage(params).promise(), maxRetries);
}

module.exports = {
    sendMessage : promiseSendMessage
}