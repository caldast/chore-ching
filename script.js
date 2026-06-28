const csvPath = 'config.csv';
const storageKey = 'choreChingState';
let appState = {
  users: {},
  chores: [],
  rewards: [],
  currentUser: null,
  sessionCompleted: new Set(),
};

const elements = {
  screenDashboard: document.getElementById('screen-dashboard'),
  screenLogin: document.getElementById('screen-login'),
  screenKid: document.getElementById('screen-kid'),
  screenParent: document.getElementById('screen-parent'),
  btnJasper: document.getElementById('btn-jasper'),
  btnParent: document.getElementById('btn-parent'),
  loginTitle: document.getElementById('login-title'),
  loginName: document.getElementById('login-name'),
  loginPassword: document.getElementById('login-password'),
  loginForm: document.getElementById('login-form'),
  loginBack: document.getElementById('login-back'),
  kidUserName: document.getElementById('kid-user-name'),
  kidPoints: document.getElementById('kid-points'),
  kidBack: document.getElementById('kid-back'),
  kidChores: document.getElementById('kid-chores'),
  kidRedeem: document.getElementById('kid-redeem'),
  parentBack: document.getElementById('parent-back'),
  parentContent: document.getElementById('parent-content'),
  toast: document.getElementById('toast'),
  tabButtons: document.querySelectorAll('.tab-row .tab-button'),
};

const defaultConfig = `category,name,points,cost,password
user,Jasper,0,,jasper123
user,Parent,0,,parent123
chore,Brush teeth,3,,
chore,Read Book,10,,
chore,Milk,3,,
chore,Food,5,,
reward,Soda,,10,
reward,Cookie,,5,
reward,Book,,5,
reward,Pizza,,10,
reward,Screen time,,10,
`;

function showScreen(screen) {
  [elements.screenDashboard, elements.screenLogin, elements.screenKid, elements.screenParent].forEach((node) => {
    node.classList.toggle('active-screen', node === screen);
  });
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 2500);
}

function parseCsv(text) {
  const rows = text.trim().split('\n').map((line) => line.split(',').map((value) => value.trim()));
  const header = rows[0];
  return rows.slice(1).map((row) => {
    return row.reduce((obj, value, index) => {
      obj[header[index]] = value;
      return obj;
    }, {});
  });
}

function loadConfigCsv() {
  return fetch(csvPath)
    .then((response) => response.text())
    .catch(() => defaultConfig)
    .then((csvText) => parseCsv(csvText));
}

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

function hasRemoteState() {
  return typeof getFirestore === 'function';
}

async function loadRemoteState() {
  if (!hasRemoteState()) return null;
  try {
    const doc = await getFirestore().collection('choreChing').doc('sharedState').get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    console.warn('Failed to load remote state', error);
    return null;
  }
}

async function persistRemoteState(state) {
  if (!hasRemoteState()) return;
  try {
    await getFirestore().collection('choreChing').doc('sharedState').set(state);
  } catch (error) {
    console.warn('Failed to persist remote state', error);
  }
}

function saveState() {
  const store = {
    chores: appState.chores,
    rewards: appState.rewards,
    users: appState.users,
  };
  localStorage.setItem(storageKey, JSON.stringify(store));
  persistRemoteState(store);
}

function applySavedState(saved) {
  if (!saved) return;
  if (saved.users) {
    Object.keys(saved.users).forEach((name) => {
      if (appState.users[name]) {
        appState.users[name].points = Number(saved.users[name].points || appState.users[name].points);
      }
    });
  }
  if (Array.isArray(saved.chores) && saved.chores.length) {
    appState.chores.length = 0;
    saved.chores.forEach((item) => appState.chores.push(item));
  }
  if (Array.isArray(saved.rewards) && saved.rewards.length) {
    appState.rewards.length = 0;
    saved.rewards.forEach((item) => appState.rewards.push(item));
  }
}

function initializeState(rows) {
  const saved = loadState();
  const users = {};
  const chores = [];
  const rewards = [];

  rows.forEach((row) => {
    if (row.category === 'user') {
      users[row.name] = {
        name: row.name,
        password: row.password || '',
        points: Number(row.points || 0),
      };
    }
    if (row.category === 'chore') {
      chores.push({ id: crypto.randomUUID(), name: row.name, points: Number(row.points || 0) });
    }
    if (row.category === 'reward') {
      rewards.push({ id: crypto.randomUUID(), name: row.name, cost: Number(row.cost || 0) });
    }
  });

  if (saved && saved.users) {
    Object.keys(saved.users).forEach((name) => {
      if (users[name]) {
        users[name].points = saved.users[name].points;
      }
    });
    if (Array.isArray(saved.chores) && saved.chores.length) {
      chores.length = 0;
      saved.chores.forEach((item) => chores.push(item));
    }
    if (Array.isArray(saved.rewards) && saved.rewards.length) {
      rewards.length = 0;
      saved.rewards.forEach((item) => rewards.push(item));
    }
  }

  appState.users = users;
  appState.chores = chores;
  appState.rewards = rewards;
}

function setLoginContext(userName) {
  elements.loginTitle.textContent = `Sign in as ${userName}`;
  elements.loginName.value = userName;
  elements.loginPassword.value = '';
  appState.pendingLogin = userName;
}

function login(userName, password) {
  const user = appState.users[userName];
  if (!user || password !== user.password) {
    showToast('Password not recognized. Try again.');
    return;
  }

  appState.currentUser = user;
  appState.sessionCompleted.clear();
  if (userName === 'Parent') {
    buildParentPage();
    showScreen(elements.screenParent);
    setActiveParentTab('manage-chores');
  } else {
    buildKidPage();
    showScreen(elements.screenKid);
    setActiveKidTab('chores');
  }
}

function buildKidPage() {
  elements.kidUserName.textContent = appState.currentUser.name;
  elements.kidPoints.textContent = appState.currentUser.points;
  renderChores();
  renderRedeem();
}

function buildParentPage() {
  renderParentChores();
  renderParentRewards();
  renderParentPoints();
}

function renderChores() {
  elements.kidChores.innerHTML = '';
  if (appState.chores.length === 0) {
    elements.kidChores.innerHTML = '<p>No chores configured yet.</p>';
    return;
  }

  appState.chores.forEach((chore) => {
    const card = document.createElement('div');
    card.className = 'list-card';
    const details = document.createElement('div');
    details.className = 'details';
    details.innerHTML = `<h3>${chore.name}</h3><p>${chore.points} points</p>`;

    const button = document.createElement('button');
    button.className = 'action-button';
    button.textContent = appState.sessionCompleted.has(chore.id) ? 'Done' : 'Complete';
    button.disabled = appState.sessionCompleted.has(chore.id);
    button.addEventListener('click', () => {
      appState.currentUser.points += chore.points;
      appState.sessionCompleted.add(chore.id);
      elements.kidPoints.textContent = appState.currentUser.points;
      button.textContent = 'Done';
      button.disabled = true;
      saveState();
      showToast(`${chore.points} points added!`);
    });

    card.append(details, button);
    elements.kidChores.appendChild(card);
  });
}

function renderRedeem() {
  elements.kidRedeem.innerHTML = '';
  if (appState.rewards.length === 0) {
    elements.kidRedeem.innerHTML = '<p>No rewards configured yet.</p>';
    return;
  }

  appState.rewards.forEach((reward) => {
    const card = document.createElement('div');
    card.className = 'list-card';
    const details = document.createElement('div');
    details.className = 'details';
    details.innerHTML = `<h3>${reward.name}</h3><p>${reward.cost} points minimum</p>`;

    const button = document.createElement('button');
    button.className = 'action-button';
    button.textContent = 'Redeem';
    button.addEventListener('click', () => {
      if (appState.currentUser.points < reward.cost) {
        showToast('Not enough points yet.');
        return;
      }
      appState.currentUser.points -= reward.cost;
      elements.kidPoints.textContent = appState.currentUser.points;
      saveState();
      showToast(`${reward.name} redeemed for ${reward.cost} points.`);
    });

    card.append(details, button);
    elements.kidRedeem.appendChild(card);
  });
}

function renderParentChores() {
  const container = document.getElementById('manage-chores');
  container.innerHTML = '';

  const card = document.createElement('section');
  card.className = 'manage-card';
  card.innerHTML = `
    <h3>Manage Chores</h3>
    <div class="form-row">
      <label>New chore</label>
      <input id="new-chore-name" type="text" placeholder="Chore name" />
      <input id="new-chore-points" type="number" placeholder="Points" min="1" />
      <button class="primary-button" id="add-chore">Add chore</button>
    </div>
  `;
  container.appendChild(card);

  const list = document.createElement('div');
  if (appState.chores.length === 0) {
    list.innerHTML = '<p>No chores configured yet.</p>';
  } else {
    appState.chores.forEach((chore) => {
      const item = document.createElement('div');
      item.className = 'list-card';
      item.innerHTML = `
        <div class="details">
          <input data-role="chore-name" value="${chore.name}" />
          <input data-role="chore-points" type="number" min="1" value="${chore.points}" />
        </div>
        <button class="remove-button" data-id="${chore.id}">Remove</button>
      `;
      const nameInput = item.querySelector('[data-role="chore-name"]');
      const pointsInput = item.querySelector('[data-role="chore-points"]');
      const removeButton = item.querySelector('[data-id]');

      nameInput.addEventListener('change', () => {
        chore.name = nameInput.value.trim() || chore.name;
        saveState();
        showToast('Chore updated.');
      });
      pointsInput.addEventListener('change', () => {
        chore.points = Number(pointsInput.value) || chore.points;
        saveState();
        showToast('Chore points updated.');
      });
      removeButton.addEventListener('click', () => {
        appState.chores = appState.chores.filter((item) => item.id !== chore.id);
        saveState();
        renderParentChores();
        showToast('Chore removed.');
      });
      list.appendChild(item);
    });
  }
  container.appendChild(list);

  const addChoreButton = card.querySelector('#add-chore');
  addChoreButton.addEventListener('click', () => {
    const nameInput = document.getElementById('new-chore-name');
    const pointsInput = document.getElementById('new-chore-points');
    const name = nameInput.value.trim();
    const points = Number(pointsInput.value);
    if (!name || points <= 0) {
      showToast('Enter a chore name and points.');
      return;
    }
    appState.chores.push({ id: crypto.randomUUID(), name, points });
    saveState();
    nameInput.value = '';
    pointsInput.value = '';
    renderParentChores();
    showToast('New chore added.');
  });
}

function renderParentRewards() {
  const container = document.getElementById('manage-rewards');
  container.innerHTML = '';

  const card = document.createElement('section');
  card.className = 'manage-card';
  card.innerHTML = `
    <h3>Manage Rewards</h3>
    <div class="form-row">
      <label>New reward</label>
      <input id="new-reward-name" type="text" placeholder="Reward name" />
      <input id="new-reward-cost" type="number" placeholder="Cost in points" min="1" />
      <button class="primary-button" id="add-reward">Add reward</button>
    </div>
  `;
  container.appendChild(card);

  const list = document.createElement('div');
  if (appState.rewards.length === 0) {
    list.innerHTML = '<p>No rewards configured yet.</p>';
  } else {
    appState.rewards.forEach((reward) => {
      const item = document.createElement('div');
      item.className = 'list-card';
      item.innerHTML = `
        <div class="details">
          <input data-role="reward-name" value="${reward.name}" />
          <input data-role="reward-cost" type="number" min="1" value="${reward.cost}" />
        </div>
        <button class="remove-button" data-id="${reward.id}">Remove</button>
      `;
      const nameInput = item.querySelector('[data-role="reward-name"]');
      const costInput = item.querySelector('[data-role="reward-cost"]');
      const removeButton = item.querySelector('[data-id]');

      nameInput.addEventListener('change', () => {
        reward.name = nameInput.value.trim() || reward.name;
        saveState();
        showToast('Reward updated.');
      });
      costInput.addEventListener('change', () => {
        reward.cost = Number(costInput.value) || reward.cost;
        saveState();
        showToast('Reward cost updated.');
      });
      removeButton.addEventListener('click', () => {
        appState.rewards = appState.rewards.filter((item) => item.id !== reward.id);
        saveState();
        renderParentRewards();
        showToast('Reward removed.');
      });
      list.appendChild(item);
    });
  }
  container.appendChild(list);

  const addRewardButton = card.querySelector('#add-reward');
  addRewardButton.addEventListener('click', () => {
    const nameInput = document.getElementById('new-reward-name');
    const costInput = document.getElementById('new-reward-cost');
    const name = nameInput.value.trim();
    const cost = Number(costInput.value);
    if (!name || cost <= 0) {
      showToast('Enter a reward name and point cost.');
      return;
    }
    appState.rewards.push({ id: crypto.randomUUID(), name, cost });
    saveState();
    nameInput.value = '';
    costInput.value = '';
    renderParentRewards();
    showToast('New reward added.');
  });
}

function renderParentPoints() {
  const container = document.getElementById('manage-points');
  container.innerHTML = '';

  const card = document.createElement('section');
  card.className = 'manage-card';
  card.innerHTML = '<h3>Kid Points</h3>';
  container.appendChild(card);

  Object.values(appState.users)
    .filter((user) => user.name !== 'Parent')
    .forEach((user) => {
      const item = document.createElement('div');
      item.className = 'list-card';
      item.innerHTML = `
        <div class="details">
          <h3>${user.name}</h3>
          <label>Points</label>
          <input data-role="user-points" type="number" min="0" value="${user.points}" />
        </div>
        <button class="secondary-button" data-action="update-user" data-name="${user.name}">Save</button>
      `;
      const pointsInput = item.querySelector('[data-role="user-points"]');
      const saveButton = item.querySelector('[data-action="update-user"]');
      saveButton.addEventListener('click', () => {
        user.points = Number(pointsInput.value) || 0;
        saveState();
        showToast(`${user.name} points updated.`);
      });
      container.appendChild(item);
    });
}

function setActiveKidTab(tabName) {
  document.querySelectorAll('#screen-kid .tab-button').forEach((button) => {
    const active = button.dataset.tab === tabName;
    button.classList.toggle('active-tab', active);
    document.getElementById(`kid-${button.dataset.tab}`).classList.toggle('active-panel', active);
  });
}

function setActiveParentTab(tabName) {
  document.querySelectorAll('#screen-parent .tab-button').forEach((button) => {
    const active = button.dataset.tab === tabName;
    button.classList.toggle('active-tab', active);
    document.getElementById(button.dataset.tab).classList.toggle('active-panel', active);
  });
}

function wireEvents() {
  elements.btnJasper.addEventListener('click', () => {
    setLoginContext('Jasper');
    showScreen(elements.screenLogin);
  });

  elements.btnParent.addEventListener('click', () => {
    setLoginContext('Parent');
    showScreen(elements.screenLogin);
  });

  elements.loginBack.addEventListener('click', () => showScreen(elements.screenDashboard));

  elements.loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    login(appState.pendingLogin, elements.loginPassword.value);
  });

  elements.kidBack.addEventListener('click', () => showScreen(elements.screenDashboard));
  elements.parentBack.addEventListener('click', () => showScreen(elements.screenDashboard));

  document.querySelectorAll('#screen-kid .tab-button').forEach((button) => {
    button.addEventListener('click', () => setActiveKidTab(button.dataset.tab));
  });

  document.querySelectorAll('#screen-parent .tab-button').forEach((button) => {
    button.addEventListener('click', () => setActiveParentTab(button.dataset.tab));
  });
}

async function init() {
  const rows = await loadConfigCsv();
  initializeState(rows);

  const localSaved = loadState();
  if (localSaved) {
    applySavedState(localSaved);
  }

  const remoteSaved = await loadRemoteState();
  if (remoteSaved) {
    applySavedState(remoteSaved);
    saveState();
  }

  wireEvents();
  showScreen(elements.screenDashboard);
}

init();
