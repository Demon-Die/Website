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
          <td class="px-6 py-4 font-mono text-sm ${rankStyles}">
            ${icon}#${rank}
          </td>
          <td class="px-6 py-4 flex items-center gap-3">
            <img src="${amb.photoURL || '/LogoOmnikon.jpeg'}" class="w-8 h-8 rounded-full border border-surface-variant object-cover">
            <div>
              <p class="font-bold text-on-surface">${amb.name || 'Anonymous'}</p>
              <p class="text-[10px] text-primary font-mono">${amb.ambassadorId || '---'}</p>
            </div>
          </td>
          <td class="px-6 py-4 text-sm text-on-surface-variant">${amb.college || '---'}</td>
          <td class="px-6 py-4 text-right">
            <span class="inline-flex items-center justify-center bg-surface-variant/50 text-on-surface font-mono text-sm px-3 py-1 rounded border border-surface-variant">
              ${amb.totalReferrals || 0}
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
