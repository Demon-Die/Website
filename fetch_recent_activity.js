(async () => {
  const container = document.getElementById('recent-activity');
  if (!container) return;

  try {
    if (!window.envLoaded) {
      await new Promise(resolve => window.addEventListener('envLoaded', resolve, { once: true }));
    }

    const token = window.env?.GIT_OMNIKON_ALL || window.env?.GITHUB_TOKEN;
    let events;

    try {
      const headers = token ? { Authorization: `token ${token}` } : {};
      let resp = await fetch('https://api.github.com/orgs/Omnikon-Org/events', { headers });
      if (!resp.ok && resp.status === 401 && token) {
        console.warn('GitHub events request returned 401 with token, retrying anonymously...');
        resp = await fetch('https://api.github.com/orgs/Omnikon-Org/events');
      }
      if (!resp.ok) throw new Error('GitHub events request failed');
      events = await resp.json();
    } catch (e) {
      console.warn('Authenticated fetch failed, trying final anonymous request...', e);
      const resp = await fetch('https://api.github.com/orgs/Omnikon-Org/events');
      if (!resp.ok) throw new Error('Anonymous backup request failed');
      events = await resp.json();
    }

    container.innerHTML = '';

    if (!events || events.length === 0) {
      container.innerHTML = '<p class="text-on-surface-variant text-code-sm">No recent activity found.</p>';
      return;
    }

    events.slice(0, 8).forEach(event => {
      const div = document.createElement('div');
      div.className = 'flex items-start gap-4';
      
      const icon = document.createElement('span');
      icon.className = 'material-symbols-outlined text-primary text-sm mt-0.5';

      let iconName = 'history';
      let actionText = 'performed action';
      let detailText = '';
      const type = event.type;

      if (type === 'PushEvent') {
        iconName = 'commit';
        const commitMsg = event.payload?.commits?.[0]?.message || '';
        const cleanMsg = commitMsg.split('\n')[0];
        actionText = 'pushed';
        detailText = cleanMsg ? ` "${cleanMsg}" to` : ' to';
      } else if (type === 'PullRequestEvent') {
        iconName = 'call_merge';
        const action = event.payload?.action || 'opened';
        const prTitle = event.payload?.pull_request?.title || '';
        actionText = `${action} pull request`;
        detailText = prTitle ? ` "${prTitle}" in` : ' in';
      } else if (type === 'IssuesEvent') {
        iconName = 'info';
        const action = event.payload?.action || 'opened';
        const issueTitle = event.payload?.issue?.title || '';
        actionText = `${action} issue`;
        detailText = issueTitle ? ` "${issueTitle}" in` : ' in';
      } else if (type === 'CreateEvent') {
        iconName = 'add_circle';
        const refType = event.payload?.ref_type || 'branch';
        const ref = event.payload?.ref || '';
        actionText = `created ${refType}`;
        detailText = ref ? ` "${ref}" in` : ' in';
      } else if (type === 'IssueCommentEvent') {
        iconName = 'comment';
        const issueTitle = event.payload?.issue?.title || '';
        actionText = 'commented on';
        detailText = issueTitle ? ` "${issueTitle}" in` : ' in';
      } else if (type === 'WatchEvent') {
        iconName = 'star';
        actionText = 'starred';
      }

      icon.textContent = iconName;

      const content = document.createElement('div');
      content.className = 'flex-grow';
      const p = document.createElement('p');
      p.className = 'text-on-surface font-code-sm text-code-sm';
      const actor = event.actor?.login || 'Someone';
      const repoName = event.repo?.name ? event.repo.name.replace('Omnikon-Org/', '') : '';
      
      p.innerHTML = `<span class="text-primary">${actor}</span> ${actionText}${detailText} <span class="text-on-surface-variant font-bold">${repoName}</span>`;
      content.appendChild(p);

      const time = document.createElement('span');
      time.className = 'text-on-surface-variant text-code-sm font-code-sm text-[10px] whitespace-nowrap';
      
      const date = new Date(event.created_at);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) {
        time.textContent = 'just now';
      } else if (diffMins < 60) {
        time.textContent = `${diffMins}m ago`;
      } else if (diffHours < 24) {
        time.textContent = `${diffHours}h ago`;
      } else {
        time.textContent = `${diffDays}d ago`;
      }

      div.appendChild(icon);
      div.appendChild(content);
      div.appendChild(time);
      container.appendChild(div);
    });
  } catch (e) {
    console.error('Failed to load recent activity:', e);
    container.innerHTML = '<p class="text-on-surface-variant text-code-sm">Unable to load recent activity.</p>';
  }
})();
