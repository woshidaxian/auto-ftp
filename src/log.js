const CONFIG = require('./../config')
const fs = require('fs')

function addLog(str){
  fs.appendFile(CONFIG.LOG_FILE, str, 'utf8', (err) => {
    if (err) {
      console.error('追加内容到文件出错:', err);
      return;
    }
  });
}

module.exports = addLog