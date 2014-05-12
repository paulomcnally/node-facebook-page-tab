var util = require('util');
var request = require('request');
var qs = require('qs');
var fbSignedParser = require('fb-signed-parser');
var async = require('async');

var facebookUrl = 'https://facebook.com/';
var graphApiUrl = 'https://graph.facebook.com/';
var graphUrl = 'https://graph.facebook.com/v2.0/';

module.exports = function (app, options) {

    var _name = 'Facebook Tab Page';

    if (!options.id) {
        throw new Error(_name + ': Please define a facebook application id.');
    }

    if (!options.secret) {
        throw new Error(_name + ': Please define a facebook application secret.');
    }

    if (!options.callback) {
        throw new Error(_name + ': Please define a facebook application auth callback url.');
    }

    if (!options.scope) {
        throw new Error(_name + ': Please define a facebook application auth scope.');
    }

    if (!options.page) {
        throw new Error(_name + ': Please define a facebook page name.');
    }

    return function auth(req, res, next) {

        // Is is autenticated go to next
        if (req.session.accessToken) {

            if (req.body.signed_request && !req.session.facebook) {

                async.parallel({
                        user: function (callback) {

                            request(util.format(graphUrl + 'me?access_token=%s', req.session.accessToken), function (error, response, body) {

                                callback(null,JSON.parse(body));

                            });

                        },
                        application: function (callback) {
                            request(util.format(graphUrl + 'fql?q=SELECT+app_id,app_name,namespace,display_name,link,logo_url+FROM+application+WHERE+app_id=%d&access_token=%s', options.id, req.session.accessToken), function (error, response, body) {

                                callback(null,JSON.parse(body));

                            });
                        }
                    },
                    function (err, results) {

                        var facebook = fbSignedParser.parse(req.body.signed_request, options.secret);

                        facebook.application = results.application.data[0];

                        facebook.user = results.user;

                        req.session.facebook = facebook;

                        next();

                    });

            }
            else {

                next();

            }

        } else {

            if (req.param('code')) {

                var url = util.format(graphUrl + 'oauth/access_token?code=%s&client_id=%d&redirect_uri=%s&client_secret=%s', req.param('code'), options.id, encodeURIComponent(options.callback), options.secret);

                request(url, function (error, response, body) {

                    if (!error && response.statusCode == 200) {

                        var dataParse = qs.parse(body);

                        req.session.accessToken = dataParse.access_token;

                        res.redirect(util.format('https://www.facebook.com/%s/app_%d', options.page, options.id));

                    }

                });

            }
            else {
                var url = util.format(facebookUrl + 'dialog/oauth?client_id=%d&redirect_uri=%s&auth_type=rerequest&scope=%s', options.id, encodeURIComponent(options.callback), options.scope.join(','));
                res.send('<script>window.top.location = ' + '"' + url + '"' + ';</script>');
            }

        }

    }


}