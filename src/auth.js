const chalk = require('chalk')
async function auth(pwd){
  if(pwd == 'hwgNb'){
    return true
  }else{
    console.log(chalk.red('密码错误!'))
    return false
  }
}

module.exports = auth