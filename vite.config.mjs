import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        about: resolve(import.meta.dirname, 'about.html'),
        contact: resolve(import.meta.dirname, 'contact.html'),
        privacy: resolve(import.meta.dirname, 'privacy.html'),
        terms: resolve(import.meta.dirname, 'terms.html'),
        blogs: resolve(import.meta.dirname, 'blogs.html'),
        codeOfConduct: resolve(import.meta.dirname, 'codeOfConduct.html'),
        faqs: resolve(import.meta.dirname, 'faqs.html'),
        guidelines: resolve(import.meta.dirname, 'guidelines.html'),
        licence: resolve(import.meta.dirname, 'licence.html'),
        err404: resolve(import.meta.dirname, '404err.html'),
        projects: resolve(import.meta.dirname, 'projects.html'),
        members: resolve(import.meta.dirname, 'members.html'),
        achievements: resolve(import.meta.dirname, 'achievements.html'),
        ambassadors: resolve(import.meta.dirname, 'ambassadors.html'),
        dashboard: resolve(import.meta.dirname, 'dashboard.html'),
        admin: resolve(import.meta.dirname, 'admin.html'),
        leaderboard: resolve(import.meta.dirname, 'leaderboard.html'),
        r: resolve(import.meta.dirname, 'r.html')
      }
    }
  }
});
