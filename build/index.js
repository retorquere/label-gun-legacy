var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const _ = require('lodash');
function load(robot, context) {
    return __awaiter(this, void 0, void 0, function* () {
        const request = {
            config: null,
            isContributor: false,
            ignore: false,
            reopen: false,
            issue: null,
            edits: null,
            label: null,
            unlabel: null,
            save: null,
        };
        try {
            request.config = yield context.config('config.yml');
        }
        catch (err) {
            robot.log(err);
            request.config = null;
        }
        request.config = ((request.config || {})['label-gun']) || {};
        if (!request.config.labels)
            request.config.labels = {};
        if (!request.config.labels.feedback)
            request.config.labels.feedback = 'awaiting-user-feedback';
        request.config.labels.ignore = request.config.labels.ignore || [];
        request.config.labels.reopen = request.config.labels.reopen || [];
        const contributors = new Set((yield context.github.repos.getContributors(context.repo())).data.map((contributor) => contributor.login));
        request.isContributor = contributors.has(context.payload.sender.login);
        request.issue = Object.assign({}, context.payload.issue, { labels: context.payload.issue.labels.map((label) => label.name) });
        request.edits = context.issue({ state: request.issue.state, labels: [...request.issue.labels] });
        robot.log(`contributors: ${context.payload.sender.login} / ${Array.from(contributors)} => ${request.isContributor}`);
        request.ignore = (_.intersection(request.issue.labels, request.config.labels.ignore).length !== 0);
        request.reopen = (_.intersection(request.issue.labels.concat('*'), request.config.labels.reopen).length !== 0);
        request.label = name => {
            if (request.edits.labels.includes(name))
                return;
            request.edits.labels.push(name);
        };
        request.unlabel = name => {
            request.edits.labels = request.edits.labels.filter(label => label !== name);
        };
        request.save = (reason) => __awaiter(this, void 0, void 0, function* () {
            if (request.edits.state === request.issue.state && _.isEqual(new Set(request.edits.labels), new Set(request.issue.labels)))
                return;
            robot.log(`${reason}(${context.payload.sender.login}${request.isContributor ? '*' : ''}): ${request.issue.state}[${request.issue.labels}] -> ${request.edits.state}[${request.edits.labels}]`);
            yield context.github.issues.edit(request.edits);
        });
        return request;
    });
}
module.exports = (robot) => __awaiter(this, void 0, void 0, function* () {
    // Your code here
    robot.log('Yay, the app was loaded!');
    // For more information on building apps:
    // https://probot.github.io/docs/
    // To get your app running against GitHub, see:
    // https://probot.github.io/docs/development/
    robot.on('issue_comment.created', (context) => __awaiter(this, void 0, void 0, function* () {
        const req = yield load(robot, context);
        // if a non-contrib comments on a closed issue, re-open it
        if (req.edits.state === 'closed' && !req.isContributor)
            req.edits.state = 'open';
        if (!req.ignore && req.edits.state === 'open') {
            if (req.isContributor) {
                req.label(req.config.labels.feedback);
            }
            else {
                req.unlabel(req.config.labels.feedback);
            }
        }
        yield req.save('issue_comment.created');
    }));
    robot.on('issues.closed', (context) => __awaiter(this, void 0, void 0, function* () {
        const req = yield load(robot, context);
        if (req.isContributor) {
            req.unlabel(req.config.labels.feedback);
        }
        else if (req.reopen) {
            // if a non-contrib close an issue, re-open it
            req.edits.state = 'open';
        }
        yield req.save('issues.closed');
    }));
    robot.on('issues.reopened', (context) => __awaiter(this, void 0, void 0, function* () {
        const req = yield load(robot, context);
        if (req.isContributor && !req.ignore)
            req.label(req.config.labels.feedback);
        yield req.save('issues.reopend');
    }));
});
//# sourceMappingURL=index.js.map