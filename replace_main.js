const fs = require('fs');

const files = ['ambassadors.html', 'apply.html', 'leaderboard.html', 'dashboard.html', 'admin.html'];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  // Find the exact main block. We know it starts at <main and ends at </main>
  const startIdx = content.indexOf('<main class="pt-24');
  const endIdx = content.indexOf('</main>') + '</main>'.length;
  
  if (startIdx !== -1 && endIdx !== -1) {
    const newMain = '<main class="pt-24 pb-section-gap max-w-container-max mx-auto px-margin-mobile md:px-gutter relative min-h-screen" id="app-root"></main>';
    const newContent = content.substring(0, startIdx) + newMain + content.substring(endIdx);
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('Replaced main in', file);
  }
}
