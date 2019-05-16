// CUSTOM ERROR TYPES

class ValidationError {
    constructor(message) {
        this.name = "ValidationError";
        this.message = message;
    }
}

class ParameterValidationError extends ValidationError {
    constructor(message) {
        super(message);
        this.name = "ParameterValidationError";
    }
}

class OperationNotAllowedError extends ValidationError {
    constructor(message) {
        super(message);
        this.name = "OperationNotAllowed";
    }
}

class DappItemValidationError extends ValidationError {
    constructor(message) {
        super(message);
        this.name = "DappItemValidationError";
    }
}

class InternalValidationError extends ValidationError {
    constructor(message) {
        super(message);
        this.name = "InternalValidationError";
    }
}

// ASSERT METHODS

function assert(condition, message, errorType=ValidationError) {
    if (!condition) {
        throw new errorType(message);
    }
}

function assertParameterValid(condition, message) {
    return assert(condition, message, ParameterValidationError);
}

function assertOperationAllowed(condition, message) {
    return assert(condition, message, OperationNotAllowedError);
}

function assertDappItemValid(condition, message) {
    return assert(condition, message, DappItemValidationError);
}

function assertInternal(condition) {
    let message = "Internal error during validation";
    return assert(condition, message, InternalValidationError);
}

function throwInternalValidationError() {
    return assertInternal(false);
}

module.exports = {
    assertParamValid : assertParameterValid,
    assertOpAllowed : assertOperationAllowed,
    assertDappValid : assertDappItemValid,
    assertInternal : assertInternal,
    throwInternalValidationError : throwInternalValidationError
}