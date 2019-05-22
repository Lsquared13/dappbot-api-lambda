const uuidv4 = require('uuid/v4');
const { dnsRoot } = require('../env');

const s3BucketPrefix = "exim-abi-clerk-";

export function createS3BucketName() {
    return s3BucketPrefix.concat(uuidv4());
}

export function dnsNameFromId(id:string) {
    return id.concat(dnsRoot);
}

export function pipelineNameFromId(id:string) {
    return `${id}${dnsRoot}`
}

export function generateNewId() {
    return uuidv4();
}

export default {
    newId : generateNewId,
    newS3BucketName : createS3BucketName,
    dnsNameFromId : dnsNameFromId,
    pipelineNameFromId : pipelineNameFromId
}