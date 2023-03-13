const CONFIG = require('./../config')
const fs = require('fs')
const chalk = require('chalk')
const auth = require('./auth')
const readlineSync = require('readline-sync');
const nodeGit = require('nodegit');
const SQL = require('./sql')
const Client = require('ssh2-sftp-client');
const path = require('path');
const moment = require('moment');
const logInfo = require('./log');
let sftp = null

async function putFile() {
  fs.readdir(CONFIG.DIST, async (err, files)=>{
    if(err){
      console.log(chalk.red('未发现打包后的dist目录，请检查！'))
      process.exit(1)
    }else{
      if(files.length == 0){
        console.log(chalk.red('打包文件dist目录为空，请检查！'))
        process.exit(1)
      }else{
        let flag = false
        while(!flag){
          let pwd = readlineSync.question(chalk.green('Input your password before transfer files to server (Input "no" to cancel)\n'), { hideEchoBack: true })
          if(pwd == 'no') process.exit(1)
          flag = await auth(pwd)
          if(flag){
            // 查询部署地址
            await findServer(files)
          }
        }
      }
    }
  })
}

async function findServer(files){
  const repo = await nodeGit.Repository.open(process.cwd())
  const ref = await repo.getCurrentBranch()
  const branchName = ref.name()
  const projectName = require(CONFIG.PACKAGE).project
  const result = await SQL.lookProject(branchName.split('/')[2], projectName)
  if(result.length == 0){
    console.log(chalk.red('未找到对应服务器，请检查package.json或后台配置！'))
    process.exit(1)
  }else if(result.length == 1){
    backupFile(files, result[0])
  }else if(result.length > 1){
    const str = await result.map((it, ii) => {
      return `【${ii + 1}】：[${it.server.ip}]  [${it.root}]`
    }).join('\n')
    console.log(`${chalk.green('发现多个可部署环境，请选择（输入对应序号并回车）\n')}${str}\n`)
    let n = readlineSync.question('Your answer:')
    if(n>=1&&n<=result.length){
      backupFile(files, result[n-1])
    }else{
      console.log(chalk.red('不支持的输入！请检查'))
      process.exit(1)
    }
  }else{
    console.log(chalk.red('未知错误！'))
    process.exit(1)
  }
}

async function backupFile(files, server) {
  try{
    sftp = new Client()
    await sftp.connect({ host: server.server.ip, port: 22, username: server.server.user, password: server.server.password })
    const now = moment().format('YYYY-MM-DD HH:mm:ss')
    let promises = []
    await files.forEach(async file => {
      promises.push(
        new Promise(async (resolve, reject) => {
          let hasFile = await sftp.exists(server.root + file)
          if (hasFile) {
            await sftp.rename(server.root + file, server.root + now + '_' + file)
            console.log(server.root + file + '    =====>     ' + server.root + now + '_' + file)
            resolve(true)
          } else {
            resolve(true)
          }
        })
      )
    })
    Promise.all(promises).then(res => {
      console.log(chalk.green('文件备份完成'))
      transfer(server, now)
    })
  }catch (err) {
    console.log(chalk.red(err))
    process.exit(1)
  }
}

async function transfer(server, now){
  sftp.on('upload', info=>{
    let t = Math.round((new Date().getTime() - new Date(now).getTime()) / 1000)
    singleLine(`[${t}秒]正在传输：${chalk.green(info.source)}`)
  })
  sftp.uploadDir(CONFIG.DIST, server.root).then(done=>{
    sftp.end()
    console.log(chalk.green('\n传输完成'))
    logInfo(`${global.user}【${now}】：更新了项目${server.project}【${server.house}】\n`)
    process.exit(1)
  })
}

module.exports = putFile