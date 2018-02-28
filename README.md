# issue-workflow

a GitHub App built with [probot](https://github.com/probot/probot) that automatically labels issues that require user feedback, on the assumption that if a repo contributer responds but does not close the issue, more user input is required. If a non-contributor responds, the label is removed.

You can steer this behavior by adding a yaml file in `.github/config.yml` in your repo that looks like

```
label-gun:
  labels:
    ignore:
    - chatter
    - wontfix
    reopen:
    - *
    feedback: awaiting-user-feedback
```

which means:

1. Don't (unlabel) issues that have one or more of the named labels
2. If a non-contributor comments on a closed issue that carries one of these labels, reopen the issue. This works on the assumption that if users are still commenting on the issue, there are remaining questions, and the issue isn't really dealt with fully. `*` means "any issue, labelled or not"
3. Use this label to mark issues that require user feedback (`awaiting-user-feedback` is the default, so if you omit `feedback`, it will get this label.

## Setup

Install the GitHub App by visiting [this link](https://github.com/settings/apps/label-gun/installations)
