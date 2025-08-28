import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
        }
    },
    // Uncomment and set this if deploying to GitHub Pages under a repo name:
    // base: '/corrosion-calculator/',
});
