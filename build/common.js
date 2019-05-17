"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
Returns a Promise that rejects with reason after msDelay milliseconds
*/
function rejectDelay(reason) {
    var msDelay = 700;
    return new Promise(function (resolve, reject) {
        setTimeout(reject.bind(null, reason), msDelay);
    });
}
exports.rejectDelay = rejectDelay;
/*
Retries a promise returned by promiseGenerator up to maxRetries times as long as the error is retryable
Based on https://stackoverflow.com/questions/38213668/promise-retry-design-patterns
*/
function addAwsPromiseRetries(promiseGenerator, maxRetries) {
    // Ensure we call promiseGenerator on the first iteration
    var p = Promise.reject({ retryable: true });
    /*
    Appends maxRetries number of retry and delay promises to an AWS promise, returning once a retry promise resolves.

    1. As long as promiseGenerator() rejects with a retryable error, we retry and then delay before the next loop iteration
    2. If promiseGenerator() resolves, the rest of the loop will finish without triggering any further catch functions
    3. If promiseGenerator() rejects with a non-retryable error, the rest of the loop will finish without any further
       retries or delays since all catch blocks will simply return Promise.reject(err)
    */
    for (var i = 0; i < maxRetries; i++) {
        p = p.catch(function (err) { return err.retryable ? promiseGenerator() : Promise.reject(err); })
            .catch(function (err) { return err.retryable ? rejectDelay(err) : Promise.reject(err); });
    }
    return p;
}
exports.addAwsPromiseRetries = addAwsPromiseRetries;
//# sourceMappingURL=common.js.map