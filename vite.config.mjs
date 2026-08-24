import { defineConfig } from 'vite';
import { resolve } from 'path';

// Mirrors vercel.json rewrites in dev so localhost routes like production:
// "/" and "/:page.html" are served from pages/, and /omnikon-ref-:id maps
// to pages/r.html.
function pagesRewritePlugin() {
  return {
    name: 'pages-rewrite',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const [path, query] = req.url.split('?');
        const q = query ? `?${query}` : '';
        const refMatch = path.match(/^\/omnikon-ref-([^/]+)$/);
        if (refMatch) {
          req.url = `/pages/r.html?id=${refMatch[1]}`;
        } else if (path === '/') {
          req.url = '/pages/index.html' + q;
        } else if (/^\/(?!pages\/)[^/]+\.html$/.test(path)) {
          req.url = '/pages' + path + q;
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [pagesRewritePlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'pages/index.html'),
        about: resolve(import.meta.dirname, 'pages/about.html'),
        contact: resolve(import.meta.dirname, 'pages/contact.html'),
        privacy: resolve(import.meta.dirname, 'pages/privacy.html'),
        terms: resolve(import.meta.dirname, 'pages/terms.html'),
        blogs: resolve(import.meta.dirname, 'pages/blogs.html'),
        codeOfConduct: resolve(import.meta.dirname, 'pages/codeOfConduct.html'),
        faqs: resolve(import.meta.dirname, 'pages/faqs.html'),
        guidelines: resolve(import.meta.dirname, 'pages/guidelines.html'),
        licence: resolve(import.meta.dirname, 'pages/licence.html'),
        err404: resolve(import.meta.dirname, 'pages/404err.html'),
        projects: resolve(import.meta.dirname, 'pages/projects.html'),
        members: resolve(import.meta.dirname, 'pages/members.html'),
        achievements: resolve(import.meta.dirname, 'pages/achievements.html'),
        ambassadors: resolve(import.meta.dirname, 'pages/ambassadors.html'),
        dashboard: resolve(import.meta.dirname, 'pages/dashboard.html'),
        admin: resolve(import.meta.dirname, 'pages/admin.html'),
        leaderboard: resolve(import.meta.dirname, 'pages/leaderboard.html'),
        r: resolve(import.meta.dirname, 'pages/r.html'),
        docs: resolve(import.meta.dirname, 'pages/docs.html'),
        blogOpenSource: resolve(import.meta.dirname, 'pages/blog/getting-started-open-source.html'),
        blogHackathon: resolve(import.meta.dirname, 'pages/blog/hackathon-guide-2026.html'),
        blogWebApps: resolve(import.meta.dirname, 'pages/blog/building-scalable-web-apps.html')
      }
    }
  }
});
