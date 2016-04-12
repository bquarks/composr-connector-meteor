import AuthRequest from './AuthRequest';
import AuthPersist from './AuthPersist';
import * as utils from '../utils/utils';

class AuthConnector {
  constructor({options = {}, authConfig, authPersist = new AuthPersist(), authRequest = new AuthRequest(authConfig)}) {
    this.authPersist = authPersist;
    this.authRequest = authRequest;
    // this.options = options;
    // TODO (Ivan): Expose utils and remove next expresion
    this.options = {
      headersExtension: {
        Deviceid: 'Web-' + utils.generateUUID()
      },
      authDataExtension: {
        'device_id': 'Web-' + utils.generateUUID()
      }
    };
    this.userAuthenticated = false;
  }

  /////////////////
  // Private API //
  /////////////////

  /**
   * Validates accesstoken and refresh if it's necessary
   */
  _validateAccessToken() {
    this.authPersist.getTokensFromStorage();
    const {accessToken, expiresAt, refreshToken} = this.authPersist.tokens.user;
    const validAccessToken = accessToken && expiresAt && (Date.now() < expiresAt);
    let accessTokenPromise;

    if (validAccessToken) {
      // Accesstoken exists and is not expired
      accessTokenPromise = Promise.resolve({
        accessToken
      });
    } else if (refreshToken) {
      // AccessToken expired or missed: refresh token if exists
      accessTokenPromise = this.refreshUserToken();
    } else {
      accessTokenPromise = Promise.reject('No accessToken or refreshToken');
    }

    return accessTokenPromise;
  }

  /**
   * Validates if clientAccessToken exists in sessionStorage and is not expired
   *
   * @return {String} clientAccessToken
   */
  _validateClientAccessToken(clientToken) {

    const isValid = (clientToken &&
      clientToken.accessToken &&
      clientToken.expiresAt &&
      Date.now() < parseInt(clientToken.expiresAt));

    return isValid ? clientToken.accessToken : false;

  }

  ////////////////
  // Public API //
  ////////////////

  /**
   * Init method
   * Make a client login and use authValidation method
   * to check if exists a previous valid session
   */
  init() {
    this.loginClient();
    this.authValidation()
      .then(() => this.userAuthenticated = true)
      .catch(() => this.userAuthenticated = false);
  }

  /**
   * Checks if exists a valid user session
   *
   * @return {Object} Promise
   */
  authValidation() {
    var that = this;
    // Use a previous authValidation promise if it is already pending
    if (this.validationPromise && this._validationState === 'Pending') {
      return this.validationPromise;
    }

    this._validationState = 'Pending';

    const validationRequest = this._validateAccessToken();

    validationRequest
      .then(() => this._validationState = 'Resolved')
      .catch(() => this._validationState = 'Resolved');

    this.validationPromise = validationRequest;

    return validationRequest;
  }

 /**
  * Dispatch user accessToken if it's available, if not, dispatch client accessToken
  *
  * @return {Object} Promise
  */
  getCurrentToken() {
    this.authPersist.getTokensFromStorage();

    const currentTokenPromise = this.authValidation()
    .then(() => {
      const accessToken = this.authPersist.tokens.user.accessToken;
      if (accessToken && this.userAuthenticated === false) {
        this.userAuthenticated = true;
      }
      return accessToken;
    })
    .catch(() => this.loginClient());

    return currentTokenPromise;
  }

  /**
   * Authenticates with client scope
   *
   * @return {Object} Promise
   */
  loginClient() {
    this.authPersist.getTokensFromStorage();
    const storedClientToken = this.authPersist.tokens.client;
    const currentClientAccessToken = this._validateClientAccessToken(storedClientToken);

    const clientAccessTokenPromise = new Promise((resolve, reject) => {
      // Resolve current clientToken if exists
      if (currentClientAccessToken) {
        resolve(currentClientAccessToken);
        return;
      }

      // Ask for a new clientToken
      this.authRequest.authenticateClient()
        .then(res => {
          this.authPersist.persistClientToken(res);
          resolve(res);
        })
        .catch(err => reject(err));

    });

    this.clientAccessTokenPromise = clientAccessTokenPromise;

    return clientAccessTokenPromise;
  }

  /**
   * Sign in method
   *
   * @return {Object} A result promise
   */
  loginUser({email, password, remember}) {
    const {authDataExtension = {}, headersExtension = {}} = this.options;

    const request = this.authRequest.authenticateUser({
      email,
      password,
      remember,
      headersExtension,
      authDataExtension
    });

    request.then(res => {
      let tokenObject = res.tokenObject;
      tokenObject.authOptions = this.options;
      this.authPersist.remember = remember ? remember : false;
      this.authPersist.persistAuthData(tokenObject);
      this.userAuthenticated = true;
    });

    this.loginUserPromise = request;

    return request;
  }

  /**
   * Refresh token method
   *
   * @return {Object}  A result promise
   */
  refreshUserToken() {
    this.authPersist.getTokensFromStorage();

    const refreshToken = this.authPersist.tokens.user.refreshToken;
    const {authDataExtension = {}, headersExtension = {}} = this.authPersist.tokens.authOptions;

    const request = this.authRequest.refreshUserToken({
      refreshToken,
      headersExtension,
      authDataExtension
    });

    request.then(res => {
      this.authPersist.persistAuthData(res);
      this.userAuthenticated = true;
    });

    this.refreshUserTokenPromise = request;

    return request;
  }

  /**
   * Logout method
   * Calls _authenticate() method
   */
  logoutUser() {
    this.authPersist.getTokensFromStorage();

    const accessToken = this.authPersist.tokens.user.accessToken;
    const {authDataExtension = {}, headersExtension = {}} = this.authPersist.tokens.authOptions;

    const request = this.authRequest.logoutUser({
      accessToken,
      headersExtension,
      authDataExtension
    });

    this.userAuthenticated = false;

    this.authPersist.removeAllUserData();

    return request;
  }
}

export default AuthConnector;
