const fs = require('fs');
const path = require('path');

const dir = './';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const desktopTarget = '<a class="text-on-surface-variant hover:text-on-surface font-label-mono text-label-mono text-xs" href="blogs.html">Blog</a>';
const desktopReplacement = '<a class="text-on-surface-variant hover:text-on-surface font-label-mono text-label-mono text-xs" href="ambassadors.html">Ambassadors</a>\n<a class="text-on-surface-variant hover:text-on-surface font-label-mono text-label-mono text-xs" href="blogs.html">Blog</a>';

const mobileTarget = '<a class="text-on-surface-variant hover:text-primary font-label-mono text-lg transition-colors" href="blogs.html" onclick="toggleMobileMenu()">Blog</a>';
const mobileReplacement = '<a class="text-on-surface-variant hover:text-primary font-label-mono text-lg transition-colors" href="ambassadors.html" onclick="toggleMobileMenu()">Ambassadors</a>\n<a class="text-on-surface-variant hover:text-primary font-label-mono text-lg transition-colors" href="blogs.html" onclick="toggleMobileMenu()">Blog</a>';

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  let modified = false;
  if (content.includes(desktopTarget) && !content.includes('href="ambassadors.html"')) {
    content = content.replace(desktopTarget, desktopReplacement);
    modified = true;
  }
  
  if (content.includes(mobileTarget)) {
    content = content.replace(mobileTarget, mobileReplacement);
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated nav in', file);
  }
}
