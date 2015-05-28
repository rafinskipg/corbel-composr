'use strict';
var request = require('supertest'),
  chai = require('chai'),
  expect = chai.expect,
  clientUtils = require('../utils/client'),
  corbelSigner = require('../utils/corbelSigner');

var AdminClientData = clientUtils.getAdminClient();
var demoAppClientData = clientUtils.getDemoClient();

var adminClientToken,
  demoClientToken,
  demoUserToken,
  demoUserRefreshToken;

function test(app) {
  describe('With Login phrases,', function() {

    var loginphrase = require('../../fixtures/phrases/phraseLoginClient.json');

    before(function(done) {
      this.timeout(30000);
      request(app)
        .post('/token')
        .send(AdminClientData)
        .expect(200)
        .end(function(err, response) {
          expect(response).to.be.an('object');
          expect(response.body.data.accessToken).to.exist;
          adminClientToken = response.body.data.accessToken;

          request(app)
            .post('/token')
            .send(demoAppClientData)
            .expect(200)
            .end(function(err, response) {
              expect(response).to.be.an('object');
              expect(response.body.data.accessToken).to.exist;
              demoClientToken = response.body.data.accessToken;
              done(err);
            });

        });
    });

    describe('client login phrase', function() {

      var phraseClientLoginLocation;

      it('is created correctly', function(done) {
        this.timeout(30000);
        request(app)
          .put('/phrase')
          .set('Authorization', adminClientToken)
          .send(loginphrase)
          .expect(204)
          .end(function(err, response) {
            expect(response.headers).to.exist;
            phraseClientLoginLocation = response.headers.location;
            expect(phraseClientLoginLocation).to.exist;
            done(err);
          });
      });

      it('receives a token after calling it', function(done) {
        var phraseEndpoint = loginphrase.url;
        var domain = phraseClientLoginLocation.replace('phrase/', '').split('!')[0];
        var url = '/' + domain + '/' + phraseEndpoint;
        var demoClientJwt = {
          jwt: corbelSigner.getClientAssertion(demoAppClientData)
        };

        this.timeout(30000);

        //let's wait till corbel triggers the event to register the phrase in composr
        //TODO: use any tool to know when it happens
        setTimeout(function() {

          request(app)
            .post(url)
            .send(demoClientJwt)
            .expect(200)
            .end(function(err, response) {
              expect(response).to.be.an('object');
              expect(response.body.accessToken).to.exist;
              //demoClientToken = response.body.data.accessToken;
              done(err);
            });

        }, 2000);

      });

    });


    describe('user login phrase', function() {

      var phraseUserLoginLocation;
      var userLoginPhrase = require('../../fixtures/phrases/phraseLoginUser.json');

      it('is created correctly', function(done) {
        this.timeout(30000);
        request(app)
          .put('/phrase')
          .set('Authorization', adminClientToken)
          .send(userLoginPhrase)
          .expect(204)
          .end(function(err, response) {
            expect(response.headers).to.exist;
            phraseUserLoginLocation = response.headers.location;
            expect(phraseUserLoginLocation).to.exist;
            done(err);
          });
      });

      it('receives a token/expires/refresh after calling it', function(done) {
        var phraseEndpoint = userLoginPhrase.url;
        var domain = phraseUserLoginLocation.replace('phrase/', '').split('!')[0];
        var url = '/' + domain + '/' + phraseEndpoint;

        //Returns the data needed to make a user login
        var demoUserData = clientUtils.getUser();

        var demoUserJwt = {
          jwt: corbelSigner.getUserAssertion(demoClientToken, demoAppClientData.clientSecret, demoUserData)
        };

        this.timeout(30000);

        //let's wait till corbel triggers the event to register the phrase in composr
        //TODO: use any tool to know when it happens
        setTimeout(function() {
          console.log('DEMO_CLIENT', demoClientToken);
          request(app)
            .post(url)
            .send(demoUserJwt)
            .expect(200)
            .end(function(err, response) {
              expect(response).to.be.an('object');
              expect(response.body).to.be.an('object');
              expect(response.body.tokenObject).to.be.an('object');
              expect(response.body.user).to.be.an('object');
              expect(response.body.tokenObject.accessToken).to.exist;
              expect(response.body.tokenObject.expiresAt).to.exist;
              expect(response.body.tokenObject.refreshToken).to.exist;
              demoUserToken = response.body.tokenObject.accessToken;
              demoUserRefreshToken = response.body.tokenObject.refreshToken;
              done(err);
            });

        }, 2000);

      });

    });

    describe('user tokenRefresh phrase', function() {

      var refreshTokenLocation;
      var refreshTokenPhrase = require('../../fixtures/phrases/refreshToken.json');

      it('is created correctly', function(done) {
        this.timeout(30000);
        request(app)
          .put('/phrase')
          .set('Authorization', adminClientToken)
          .send(refreshTokenPhrase)
          .expect(204)
          .end(function(err, response) {
            expect(response.headers).to.exist;
            refreshTokenLocation = response.headers.location;
            expect(refreshTokenLocation).to.exist;
            done(err);
          });
      });

      it('can refresh user token with refreshToken', function(done) {
        var phraseEndpoint = refreshTokenPhrase.url;
        var domain = refreshTokenLocation.replace('phrase/', '').split('!')[0];
        var url = '/' + domain + '/' + phraseEndpoint;

        //Returns the data needed to make a user login

        var demoUserData = clientUtils.getUser();

        var data = {
          jwt: corbelSigner.getTokenRefreshAssertion(demoUserRefreshToken, demoUserData.scopes, demoAppClientData)
        };

        this.timeout(30000);

        //let's wait till corbel triggers the event to register the phrase in composr
        //TODO: use any tool to know when it happens
        setTimeout(function() {

          request(app)
            .post(url)
            .send(data)
            .expect(200)
            .end(function(err, response) {
              expect(response).to.be.an('object');
              expect(response.body).to.be.an('object');
              expect(response.body.accessToken).to.exist;
              expect(response.body.expiresAt).to.exist;
              expect(response.body.refreshToken).to.exist;
              expect(response.body.refreshToken).to.not.be.equal(demoUserRefreshToken);
              demoUserToken = response.body.accessToken;
              demoUserRefreshToken = response.body.refreshToken;
              done(err);
            });

        }, 2000);

      });
    });


  });


}

module.exports = test;
