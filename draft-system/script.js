// 탭 전환 로직
document.getElementById('nav-draft').addEventListener('click', (e) => {
    document.getElementById('tab-draft-content').style.display = 'block';
    document.getElementById('tab-hof-content').style.display = 'none';
    e.target.classList.add('active'); document.getElementById('nav-hof').classList.remove('active');
});

document.getElementById('nav-hof').addEventListener('click', (e) => {
    document.getElementById('tab-draft-content').style.display = 'none';
    document.getElementById('tab-hof-content').style.display = 'block';
    e.target.classList.add('active'); document.getElementById('nav-draft').classList.remove('active');
    renderHallOfFame(); 
});

// 1~20티어 셀렉트 생성
const tierSelect = document.getElementById('new-tier');
if (tierSelect) {
    for (let i = 1; i <= 20; i++) {
        const option = document.createElement('option'); option.value = i; option.textContent = `${i}티어`;
        if (i === 20) option.selected = true; tierSelect.appendChild(option);
    }
}

// [백엔드 연동] 데이터를 담을 빈 배열 선언
let allPlayers = [];

// 백엔드 서버(FastAPI)에서 실시간으로 명단 받아오는 함수
async function loadPlayersFromBackend() {
    try {
        // 상대 경로로 내 백엔드 API 호출
        const response = await fetch('/api/players');
        allPlayers = await response.json(); // 🌟 response.get() 오타를 json()으로 완벽 수정!
        
        // 데이터를 성공적으로 가져왔으면 화면에 렌더링
        renderSetupScreen();
    } catch (error) {
        console.error("백엔드 서버 연동 중 에러 발생:", error);
        alert("❌ 백엔드 서버 데이터를 가져오는 데 실패했습니다!");
    }
}

// 화면 목록 출력
function renderSetupScreen() {
    const listContainer = document.getElementById('total-player-list');
    if (!listContainer) return;
    listContainer.innerHTML = ''; 
    allPlayers.sort((a,b) => a.tier - b.tier);

    allPlayers.forEach(player => {
        listContainer.innerHTML += `
            <div class="player-row">
                <label class="player-label">
                    <input type="checkbox" class="player-checkbox" value="${player.id}">
                    <span class="player-name">
                        ${player.name} (${player.tier}티어) | KDA: ${player.kda}
                    </span>
                </label>
                <label class="captain-label">
                    <input type="checkbox" class="captain-checkbox" data-id="${player.id}">
                    👑 팀장
                </label>
                <button class="btn-delete" onclick="deletePlayer('${player.id}')">삭제</button>
            </div>
        `;
    });
}

// 닉네임 검색
const searchInput = document.getElementById('search-input');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const keyword = e.target.value.toLowerCase().trim();
        document.querySelectorAll('.player-row').forEach(row => {
            const name = row.querySelector('.player-name').textContent.toLowerCase();
            row.style.display = name.includes(keyword) ? 'flex' : 'none';
        });
    });
}

// 임시 멤버 등록
function addNewPlayer() {
    const nameInput = document.getElementById('new-name');
    const tierInput = document.getElementById('new-tier');
    if (!nameInput || !tierInput) return;
    const name = nameInput.value.trim();
    const tier = parseInt(tierInput.value);

    if (name === "") return;

    allPlayers.push({ id: 'p_' + name, name: name, tier: tier, matches: 0, win: 0, lose: 0, winRate: "0.0", kda: "0.00", most: "- / - / -" });
    renderSetupScreen(); nameInput.value = "";
}

function deletePlayer(id) {
    if (confirm("삭제하시겠습니까?")) {
        allPlayers = allPlayers.filter(p => p.id !== id);
        renderSetupScreen();
    }
}

// 드래프트 시작
const btnStartDraft = document.getElementById('btn-start-draft');
if (btnStartDraft) {
    btnStartDraft.addEventListener('click', () => {
        const checkedBoxes = document.querySelectorAll('.player-checkbox:checked');
        if (checkedBoxes.length === 0) { alert("멤버를 선택하세요!"); return; }

        const selectedPlayers = Array.from(checkedBoxes).map(cb => {
            const p = allPlayers.find(p => p.id === cb.value);
            const isCap = document.querySelector(`.captain-checkbox[data-id="${p.id}"]`).checked;
            return { ...p, tag: isCap ? "[팀장]" : "" };
        });

        document.getElementById('phase1-setup').style.display = 'none';
        document.getElementById('phase2-draft').style.display = 'block'; 
        renderAgentPool(selectedPlayers);
    });
}

const btnGoBack = document.getElementById('btn-go-back');
if (btnGoBack) {
    btnGoBack.addEventListener('click', () => {
        document.getElementById('phase2-draft').style.display = 'none';
        document.getElementById('phase1-setup').style.display = 'block';
    });
}

function renderAgentPool(players) {
    const poolContainer = document.getElementById('agent-pool'); if (!poolContainer) return;
    poolContainer.innerHTML = ''; 
    players.sort((a, b) => a.tier - b.tier);

    players.forEach(p => {
        const isCapStyle = p.tag ? "color: #ff3333;" : "";
        poolContainer.innerHTML += `
            <div class="agent-card" draggable="true" id="${p.id}">
                <span style="${isCapStyle}">${p.tag} ${p.name}</span>
                <span class="agent-tier">${p.tier}티어</span>
                <div class="stats-overlay">
                    <div class="stats-row">
                        <div class="stat-item"><span>판수</span><span>${p.matches || 0}전</span></div>
                        <div class="stat-item"><span>승률</span><span>${p.winRate || 0}%</span></div>
                        <div class="stat-item"><span>KDA</span><span>${p.kda}</span></div>
                    </div>
                    <div class="most-champs">🔥 Most: ${p.most || '- / - / -'}</div>
                </div>
            </div>
        `;
    });
    addDragAndDropHandlers();
}

function addDragAndDropHandlers() {
    const draggables = document.querySelectorAll('.agent-card');
    const dropZones = document.querySelectorAll('.roster-list, .agent-list');
    draggables.forEach(d => {
        d.addEventListener('dragstart', () => d.classList.add('dragging'));
        d.addEventListener('dragend', () => d.classList.remove('dragging'));
    });
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone.addEventListener('drop', e => {
            e.preventDefault(); zone.classList.remove('drag-over');
            const d = document.querySelector('.dragging'); if (d) zone.appendChild(d);
        });
    });
}

function renderHallOfFame() {
    const sortedByWin = [...allPlayers].filter(p => p.matches > 0).sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate)).slice(0, 5);
    const listWin = document.getElementById('rank-win'); if (listWin) {
        listWin.innerHTML = '';
        sortedByWin.forEach((p, i) => { listWin.innerHTML += `<li><span>${i + 1}. ${p.name}</span> <span>${p.winRate}%</span></li>`; });
    }

    const sortedByKda = [...allPlayers].filter(p => p.matches > 0).sort((a, b) => parseFloat(b.kda) - parseFloat(a.kda)).slice(0, 5);
    const listKda = document.getElementById('rank-kda'); if (listKda) {
        listKda.innerHTML = '';
        sortedByKda.forEach((p, i) => { listKda.innerHTML += `<li><span>${i + 1}. ${p.name}</span> <span>${p.kda}</span></li>`; });
    }
}

// 사이트가 켜지자마자 백엔드에서 데이터를 받아오도록 실행
loadPlayersFromBackend();