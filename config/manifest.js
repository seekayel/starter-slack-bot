module.exports = {
  "_metadata": {
      "major_version": 1,
      "minor_version": 1
  },
  "display_information": {
      "name": "Cyclic Starter Bot",
      "description": "Cyclic Starter Bot Just For Kicks",
      "background_color": "#737373"
  },
  "features": {
      "bot_user": {
          "display_name": "cyclic-starter-bot",
          "always_online": true
      }
  },
  "oauth_config": {
      "scopes": {
          "bot": [
              "chat:write",
              "channels:history",
              "groups:history",
              "im:history",
              "mpim:history",
              "app_mentions:read"
          ]
      }
  },
  "settings": {
      "event_subscriptions": {
          "request_url": "x-x-x-x-x-x-x-x-x",
          "bot_events": [
              "app_mention",
              "message.channels"
          ]
      },
      "org_deploy_enabled": false,
      "socket_mode_enabled": false,
      "token_rotation_enabled": false
  }
}
