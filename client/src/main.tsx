import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { InquiryProvider } from './context/InquiryContext.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InquiryProvider>
      <App />
    </InquiryProvider>
  </StrictMode>,
)
