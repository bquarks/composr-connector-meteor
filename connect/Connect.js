import AuthConnector from '../auth/AuthConnector';
import * as utils from '../utils/utils';

if (Meteor) {
  // NOTE: this only work if it is used with the meteor package version of this library.

  var Headers = fetch.Headers,
      Request = fetch.Request;

  fetch.Promise = Promise;
}

class Connect {
  constructor({ config, authConnector = new AuthConnector({
        authConfig: config,
      }), }) {
    this.authConnector = authConnector;
    this.endpoints = config.endpoints;
    this.urlBase = config.urlBase;

    this.authConnector.init();
  }

  /////////////////
  // Private API //
  /////////////////

  _buildHeaders({ token, headersExtension }) {
    const defaultHeaders = {
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: 'Bearer ' + (token && token.accessToken ? token.accessToken : token),
    };

    let headers = Object.assign(defaultHeaders, headersExtension);

    return new Headers(headers);
  }

  _buildRequestParams({ body, queryParams }) {
    const queryPath = this._buildQueryPath(queryParams);

    if (body) {
      body = JSON.stringify(body);
    }

    return {
      body,
      queryPath,
    };
  }

  _buildQueryPath(dict) {
    var query = '';
    if (dict) {
      var queries = [];
      Object.keys(dict).forEach(function (key) {
        queries.push(key + '=' + dict[key]);
      });

      if (queries.length > 0) {
        query = '?' + queries.join('&');
      }
    }

    return query;
  }

  _buildUrl({ endpoint, queryPath }) {
    const url = utils.buildURI(this.urlBase) + this.endpoints[endpoint] + queryPath;

    return url;
  }

  _buildRequest({ endpoint, method, params, data, headersExtension }, token) {
    const { body, queryPath } = this._buildRequestParams({
      queryParams: params,
      body: data,
    });
    const url = this._buildUrl({
      endpoint,
      queryPath,
    });
    const headers = this._buildHeaders({
      token,
      headersExtension,
    });

    const request = new Request(url, {
      credentials: 'same-origin',
      mode: 'cors',
      cache: 'no-store',
      method,
      headers,
      body,
    });

    return fetch(request)
      .then(utils.checkStatus);
  }

  ////////////////
  // Public API //
  ////////////////

  /**
   * Send request
   *
   * @param  {Object} requestData
   * @return {Object} Promise
   */
  request(requestData, retry = true) {
    const fetchRequest = this.authConnector.getCurrentToken()
      .then((token) => {
        const request = this._buildRequest(requestData, token);

        return request;
      })
      .catch((err) => {
        if (retry && err.status === 401 && this.authConnector.userAuthenticated) {
          return this.authConnector.refreshUserToken()
            .then(({ accessToken }) => {
              const request = this._buildRequest(requestData, accessToken);

              return request;
            });
        }

        throw err;
      });

    return fetchRequest;
  }

  /**
   * GET request
   *
   * @param  {String} endpoint
   * @param  {Object} params
   * @return {Object}  Request promise
   */
  get(endpoint, params) {
    const requestData = {
      method: 'get',
      endpoint,
      params,
    };

    return this.request(requestData);
  }

  /**
   * DELETE request
   *
   * @param  {String} endpoint
   * @param  {Object} params
   * @return {Object}  Request promise
   */
  delete(endpoint, params) {
    const requestData = {
      method: 'delete',
      endpoint,
      params,
    };

    return this.request(requestData);
  }

  /**
   * POST request
   *
   * @param  {String} endpoint
   * @param  {Object} data
   * @return {Object}  Request promise
   */
  post(endpoint, data) {
    const requestData = {
      method: 'post',
      endpoint,
      data,
    };

    return this.request(requestData);
  }

  /**
   * PUT request
   *
   * @param  {String} endpoint
   * @param  {Object} data
   * @return {Object}  Request promise
   */
  put(endpoint, data) {
    const requestData = {
      method: 'put',
      endpoint,
      data,
    };

    return this.request(requestData);
  }

}

export default Connect;
