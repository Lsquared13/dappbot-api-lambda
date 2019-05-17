"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var uuidv4 = require('uuid/v4');
var dnsRoot = require('../env').dnsRoot;
var s3BucketPrefix = "exim-abi-clerk-";
function createS3BucketName() {
    return s3BucketPrefix.concat(uuidv4());
}
exports.createS3BucketName = createS3BucketName;
function dnsNameFromDappName(dappName) {
    return dappName.concat(dnsRoot);
}
exports.dnsNameFromDappName = dnsNameFromDappName;
function pipelineNameFromDappName(dappName) {
    return "" + dappName + dnsRoot;
}
exports.pipelineNameFromDappName = pipelineNameFromDappName;
exports.default = {
    newS3BucketName: createS3BucketName,
    dnsNameFromDappName: dnsNameFromDappName,
    pipelineNameFromDappName: pipelineNameFromDappName
};
//# sourceMappingURL=names.js.map