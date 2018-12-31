"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
var _ = require('lodash');
var ProbotRequest = /** @class */ (function () {
    function ProbotRequest(robot, context) {
        this.isCollaborator = false;
        this.isBot = false;
        this.reopen = false;
        this.ignore = false;
        this.state = '';
        this.labels = [];
        this.robot = robot;
        this.context = context;
        this.config = {
            feedback: '',
            ignore: [],
            reopen: [],
        };
    }
    ProbotRequest.prototype.load = function () {
        return __awaiter(this, void 0, void 0, function () {
            var config, err_1, _a, err_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.context.config('label-gun.yml')];
                    case 1:
                        config = _b.sent();
                        if (config && config.reopen === '*')
                            config.reopen = ['*'];
                        return [3 /*break*/, 3];
                    case 2:
                        err_1 = _b.sent();
                        this.robot.log(err_1);
                        config = null;
                        return [3 /*break*/, 3];
                    case 3:
                        this.config = config || { ignore: [], reopen: [], feedback: '' };
                        this.config.feedback = this.config.feedback || 'awaiting-user-feedback';
                        this.config.ignore = this.config.ignore || [];
                        this.config.reopen = this.config.reopen || [];
                        _b.label = 4;
                    case 4:
                        _b.trys.push([4, 6, , 7]);
                        _a = this;
                        return [4 /*yield*/, this.context.github.repos.checkCollaborator(__assign({}, this.context.repo(), { username: this.context.payload.sender.login }))];
                    case 5:
                        _a.isCollaborator = _b.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        err_2 = _b.sent();
                        this.robot.log(this.context.payload.sender.login + " = collab? (" + err_2 + ")");
                        return [3 /*break*/, 7];
                    case 7:
                        // remember state
                        this.issue = __assign({}, this.context.payload.issue, { labels: this.context.payload.issue.labels.map(function (label) { return label.name; }) });
                        this.state = this.issue.state;
                        this.labels = this.issue.labels.slice();
                        this.isBot = this.context.payload.sender.login.endsWith('[bot]');
                        this.ignore = (_.intersection(this.issue.labels, this.config.ignore).length !== 0) || this.isBot;
                        this.reopen = (_.intersection(this.issue.labels.concat('*'), this.config.reopen).length !== 0)
                            && (_.intersection(this.issue.labels.map(function (label) { return "-" + label; }), this.config.reopen).length === 0)
                            && !this.isBot;
                        return [2 /*return*/, this];
                }
            });
        });
    };
    ProbotRequest.prototype.label = function (name) {
        if (this.labels.includes(name))
            return;
        this.labels.push(name);
    };
    ProbotRequest.prototype.unlabel = function (name) {
        this.labels = this.labels.filter(function (label) { return label !== name; });
    };
    ProbotRequest.prototype.save = function (reason) {
        return __awaiter(this, void 0, void 0, function () {
            var changed, msg;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        changed = (this.state !== this.issue.state || !_.isEqual(new Set(this.labels), new Set(this.issue.labels)));
                        msg = reason + "(" + this.context.payload.sender.login + (this.isCollaborator ? '*' : '') + "): " + this.issue.state + "[" + this.issue.labels + "] -> " + this.state + "[" + this.labels + "]";
                        if (!changed)
                            return [2 /*return*/];
                        this.robot.log(reason + "(" + this.context.payload.sender.login + (this.isCollaborator ? '*' : '') + "): " + this.issue.state + "[" + this.issue.labels + "] -> " + this.state + "[" + this.labels + "]");
                        return [4 /*yield*/, this.context.github.issues.update(this.context.issue({ state: this.state, labels: this.labels }))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return ProbotRequest;
}());
module.exports = function (robot) {
    // Your code here
    robot.log('Yay, the app was loaded!');
    // For more information on building apps:
    // https://probot.github.io/docs/
    // To get your app running against GitHub, see:
    // https://probot.github.io/docs/development/
    robot.on('issue_comment.created', function (context) { return __awaiter(_this, void 0, void 0, function () {
        var req;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (new ProbotRequest(robot, context)).load()
                    // if a non-collab comments on a closed issue, re-open it
                ];
                case 1:
                    req = _a.sent();
                    // if a non-collab comments on a closed issue, re-open it
                    if (req.state === 'closed' && !req.isCollaborator && req.reopen)
                        req.state = 'open';
                    if (!req.ignore && req.state === 'open') {
                        if (req.isCollaborator) {
                            req.label(req.config.feedback);
                        }
                        else {
                            req.unlabel(req.config.feedback);
                        }
                    }
                    return [4 /*yield*/, req.save('issue_comment.created')];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    robot.on('issues.closed', function (context) { return __awaiter(_this, void 0, void 0, function () {
        var req;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (new ProbotRequest(robot, context)).load()];
                case 1:
                    req = _a.sent();
                    if (req.isCollaborator) {
                        req.unlabel(req.config.feedback);
                    }
                    else if (req.reopen) {
                        // if a non-collab closes an issue, re-open it
                        req.state = 'open';
                    }
                    return [4 /*yield*/, req.save('issues.closed')];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    robot.on('issues.reopened', function (context) { return __awaiter(_this, void 0, void 0, function () {
        var req;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (new ProbotRequest(robot, context)).load()];
                case 1:
                    req = _a.sent();
                    if (req.isCollaborator && !req.ignore)
                        req.label(req.config.feedback);
                    return [4 /*yield*/, req.save('issues.reopend')];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
};
//# sourceMappingURL=index.js.map