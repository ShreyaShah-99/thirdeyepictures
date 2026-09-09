import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth'
import { ResourcesProvider } from './resources'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ResourcesProvider>
          <App />
        </ResourcesProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
