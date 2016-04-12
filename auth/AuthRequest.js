import * as utils from '../utils/utils';

var Headers = fetch.Headers,
    Request = fetch.Request;

fetch.Promise = Promise;

class AuthRequest {
  constructor(authConfig) {
    // Init auth variables
    this.authConfig = authConfig;
  }

  /////////////////
  // Private API //
  /////////////////

  /**
   * Creates a credentials object with data stored in this.authconfig
   * and extends it with more authData (if provided)
   *
   * @param  {Object} authData Extended auth data (i.e. user & pass)
   * @param  {String} scope
   * @return {Object}
   */
  _createClaims(authData, scope) {
    const { clientId, iamAUD, scopes, defaultAuthData } = this.authConfig;
    let claims = {
      iss: clientId,
      aud: iamAUD,
      scope: scopes[scope],
    };

    Object.assign(claims, defaultAuthData);
    Object.assign(claims, authData);

    return claims;
  }

  /**
   * Generates jwt
   *
   * @param  {Object} claims
   * @param  {String} clientSecret
   * @return {String}
   */
  _generateAssertion(claims, clientSecret) {
    return utils.jwt.generate(claims, clientSecret);
  }

  /**
   * Authenticates with composr
   * Uses fetch (or fetch polyfill: https://github.com/github/fetch)
   *
   * @param  {String} endpoint     Endpoint to comunicate with
   * @param  {Object} claims  Credentials data created with _createClaims
   * @param  {Object} headers
   * @return {Object} A result promise
   */
  _authenticate(endpoint, claims, headers) {
    const { endpoints, urlBase, clientSecret, defaultHeaders } = this.authConfig;
    const url = utils.buildURI(urlBase) + endpoints[endpoint];
    const jwt = this._generateAssertion(claims, clientSecret);
    const body = {
      jwt,
    };
    let authenticationHeaders = {
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
    };

    Object.assign(authenticationHeaders, defaultHeaders);
    Object.assign(authenticationHeaders, headers);

    let headersInstance = new Headers(authenticationHeaders);

    const request = new Request(url, {
      credentials: 'same-origin',
      mode: 'cors',
      cache: 'no-store',
      method: 'POST',
      headers: headersInstance,
      body: JSON.stringify(body),
    });

    return fetch(request).then(utils.checkStatus);
  }

  ////////////////
  // Public API //
  ////////////////

  /**
   * Authenticates with client scope
   *
   * @return {Object} Promise
   */
  authenticateClient() {
    const claims = this._createClaims({}, 'client');

    this.clientAccessTokenPromise = this._authenticate('loginClient', claims);

    return this.clientAccessTokenPromise;
  }

  /**
   * Sign in method
   * Calls _authenticate() method with the inserted credentials
   *
   * @return {Object} A result promise
   */
  authenticateUser({ email, password, headersExtension = {}, authDataExtension = {} }) {
    const authData = Object.assign({
      'basic_auth.username': email,
      'basic_auth.password': password,
    }, authDataExtension);

    const claims = this._createClaims(authData, 'user');

    const request = this._authenticate('login', claims, headersExtension);

    return request;
  }

  /**
   * Refresh Token method
   * Calls _authenticate() method with the user refresh token provided
   *
   * @return {Object} A result promise
   */
  refreshUserToken({ refreshToken, headersExtension = {}, authDataExtension = {} }) {
    const authData = Object.assign({
      refresh_token: refreshToken,
    }, authDataExtension);

    const claims = this._createClaims(authData, 'user');

    const request = this._authenticate('refreshToken', claims, headersExtension);

    return request;
  }

  /**
   * Logs out method
   * Calls _authenticate() method with provided credentials
   */
  logoutUser({ accessToken, headersExtension = {}, authDataExtension = {} }) {
    const headers = Object.assign({
      Authorization: accessToken,
    }, headersExtension);

    const claims = this._createClaims(authDataExtension, 'user');

    const request = this._authenticate('logout', claims, headers);

    return request;
  }
}

export default AuthRequest;
