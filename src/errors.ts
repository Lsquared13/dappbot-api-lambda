import { String } from "aws-sdk/clients/elasticache";

// CUSTOM ERROR TYPES
export class ValidationError {
    name: string
    message: string
    constructor(message:string) {
        this.name = "ValidationError";
        this.message = message;
    }
}

export class ParameterValidationError extends ValidationError {
    constructor(message:string) {
        super(message);
        this.name = "ParameterValidationError";
    }
}

export class OperationNotAllowedError extends ValidationError {
    constructor(message:string) {
        super(message);
        this.name = "OperationNotAllowed";
    }
}

export class DappItemValidationError extends ValidationError {
    constructor(message:string) {
        super(message);
        this.name = "DappItemValidationError";
    }
}

export class InternalValidationError extends ValidationError {
    constructor(message:string) {
        super(message);
        this.name = "InternalValidationError";
    }
}

// ASSERT METHODS
function assert(condition:any, message:string, errorType=ValidationError) {
    if (!condition) {
        throw new errorType(message);
    }
}

export function assertParameterValid(condition:any, message:string) {
    return assert(condition, message, ParameterValidationError);
}

export function assertOperationAllowed(condition:any, message:string) {
    return assert(condition, message, OperationNotAllowedError);
}

export function assertDappItemValid(condition:any, message:string) {
    return assert(condition, message, DappItemValidationError);
}

export function assertInternal(condition:any) {
    let message = "Internal error during validation";
    return assert(condition, message, InternalValidationError);
}

export function throwInternalValidationError() {
    return assertInternal(false);
}

export default {
    assertParamValid : assertParameterValid,
    assertOpAllowed : assertOperationAllowed,
    assertDappValid : assertDappItemValid,
    assertInternal : assertInternal,
    throwInternalValidationError : throwInternalValidationError
}