const $=s=>document.querySelector(s);
const state={problems:[],community:{teams:[],submissions:[]},current:null,view:'dashboard',results:[],user:localStorage.getItem('cd_user')||'Anirud',myTeam:localStorage.getItem('cd_team')||null,solved:JSON.parse(localStorage.getItem('cd_solved')||'[]'),activity:JSON.parse(localStorage.getItem('cd_activity')||'{}'),language:'javascript',worker:null};
const starter={
 javascript:`function solve(input) {\n  // Your solution here\n  const { nums, target } = input;\n  return [];\n}\n`,
 python:`def solve(input):\n    # Your solution here\n    nums = input.get("nums", [])\n    target = input.get("target")\n    return []\n`
};
function todayKey(){return new Date().toISOString().slice(0,10)}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2400)}
async function api(url,options){const r=await fetch(url,options);const data=await r.json();if(!r.ok)throw new Error(data.error||'Something went wrong');return data}
async function init(){
  $('#todayDate').textContent=new Intl.DateTimeFormat('en-IN',{weekday:'short',day:'numeric',month:'short'}).format(new Date()).toUpperCase();
  $('#captainName').value=state.user;
  try{state.problems=await api('/api/problems');state.community=await api('/api/community')}catch(e){toast('Could not connect to the local server. Please restart npm start.')}
  renderAll();bindEvents();if(!localStorage.getItem('cd_user'))openName();
}
function renderAll(){renderDaily();renderProblems();renderTeams();renderLeaderboard();renderStats();renderHeat();renderHistory()}
function renderDaily(){
 const p=state.problems[(Math.floor(Date.now()/86400000))%Math.max(state.problems.length,1)];if(!p)return;
 state.daily=p;$('#dailyTitle').textContent=p.title;$('#dailyDescription').textContent=p.description;$('#dailyDifficulty').textContent=p.difficulty.toUpperCase();$('#dailyDifficulty').className='difficulty '+p.difficulty.toLowerCase();$('#dailyTags').innerHTML=p.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('');
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderProblems(){
 const allTags=[...new Set(state.problems.flatMap(p=>p.tags))].sort();$('#tagFilter').innerHTML='<option value="All">All topics</option>'+allTags.map(t=>`<option>${esc(t)}</option>`).join('');
 const q=$('#problemSearch').value.toLowerCase(),d=$('#difficultyFilter').value,t=$('#tagFilter').value;
 const list=state.problems.filter(p=>(d==='All'||p.difficulty===d)&&(t==='All'||p.tags.includes(t))&&(p.title+' '+p.description+' '+p.tags.join(' ')).toLowerCase().includes(q));
 $('#problemCount').textContent=state.problems.length;$('#problemGrid').innerHTML=list.map(p=>`<article class="problem-card" data-problem="${p.id}"><div class="problem-card-top"><span class="difficulty ${p.difficulty.toLowerCase()}">${p.difficulty.toUpperCase()}</span><span class="tiny muted">#${String(p.id).padStart(2,'0')}</span></div><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p><div class="problem-card-foot"><span class="tag">${esc(p.tags[0])}</span><span class="tiny muted">Open challenge →</span></div></article>`).join('')||'<div class="empty-state">No challenges match those filters.</div>';
}
function renderTeams(){
 const teams=state.community.teams||[];$('#teamList').innerHTML=teams.length?teams.map(t=>`<div class="team-item"><div class="team-symbol">${esc(t.name.slice(0,1).toUpperCase())}</div><div class="team-item-info"><strong>${esc(t.name)}</strong><small>${t.members.length}/4 members · ${t.solves||0} solves</small></div><button class="join-btn" data-join="${t.id}" ${t.members.length>=4?'disabled':''}>${t.members.length>=4?'Full':'Join'}</button></div>`).join(''):'<div class="empty-state">No squads yet. Be the first to create one.</div>';
 const mine=teams.find(t=>t.id===state.myTeam);$('#myTeamStatus').textContent=mine?'SQUAD MEMBER':'NOT IN A TEAM';
 $('#myTeamContent').innerHTML=mine?`<div class="team-item"><div class="team-symbol">${esc(mine.name[0].toUpperCase())}</div><div class="team-item-info"><strong>${esc(mine.name)}</strong><small>Created ${new Date(mine.createdAt).toLocaleDateString()}</small></div><strong>${mine.solves||0} pts</strong></div><div class="member-pills">${mine.members.map(m=>`<span class="member-pill">✦ ${esc(m)}</span>`).join('')}</div>`:'No squad selected yet. Create one or join an open squad above.';
}
function scores(){return [...(state.community.teams||[])].map(t=>({...t,points:(t.solves||0)*100+(t.members.length*5)})).sort((a,b)=>b.points-a.points)}
function renderLeaderboard(){
 const list=scores();const rows=list.length?list.map((t,i)=>`<div class="leader-row"><span class="rank">0${i+1}</span><div style="display:flex;align-items:center;gap:9px"><span class="team-avatar">${esc(t.name[0].toUpperCase())}</span><div class="leader-name"><strong>${esc(t.name)}</strong><small>${t.members.length} members</small></div></div><span class="leader-points">${t.points.toLocaleString()} pts</span></div>`).join(''):'<div class="empty-state">Squads will appear here when teams are created.</div>';
 $('#miniLeaderboard').innerHTML=rows;
 $('#fullLeaderboard').innerHTML=list.length?list.map((t,i)=>`<div class="leaderboard-line"><div class="team-cell"><span class="team-avatar">${esc(t.name[0].toUpperCase())}</span>${esc(t.name)} ${t.id===state.myTeam?'<span class="pill pill-purple">YOUR SQUAD</span>':''}</div><span>${t.members.length}/4</span><span>${t.solves||0}</span><strong class="points">${t.points.toLocaleString()}</strong></div>`).join(''):'<div class="empty-state">No teams yet. Create a squad to start the derby.</div>';
 const rank=list.findIndex(t=>t.id===state.myTeam);$('#statRank').textContent=rank<0?'—':'#'+(rank+1);const mine=list.find(t=>t.id===state.myTeam);$('#statTeam').textContent=mine?mine.name:'Join a squad to compete';
}
function renderStats(){
 const subs=state.community.submissions.filter(s=>s.user===state.user);const accepted=subs.filter(s=>s.accepted);const rate=subs.length?Math.round(accepted.length/subs.length*100)+'%':'—';
 $('#statSolved').textContent=state.solved.length;$('#statStreak').innerHTML=streak()+' <i>days</i>';$('#statRate').textContent=rate;$('#sideStreak').textContent=streak()+' day streak';$('#sideProgress').style.width=Math.min(streak()/7*100,100)+'%';
 $('#activityStreak').textContent=streak()+' days';$('#activitySolved').textContent=state.solved.length;$('#activityDays').textContent=Object.keys(state.activity).filter(k=>state.activity[k]>0).length;
}
function streak(){let n=0,d=new Date();while(true){const k=d.toISOString().slice(0,10);if((state.activity[k]||0)>0){n++;d.setDate(d.getDate()-1)}else break;}return n}
function renderHeat(){
 const cells=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));const n=state.activity[d.toISOString().slice(0,10)]||0;return `<i class="heat-cell ${n>=4?'l4':n===3?'l3':n===2?'l2':n===1?'l1':''}" title="${n} accepted solves"></i>`}).join('');
 $('#miniHeat').innerHTML=cells;
 const total=84;let html='';for(let i=total-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const n=state.activity[d.toISOString().slice(0,10)]||0;html+=`<i class="heat-cell ${n>=4?'l4':n===3?'l3':n===2?'l2':n===1?'l1':''}" title="${d.toDateString()}: ${n} accepted solves"></i>`}
 $('#activityHeat').innerHTML=html;
}
function renderHistory(){
 const mine=state.community.submissions.filter(s=>s.user===state.user).slice(0,10);
 $('#submissionHistory').innerHTML=mine.length?mine.map(s=>`<div class="history-row"><strong>${esc(s.problemTitle)}</strong><span class="${s.accepted?'accepted':'failed'}">${s.accepted?'✓ Accepted':'× Not accepted'}</span><span class="muted">${new Date(s.createdAt).toLocaleDateString()}</span></div>`).join(''):'<div class="empty-state">Your submissions will show up here after your first run.</div>';
}
function goto(view){state.view=view;document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));$('#page-'+view).classList.remove('hidden');document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));$('#crumb').textContent=({dashboard:'Overview',challenges:'Challenges',teams:'My squad',leaderboard:'Leaderboard',activity:'Activity & streaks',editor:'Code workspace'})[view]||view;window.scrollTo(0,0)}
function openProblem(id){const p=state.problems.find(x=>x.id===Number(id));if(!p)return;state.current=p;state.results=[];$('#editorId').textContent='CHALLENGE '+String(p.id).padStart(2,'0');$('#editorTitle').textContent=p.title;$('#editorDifficulty').textContent=p.difficulty.toUpperCase();$('#editorDifficulty').className='difficulty '+p.difficulty.toLowerCase();$('#editorTags').innerHTML=p.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('');$('#editorDescription').textContent=p.description;$('#exampleInput').textContent=p.exampleInput;$('#exampleOutput').textContent=p.exampleOutput;$('#editorConstraints').textContent=p.constraints;$('#hintText').textContent=p.hint;$('#testCasePreview').innerHTML=p.tests.map((t,i)=>`<div class="test-preview"><span>Test ${i+1}</span><span>Input: ${esc(JSON.stringify(t.input).slice(0,45))}</span></div>`).join('');setLanguage('javascript');$('#testResults').innerHTML='<div class="result-empty">Run your code to see the test results here.</div>';$('#runMessage').textContent='Ready when you are.';document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.tab==='description'));$('#tab-description').classList.remove('hidden');$('#tab-hints').classList.add('hidden');goto('editor')}
function setLanguage(lang){state.language=lang;$('#languageSelect').value=lang;$('#editorFile').textContent=lang==='python'?'solution.py':'solution.js';$('#codeEditor').value=starter[lang];}
function normalize(x){if(x===undefined)return 'undefined';return JSON.stringify(x)}
function runOne(code,lang,input){return new Promise(resolve=>{const worker=new Worker('/runner.js');let finished=false;const timer=setTimeout(()=>{if(!finished){finished=true;worker.terminate();resolve({ok:false,error:'Time limit exceeded (3 seconds).'})}},3000);worker.onmessage=e=>{if(finished)return;finished=true;clearTimeout(timer);worker.terminate();resolve(e.data)};worker.onerror=e=>{if(finished)return;finished=true;clearTimeout(timer);worker.terminate();resolve({ok:false,error:e.message||'Runner failed'})};worker.postMessage({code,language:lang,input})})}
function equal(a,b){return JSON.stringify(sortDeep(a))===JSON.stringify(sortDeep(b))}
function sortDeep(x){if(Array.isArray(x))return x.map(sortDeep);if(x&&typeof x==='object')return Object.keys(x).sort().reduce((o,k)=>(o[k]=sortDeep(x[k]),o),{});return x}
async function runTests(submit=false){
 if(!state.current)return;const code=$('#codeEditor').value,lang=state.language;const button=submit?$('#submitSolution'):$('#runTests');button.disabled=true;$('#runMessage').textContent=lang==='python'?'Loading Python runtime if needed…':'Running in an isolated Web Worker…';$('#testResults').innerHTML='<div class="result-empty">Running test cases…</div>';
 const results=[];for(let i=0;i<state.current.tests.length;i++){const test=state.current.tests[i];const r=await runOne(code,lang,test.input);let passed=false;if(r.ok){if(test.expected==='groups'||test.expected==='triplets'||test.expected==='topk'){passed=validateSpecial(state.current.id,r.result,test.input)}else{let expected;try{expected=JSON.parse(test.expected)}catch{expected=test.expected}passed=equal(r.result,expected)}}
 results.push({passed,error:r.error,actual:r.result});}
 state.results=results;const passed=results.filter(r=>r.passed).length;const accepted=passed===results.length;
 $('#runMessage').textContent=accepted?'All checks passed. Nice work.':`${passed} of ${results.length} tests passed.`;
 $('#testResults').innerHTML=`<div class="result-summary"><strong>${accepted?'✓ All tests passed':'Test results'}</strong><span>${passed}/${results.length} passed</span></div>`+results.map((r,i)=>`<div class="result-item ${r.passed?'pass':'fail'}"><span>${r.passed?'✓':'×'} Test case ${i+1}</span><small>${r.passed?'Passed':esc(r.error||'Output did not match expected result')}</small></div>`).join('');
 if(submit){try{const submission=await api('/api/submissions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user:state.user,problemId:state.current.id,problemTitle:state.current.title,passed,total:results.length,accepted})});if(accepted&&!state.solved.includes(state.current.id)){state.solved.push(state.current.id);localStorage.setItem('cd_solved',JSON.stringify(state.solved));const k=todayKey();state.activity[k]=(state.activity[k]||0)+1;localStorage.setItem('cd_activity',JSON.stringify(state.activity));}state.community=await api('/api/community');renderAll();toast(accepted?'Accepted! Your progress has been saved.':'Submission saved. Keep iterating!')}catch(e){toast(e.message)}}
 button.disabled=false;
}
function validateSpecial(id,result,input){
 if(id===13){const a=Array.isArray(result)?result:[];const expectedGroups={};for(const s of input.strs){const k=s.split('').sort().join('');(expectedGroups[k]??=[]).push(s)}return a.length===Object.keys(expectedGroups).length&&a.every(g=>g.every(x=>expectedGroups[x.split('').sort().join('')]?.includes(x))&&g.length===expectedGroups[g[0]?.split('').sort().join('')]?.length)}
 if(id===14){const target=[];const nums=[...input.nums].sort((a,b)=>a-b);for(let i=0;i<nums.length-2;i++){if(i&&nums[i]===nums[i-1])continue;let l=i+1,r=nums.length-1;while(l<r){let s=nums[i]+nums[l]+nums[r];if(s===0){target.push([nums[i],nums[l],nums[r]]);l++;r--;while(l<r&&nums[l]===nums[l-1])l++;while(l<r&&nums[r]===nums[r+1])r--}else if(s<0)l++;else r--}}return equal(result,target)}
 if(id===15){const f={};input.nums.forEach(n=>f[n]=(f[n]||0)+1);const expected=Object.entries(f).sort((a,b)=>b[1]-a[1]).slice(0,input.k).map(x=>Number(x[0]));return Array.isArray(result)&&result.length===expected.length&&result.every(x=>expected.includes(x))}
 return false;
}
function openName(){ $('#displayNameInput').value=state.user;$('#nameModal').classList.remove('hidden')}
function saveName(){const n=$('#displayNameInput').value.trim();if(!n)return toast('Please enter a display name.');state.user=n;localStorage.setItem('cd_user',n);$('#captainName').value=n;$('#nameModal').classList.add('hidden');renderAll();toast('Profile updated.')}
function bindEvents(){
 document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>goto(b.dataset.view)));
 document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>goto(b.dataset.goto)));
 $('#jumpChallenge').onclick=()=>openProblem(state.daily.id);$('#openDaily').onclick=()=>openProblem(state.daily.id);
 $('#problemSearch').oninput=renderProblems;$('#difficultyFilter').onchange=renderProblems;$('#tagFilter').onchange=renderProblems;
 $('#problemGrid').addEventListener('click',e=>{const card=e.target.closest('[data-problem]');if(card)openProblem(card.dataset.problem)});
 $('#createTeam').onclick=async()=>{try{const t=await api('/api/teams',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:$('#teamName').value,captain:$('#captainName').value||state.user})});state.myTeam=t.id;localStorage.setItem('cd_team',t.id);state.community=await api('/api/community');$('#teamName').value='';renderAll();toast('Squad created. Rally your teammates!')}catch(e){toast(e.message)}};
 $('#teamList').addEventListener('click',async e=>{const b=e.target.closest('[data-join]');if(!b)return;try{const t=await api('/api/teams/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({teamId:b.dataset.join,member:state.user})});state.myTeam=t.id;localStorage.setItem('cd_team',t.id);state.community=await api('/api/community');renderAll();toast('You joined '+t.name+'!')}catch(e){toast(e.message)}});
 $('#backToChallenges').onclick=()=>goto('challenges');$('#languageSelect').onchange=e=>setLanguage(e.target.value);$('#resetCode').onclick=()=>setLanguage(state.language);
 $('#runTests').onclick=()=>runTests(false);$('#submitSolution').onclick=()=>runTests(true);
 $('#codeEditor').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();runTests(false)}if(e.key==='Tab'){e.preventDefault();const el=e.target,start=el.selectionStart,end=el.selectionEnd;el.setRangeText('  ',start,end,'end')}});
 document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===t));$('#tab-description').classList.toggle('hidden',t.dataset.tab!=='description');$('#tab-hints').classList.toggle('hidden',t.dataset.tab!=='hints')});
 $('#profileButton').onclick=openName;$('#closeName').onclick=()=>$('#nameModal').classList.add('hidden');$('#saveName').onclick=saveName;$('#displayNameInput').addEventListener('keydown',e=>{if(e.key==='Enter')saveName()});
}
init();
