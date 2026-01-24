import React from 'react';
import { useOktaAuth } from '@okta/okta-react';
import { Navigate } from 'react-router-dom';

export const RequireAuth = ({ children }) => {
  const { oktaAuth, authState } = useOktaAuth();

  if (!authState) {
    return <div>Loading...</div>;
  }

  if (!authState.isAuthenticated) {
    // Store current location and redirect to Okta login
    oktaAuth.signInWithRedirect();
    return <div>Redirecting to login...</div>;
  }

  return children;
};
