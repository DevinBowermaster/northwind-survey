export const oktaConfig = {
  clientId: '0oasmeb86mrw4Sm3U5d7',
  issuer: 'https://nw.okta.com/oauth2/default',
  redirectUri: window.location.origin + '/login/callback',
  scopes: ['openid', 'profile', 'email'],
  pkce: true
};