console.log("Loading SQS");
const { AWS, awsRegion, sqsQueue } = require('../env');
const { addAwsPromiseRetries } = require('../common');

const sqs = new AWS.SQS({apiVersion: '2012-11-05'});

// TODO

module.exports = {
    // TODO
    //externalName : internalName
}