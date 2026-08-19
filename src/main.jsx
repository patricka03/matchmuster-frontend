import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import './index.css'

import App from './App.jsx'

import {
  initialiseAuthStorage,
} from './utils/authStorage'

async function startMatchMuster() {
  try {
    await initialiseAuthStorage()
  } catch (error) {
    console.error(
      'Unable to initialise authentication storage.',
      error,
    )
  }

  createRoot(
    document.getElementById('root'),
  ).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
}

startMatchMuster()
