const express = require('express')
const bodyParser = require('body-parser')
const crypto = require('crypto')
const { WebClient } = require('@slack/web-api');
const token = process.env.SLACK_TOKEN;
const web = new WebClient(token);
const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

const router = express.Router()
router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: true }))

// #############################################################################
// Configure static hosting for files in /public that have the extensions
// listed in the array.
var options = {
  dotfiles: 'ignore',
  etag: false,
  extensions: ['htm', 'html','css','js','ico','jpg','jpeg','png','svg'],
  index: ['index.html'],
  maxAge: '1m',
  redirect: true
}
app.use('/public', express.static('public', options))


// #############################################################################
// Check if the inbound call is actually from slack
const authorize_slack = (req,res,next)=>{
  if(req.body.type === 'url_verification'){
      return res.json(req.body)
  }
  const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
  const requestSignature = req.headers['x-slack-signature']
  const requestTimestamp = req.headers['x-slack-request-timestamp']
  const hmac = crypto.createHmac('sha256', slackSigningSecret)
  const [version, hash] = requestSignature.split('=')
  const base = `${version}:${requestTimestamp}:${JSON.stringify(req.body)}`
  hmac.update(base);
  if(hash!==hmac.digest('hex')){
    console.log('unauthorized request from slack')
    console.log(req.headers)
    console.log(req.body)
    return res.sendStatus(200)
  }
  return next()
}

router.post('/events', authorize_slack, async (req, res) => {
  let ts = req.body.event.thread_ts || req.body.event.ts
  let channel = req.body.event.channel
  let msg_txt = req.body.event.text
  let resp_txt = `Hi! :wave: I heard you say:\n\n> ${msg_txt}`
  const result = await web.chat.postMessage({
    text: resp_txt,
    channel,
    thread_ts:ts
  });
  return res.sendStatus(200)
})

const fs = require('fs')
const path = require('path')

router.all('/', async (req,res) => {
  try {
    if(process.env.SLACK_TOKEN) {
      res.status(200)
      return res.send('Hi! Configuration complete')
    } else {
      const manifestTemplate = fs.readFileSync(path.resolve('./config/app-manifest.yaml'))

      res.status(200)
      return res.send(manifestTemplate.toString())
    }
  } catch(e) {
    res.status(500)
    console.error(e)
    return res.json({'error':e.toString()})
  }
})

app.use('/', router)
app.listen(process.env.PORT || 3000)
