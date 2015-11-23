var util = require('util');
var request = require('request');
var qs = require('qs');
var fbSignedParser = require('fb-signed-parser');
var async = require('async');
var _ = require('underscore');

var facebookUrl = 'https://facebook.com/';
var graphApiUrl = 'https://graph.facebook.com/';
var graphUrl = 'https://graph.facebook.com/v2.5/';
var graphFql = 'https://graph.facebook.com/v2.0/';

module.exports.page = function(app, options) {

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

  if (!options.pageId) {
    throw new Error(appName + ': Please define a facebook page id.');
  }

  return function page(req, res, next) {
    // Set p3p header http://bit.ly/QYmhxt
    res.set('P3P', 'CP="IDC DSP COR CURa ADMa OUR IND PHY ONL COM STA"');

    if (req.body.signed_request) {
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


module.exports.auth = function(app, options) {

  return function auth(req, res, next) {
    if (req.session.accessToken && req.session.facebook) {
      next();
    }
    else if (req.query.code) {

      console.log('Debug Session');
      console.log(JSON.stringify(req.session));

      // Get access token http://bit.ly/1jXCmiY
      var url = util.format(graphUrl + 'oauth/access_token?code=%s&client_id=%d&redirect_uri=%s&client_secret=%s', req.query.code, options.id, encodeURIComponent(options.callback), options.secret);

      request(url, function (error, response, body) {

        if (!error && response.statusCode == 200) {

          var dataParse = JSON.parse(body);

          console.log(dataParse);

          // set accessToken session
          req.session.accessToken = dataParse.access_token;

          console.log(req.session.pageId);

          // Call user, application and page data
          async.parallel({
            user: function (callback) {

              request(util.format(graphUrl + 'me?access_token=%s', req.session.accessToken), function (error, response, body) {

                if( error ){
                  console.log( error );
                }

                callback(null,JSON.parse(body));

              });

            },
            application: function (callback) {
              request(util.format(graphFql + 'fql?q=SELECT+app_id,app_name,namespace,display_name+FROM+application+WHERE+app_id=%d&access_token=%s', options.id, req.session.accessToken), function (error, response, body) {

                if( error ){
                  console.log( error );
                }

                callback(null,JSON.parse(body));

              });
            },
            page: function (callback) {
              request(util.format(graphFql + 'fql?q=SELECT+username,website+FROM+page+WHERE+page_id=%d&access_token=%s', options.pageId, req.session.accessToken), function (error, response, body) {

                if( error ){
                  console.log( error );
                }

                callback(null, JSON.parse(body));

              });
            }
          },
          function (err, results) {

            console.log(results);

            var facebook = {};

            if (results.hasOwnProperty('application') && results.application.hasOwnProperty('data') && results.application.data.length > 0) {
              facebook.application = results.application.data[0];
            }

            if (results.hasOwnProperty('page') && results.page.hasOwnProperty('data') && results.page.data.length > 0) {
              facebook.page = results.page.data[0];
            }

            if (results.user) {
              facebook.user = results.user;
            }

            console.log(facebook);

            req.session.facebook = facebook;

            res.redirect(util.format('https://www.facebook.com/%s/app_%d', facebook.page.username, options.id));

          });

        }

      });
    }
    else {
      // Request auth dialog
      var urlAuth = util.format(facebookUrl + 'dialog/oauth?client_id=%d&redirect_uri=%s&auth_type=rerequest&scope=%s', options.id, encodeURIComponent(options.callback), options.scope.join(','));
      res.send('<script>window.top.location = ' + '"' + urlAuth + '"' + ';</script>');
    }
  };
};
