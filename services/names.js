const uuidv4 = require('uuid/v4');
const { dnsRoot } = require('../env');

const s3BucketPrefix = "exim-abi-clerk-";

function createS3BucketName() {
    return s3BucketPrefix.concat(uuidv4());
}

function dnsNameFromDappName(dappName) {
    return dappName.concat(dnsRoot);
}

function pipelineNameFromDappName(dappName) {
    return `${dappName}${dnsRoot}`
  }

module.exports = {
    newS3BucketName : createS3BucketName,
    dnsNameFromDappName : dnsNameFromDappName,
    pipelineNameFromDappName : pipelineNameFromDappName
}