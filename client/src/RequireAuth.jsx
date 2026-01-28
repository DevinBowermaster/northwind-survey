import React, { useEffect, useState } from 'react';
import { useOktaAuth } from '@okta/okta-react';
import { Navigate } from 'react-router-dom';
import { AuthSdkError } from '@okta/okta-auth-js';

export const RequireAuth = ({ children }) => {
  const { oktaAuth, authState } = useOktaAuth();
  const [errorMessage, setErrorMessage] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleSignIn = async (isRetry = false) => {
    try {
      setErrorMessage(null);
      oktaAuth.signInWithRedirect();
    } catch (error) {
      // Check if it's an AuthSdkError with PKCE/codeVerifier issues
      if (error instanceof AuthSdkError || 
          (error.message && (error.message.includes('PKCE') || error.message.includes('codeVerifier')))) {
        
        console.warn('[RequireAuth] PKCE error detected, clearing storage and retrying...', error);
        
        // Clear Okta token storage
        try {
          await oktaAuth.tokenManager.clear();
        } catch (clearError) {
          console.warn('[RequireAuth] Error clearing token manager:', clearError);
        }
        
        // Clear localStorage items starting with 'okta-'
        try {
          const keys = Object.keys(localStorage);
          keys.forEach(key => {
            if (key.startsWith('okta-')) {
              localStorage.removeItem(key);
            }
          });
        } catch (storageError) {
          console.warn('[RequireAuth] Error clearing localStorage:', storageError);
        }
        
        // Show message and retry after delay
        setErrorMessage('Authentication error detected, retrying...');
        
        // Limit retries to prevent infinite loops
        if (retryCount < 3) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            handleSignIn(true);
          }, 1000);
        } else {
          setErrorMessage('Authentication failed after multiple retries. Please refresh the page.');
        }
      } else {
        // Other errors
        console.error('[RequireAuth] Authentication error:', error);
        setErrorMessage('An authentication error occurred. Please try refreshing the page.');
      }
    }
  };

  useEffect(() => {
    if (authState && !authState.isAuthenticated && retryCount === 0) {
      handleSignIn();
    }
  }, [authState, retryCount]);

  if (!authState) {
    return <div>Loading...</div>;
  }

  if (!authState.isAuthenticated) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Redirecting to login...</div>
        {errorMessage && (
          <div style={{ marginTop: '10px', color: '#fbbf24' }}>
            {errorMessage}
          </div>
        )}
      </div>
    );
  }

  return children;
};
