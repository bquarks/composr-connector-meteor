let window = {
  localStorage: {
    removeItem: function () {

    },

    setItem: function () {

    },

    getItem: function () {

    },
  },

  sessionStorage: {
    removeItem: function () {

    },

    setItem: function () {

    },

    getItem: function () {

    },
  },
};

class AuthPersist {
  constructor(cookies = []) {
    this.getRememberFromStorage();
    this.getTokensFromStorage();
    this.cookies = cookies;
  }

  /////////////////
  // Private API //
  /////////////////

  /**
   * Adds data to localStorage
   *
   * @param {Object} data
   */
  _addLocalStorage(data) {
    if (this.remember) {
      window.localStorage.remember = true;
      window.localStorage.refreshToken = data.refreshToken;
    }

    if (data.authOptions) {
      window.localStorage.authOptions = JSON.stringify(data.authOptions);
    }

    window.localStorage.accessToken = data.accessToken;
    window.localStorage.expiresAt = data.expiresAt;

  }

  /**
   * Adds data to sessionStorage
   *
   * @param {Object} data
   */
  _addSessionStorage(data) {

    if (this.remember) {
      window.sessionStorage.remember = true;
    }

    if (data.authOptions) {
      window.sessionStorage.authOptions = JSON.stringify(data.authOptions);
    }

    window.sessionStorage.refreshToken = data.refreshToken;
    window.sessionStorage.accessToken = data.accessToken;
    window.sessionStorage.expiresAt = data.expiresAt;

  }

  /**
   * Removes auth data from localStorage
   */
  _removeLocalStorage() {
    window.localStorage.removeItem('refreshToken');
    window.localStorage.removeItem('accessToken');
    window.localStorage.removeItem('expiresAt');
    window.localStorage.removeItem('remember');
    window.localStorage.removeItem('authOptions');
  }

  /**
   * Removes auth data from sessionStorage
   */
  _removeSessionStorage() {
    window.sessionStorage.removeItem('refreshToken');
    window.sessionStorage.removeItem('accessToken');
    window.sessionStorage.removeItem('expiresAt');
    window.sessionStorage.removeItem('remember');
    window.sessionStorage.removeItem('authOptions');
  }

  _removeUserCookie(cookieName) {
    document.cookie = cookieName + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  }

  _removeUserCookies() {
    for (const cookie of this.cookies) {
      this._removeUserCookie(cookie);
    }
  }

  _getAuthOptionsFromStorage() {
    let authOptions = window.sessionStorage.authOptions ||
      window.localStorage.authOptions;
    try {
      authOptions = JSON.parse(authOptions);
    } catch (err) {
      authOptions = {};
    }

    return authOptions;
  }

  _getUserAccessToken() {
    const sessionStorageToken = {
      accessToken: window.sessionStorage.accessToken,
      expiresAt: parseInt(window.sessionStorage.expiresAt),
    };

    const localStorageToken = {
      accessToken: window.localStorage.accessToken,
      expiresAt: parseInt(window.localStorage.expiresAt),
    };

    let mostRecentToken = {};

    if (!isNaN(sessionStorageToken.expiresAt) && !isNaN(localStorageToken.expiresAt)) {
      mostRecentToken = sessionStorageToken.expiresAt > localStorageToken.expiresAt ? sessionStorageToken : localStorageToken;
      return mostRecentToken;
    }

    mostRecentToken = isNaN(sessionStorageToken.expiresAt) ? localStorageToken : sessionStorageToken;

    return mostRecentToken;
  }

  _getUserTokens() {
    const refreshToken = window.sessionStorage.refreshToken ||
      window.localStorage.refreshToken;
    const {
      accessToken,
      expiresAt,
    } = this._getUserAccessToken();
    const userTokens = {
      refreshToken,
      accessToken,
      expiresAt,
    };

    return userTokens;
  }

  _getClientAccessToken() {
    let accessToken = window.sessionStorage.clientAccessToken;;
    let expiresAt = window.sessionStorage.clientExpiresAt;

    return {
      accessToken,
      expiresAt,
    };
  }

  ////////////////
  // Public API //
  ////////////////

  /**
   * Persist client accessToken
   */
  persistClientToken(data) {
    let {
      accessToken,
      expiresAt,
    } = data;

    window.sessionStorage.setItem('clientAccessToken', accessToken);
    window.sessionStorage.setItem('clientExpiresAt', expiresAt);

    this.tokens.client = {
      accessToken,
      expiresAt,
    };
  }

  /**
   * Stores result auth data in local & session storage
   *
   * @param  {Object} data [accessToken, refreshToken, remember]
   */
  persistAuthData(data) {
    const {
      accessToken,
      refreshToken,
      expiresAt,
      authOptions,
    } = data;

    if (this.remember) {
      this._addLocalStorage(data);
      this._addSessionStorage(data);

    } else {
      // Not saving in localstorage if user doesnt check remember option
      // When browser is closed, user is logged out
      this._addSessionStorage(data);
    }

    this.tokens.user = {
      accessToken,
      refreshToken,
      expiresAt,
    };

    this.tokens.authOptions = authOptions;

    return true;
  }

  removeAllUserData() {
    this._removeLocalStorage();
    this._removeSessionStorage();
    this._removeUserCookies();
  }

  getRememberFromStorage() {
    const remember = window.sessionStorage.getItem('remember') ||
      window.localStorage.getItem('remember');

    this.remember = (remember === 'true');

    return this.remember;
  }

  getTokensFromStorage() {
    let tokens = {
      client: this._getClientAccessToken(),
      user: this._getUserTokens(),
      authOptions: this._getAuthOptionsFromStorage(),
    };
    this.tokens = tokens;

    return tokens;
  }
}

export default AuthPersist;
