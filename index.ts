const _ = require('lodash')

class ProbotRequest {
  private robot: any
  private context: any
  private issue: any

  public isContributor: boolean
  public reopen: boolean
  public ignore: boolean

  public state: string
  public labels: Array<string>

  public config: {
    feedback: string
    ignore: Array<string>
    reopen: Array<string>
  }

  constructor(robot: any, context: any) {
    this.robot = robot
    this.context = context
  }

  public async load() {
    // load config
    let config
    try {
      config = await this.context.config('config.yml')
      if (config) config = config['label-gun']
      if (config && config.reopen === '*') config.reopen = ['*']
    } catch (err) {
      this.robot.log(err)
      config = null
    }
    this.config = config || { ignore: [], reopen: [], feedback: '' }
    this.config.feedback = this.config.feedback || 'awaiting-user-feedback'
    this.config.ignore = this.config.ignore || []
    this.config.reopen = this.config.reopen || []

    // called by contributor?
    const contributors = new Set((await this.context.github.repos.getContributors(this.context.repo())).data.map((contributor: any) => contributor.login))
    this.isContributor = contributors.has(this.context.payload.sender.login)

    // remember state
    this.issue = { ...this.context.payload.issue, labels: this.context.payload.issue.labels.map((label: any) => label.name) }
    this.state = this.issue.state
    this.labels = [...this.issue.labels]

    this.ignore = (_.intersection(this.issue.labels, this.config.ignore).length !== 0)
    this.reopen = (_.intersection(this.issue.labels.concat('*'), this.config.reopen).length !== 0)

    return this
  }

  public label(name: string) {
    if (this.labels.includes(name)) return
    this.labels.push(name)
  }

  public unlabel(name: string) {
    this.labels = this.labels.filter(label => label !== name)
  }

  public async save(reason: string) {
    if (this.state === this.issue.state && _.isEqual(new Set(this.labels), new Set(this.issue.labels))) return

    this.robot.log(`${reason}(${this.context.payload.sender.login}${this.isContributor ? '*' : ''}): ${this.issue.state}[${this.issue.labels}] -> ${this.state}[${this.labels}]`)
    await this.context.github.issues.edit(this.context.issue({ state: this.state, labels: this.labels }))
  }
}

module.exports = async (robot: any) => {
  // Your code here
  robot.log('Yay, the app was loaded!')

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/

  robot.on('issue_comment.created', async (context: any) => {
    const req = await (new ProbotRequest(robot, context)).load()

    // if a non-contrib comments on a closed issue, re-open it
    if (req.state === 'closed' && !req.isContributor) req.state = 'open'

    if (!req.ignore && req.state === 'open') {
      if (req.isContributor) {
        req.label(req.config.feedback)
      } else {
        req.unlabel(req.config.feedback)
      }
    }

    await req.save('issue_comment.created')
  })

  robot.on('issues.closed', async (context: any) => {
    const req = await (new ProbotRequest(robot, context)).load()

    if (req.isContributor) {
      req.unlabel(req.config.feedback)
    } else if (req.reopen) {
      // if a non-contrib close an issue, re-open it
      req.state = 'open'
    }

    await req.save('issues.closed')
  })

  robot.on('issues.reopened', async (context: any) => {
    const req = await (new ProbotRequest(robot, context)).load()

    if (req.isContributor && !req.ignore) req.label(req.config.feedback)

    await req.save('issues.reopend')
  })
}
