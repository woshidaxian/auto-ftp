const PROJECT = require('./project')
const SERVER = require('./server')
const CONFIG = require('./../config')
const axios = require('axios')

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

async function login(account, password){
  return new Promise((resolve, reject)=>{
    axios({
      url: CONFIG.BASE_URL + '/api/user/login?type=3',
      method: 'POST',
      data: {
        a: account,
        b: password
      },
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(res => {
      if (res.data.code == 1) {
        global.token = res.data.data.t
        global.userId = res.data.data.i
        resolve(true)
      } else {
        reject(res.data.message)
      }
    }).catch(err => {
      reject(err)
    })
  })
}

async function findServer(r, n){
  return new Promise((resolve, reject) => {
    axios({
      url: CONFIG.BASE_URL + '/api/tool/lookUpProject',
      method: 'GET',
      headers: {
        'u': global.userId,
        't': global.token
      },
      params: {
        house: r,
        project: n
      }
    }).then(res => {
      if(res.data.code == 1){
        resolve(res.data.data)
      }else{
        reject(res.data.message)
      }
    }).catch(err => {
      reject(err)
    })
  })
}

function addLog(r, n) {
  axios({
    url: CONFIG.BASE_URL + '/api/tool/deploymentLog',
    method: 'PUT',
    headers: {
      'u': global.userId,
      't': global.token
    },
    data: {
      house: r,
      project: n
    }
  })
}

module.exports = {
  lookProject, lookServer, login, findServer, addLog
}