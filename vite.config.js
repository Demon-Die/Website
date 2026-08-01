import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        contact: resolve(__dirname, 'contact.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        terms: resolve(__dirname, 'terms.html'),
        blogs: resolve(__dirname, 'blogs.html'),
        codeOfConduct: resolve(__dirname, 'codeOfConduct.html'),
        faqs: resolve(__dirname, 'faqs.html'),
        guidelines: resolve(__dirname, 'guidelines.html'),
        licence: resolve(__dirname, 'licence.html'),
        err404: resolve(__dirname, '404err.html'),
        projects: resolve(__dirname, 'projects.html'),
        members: resolve(__dirname, 'members.html'),
        achievements: resolve(__dirname, 'achievements.html'),
        ambassadors: resolve(__dirname, 'ambassadors.html'),
        admin: resolve(__dirname, 'admin.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        leaderboard: resolve(__dirname, 'leaderboard.html')
      }
    }
  }
});
