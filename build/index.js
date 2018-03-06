var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const _ = require('lodash');
let slack;
try {
    slack = require('slack-notify')(`https://hooks.slack.com/services/${process.env.SLACK_TOKEN}`);
}
catch (err) {
    console.log(err);
    slack = null;
}
class ProbotRequest {
    constructor(robot, context) {
        this.robot = robot;
        this.context = context;
    }
    load() {
        return __awaiter(this, void 0, void 0, function* () {
            // load config
            let config;
            try {
                config = yield this.context.config('config.yml');
                if (config)
                    config = config['label-gun'];
                if (config && config.reopen === '*')
                    config.reopen = ['*'];
            }
            catch (err) {
                this.robot.log(err);
                config = null;
            }
            this.config = config || { ignore: [], reopen: [], feedback: '' };
            this.config.feedback = this.config.feedback || 'awaiting-user-feedback';
            this.config.ignore = this.config.ignore || [];
            this.config.reopen = this.config.reopen || [];
            this.isCollaborator = yield this.context.github.repos.checkCollaborator(Object.assign({}, this.context.repo(), { username: this.context.payload.sender.login }));
            // remember state
            this.issue = Object.assign({}, this.context.payload.issue, { labels: this.context.payload.issue.labels.map((label) => label.name) });
            this.state = this.issue.state;
            this.labels = [...this.issue.labels];
            this.ignore = (_.intersection(this.issue.labels, this.config.ignore).length !== 0);
            this.reopen = (_.intersection(this.issue.labels.concat('*'), this.config.reopen).length !== 0);
            return this;
        });
    }
    label(name) {
        if (this.labels.includes(name))
            return;
        this.labels.push(name);
    }
    unlabel(name) {
        this.labels = this.labels.filter(label => label !== name);
    }
    save(reason) {
        return __awaiter(this, void 0, void 0, function* () {
            const changed = (this.state !== this.issue.state || !_.isEqual(new Set(this.labels), new Set(this.issue.labels)));
            const msg = `${reason}(${this.context.payload.sender.login}${this.isCollaborator ? '*' : ''}): ${this.issue.state}[${this.issue.labels}] -> ${this.state}[${this.labels}]`;
            try {
                if (slack)
                    slack.alert(`${msg} (changed: ${changed})`);
            }
            catch (err) {
                this.robot.log('' + err);
            }
            if (!changed)
                return;
            this.robot.log(`${reason}(${this.context.payload.sender.login}${this.isCollaborator ? '*' : ''}): ${this.issue.state}[${this.issue.labels}] -> ${this.state}[${this.labels}]`);
            yield this.context.github.issues.edit(this.context.issue({ state: this.state, labels: this.labels }));
        });
    }
}
module.exports = (robot) => __awaiter(this, void 0, void 0, function* () {
    // Your code here
    robot.log('Yay, the app was loaded!');
    // For more information on building apps:
    // https://probot.github.io/docs/
    // To get your app running against GitHub, see:
    // https://probot.github.io/docs/development/
    robot.on('issue_comment.created', (context) => __awaiter(this, void 0, void 0, function* () {
        const req = yield (new ProbotRequest(robot, context)).load();
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
        yield req.save('issue_comment.created');
    }));
    robot.on('issues.closed', (context) => __awaiter(this, void 0, void 0, function* () {
        const req = yield (new ProbotRequest(robot, context)).load();
        if (req.isCollaborator) {
            req.unlabel(req.config.feedback);
        }
        else if (req.reopen) {
            // if a non-collab closes an issue, re-open it
            req.state = 'open';
        }
        yield req.save('issues.closed');
    }));
    robot.on('issues.reopened', (context) => __awaiter(this, void 0, void 0, function* () {
        const req = yield (new ProbotRequest(robot, context)).load();
        if (req.isCollaborator && !req.ignore)
            req.label(req.config.feedback);
        yield req.save('issues.reopend');
    }));
});
//# sourceMappingURL=index.js.map