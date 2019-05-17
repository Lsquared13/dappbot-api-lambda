"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var cognito_1 = __importDefault(require("./cognito"));
var dynamoDB_1 = __importDefault(require("./dynamoDB"));
var sqs_1 = __importDefault(require("./sqs"));
var names_1 = __importDefault(require("./names"));
exports.default = { cognito: cognito_1.default, dynamoDB: dynamoDB_1.default, sqs: sqs_1.default, names: names_1.default };
//# sourceMappingURL=index.js.map