import * as cryptography from './cryptography';

/*
 * Extracted from Corbel-js: https://github.com/corbel-platform/corbel-js
 * Original module: https://github.com/corbel-platform/corbel-js/blob/master/src/jwt.js
 */
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
// TODO: Use ES6 syntax
const EXPIRATION = 3500;
const ALGORITHM = 'HS256';
const TYP = 'JWT';
const VERSION = '1.0.0';

/**
 * JWT-HmacSHA256 generator
 * http://self-issued.info/docs/draft-ietf-oauth-json-web-token.html
 *
 * @param  {Object}                                 claims Specific claims to include in the JWT (iss, aud, exp, scope, ...)
 * @param  {String} secret                          String with the client assigned secret
 * @param  {Object} [alg='corbel.jwt.ALGORITHM']    Object with the algorithm type
 * @return {String} jwt                             JWT string
 */
export function generate(claims, secret, alg) {
  claims = claims || {};
  claims.exp = claims.exp || _generateExp();

  if (!claims.iss) {
    throw new Error('jwt:undefined:iss');
  }
  if (!claims.aud) {
    throw new Error('jwt:undefined:aud');
  }

  return _generate(claims, secret, alg);
}

export function decode(assertion) {
  var decoded = assertion.split('.');

  try {
    decoded[0] = JSON.parse(atob(decoded[0]));
  } catch (e) {
    decoded[0] = false;
  }

  try {
    decoded[1] = JSON.parse(atob(decoded[1]));
  } catch (e) {
    decoded[1] = false;
  }

  if (!decoded[0] && !decoded[1]) {
    throw new Error('corbel:jwt:decode:invalid_assertion');
  }

  decoded[0] = decoded[0] || {};
  decoded[1] = decoded[1] || {};

  Object.keys(decoded[1]).forEach(function(key) {
    decoded[0][key] = decoded[1][key];
  });

  return decoded[0];
}

function _generate(claims, secret, alg) {
  alg = alg || ALGORITHM;

  // Ensure claims specific order
  var claimsKeys = [
    'iss',
    'aud',
    'exp',
    'scope',
    'prn',
    'version',
    'refresh_token',
    'request_domain',

    'basic_auth.username',
    'basic_auth.password',

    'device_id'
  ];

  var finalClaims = {};
  claimsKeys.forEach(function(key) {
    if (claims[key]) {
      finalClaims[key] = claims[key];
    }
  });

  Object.assign(finalClaims, claims);

  if (Array.isArray(finalClaims.scope)) {
    finalClaims.scope = finalClaims.scope.join(' ');
  }

  var bAlg = cryptography.rstr2b64(cryptography.str2rstr_utf8(JSON.stringify({
      typ: TYP,
      alg: alg
    })));
  var bClaims = cryptography.rstr2b64(cryptography.str2rstr_utf8(JSON.stringify(finalClaims)));
  var segment = bAlg + '.' + bClaims;
  var assertion = cryptography.b64tob64u(cryptography.b64_hmac_sha256(secret, segment));

  return segment + '.' + assertion;
}

function _generateExp() {
  return Math.round((new Date().getTime() / 1000)) + EXPIRATION;
}
