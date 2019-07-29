// CUSTOM ERROR TYPES
export class ValidationError {
    name: string
    message: string
    constructor(message:string) {
        this.name = "ValidationError";
        this.message = message;
    }
    toString():string {
        return this.message;
    }
}

export class Error422 extends ValidationError {
    constructor(message:string) {
        super(message);
        this.name = "Error422";
    }
}

export class ParameterValidationError extends Error422 {
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

export class Error409 extends OperationNotAllowedError {
    constructor(message:string) {
        super(message);
        this.name = "Error409";
    }
}

export class DappNameTakenError extends Error409 {
    constructor(message:string) {
        super(message);
        this.name = "DappNameTakenError";
    }
}

export class Error404 extends OperationNotAllowedError {
    constructor(message:string) {
        super(message);
        this.name = "Error404";
    }
}

export class DappNotFound extends Error404 {
    constructor(message:string) {
        super(message);
        this.name = "DappNotFound";
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

export class AuthError {
    name: string
    message: string
    constructor(message:string) {
        this.name = "AuthError";
        this.message = message;
    }
    toString():string {
        return this.message;
    }
}

export class Error401 extends ValidationError {
    constructor(message:string) {
        super(message);
        this.name = "Error401";
    }
}

export class UnrecognizedCredentialsError extends Error401 {
    constructor(message:string) {
        super(message);
        this.name = "UnrecognizedCredentialsError";
    }
}

export class EmailNotConfirmedError extends Error401 {
    constructor(message:string) {
        super(message);
        this.name = "EmailNotConfirmedError";
    }
}

export class PasswordResetRequiredError extends Error401 {
    constructor(message:string) {
        super(message);
        this.name = "PasswordResetRequiredError";
    }
}

export class InvalidPasswordError extends Error401 {
    constructor(message:string) {
        super(message);
        this.name = "InvalidPasswordError";
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

export function assertDappNameNotTaken(condition:any, message:string) {
    return assert(condition, message, DappNameTakenError);
}

export function assertDappFound(condition:any, message:string) {
    return assert(condition, message, DappNotFound);
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