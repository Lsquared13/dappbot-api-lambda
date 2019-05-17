"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// CUSTOM ERROR TYPES
var ValidationError = /** @class */ (function () {
    function ValidationError(message) {
        this.name = "ValidationError";
        this.message = message;
    }
    return ValidationError;
}());
exports.ValidationError = ValidationError;
var ParameterValidationError = /** @class */ (function (_super) {
    __extends(ParameterValidationError, _super);
    function ParameterValidationError(message) {
        var _this = _super.call(this, message) || this;
        _this.name = "ParameterValidationError";
        return _this;
    }
    return ParameterValidationError;
}(ValidationError));
exports.ParameterValidationError = ParameterValidationError;
var OperationNotAllowedError = /** @class */ (function (_super) {
    __extends(OperationNotAllowedError, _super);
    function OperationNotAllowedError(message) {
        var _this = _super.call(this, message) || this;
        _this.name = "OperationNotAllowed";
        return _this;
    }
    return OperationNotAllowedError;
}(ValidationError));
exports.OperationNotAllowedError = OperationNotAllowedError;
var DappItemValidationError = /** @class */ (function (_super) {
    __extends(DappItemValidationError, _super);
    function DappItemValidationError(message) {
        var _this = _super.call(this, message) || this;
        _this.name = "DappItemValidationError";
        return _this;
    }
    return DappItemValidationError;
}(ValidationError));
exports.DappItemValidationError = DappItemValidationError;
var InternalValidationError = /** @class */ (function (_super) {
    __extends(InternalValidationError, _super);
    function InternalValidationError(message) {
        var _this = _super.call(this, message) || this;
        _this.name = "InternalValidationError";
        return _this;
    }
    return InternalValidationError;
}(ValidationError));
exports.InternalValidationError = InternalValidationError;
// ASSERT METHODS
function assert(condition, message, errorType) {
    if (errorType === void 0) { errorType = ValidationError; }
    if (!condition) {
        throw new errorType(message);
    }
}
function assertParameterValid(condition, message) {
    return assert(condition, message, ParameterValidationError);
}
exports.assertParameterValid = assertParameterValid;
function assertOperationAllowed(condition, message) {
    return assert(condition, message, OperationNotAllowedError);
}
exports.assertOperationAllowed = assertOperationAllowed;
function assertDappItemValid(condition, message) {
    return assert(condition, message, DappItemValidationError);
}
exports.assertDappItemValid = assertDappItemValid;
function assertInternal(condition) {
    var message = "Internal error during validation";
    return assert(condition, message, InternalValidationError);
}
exports.assertInternal = assertInternal;
function throwInternalValidationError() {
    return assertInternal(false);
}
exports.throwInternalValidationError = throwInternalValidationError;
var Asserts = {};
exports.default = {
    assertParamValid: assertParameterValid,
    assertOpAllowed: assertOperationAllowed,
    assertDappValid: assertDappItemValid,
    assertInternal: assertInternal,
    throwInternalValidationError: throwInternalValidationError
};
//# sourceMappingURL=errors.js.map