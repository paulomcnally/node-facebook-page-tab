[ExpressJS](https://github.com/visionmedia/express) middleware to create facebook tab page applications.

Auth via top location.

## Installation

    npm install facebook-page-tab

## Data stored on session
* user
* application
* page


## package.json

Create a package.json file

    {
      "name": "my-tab-app",
      "version": "0.0.1",
      "dependencies": {
        "express": "^4.2.0",
        "body-parser": "^1.2.0",
        "cookie-parser": "^1.1.0",
        "express-session": "^1.1.0",
        "facebook-page-tab": "0.0.3"
      }
    }

## Dependencies

Install dependencies

    npm install

## config.js

Create config.js file

    var Config = function(){

        var self = this;
    
        /**
         * Http Port
         * @type {number}
         */
        self.port = 1772;
    
        /**
         * Facebook Application Settings
         */
        self.facebook = {
            id: '', // facebook application ID
            secret: '', // facebook application secret
            callback: 'https://domain.com/app/', // facebook callback url
            scope: ['email'] // http://bit.ly/1vqKT2o
        };
    
        /**
         * Session Settings
         */
        self.session = {
            secret: '123456', // custom hash
            key: 'fb_' + self.facebook.id, // session key name
            cookie: {
                secure: true,
                maxAge  : new Date(Date.now() + 3600000*24) // 24 hours
            },
            proxy: true
        };
    
    }
    
    module.exports = new Config();

## app.js

Create app.js file

    var express = require('express');
    var bodyParser = require('body-parser');
    var cookieParser = require('cookie-parser');
    var session = require('express-session');
    var facebookPageTap = require('facebook-page-tab');
    var config = require('./config');
    
    var app = express();
    
    // Express configuration
    
    app.use( bodyParser() );
    app.use( cookieParser( config.session.secret ) );
    app.use( session( config.session ) );
    
    app.use( facebookPageTap( app, config.facebook ) );
    
    app.post( '/', function( req, res ){
        res.send( JSON.stringify( req.session, null, 2 ) );
    } );
    
    app.listen(config.port);


## Example repo

[https://github.com/paulomcnally/node-facebook-page-tab-example](https://github.com/paulomcnally/node-facebook-page-tab-example)