var util = require('util');
var request = require('request');
var qs = require('qs');
var fbSignedParser = require('fb-signed-parser');
var async = require('async');
var _ = require('underscore');

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

    return function auth(req, res, next) {

        var signedData = fbSignedParser.parse(req.body.signed_request, options.secret);

        // Set facebook page data from signed_request
        if( req.session.facebook ){

            req.session.facebook.page = _.extend( req.session.facebook.page, signedData.page );
        }

        // Is is autenticated go to next
        if (req.session.accessToken && req.session.facebook) {

            next();

        } else {

            if (req.param('code')) {

                // Get access token http://bit.ly/1jXCmiY
                var url = util.format(graphUrl + 'oauth/access_token?code=%s&client_id=%d&redirect_uri=%s&client_secret=%s', req.param('code'), options.id, encodeURIComponent(options.callback), options.secret);

                request(url, function (error, response, body) {

                    if (!error && response.statusCode == 200) {

                        var dataParse = qs.parse(body);

                        // set accessToken session
                        req.session.accessToken = dataParse.access_token;

                        // Call user, application and page data
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
                            },
                            page: function (callback) {
                                request(util.format(graphUrl + 'fql?q=SELECT+username,website+FROM+page+WHERE+page_id=%d&access_token=%s', signedData.page.id, req.session.accessToken), function (error, response, body) {

                                    callback(null,JSON.parse(body));

                                });
                            }
                        },
                        function (err, results) {

                            var facebook = {};

                            if( results.application.data[0] ){

                                facebook.application = results.application.data[0];

                            }

                            if( results.page.data[0] ){

                                facebook.page = _.extend( results.page.data[0], signedData.page );

                            }

                            if( results.user ){

                                facebook.user = _.extend( results.user, signedData.user );

                            }

                            req.session.facebook = facebook;

                            res.redirect(util.format('https://www.facebook.com/%s/app_%d', facebook.page.username, options.id));

                        });

                    }

                });

            }
            else {

                // Request auth dialog
                var url = util.format(facebookUrl + 'dialog/oauth?client_id=%d&redirect_uri=%s&auth_type=rerequest&scope=%s', options.id, encodeURIComponent(options.callback), options.scope.join(','));
                res.send('<script>window.top.location = ' + '"' + url + '"' + ';</script>');

            }

        }

    }


}