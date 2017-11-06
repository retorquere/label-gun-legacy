const express = require('express');
// const bodyParser = require('body-parser');
const coroute = require('co-express');
const coroutine = require('bluebird').coroutine;
const request = require('request-promise');
const _ = require('lodash');

const app = express();
const owners = process.env.OWNERS.split(',');
const ignoreUsers = new Set(process.env.IGNORE_USERS.split(','));
const ignoreLabels = new Set(process.env.IGNORE_LABELS.split(','));

const activityLog = [];

const github = coroutine(function* (req) {
  req = _.merge({
    json: true,
    headers: {
      'User-Agent': 'Zotero Better BibTeX',
      Authorization: `token ${process.env.GITHUB_TOKEN}`,
    },
  }, req)
  req.uri = `https://api.github.com/repos/${req.uri}`

  activityLog.push({ timestamp: new Date, method: req.method, body: req.body, uri: req.uri });
  activityLog.splice(20, activityLog.length)

  return yield request(req)
})

const githubMiddleware = require('github-webhook-middleware')({
  secret: process.env.SECRET,
  limit: '1mb', // <-- optionally include the webhook json payload size limit, useful if you have large merge commits. Default is '100kb'
})
// app.use(bodyParser.json())
// app.use(bodyParser.text())

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index', { activityLog });
});

app.post('/', githubMiddleware, coroute(function* (req, res, next) {
  if (req.headers['x-github-event'] == 'ping') return res.status(200).send({ success: true });

  var payload = req.body;

  const awaiting = 'awaiting feedback from user'
  let action = null

  switch (req.headers['x-github-event']) {
    case 'ping':
      return res.status(200).send({ success: true });

    case 'issues':
      switch (payload.action) {
        case 'closed':
          action = 'remove'
          break;
        case 'reopened':
          action = 'add'
          break;
      }
      break;

    case 'issue_comment':
      if (ignoreUsers.has(payload.sender.login)) return res.status(200).send({ success: true });

      action = owners.includes(payload.sender.login) ? 'add' : 'remove'

    default:
      throw new Error(`Did not expect ${req.headers['x-github-event']}`);
  }

  if (payload.issue.labels.find(label => ignoreLabels.has(label.name))) action = 'remove'

  switch (action) {
    case 'add':
      if (!payload.issue.labels.includes(awaiting)) { // 'awaiting' label not present
        yield github({
          uri: `${payload.repository.full_name}/issues/${payload.issue.number}/labels`,
          method: 'POST',
          body: [ awaiting ],
        })
      }
      break;

    case 'remove':
      if (payload.issue.labels.includes(awaiting)) { // label is present
        yield github({
          uri: `${payload.repository.full_name}/issues/${payload.issue.number}/labels/${encodeURIComponent(awaiting)}`,
          method: 'DELETE',
        })
      }
      break;
  }

  return res.status(200).send({ success: true })
}));

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
