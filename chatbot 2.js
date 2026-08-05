(() => {
  const modal = document.getElementById('chatbot-modal');
  if (!modal) return;

  modal.innerHTML = `
    <div id="chatbot-header">
      <span class="text-on-surface font-label-mono text-sm tracking-wider font-bold">OMNIKON AI CORE v1.0</span>
      <button id="chatbot-close" class="text-on-surface-variant hover:text-primary transition-colors text-sm">✖</button>
    </div>
    <div id="chatbot-messages"></div>
    <div id="chatbot-input">
      <input id="chatbot-text" type="text" placeholder="Ask about projects, contributors, or rules..." />
      <button id="chatbot-send">SEND</button>
    </div>`;

  const toggleBtn = document.getElementById('chatbot-toggle');
  const closeBtn = document.getElementById('chatbot-close');
  const sendBtn = document.getElementById('chatbot-send');
  const input = document.getElementById('chatbot-text');
  const messages = document.getElementById('chatbot-messages');

  let orgData = null;
  let chatHistory = [];
  let isLoaded = false;
  let hasGreeted = false;

  async function loadOrgData() {
    try {
      const res = await fetch('github_summary.json');
      if (res.ok) {
        orgData = await res.json();
      }
    } catch (e) {
      console.warn('Could not load github_summary.json for chatbot context', e);
    }
  }

  function formatMarkdown(text) {
    let escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/`(.*?)`/g, '<code class="bg-[#1e1e1e] border border-[#333] px-1 py-0.5 font-mono text-xs text-primary">$1</code>');
    escaped = escaped.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-primary hover:underline">$1</a>');

    const lines = escaped.split('\n');
    const formattedLines = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return `<li class="ml-4 list-disc text-on-surface-variant">${trimmed.substring(2)}</li>`;
      }
      return line;
    });

    return formattedLines.join('<br>');
  }

  function getSystemPrompt() {
    let context = '';
    if (orgData) {
      const projects = orgData.repos 
        ? orgData.repos.map(r => `- ${r.name}: ${r.description || 'No description'} (${r.stars} stars, URL: ${r.html_url})`).join('\n') 
        : '';
      const members = orgData.members 
        ? orgData.members.map(m => `- ${m.login} (${m.html_url})`).join('\n') 
        : '';
      context = `Here is the current real-time data about the Omnikon organization:\n\nActive Projects:\n${projects}\n\nKey Members/Contributors:\n${members}`;
    }

    return `You are the official AI Assistant for the Omnikon Open Source Organization.
Your sole purpose is to help users learn about the Omnikon community, its active projects, repositories, code of conduct, guidelines, and contributors.

${context}

RULES:
1. ONLY answer questions related to Omnikon, its projects, and its community.
2. If a query is unrelated to Omnikon (e.g. general knowledge, unrelated coding, general questions), politely refuse to answer. Say: "I am the Omnikon assistant, and I can only answer questions related to the organization."
3. Keep answers technical, concise, clear, and direct.
4. Respond in Markdown format where appropriate.`;
  }

  const openModal = async () => {
    modal.classList.add('open');
    modal.classList.remove('hidden');
    input.focus();

    if (!isLoaded) {
      await loadOrgData();
      isLoaded = true;
    }

    if (!hasGreeted) {
      appendMessage('Hello! I am the Omnikon AI Assistant. I can help you with questions about our active projects, guidelines, contributors, or how to get started in our community. What would you like to know?', 'bot');
      hasGreeted = true;
    }
  };

  const closeModal = () => {
    modal.classList.remove('open');
    setTimeout(() => modal.classList.add('hidden'), 300);
  };

  toggleBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);

  const appendMessage = (text, role) => {
    const msg = document.createElement('div');
    msg.className = `chatbot-msg ${role}`;
    
    if (role === 'bot') {
      msg.innerHTML = formatMarkdown(text);
    } else {
      msg.textContent = text;
    }
    
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
  };

  const showTypingIndicator = () => {
    const indicator = document.createElement('div');
    indicator.className = 'chatbot-msg bot typing-indicator';
    indicator.id = 'chatbot-typing';
    indicator.innerHTML = `
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
    `;
    messages.appendChild(indicator);
    messages.scrollTop = messages.scrollHeight;
  };

  const removeTypingIndicator = () => {
    const indicator = document.getElementById('chatbot-typing');
    if (indicator) {
      indicator.remove();
    }
  };

  const getHFToken = () => window.env?.HF_TOKEN || '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';

  const sendMessage = async () => {
    const userText = input.value.trim();
    if (!userText) return;

    appendMessage(userText, 'user');
    input.value = '';

    if (!window.envLoaded) {
      showTypingIndicator();
      await new Promise(resolve => window.addEventListener('envLoaded', resolve, { once: true }));
      removeTypingIndicator();
    }

    const token = getHFToken();
    if (!token) {
      appendMessage('API key missing. Please add HF_TOKEN to your .env file in the repository root to enable the AI assistant.', 'bot');
      return;
    }

    showTypingIndicator();

    const recentHistory = chatHistory.slice(-6).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const payload = {
      model: 'meta-llama/Llama-3.1-8B-Instruct:novita',
      messages: [
        { role: 'system', content: getSystemPrompt() },
        ...recentHistory,
        { role: 'user', content: userText }
      ]
    };

    try {
      const resp = await fetch('https://router.huggingface.co/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      removeTypingIndicator();

      if (!resp.ok) throw new Error('HuggingFace request failed');
      const data = await resp.json();
      const reply = data.choices?.[0]?.message?.content || 'No response';
      
      appendMessage(reply, 'bot');

      chatHistory.push({ role: 'user', content: userText });
      chatHistory.push({ role: 'assistant', content: reply });
    } catch (e) {
      console.error(e);
      removeTypingIndicator();
      appendMessage('Unable to connect to the AI service. Please verify your HF_TOKEN configuration.', 'bot');
    }
  };

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
})();
