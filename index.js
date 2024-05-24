#! /usr/bin/env node
/**
 * Create changelog using keep a changelog https://keepachangelog.com
 * Release Behavior:
 * - each release have a version number, which obtained from package.json version.
 * - each logs from the CLI question, will generated the changes by type to the Changelog Instance.
 * - when release is added, we created a changelog file with group by minor version in changelogs/ directory.
 *
 * @author Andikha Dian.
 */

const { Changelog, Release, parser } = require('keep-a-changelog')
const fs = require('fs')
const readline = require('readline')

const { version } = JSON.parse(fs.readFileSync('package.json', 'utf8'))

const bump = {
  version: version,
  date: new Date(),
  logs: [],
}

const supportedChangeTypes = [
  {
    key: 1,
    label: 'Added',
    methodName: 'added',
  },
  {
    key: 2,
    label: 'Changed',
    methodName: 'changed',
  },
  {
    key: 3,
    label: 'Removed',
    methodName: 'removed',
  },
  {
    key: 4,
    label: 'Fixed',
    methodName: 'fixed',
  },
  {
    key: 5,
    label: 'Deprecated',
    methodName: 'deprecated',
  },
  {
    key: 6,
    label: 'Security',
    methodName: 'security',
  },
]

/* ------------------------------ CLI Questions ----------------------------- */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})
const question = (str) => new Promise((resolve) => rl.question(str, resolve))

const steps = {
  start: async () => {
    console.log('Changelog Generation\n')
    return steps.chooseChangeType()
  },
  chooseChangeType: async () => {
    console.log('Change Types: ')
    supportedChangeTypes.forEach((item) =>
      console.log(`${item.key}. ${item.label}`)
    )
    const answer = await question('Choose change type, Please type number: ')

    const targetChangeType = supportedChangeTypes.find(
      (item) => item.key === Number(answer)
    )

    if (!targetChangeType) {
      console.log('Wrong log type!')
      return steps.chooseChangeType()
    }

    return steps.describeLogChange(targetChangeType)
  },
  describeLogChange: async (changeType) => {
    const answer = await question('Describe the change (eg: New Home UI): ')
    bump.logs.push({
      changeType,
      change: answer,
    })
    console.log('OK!')

    return steps.newLog()
  },
  newLog: async () => {
    const answer = await question('Add more log? Please type [y/n]: ')
    switch (answer.toLowerCase()) {
      case 'y':
        return steps.chooseChangeType()

      default:
        return steps.end()
    }
  },
  end: async () => {
    createChangelog()
    return rl.close()
  },
}

/* --------------------------- Generate Changelog --------------------------- */

function createChangelog() {
  if (!bump.logs.length) {
    return
  }
  const ROOT_DIR = 'changelogs/'

  const [major, minor] = String(bump.version).split('.')

  const targetFile = `${ROOT_DIR}${major}.${minor}.x.md`

  let changelog = new Changelog(
    'Changelog',
    `All notable changes to ${major}.${minor}.x version will be documented in this file.`
  )

  if (!fs.existsSync(ROOT_DIR)) {
    fs.mkdir(ROOT_DIR, (err) => {
      if (err) throw new Error(`Error write file: ${err.message}`)
    })
  }

  if (fs.existsSync(targetFile)) {
    changelog = parser(fs.readFileSync(targetFile, 'utf-8'))
  }

  const release = new Release(bump.version, bump.date)
  for (let idx = 0; idx < bump.logs.length; idx++) {
    const log = bump.logs[idx]

    try {
      release[log.changeType.methodName](log.change)
    } catch (error) {
      console.log(`❌ Failed to call release item: ${log}`)
      console.log(`Error: ${error}`)
    }
  }

  changelog.addRelease(release)

  fs.writeFile(
    targetFile,
    changelog.toString(),
    { encoding: 'utf-8' },
    (error) => {
      if (error) throw new Error(`Error write file: ${error.message}`)

      console.log(`✅ Changelog from ${version} has been created!`)
    }
  )
}

/* --------------------------------- Runner --------------------------------- */

steps.start()
