const express = require('express');
const bodyParser = require('body-parser');
const coroute = require('co-express');
const coroutine = require('bluebird').coroutine;
const request = require('request-promise')

const app = express();
const owners = process.env.OWNERS.split(',');

const github = coroutine(function* (req, repo) {
  req = _.merge({
    json: true,
    headers: {
      'User-Agent': 'Zotero Better BibTeX',
      Authorization: `token ${process.env.GITHUB_TOKEN}`,
    },
  }, req)
  req.uri = `https://api.github.com/repos/${repo}${req.uri}`

  return yield request(req)
})

app.use(bodyParser.json())

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index');
});

app.post('/comment', coroute(function* (req, res, next) {
  var payload = req.body;

  if (payload.hook.config.secret != process.env.SECRET) {
    console.log('secret: got', payload.hook.config.secret.substring(0, 3), payload.hook.config.secret.length);
    throw new Error('Who I Am?');
  }

  var labels = yield github({ uri: `/issues/${payload.issue.id}/labels` });
  labels = labels.map(label => label.name);

  const awaiting = 'awaiting feedback from user'

	if (owners.includes(payload.sender.login)) {
    yield github({
      uri: `/issues/${payload.issue.id}/labels`,
      method: 'POST',
      body: [ awaiting ],
    })
  } else {
    yield github({
      uri: `/issues/${payload.issue.id}/labels/${encodeURIComponent(awaiting)}`,
      method: 'DELETE',
    })
  }

	res.status(200).send({ success: true })
}));

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
