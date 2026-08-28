import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Robustly get the key: Check .env file OR system environment variables (Railway)
  const apiKey = env.VITE_API_KEY || process.env.VITE_API_KEY || process.env.GEMINI_API_KEY || '';
  const geminiApiKey = process.env.GEMINI_API_KEY || apiKey;

  return {
    plugins: [react()],
    define: {
      // This is critical: it replaces `process.env.API_KEY` and `process.env.GEMINI_API_KEY` in your code 
      // with the actual value from environment variables during build.
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiApiKey),
    },
  }
})