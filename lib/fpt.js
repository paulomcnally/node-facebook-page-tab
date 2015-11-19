var util = require('util');
var request = require('request');
var qs = require('qs');
var fbSignedParser = require('fb-signed-parser');
var async = require('async');
var _ = require('underscore');

var facebookUrl = 'https://facebook.com/';
var graphApiUrl = 'https://graph.facebook.com/';
var graphUrl = 'https://graph.facebook.com/v2.5/';

module.exports = function (app, options) {

  var appName = 'Facebook Tab Page';

  if (!options.id) {
    throw new Error(appName + ': Please define a facebook application id.');
  }

  if (!options.secret) {
    throw new Error(appName + ': Please define a facebook application secret.');
  }

  if (!options.callback) {
    throw new Error(appName + ': Please define a facebook application auth callback url.');
  }

  if (!options.scope) {
    throw new Error(appName + ': Please define a facebook application auth scope.');
  }

  return function auth(req, res, next) {
    // Set p3p header http://bit.ly/QYmhxt
    res.set('P3P', 'CP="IDC DSP COR CURa ADMa OUR IND PHY ONL COM STA"');

    if (req.body.hasOwnProperty('signed_request')) {

      // get signedRequest data
      var signedRequest = fbSignedParser.parse(req.body.signed_request, options.secret);

      // Set page ID on session
      req.session.pageId = signedRequest.page.id;

      // Merge session and signed data
      if (req.session.facebook) {
        req.session.facebook.page = _.extend( req.session.facebook.page, signedRequest.page );
        req.session.facebook.user = _.extend( req.session.facebook.user, signedRequest.user );
      }
    }
    else{
      console.error('req.body.signed_request is empty %s', req.url);
      console.log(req.query.signed_request);
    }

    next();

  };

};
