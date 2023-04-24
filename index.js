const chalk = require('chalk')
const CONFIG = require('./config.js')
const putFile = require('./src/put');
const runProject = require('./src/run')
const fs = require('fs')
global.readline = require('readline').createInterface({ input: process.stdin, output: process.stdout })
let package = null
global.user = ''
  fs.access(CONFIG.PACKAGE, fs.constants.F_OK, err=>{
    if(err){
      console.log(chalk.red('请确认程序启动于项目根路径上，或项目根路径上存在package.json文件！'))
      // 结束程序
      process.exit(1)
    }else{
      package = require(CONFIG.PACKAGE)
      if (!package.project) {
        console.log(chalk.red('未在package.json中找到project配置！！！'))
        process.exit(1)
      } else {
        main()
      }
    }
    
  })

async function main() {
  if(process.argv&&process.argv[2]){
    global.user = process.argv[2]
    if (process.argv[3]&&process.argv[3]=='put'){
      readline.question(chalk.green('执行文件传输，是否继续？  y/n   '), async flag=>{
        if (flag != 'y' && flag != 'n') {
          console.log(chalk.red('不支持的输入！'))
          process.exit(1)
        } else if (flag == 'y') {
          await putFile()
        } else {
          process.exit(1)
        }
      })
    }else{
      runProject()
    }
  }else{
    console.log(chalk.red('错误的程序启动方式！未键入用户名'))
    // 未输入用户名，程序中断执行
    process.exit(1)
  }
}
