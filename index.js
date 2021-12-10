const express = require('express')
const bodyParser = require('body-parser')
const crypto = require('crypto')
const { WebClient } = require('@slack/web-api');
const manifest = require('./config/manifest');

const token = process.env.SLACK_BOT_USER_OAUTH_TOKEN;
const web = new WebClient(token);
const app = express()
const fs = require('fs')
const path = require('path')

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

const router = express.Router()

// #############################################################################
// Configure the saving of the raw body to be used in slack signature authorization
app.use(function(req, res, next) {
  req.rawBody = '';
  req.setEncoding('utf8');

  req.on('data', function(chunk) {
    req.rawBody += chunk;
  });

  req.on('end', function() {
    next();
  });
});
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
  const slackSigningSecret = process.env.SLACK_APP_CREDENTIALS_SIGNING_SECRET;
  const requestSignature = req.headers['x-slack-signature'] || '='
  const requestTimestamp = req.headers['x-slack-request-timestamp']
  const hmac = crypto.createHmac('sha256', slackSigningSecret)
  const [version, hash] = requestSignature.split('=')
  const base = `${version}:${requestTimestamp}:${req.rawBody}`
  hmac.update(base);

  console.log(`base: ${base}\n\nhash: ${hash}`)

  if(hash!==hmac.digest('hex')){
    console.log('Unauthorized request, must not be from slack')

    res.sendStatus(403)
    res.end()

    return
  }
  return next()
}

router.post('/events', authorize_slack, async (req, res) => {
  let event = req.body.event;
  let ts = event.thread_ts || event.ts
  let channel = event.channel
  let msg_txt = event.text

  // Event types defined here: https://api.slack.com/events?filter=Events
  if (event.type === "app_mention") {
    let resp_txt = `Hi! :wave: I heard you say:\n\n> ${msg_txt}`
    const result = await web.chat.postMessage({
      text: resp_txt,
      channel,
      thread_ts:ts
    });
  } else if (event.type === "message") {
    console.log(`message: ${event.text}`)
  } else {
    console.log(`${event.type}: ${event.text}`)
  }

  return res.sendStatus(200)
})

router.all('/', async (req,res) => {
  try {
    if(process.env.SLACK_BOT_USER_OAUTH_TOKEN && process.env.SLACK_APP_CREDENTIALS_SIGNING_SECRET) {
      res.status(200)
      return res.send('Hi! Configuration complete')
    } else {

      manifest.settings.event_subscriptions.request_url = `https://${req.headers.host}`

      let encodedManifest = encodeURIComponent(JSON.stringify(manifest))

      let url = `https://api.slack.com/apps?new_app=1&manifest_json=${encodedManifest}`
      console.log(url)
      res.send(url)
      // return res.sendFile(path.resolve('./public/index.html'));
    }
  } catch(e) {
    res.status(500)
    console.error(e)
    return res.json({'error':e.toString()})
  }
})

app.use('/', router)
app.listen(process.env.PORT || 3000)
