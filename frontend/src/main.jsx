import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { AwsRum } from "aws-rum-web";
import { AuthProvider } from './context/AuthContext'
import { Toaster } from 'react-hot-toast'

// --- CloudWatch RUM Setup (Real User Monitoring) ---
try {
  const config = {
    sessionSampleRate: 1, // Track 100% of sessions
    identityPoolId: "us-east-1:5aa9f338-519f-4e77-904e-34f0dbb56b7d",
    endpoint: "https://dataplane.rum.us-east-1.amazonaws.com",
    telemetries: ["performance", "errors", "http"],
    allowCookies: true,
    enableXRay: true, // Connects frontend to backend traces!
    signing: false // Using public resource policy for zero-friction
  };

  const APPLICATION_ID = "7665ac47-62b9-469f-b8bb-06e36f4468d7";
  const APPLICATION_VERSION = "1.0.0";
  const APPLICATION_REGION = "us-east-1";

  new AwsRum(APPLICATION_ID, APPLICATION_VERSION, APPLICATION_REGION, config);
} catch (error) {
  // Ignore errors thrown during CloudWatch RUM web client initialization
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1a1a2e',
              color: '#f3f4f6',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
