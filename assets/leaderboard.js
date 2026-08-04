import { getLeaderboard } from './db.js';

document.addEventListener('DOMContentLoaded', async () => {
  const tbody = document.getElementById('leaderboard-body');
  if (!tbody) return;
  
  try {
    const leaders = await getLeaderboard(50);
    
    if (leaders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="py-8 text-center text-on-surface-variant font-mono">NO DATA FOUND. BE THE FIRST.</td></tr>';
      return;
    }
    
    tbody.innerHTML = leaders.map((amb, index) => {
      const rank = index + 1;
      let rankStyles = "text-on-surface-variant";
      let rowStyles = "hover:bg-surface-variant/10 transition-colors";
      let icon = "";
      
      if (rank === 1) {
        rankStyles = "text-yellow-400 font-bold drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]";
        rowStyles = "bg-yellow-400/5 hover:bg-yellow-400/10 border-l-2 border-yellow-400";
        icon = '<span class="material-symbols-outlined text-[14px] align-middle mr-1 text-yellow-400">workspace_premium</span>';
      } else if (rank === 2) {
        rankStyles = "text-gray-300 font-bold";
        rowStyles = "bg-gray-300/5 hover:bg-gray-300/10 border-l-2 border-gray-300";
      } else if (rank === 3) {
        rankStyles = "text-amber-600 font-bold";
        rowStyles = "bg-amber-600/5 hover:bg-amber-600/10 border-l-2 border-amber-600";
      }

      return `
        <tr class="border-b border-surface-variant/30 ${rowStyles}">
          <td class="px-3 sm:px-6 py-3 sm:py-4 font-mono text-xs sm:text-sm ${rankStyles} whitespace-nowrap">
            ${icon}#${rank}
          </td>
          <td class="px-3 sm:px-6 py-3 sm:py-4">
            <div class="flex items-center gap-2 sm:gap-3">
              <img src="${amb.photoURL || '/LogoOmnikon.jpeg'}" class="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-surface-variant object-cover shrink-0" alt="Avatar">
              <div class="min-w-0">
                <p class="font-bold text-on-surface text-xs sm:text-sm truncate">${amb.name || 'Anonymous'}</p>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-[10px] text-primary font-mono">${amb.ambassadorId || '---'}</span>
                  <span class="text-[10px] text-on-surface-variant md:hidden font-sans truncate max-w-[140px] sm:max-w-[200px]">• ${amb.college || '---'}</span>
                </div>
              </div>
            </div>
          </td>
          <td class="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-on-surface-variant hidden md:table-cell">${amb.college || '---'}</td>
          <td class="px-3 sm:px-6 py-3 sm:py-4 text-right whitespace-nowrap">
            <span class="inline-flex items-center justify-center bg-surface-variant/50 text-on-surface font-mono text-xs sm:text-sm px-2.5 sm:px-3 py-0.5 sm:py-1 rounded border border-surface-variant font-bold">
              ${amb.verifiedRegistrations || 0}
            </span>
          </td>
        </tr>
      `;
    }).join('');
    
  } catch (err) {
    console.error("Error loading leaderboard:", err);
    tbody.innerHTML = '<tr><td colspan="4" class="py-8 text-center text-primary font-mono">ERROR ESTABLISHING UPLINK.</td></tr>';
  }
});
