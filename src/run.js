const CONFIG = require('./../config')
const { exec } = require('child_process')
const chalk = require('chalk')
const path = require('path')
const putFile = require('./put');
global.singleLine = require('single-line-log').stdout

async function runProject(){
  let runKeys = []
  await Object.keys(require(CONFIG.PACKAGE).scripts).forEach(item=>{
    if(item.indexOf('build')!=-1){
      runKeys.push(item)
    }
  })
  if(runKeys.length == 0){
    readline.question('未发现build打包命令，继续执行则将传输存在的打包文件！是否执行？  yes/no    ', flag => {
      if (flag != 'yes' && flag != 'no') {
        console.log(chalk.red('请输入yes/no'))
        process.exit(1)
      } else if (flag == 'yes') {
        putFile()
      } else {
        process.exit(1)
      }
    })
  }else if(runKeys.length == 1){
    runCommand(runKeys[0])
  }else if(runKeys.length >=2 ){
    const str = await runKeys.map((item, index)=>{
      return `【${index + 1}】  ${item}: ${require(CONFIG.PACKAGE).scripts[item]}`
    }).join('\n')
    readline.question(`${chalk.green('发现多个打包命令，请选择？（键入对应序号的数字并回车）')}\n${str}\n`, n => {
      if(n>=1&&n<=runKeys.length){
        runCommand(runKeys[n-1])
      }else{
        console.log(chalk.red('错误的输入，请检查'))
        process.exit(1)
      }
    })
  }else{
    console.log(chalk.red('未知错误'))
    process.exit(1)
  }
}

async function runCommand(command) {
  let i = 0
  let timer = setInterval(() => {
    let s = ['·','··','···','····','·····','······']
    singleLine(`[${Math.floor(i / 2)}秒]`+'正在打包中' + s[(++i) % s.length])
  }, 500);
  exec(`npm run ${command}`, (err, out)=>{
    if(err){
      clearInterval(timer)
      console.error(err)
      console.log(chalk.red('打包过程有错误产生，请注意检查再决定是否继续执行文件传输！！！'))
      setTimeout(() => {
        putFile()
      }, 1000);
    }else{
      clearInterval(timer)
      console.log(out)
      console.log(chalk.green('打包完成，请注意辨别打包是否完整无误！'+`【${command}】`))
      setTimeout(() => {
        putFile()
      }, 1000);
    }
  })
}

module.exports = runProject