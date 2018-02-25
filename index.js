const _ = require('lodash')

async function load(context) {
  const request = { }

  try {
    request.config = await context.config('config.yml')
  } catch (err) {
    context.log(err)
    request.config = null
  }
  request.config = ((request.config || {})['label-gun']) || {}

  if (!request.config.labels) request.config.labels = {}
  if (!request.config.labels.feedback) request.config.labels.feedback = 'awaiting-user-feedback'
  request.config.labels.ignore = new Set(request.config.labels.ignore || [])
  request.config.labels.reopen = new Set(request.config.labels.reopen || [])

  request.isContributor = (await context.github.repos.getContributors(context.repo())).data.find(contr => contr.login === context.payload.sender.login)
  request.issue = { ...context.payload.issue, labels: context.payload.issue.labels.map(label => label.name) }
  request.edits = context.issue({ state: request.issue.state, labels: [...request.issue.labels] })

  request.ignore = request.issue.labels.find(label => request.config.labels.ignore.has(label))
  request.reopen = request.issue.labels.find(label => request.config.labels.reopen.has(label))

  request.label = name => {
    if (request.edits.labels.includes(name)) return
    request.edits.labels.push(name)
  }

  request.unlabel = name => {
    request.edits.labels = request.edits.labels.filter(label => label !== name)
  }

  request.save = async reason => {
    if (request.edits.state === request.issue.state && _.isEqual(new Set(request.edits.labels), new Set(request.issue.labels))) return

    context.log(`${reason}(${context.payload.sender.login}${request.isContributor ? '*' : ''}): ${request.issue.state}[${request.issue.labels}] -> ${request.edits.state}[${request.edits.labels}]`)
    await context.github.issues.edit(request.edits)
  }

  return request
}

module.exports = async robot => {
  // Your code here
  robot.log('Yay, the app was loaded!')

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/

  robot.on('issue_comment.created', async context => {
    const req = await load(context)

    // if a non-contrib comments on a closed issue, re-open it
    if (req.issue.state === 'closed' && !req.isContributer) req.edits.state = 'open'

    if (!req.ignore && req.edits.state === 'open') {
      if (req.isContributor) {
        req.label(req.config.labels.feedback)
      } else {
        req.unlabel(req.config.labels.feedback)
      }
    }

    await req.save('issue_comment.created')
  })

  robot.on('issues.closed', async context => {
    const req = await load(context)

    if (req.isContributor) {
      req.unlabel(req.config.labels.feedback)
    } else if (req.reopen) {
      // if a non-contrib close an issue, re-open it
      req.edits.state = 'open'
    }

    await req.save('issue_comment.created')
  })

  robot.on('issues.reopened', async context => {
    const req = await load(context)

    if (req.isContributor && !req.ignore) req.label(req.config.labels.feedback)

    await req.save('issue_comment.created')
  })
}
