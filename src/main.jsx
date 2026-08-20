import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'

import './index.css'

import App from './App.jsx'

import {
  initialiseAuthStorage,
} from './utils/authStorage'

function applyPlatformClass() {
  const platform =
    Capacitor.getPlatform()

  const documentElement =
    document.documentElement

  documentElement.classList.remove(
    'platform-ios',
    'platform-android',
    'platform-web',
  )

  documentElement.classList.add(
    `platform-${platform}`,
  )
}

async function startMatchMuster() {
  /*
   * Make the current Capacitor platform
   * available to the mobile CSS before
   * React renders the application.
   *
   * Results:
   * iOS     -> html.platform-ios
   * Android -> html.platform-android
   * Web     -> html.platform-web
   */
  applyPlatformClass()

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
