/*
Returns a Promise that rejects with reason after msDelay milliseconds
*/
export function rejectDelay<SuccessType>(reason:string) {
    let msDelay = 700;
    return new Promise<SuccessType>(function(resolve, reject) {
        setTimeout(reject.bind(null, reason), msDelay); 
    });
}

/*
Retries a promise returned by promiseGenerator up to maxRetries times as long as the error is retryable
Based on https://stackoverflow.com/questions/38213668/promise-retry-design-patterns
*/
export function addAwsPromiseRetries<ReturnType = any>(promiseGenerator:()=>Promise<ReturnType>, maxRetries:number) {
    // Ensure we call promiseGenerator on the first iteration
    let p:Promise<ReturnType> = Promise.reject({retryable: true});

    /*
    Appends maxRetries number of retry and delay promises to an AWS promise, returning once a retry promise resolves.

    1. As long as promiseGenerator() rejects with a retryable error, we retry and then delay before the next loop iteration
    2. If promiseGenerator() resolves, the rest of the loop will finish without triggering any further catch functions
    3. If promiseGenerator() rejects with a non-retryable error, the rest of the loop will finish without any further
       retries or delays since all catch blocks will simply return Promise.reject(err)
    */
    for(var i=0; i<maxRetries; i++) {
        p = p.catch(err => err.retryable ? promiseGenerator() : Promise.reject(err))
             .catch(err => err.retryable ? rejectDelay<ReturnType>(err) : Promise.reject(err));
    }
    return p as Promise<ReturnType>;
}

export interface ValidCreateBody {
    DappName : string
    Abi : string
    ContractAddr : string
    Web3URL : string
    GuardianURL : string
    Tier : string
    TargetRepoName? : string
    TargetRepoOwner? : string
}

export interface DappApiRepresentation extends ValidCreateBody {
    OwnerEmail : string
    CreationTime : string
    DnsName : string
    State : string
}

export interface ResponseOptions {
    isErr? : boolean
    isCreate? : boolean
    isRead? : boolean
    errorResponseCode? : number
}

export enum DappTiers {
    POC = 'POC', // TODO: Remove this legacy tier
    STANDARD = 'STANDARD',
    PROFESSIONAL = 'PROFESSIONAL',
    ENTERPRISE = 'ENTERPRISE'
}

export enum HttpMethods {
    OPTIONS = 'OPTIONS',
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE'
}

export enum ApiMethods {
    read = 'read',
    view = 'view',
    list = 'list',
    create = 'create',
    update = 'update',
    delete = 'delete',
    login  = 'login'
}