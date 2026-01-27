import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Security, LoginCallback } from '@okta/okta-react'
import { OktaAuth, toRelativeUrl } from '@okta/okta-auth-js'
import App from './App.jsx'
import SurveyResponse from './SurveyResponse.jsx'
import { RequireAuth } from './RequireAuth.jsx'
import { oktaConfig } from './oktaConfig.js'
import { registerServiceWorker } from './registerServiceWorker.js'
import './index.css'

const oktaAuth = new OktaAuth(oktaConfig);

const restoreOriginalUri = async (_oktaAuth, originalUri) => {
  window.location.replace(
    toRelativeUrl(originalUri || '/', window.location.origin)
  );
};

// Register service worker for PWA support
registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Security oktaAuth={oktaAuth} restoreOriginalUri={restoreOriginalUri}>
        <Routes>
          {/* Login callback route - public */}
          <Route path="/login/callback" element={<LoginCallback />} />
          
          {/* Survey response route - public (no auth required) */}
          <Route path="/survey/:token" element={<SurveyResponse />} />
          
          {/* Protected admin dashboard - requires auth */}
          <Route 
            path="/*" 
            element={
              <RequireAuth>
                <App />
              </RequireAuth>
            } 
          />
        </Routes>
      </Security>
    </BrowserRouter>
  </React.StrictMode>,
)