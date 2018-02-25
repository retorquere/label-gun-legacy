const _ = require('lodash')

async function load(robot: any, context: any) {
  const request: {
    config: any
    isContributor: boolean

    ignore: boolean
    reopen: boolean

    issue: { state: string, labels: Array<string> }
    edits: { state: string, labels: Array<string> }

    label: (name: string) => void
    unlabel: (name: string) => void
    save: (method: string) => void
  } = {
    config: null,
    isContributor: false,
    ignore: false,
    reopen: false,

    issue: null,
    edits: null,

    label: null,
    unlabel: null,
    save: null,
  }

  try {
    request.config = await context.config('config.yml')
  } catch (err) {
    robot.log(err)
    request.config = null
  }
  request.config = ((request.config || {})['label-gun']) || {}

  if (!request.config.labels) request.config.labels = {}
  if (!request.config.labels.feedback) request.config.labels.feedback = 'awaiting-user-feedback'
  request.config.labels.ignore = new Set(request.config.labels.ignore || [])
  request.config.labels.reopen = new Set(request.config.labels.reopen || [])

  const contributors = new Set((await context.github.repos.getContributors(context.repo())).data.map((contributor: any) => contributor.login))
  request.isContributor = contributors.has(context.payload.sender.login)
  request.issue = { ...context.payload.issue, labels: context.payload.issue.labels.map((label: any) => label.name) }
  request.edits = context.issue({ state: request.issue.state, labels: [...request.issue.labels] })

  robot.log(`contributors: ${context.payload.sender.login} / ${Array.from(contributors)} => ${request.isContributor}`)

  request.ignore = (request.issue.labels.find(label => request.config.labels.ignore.has(label)).length !== 0)
  request.reopen = request.config.labels.reopen.has('*') || (request.issue.labels.find(label => request.config.labels.reopen.has(label)).length !== 0)

  request.label = name => {
    if (request.edits.labels.includes(name)) return
    request.edits.labels.push(name)
  }

  request.unlabel = name => {
    request.edits.labels = request.edits.labels.filter(label => label !== name)
  }

  request.save = async reason => {
    if (request.edits.state === request.issue.state && _.isEqual(new Set(request.edits.labels), new Set(request.issue.labels))) return

    robot.log(`${reason}(${context.payload.sender.login}${request.isContributor ? '*' : ''}): ${request.issue.state}[${request.issue.labels}] -> ${request.edits.state}[${request.edits.labels}]`)
    await context.github.issues.edit(request.edits)
  }

  return request
}

module.exports = async (robot: any) => {
  // Your code here
  robot.log('Yay, the app was loaded!')

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/

  robot.on('issue_comment.created', async (context: any) => {
    const req = await load(robot, context)

    // if a non-contrib comments on a closed issue, re-open it
    if (req.edits.state === 'closed' && !req.isContributor) req.edits.state = 'open'

    if (!req.ignore && req.edits.state === 'open') {
      if (req.isContributor) {
        req.label(req.config.labels.feedback)
      } else {
        req.unlabel(req.config.labels.feedback)
      }
    }

    await req.save('issue_comment.created')
  })

  robot.on('issues.closed', async (context: any) => {
    const req = await load(robot, context)

    if (req.isContributor) {
      req.unlabel(req.config.labels.feedback)
    } else if (req.reopen) {
      // if a non-contrib close an issue, re-open it
      req.edits.state = 'open'
    }

    await req.save('issues.closed')
  })

  robot.on('issues.reopened', async (context: any) => {
    const req = await load(robot, context)

    if (req.isContributor && !req.ignore) req.label(req.config.labels.feedback)

    await req.save('issues.reopend')
  })
}
