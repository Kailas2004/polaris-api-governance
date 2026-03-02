import { request } from './client';

export const getUserProfile = (apiKey) =>
  request('/profiles/user', {
    headers: {
      'X-API-KEY': apiKey
    }
  });

export const callProtected = (apiKey) =>
  request('/api/protected/test', {
    headers: {
      'X-API-KEY': apiKey
    }
  });
