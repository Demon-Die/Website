const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const dir = '/Users/rishibhardwaj/Desktop/Website';

// 1. Create missing pages
const template = fs.readFileSync(path.join(dir, '404err.html'), 'utf-8');
const missingPages = [
  { name: 'docs.html', title: 'Documentation | Omnikon' },
  { name: 'about.html', title: 'About Us | Omnikon' },
  { name: 'contact.html', title: 'Contact Us | Omnikon' }
];

missingPages.forEach(p => {
  if (!fs.existsSync(path.join(dir, p.name))) {
    let $ = cheerio.load(template);
    $('title').text(p.title);
    $('h1').text(p.title.split(' |')[0]);
    $('p.text-on-surface-variant').text('Coming soon.');
    $('title').text(p.title);
    fs.writeFileSync(path.join(dir, p.name), $.html());
  }
});

// 2. Loop through all HTML files
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const footerHTML = [
'<footer class="bg-background dark:bg-background border-t border-surface-variant relative z-10 py-12 mt-auto">',
'  <div class="max-w-container-max mx-auto px-gutter grid grid-cols-1 md:grid-cols-4 gap-8">',
'    <div>',
'      <h3 class="text-xl font-bold mb-4">Omnikon</h3>',
'      <p class="text-on-surface-variant">Open Source Community for Developers.</p>',
'    </div>',
'    <div>',
'      <h3 class="font-bold mb-4">Pages</h3>',
'      <ul class="space-y-2">',
'        <li><a href="index.html">Home</a></li>',
'        <li><a href="javascript:void(0)" onclick="window.openHackathonWindow()">Hackathon</a></li>',
'        <li><a href="projects.html">Projects</a></li>',
'        <li><a href="blogs.html">Blog</a></li>',
'      </ul>',
'    </div>',
'    <div>',
'      <h3 class="font-bold mb-4">Community</h3>',
'      <ul class="space-y-2">',
'        <li><a href="members.html">Members</a></li>',
'        <li><a href="achievements.html">Community</a></li>',
'        <li><a href="docs.html">Docs</a></li>',
'        <li><a href="about.html">About</a></li>',
'        <li><a href="contact.html">Contact</a></li>',
'      </ul>',
'    </div>',
'    <div>',
'      <h3 class="font-bold mb-4">Socials</h3>',
'      <ul class="space-y-2">',
'        <li><a href="https://github.com/Omnikon-Org" target="_blank">GitHub</a></li>',
'        <li><a href="https://discord.gg/yWtjK2Tb8T" target="_blank">Discord</a></li>',
'        <li><a href="#" target="_blank">LinkedIn</a></li>',
'      </ul>',
'    </div>',
'  </div>',
'</footer>'].join('\n');

const getMeta = (file) => {
  const metaMap = {
    'index.html': { title: 'Omnikon | Open Source Community for Developers', desc: 'Omnikon is an open-source community empowering developers through hackathons, open-source projects, AI, web development, and collaborative learning.' },
    'projects.html': { title: 'Open Source Projects | Omnikon', desc: 'Explore the amazing open-source projects built by the Omnikon community.' },
    'members.html': { title: 'Meet the Omnikon Community', desc: 'Meet the talented developers, designers, and innovators in the Omnikon community.' },
    'blogs.html': { title: 'Developer Blog | Omnikon', desc: 'Read the latest technical articles, tutorials, and insights from the Omnikon blog.' },
    'achievements.html': { title: 'Community Achievements | Omnikon', desc: 'Celebrate the milestones and achievements of the Omnikon community.' },
    'docs.html': { title: 'Documentation | Omnikon', desc: 'Official documentation for Omnikon open-source projects and resources.' },
    'about.html': { title: 'About Us | Omnikon', desc: 'Learn more about the Omnikon mission, vision, and team.' },
    'contact.html': { title: 'Contact Us | Omnikon', desc: 'Get in touch with the Omnikon team for partnerships, sponsorships, or inquiries.' },
  };
  return metaMap[file] || { title: file.replace('.html', '') + ' | Omnikon', desc: 'Omnikon Community Page' };
};

const getNavLinks = (isMobile) => {
  const baseClass = isMobile 
    ? "text-on-surface-variant hover:text-primary font-label-mono text-lg transition-colors" 
    : "text-on-surface-variant hover:text-on-surface font-label-mono text-label-mono text-xs";
    
  const mClick = isMobile ? ' onclick="toggleMobileMenu()"' : '';
  const hackathonClick = isMobile ? ' onclick="toggleMobileMenu(); window.openHackathonWindow();"' : ' onclick="window.openHackathonWindow();"';
  
  return [
    '<a class="' + baseClass + '" href="index.html"' + mClick + '>Home</a>',
    '<a class="' + baseClass + '" href="achievements.html"' + mClick + '>Achievements</a>',
    '<a class="' + baseClass + '" href="projects.html"' + mClick + '>Projects</a>',
    '<a class="' + baseClass + '" href="members.html"' + mClick + '>Members</a>',
    '<a class="' + baseClass + '" href="javascript:void(0)"' + hackathonClick + '>🏆 Hackathon</a>',
    '<a class="' + baseClass + '" href="blogs.html"' + mClick + '>Blog</a>'
  ].join('\n');
};

files.forEach(file => {
  let html = fs.readFileSync(path.join(dir, file), 'utf-8');
  
  // Clean up any literal '\n' strings mistakenly injected in previous runs
  html = html.replace(/\\n/g, '');

  let $ = cheerio.load(html);

  // Semantics
  if ($('main').length === 0) {
    $('body > div').first().replaceWith(function() {
      return $('<main>').append($(this).contents()).addClass($(this).attr('class') || '');
    });
  }

  const meta = getMeta(file);
  const url = 'https://omnikonhub.com/' + (file === 'index.html' ? '' : file);

  // Update Head Metadata
  $('title').text(meta.title);
  $('meta[name="description"]').remove();
  $('link[rel="canonical"]').remove();
  $('meta[property^="og:"]').remove();
  $('meta[name^="twitter:"]').remove();
  $('meta[name="robots"]').remove();
  $('link[href="./assets/hackathon-window.css"]').remove();
  $('script[src="./assets/hackathon-window.js"]').remove();
  
  const headMeta = [
    '<meta name="description" content="' + meta.desc + '">',
    '<link rel="canonical" href="' + url + '">',
    '<meta property="og:title" content="' + meta.title + '">',
    '<meta property="og:description" content="' + meta.desc + '">',
    '<meta property="og:url" content="' + url + '">',
    '<meta property="og:type" content="website">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:title" content="' + meta.title + '">',
    '<meta name="twitter:description" content="' + meta.desc + '">',
    '<meta name="robots" content="index, follow">',
    '<meta name="view-transition" content="same-origin" />',
    '<link rel="stylesheet" href="./assets/hackathon-window.css">',
    '<script type="module" src="./assets/hackathon-window.js"></script>'
  ].join('\n');
  $('head').append(headMeta);

  // Structured Data
  $('script[type="application/ld+json"]').remove();
  
  const schemas = [];
  
  // Breadcrumb Schema
  if (file !== 'index.html') {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://omnikonhub.com/" },
        { "@type": "ListItem", "position": 2, "name": meta.title.split(' |')[0], "item": url }
      ]
    });
    
    // UI Breadcrumbs
    if ($('.breadcrumbs-ui').length === 0) {
      const bc = [
        '<nav class="breadcrumbs-ui py-4 max-w-container-max mx-auto px-gutter text-sm text-on-surface-variant" aria-label="breadcrumb">',
        '<a href="index.html" class="hover:text-primary">Home</a> &gt; <span>' + meta.title.split(' |')[0] + '</span>',
        '</nav>'
      ].join('\n');
      $('main').prepend(bc);
    }
  }

  if (file === 'index.html') {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Omnikon",
      "url": "https://omnikonhub.com",
      "logo": "https://omnikonhub.com/public/LogoOmnikon.jpeg",
      "email": "contact@omnikonhub.com",
      "sameAs": ["https://github.com/Omnikon-Org", "https://discord.gg/yWtjK2Tb8T"],
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "contact@omnikonhub.com",
        "contactType": "customer support"
      }
    });
    schemas.push({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "url": "https://omnikonhub.com",
      "name": "Omnikon",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://omnikonhub.com/search?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    });
    schemas.push({
      "@context": "https://schema.org",
      "@type": "Event",
      "name": "Omnikon National Tech Hackathon 2026",
      "startDate": "2026-08-01T00:00:00Z",
      "endDate": "2026-08-02T23:59:59Z",
      "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
      "eventStatus": "https://schema.org/EventScheduled",
      "location": { "@type": "VirtualLocation", "url": "https://hackathon-website-sooty-delta.vercel.app/" }
    });
  } else if (file === 'projects.html') {
    schemas.push({ "@context": "https://schema.org", "@type": "CollectionPage", "name": meta.title });
  } else if (file === 'members.html' || file === 'about.html') {
    schemas.push({ "@context": "https://schema.org", "@type": "AboutPage", "name": meta.title });
  } else if (file === 'blogs.html') {
    schemas.push({ "@context": "https://schema.org", "@type": "Blog", "name": meta.title });
  }

  if (schemas.length > 0) {
    const jsonLd = schemas.length === 1 ? schemas[0] : schemas;
    $('head').append('<script type="application/ld+json">' + JSON.stringify(jsonLd, null, 2) + '</script>');
  }

  // Update Nav
  $('#desktop-nav').html(getNavLinks(false));
  
  let mobileMenuBtn = $('#mobile-menu > a[target="_blank"]');
  $('#mobile-menu').html(getNavLinks(true)).append(mobileMenuBtn);

  // Update Footer
  $('footer').replaceWith(footerHTML);

  // Accessibility formatting
  $('button:not([aria-label])').each(function() {
    let txt = $(this).text().trim() || 'Button';
    if (!$(this).attr('aria-label')) {
      $(this).attr('aria-label', txt);
    }
  });

  fs.writeFileSync(path.join(dir, file), $.html());
});

console.log("SEO updates complete!");
