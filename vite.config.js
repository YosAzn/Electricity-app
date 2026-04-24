import { defineConfig } from 'vite'

import react from '@vitejs/plugin-react'



export default defineConfig({

  base: '/electricity-app/', // <--- השורה שצריך להוסיף (עם הלוכסנים)

  plugins: [react()],

})