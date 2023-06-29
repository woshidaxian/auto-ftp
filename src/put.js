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
const package = require(CONFIG.PACKAGE)
const addLog = require('./log')
let sftp = null
let foldSize = 0


function getFolderSize(folderPath) {
  let totalSize = 0;

  // 使用fs.readdirSync同步读取文件夹中的所有文件和子文件夹
  const files = fs.readdirSync(folderPath, { withFileTypes: true });
  for (const file of files) {
    const filePath = path.join(folderPath, file.name);
    // 如果是文件夹，递归计算文件夹大小
    if (file.isDirectory()) {
      totalSize += Number(getFolderSize(filePath));
    }
    // 如果是文件，获取文件大小并累加到总大小中
    else if (file.isFile()) {
      totalSize += Number(fs.statSync(filePath).size);
    }
  }

  return totalSize
}

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
            foldSize = getFolderSize(CONFIG.DIST) / 1024 ** 2
            await findServer(files)
          }
        }
      }
    }
  })
}

async function findServer(files){
  let p = process.cwd()
  if (package.repoPath){
    p = path.resolve(p, package.repoPath)
  }
  const repo = await nodeGit.Repository.open(p)
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
  addLog(`${global.user}于${moment().format('YYYY-MM-DD HH:mm:ss')}部署了${server.project}【${server.house}】\n`)
  let file = ''
  let size = 0
  sftp.on('upload', info=>{
    file = info.source
    fs.stat(info.source, (err, stats) => {
      size += stats.size
    })
  })
  let timer = setInterval(() => {
    let t = Math.round((new Date().getTime() - new Date(now).getTime()) / 1000)
    singleLine(`【${t}秒】【共：${foldSize.toFixed(2)}MB】【已传输：${(size / 1024 ** 2).toFixed(2)}MB】【${((size/1024**2)/foldSize*100).toFixed(2)}%】正在传输：${chalk.green(file)}`)
  }, 200);
  sftp.uploadDir(CONFIG.DIST, server.root).then(done=>{
    sftp.end()
    console.log(chalk.green('\n传输完成'))
    clearInterval(timer)
  })
}

module.exports = putFile