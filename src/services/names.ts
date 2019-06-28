const uuidv4 = require('uuid/v4');
const { dnsRoot } = require('../env');

const s3BucketPrefix = "exim-dappbot-";

export function createS3BucketName() {
    return s3BucketPrefix.concat(uuidv4());
}

export function dnsNameFromDappName(dappName:string) {
    return dappName.concat(dnsRoot);
}

export function pipelineNameFromDappName(dappName:string) {
    return `${dappName}${dnsRoot}`
}

export function srcPipelineNameFromDappName(dappName:string) {
    let prefix = 'src-';
    return prefix.concat(pipelineNameFromDappName(dappName));
}

export default {
    newS3BucketName : createS3BucketName,
    dnsNameFromDappName : dnsNameFromDappName,
    pipelineNameFromDappName : pipelineNameFromDappName,
    srcPipelineNameFromDappName : srcPipelineNameFromDappName
}