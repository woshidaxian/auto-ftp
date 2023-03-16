const PROJECT = require('./project')
const SERVER = require('./server')

async function lookProject(r, n){
  let result = []
  await PROJECT.forEach(async item=>{
    if (item.project == n && item.house.indexOf(r)!=-1){
      result.push({
        ...item,
        server: await lookServer(item.serverId)
      })
    }
  })
  return result
}

async function lookServer(id){
  return SERVER.filter(it=>it.id == id)[0]
}


module.exports = {
  lookProject, lookServer
}