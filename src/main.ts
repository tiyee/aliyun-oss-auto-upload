import * as core from '@actions/core'
import AliyunOSS from 'ali-oss'
import {glob} from 'glob'
import path from 'path'

async function run(): Promise<void> {
  try {
    const REGION = core.getInput('region')
    const ACCESS_KEY_ID = core.getInput('access-key-id')
    const ACCESS_KEY_SECRET = core.getInput('access-key-secret')
    const BUCKET = core.getInput('bucket')
    const SECURE = core.getInput('secure')
    //
    const LOCAL_FOLDER = core.getInput('local-folder')
    const REMOTE_DIR: string = core.getInput('remote-dir')
    const client = new AliyunOSS({
      region: REGION,
      accessKeyId: ACCESS_KEY_ID,
      accessKeySecret: ACCESS_KEY_SECRET,
      secure: /^\s*(true|1)\s*$/i.test(SECURE),
      bucket: BUCKET
    })
    let folder = LOCAL_FOLDER
    while (folder.startsWith('/')) {
      folder = folder.slice(1)
    }
    while (folder.endsWith('/')) {
      folder = folder.slice(0, folder.length - 1)
    }
    if (folder.length === 0) {
      core.setFailed('folder is empty')
    }
    const maxConcurrency = 10
    const files: string[] = glob.sync(`${folder}/**/*`, {nodir: true})
    Promise.all(
      Array.from(
        {length: maxConcurrency},
        async (_, index): Promise<number> => {
          return new Promise(resolve => {
            const proc = (): void => {
              const file = files.shift()
              if (file === undefined) {
                resolve(index)
                return
              }
              if (file) {
                client.put(REMOTE_DIR + path.relative(folder, file), file)
              }
              proc()
            }
            proc()
          })
        }
      )
    )
    core.setOutput('upload success', files.join('\n'))
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
