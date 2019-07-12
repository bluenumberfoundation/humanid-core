define({ "api": [
  {
    "type": "post",
    "url": "/mobile/users/login",
    "title": "User login",
    "name": "LoginUser",
    "group": "Mobile",
    "description": "<p>User login to new partner app using existing hash</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "existingHash",
            "description": "<p>User existing app hash</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "notifId",
            "description": "<p>Push notif ID</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "appId",
            "description": "<p>Partner app ID</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "appSecret",
            "description": "<p>Partner app secret</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "appId",
            "description": "<p>Partner app ID</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "hash",
            "description": "<p>User unique authentication code for given app</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "deviceId",
            "description": "<p>User unique authentication code for given app</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "routes/mobile.js",
    "groupTitle": "Mobile"
  },
  {
    "type": "get",
    "url": "/mobile/users/login",
    "title": "Login check",
    "name": "LoginUserCheck",
    "group": "Mobile",
    "description": "<p>Check if user still logged-in (hash is still valid)</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "hash",
            "description": "<p>User app hash</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "appId",
            "description": "<p>Partner app ID</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "appSecret",
            "description": "<p>Partner app secret</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>OK</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "routes/mobile.js",
    "groupTitle": "Mobile"
  },
  {
    "type": "post",
    "url": "/mobile/users/register",
    "title": "User registration",
    "name": "RegisterUser",
    "group": "Mobile",
    "description": "<p>New user registration</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "countryCode",
            "description": "<p>User mobile phone country code (eg. 62 for Indonesia)</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "phone",
            "description": "<p>User mobile phone number</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "deviceId",
            "description": "<p>User device ID</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "verificationCode",
            "description": "<p>User phone number verification code (OTP)</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "notifId",
            "description": "<p>Push notif ID</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "appId",
            "description": "<p>Partner app ID</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "appSecret",
            "description": "<p>Partner app secret</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "appId",
            "description": "<p>Partner app ID</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "hash",
            "description": "<p>User hash (unique authentication code) for given app</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "deviceId",
            "description": "<p>User unique authentication code for given app</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "routes/mobile.js",
    "groupTitle": "Mobile"
  },
  {
    "type": "post",
    "url": "/mobile/users/verifyPhone",
    "title": "Verify phone",
    "name": "VerifyPhone",
    "group": "Mobile",
    "description": "<p>Trigger OTP SMS code</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "countryCode",
            "description": "<p>User mobile phone country code (eg. 62 for Indonesia)</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "phone",
            "description": "<p>User mobile phone number</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "appId",
            "description": "<p>Partner app ID</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "appSecret",
            "description": "<p>Partner app secret</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>OK</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "routes/mobile.js",
    "groupTitle": "Mobile"
  },
  {
    "type": "post",
    "url": "/console/apps",
    "title": "App registration",
    "name": "CreateApp",
    "group": "WebConsole",
    "description": "<p>New (partner) app registration</p>",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p><code>Bearer accessToken</code></p>"
          }
        ]
      }
    },
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "appId",
            "description": "<p>Application ID</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "id",
            "description": "<p>Application ID</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "secret",
            "description": "<p>Secret code to invoke secured API</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "routes/webconsole.js",
    "groupTitle": "WebConsole"
  },
  {
    "type": "get",
    "url": "/console/apps",
    "title": "App list",
    "name": "ListApps",
    "group": "WebConsole",
    "description": "<p>Get list of registered (partner) apps</p>",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p><code>Bearer accessToken</code></p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Array",
            "optional": false,
            "field": "data",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "total",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "pages",
            "description": ""
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "routes/webconsole.js",
    "groupTitle": "WebConsole"
  },
  {
    "type": "get",
    "url": "/console/users",
    "title": "User list",
    "name": "ListUser",
    "group": "WebConsole",
    "description": "<p>Get list of registered users</p>",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p><code>Bearer accessToken</code></p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Array",
            "optional": false,
            "field": "data",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "total",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "pages",
            "description": ""
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "routes/webconsole.js",
    "groupTitle": "WebConsole"
  },
  {
    "type": "post",
    "url": "/console/login",
    "title": "Login",
    "name": "login",
    "group": "WebConsole",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "email",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "password",
            "description": ""
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "email",
            "description": ""
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "accessToken",
            "description": ""
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "routes/webconsole.js",
    "groupTitle": "WebConsole"
  }
] });
