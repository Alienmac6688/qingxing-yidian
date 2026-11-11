(function(){'use strict';
let seed=JSON.parse(document.getElementById('seed').textContent);const KEY='qingxing-v12',legacy='qingxing-review-v1';
const $=id=>document.getElementById(id),today=()=>new Date().toLocaleDateString('sv-SE');
const defaultState=()=>({version:2,memory:{},discern:[],custom:[],revision:1});
let state=defaultState(),active=null,first='',after='',stage=0,choices=[],selectedIndex=-1;
function valid(data){return data&&data.version===2&&data.memory&&typeof data.memory==='object'&&!Array.isArray(data.memory)&&Array.isArray(data.discern)&&Array.isArray(data.custom)&&data.discern.length<=20000&&data.custom.length<=1000}
try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(valid(s))state=s}catch{}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function all(){return seed.concat(state.custom)}
function text(node,value){node.textContent=String(value??'')}
function btn(label,click,cls){const b=document.createElement('button');b.textContent=label;if(cls)b.className=cls;b.onclick=click;return b}
function nav(tab){for(const id of ['home','practice','cases','growth','mine'])$(id).hidden=id!==tab;document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===tab));if(tab==='home'||tab==='growth')stats();if(tab==='cases')renderCases();if(tab==='mine')renderCustom();window.scrollTo(0,0)}
document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.nav)));
const labelType={choice:'情境判断',scenario:'情境题',breakdown:'话术拆解'};
function quiz(c){
 const q=c.quiz;
 if(q&&Array.isArray(q.options)&&q.options.length===3&&Number.isInteger(q.correct))return q;
 return {question:'面对这段话，下面哪一种处理方式更合理？',
 options:[c.wake,'只根据这段话就认定对方一定有恶意','不考虑具体事实，直接接受或拒绝全部说法'],
 correct:0,
 explain:'更合理的是：'+c.wake+'。'+c.check+' '+c.risk+' 注意：单段话不足以判断说话者的真实意图。'};
}
function makeOptions(c){return quiz(c).options}
function counter(c){return c.counter||'单凭这段话还不能确定对方的意图、具体背景和全部事实。也可能存在合理解释；需要进一步核实证据、上下文与实际影响。'}
function sourceType(c){if(c.id.startsWith('g2-')||c.category==='G2催眠辨识')return '课程原文';const src=String(c.source||'');if(/原创模拟|自编|用户本地/.test(src))return '自编情境';if(/Awakenology/.test(src)&&/原文|摘录/.test(src))return 'Awakenology 原文';return '作者重述'}
function verificationStatus(c){const v=String(c.evidenceStatus||c.verificationStatus||'').toLowerCase();if(/人工复核|manual/.test(v))return 'manual';if(/verified|已核验/.test(v)&&!/unverified|未核验|待核验/.test(v))return 'verified';return 'pending'}
function verificationLabel(c){return {verified:'已核验',pending:'待核验',manual:'待人工复核'}[verificationStatus(c)]}
function difficultyOf(c){if(['初级','中级','高级'].includes(c.difficulty))return c.difficulty;return '中级'}
function choose(card){
 active=card;first='';after='';stage=0;selectedIndex=-1;
 $('p-reason').value='';$('p-after-reason').value='';$('p-disagree').value='';
 $('analysis').hidden=true;$('memory').hidden=true;$('p-empty').hidden=true;
 $('p-title').textContent=card.title;$('p-prompt').textContent=card.prompt;
 $('p-meta').textContent=card.category+' · '+card.tags.join(' / ');
 $('p-type').textContent='三点辨识';$('p-count').textContent=card.id;$('p-source').textContent=card.source||'来源未注明';$('p-verification').textContent=sourceType(card)+' · '+verificationLabel(card);
 $('p-question').textContent='辨识点：这段话有哪些值得核实或留意的地方？';
 $('p-options').replaceChildren();$('p-answer').hidden=true;
 $('analyze').disabled=false;$('finish').disabled=true;
 $('p-after-choices').querySelectorAll('button').forEach(b=>b.classList.remove('selected'));
 $('p-risk').textContent=card.risk||'需要结合具体情境辨识可能的影响机制。';
 $('p-counter').textContent=counter(card);
 $('p-wake').textContent=card.wake;
 nav('practice');
}
// Homepage onboarding: preview interaction never writes into local learning records.
$('home-first').onclick=()=>choose(all()[0]);
$('demo-start').onclick=()=>{const card=all().find(c=>c.id==='core-02')||all()[0];choose(card)};
let demoFirst='';
function resetDemo(){demoFirst='';$('demo-step1').hidden=false;$('demo-step2').hidden=true;$('demo-step3').hidden=true;$('demo-result').textContent=''}
document.querySelectorAll('[data-demo-first]').forEach(b=>b.onclick=()=>{demoFirst=b.dataset.demoFirst;$('demo-first-result').textContent='你的初步判断：'+demoFirst;$('demo-step1').hidden=true;$('demo-step2').hidden=false});
$('demo-continue').onclick=()=>{$('demo-step2').hidden=true;$('demo-step3').hidden=false};
document.querySelectorAll('[data-demo-last]').forEach(b=>b.onclick=()=>{$('demo-result').textContent='你的再次判断：'+b.dataset.demoLast+'。与最初判断'+(demoFirst===b.dataset.demoLast?'方向相近。':'有所不同。')+'这不是标准答案，关键是核对事实和证据。'});
$('demo-reset').onclick=resetDemo;
function due(){return all().filter(c=>state.memory[c.id]&&Number(state.memory[c.id].due)<=Date.now())}
function next(){const pool=due();const unlearned=all().filter(c=>!state.memory[c.id]);const candidates=pool.length?pool:unlearned.length?unlearned:all();choose(candidates[Math.floor(Math.random()*candidates.length)])}
$('next').onclick=next;
$('analyze').onclick=()=>{
 if(!active||stage!==0)return;
 first=$('p-reason').value.trim();
 $('p-answer').hidden=false;
 $('p-answer').textContent='辨识点：'+(active.check||'先核对信息来源、事实与语境。');
 $('analysis').hidden=false;stage=1;
 $('analysis').scrollIntoView({behavior:'smooth',block:'start'});
};
$('p-after-choices').querySelectorAll('button').forEach(b=>b.onclick=()=>{after=b.dataset.after;$('finish').disabled=false;$('p-after-choices').querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===b))});
$('finish').onclick=()=>{if(!active||stage!==1)return;after=after||'已查看三点分析';const observation=$('p-reason').value.trim().slice(0,2000);const record={id:active.id,at:Date.now(),before:observation,after,changed:false,reason:observation,reflection:$('p-after-reason').value.trim().slice(0,2000),disagreement:$('p-disagree').value.trim().slice(0,2000),type:active.type};state.discern.push(record);save();stage=2;$('finish').disabled=true;$('memory').hidden=false;$('memory').scrollIntoView({behavior:'smooth',block:'start'});stats()};
document.querySelectorAll('[data-grade]').forEach(b=>b.onclick=()=>{if(!active||stage!==2)return;state.memory[active.id]=QXFSRS.update(state.memory[active.id],+b.dataset.grade);save();const due=new Date(state.memory[active.id].due).toLocaleDateString('zh-CN');$('p-fsrs').textContent='已保存，下次预计复习：'+due;stage=3;stats();setTimeout(next,900)});
function stats(){const cards=all(),mem=Object.values(state.memory),changed=state.discern.filter(x=>x.changed).length;const dueCount=cards.filter(c=>state.memory[c.id]&&Number(state.memory[c.id].due)<=Date.now()).length;$('home-new').hidden=state.discern.length>0;$('home-progress').hidden=state.discern.length===0;$('home-library-count').textContent=`当前收录 ${cards.length} 条训练内容（含原文辨识资料），可按领域、来源与核验状态查找；持续增补，不保证固定每周更新数量。`;$('h-due').textContent=dueCount;$('h-total').textContent=cards.length;$('h-today').textContent=state.discern.filter(x=>new Date(x.at).toLocaleDateString('sv-SE')===today()).length;$('g-memory').textContent=mem.reduce((s,x)=>s+(x.reps||0),0);$('g-discern').textContent=state.discern.length;$('g-change').textContent=changed;$('memory-metric').textContent=`记忆：${mem.length} 张卡片有复习记录；${dueCount} 张待复习。采用 FSRS-4.5 参考实现（默认参数，目标记忆保持率90%）。`;$('discern-metric').textContent=`辨识：完成 ${state.discern.length} 次双向复盘；三点辨识以自我复盘为主，不设置未经验证的标准答案。改变判断不自动代表进步。`;const log=$('log-list');log.replaceChildren();state.discern.slice(-8).reverse().forEach(x=>{const c=cards.find(c=>c.id===x.id);const p=document.createElement('p');p.textContent=`${new Date(x.at).toLocaleString('zh-CN')} · ${c?.title||'已移除案例'}\n个人观察：${x.reason||x.before||'未填写'}\n复盘判断：${x.after||'未选择'}\n复盘笔记：${x.reflection||'未填写'}\n对参考拆解的意见：${x.disagreement||'未填写'}`;p.style.whiteSpace='pre-wrap';p.style.overflowWrap='anywhere';log.append(p)});if(!state.discern.length)log.textContent='还没有训练记录。'}
function filters(){const categories=['G2催眠辨识','G2原文辨识','社会','宗教','职场','生活','家庭','爱情','教育','网络','商业','健康','歌曲歌词','其他' ,'我的案例'],tags=[...new Set(all().flatMap(c=>c.tags))].sort();for(const [id,values] of [['category',categories],['tag',tags]]){const sel=$(id),value=sel.value;sel.querySelectorAll('option:not(:first-child)').forEach(o=>o.remove());values.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;sel.append(o)});sel.value=values.includes(value)?value:''}}
function renderCases(){filters();const q=$('search').value.trim().toLowerCase(),cat=$('category').value,tag=$('tag').value,type=$('type').value,verification=$('verification').value,difficulty=$('difficulty').value;const found=all().filter(c=>(!cat||c.category===cat)&&(!tag||c.tags.includes(tag))&&(!type||c.type===type)&&(!verification||verificationStatus(c)===verification)&&(!difficulty||difficultyOf(c)===difficulty)&&(!q||[c.title,c.prompt,c.category,...c.tags].join(' ').toLowerCase().includes(q)));$('case-count').textContent=`找到 ${found.length} 个案例（原始 ${seed.length} 张）`;$('case-list').replaceChildren();found.slice(0,120).forEach(c=>{const b=btn('',()=>choose(c),'case'),title=document.createElement('b'),sub=document.createElement('small');title.textContent=c.title+' · '+c.prompt;sub.textContent=c.category+' · '+labelType[c.type]+' · '+c.tags.join(' / ');b.append(title,sub);$('case-list').append(b)});if(found.length>120){const more=document.createElement('p');more.className='muted';more.textContent=`当前显示前120条，共${found.length}条；可输入关键词进一步筛选。`; $('case-list').append(more)}}
for(const id of ['search','category','tag','type','verification','difficulty'])$(id).addEventListener(id==='search'?'input':'change',renderCases);
$('add-custom').onclick=()=>{const title=$('custom-title').value.trim(),prompt=$('custom-prompt').value.trim();if(!title||!prompt){$('custom-status').textContent='请至少填写标题和事实经过。';return}const id='user-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);state.custom.push({id,category:'我的案例',title,prompt,check:$('custom-check').value.trim()||'核实具体事实与证据',risk:'这段经历可能有多种解释，尚不能直接认定为操纵。',counter:$('custom-counter').value.trim()||'还需要了解更多背景和当事人的其他解释。',wake:$('custom-wake').value.trim()||'保留自主判断，核实证据后决定。',tags:['我的案例'],type:'scenario',source:'用户本地创建',revision:1});save();for(const id of ['custom-title','custom-prompt','custom-check','custom-counter','custom-wake'])$(id).value='';$('custom-status').textContent='已保存，仅本地可见。';renderCustom();stats()};
function renderCustom(){const list=$('custom-list');list.replaceChildren();if(!state.custom.length)list.textContent='暂无自建案例。';state.custom.forEach(c=>{const d=document.createElement('div');d.className='mini';const h=document.createElement('b');h.textContent=c.title+' · 修订版 '+c.revision;const p=document.createElement('p');p.textContent=c.prompt;d.append(h,p,btn('开始练习',()=>choose(c),'secondary'),btn('编辑',()=>editCustom(c),'secondary'),btn('导出共享草稿',()=>download('case-'+c.id+'.json',JSON.stringify({format:'qingxing-case-draft',version:1,case:c},null,2),'application/json'),'secondary'),btn('删除',()=>{if(confirm('删除此案例？相关历史记录仍保留。')){state.custom=state.custom.filter(x=>x.id!==c.id);save();renderCustom();stats()}},'secondary'));list.append(d)})}
function editCustom(c){const newTitle=prompt('修改案例标题',c.title);if(newTitle===null)return;const newPrompt=prompt('修改事实经过',c.prompt);if(newPrompt===null)return;if(!newTitle.trim()||!newPrompt.trim())return alert('标题和事实经过不能为空');c.title=newTitle.trim().slice(0,80);c.prompt=newPrompt.trim().slice(0,1000);c.revision=(c.revision||1)+1;save();renderCustom()}
function download(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$('export-md').onclick=()=>{const lines=['# 清醒一点 · 我的学习记录','','导出时间：'+new Date().toLocaleString('zh-CN'),''];for(const x of state.discern){const c=all().find(c=>c.id===x.id);lines.push('## '+(c?.title||x.id),'','- 时间：'+new Date(x.at).toLocaleString('zh-CN'),'- 个人观察：'+(x.reason||x.before||'未填写'),'- 复盘判断：'+(x.after||'未选择'),'- 复盘笔记：'+(x.reflection||'未填写'),'- 对参考拆解的意见：'+(x.disagreement||'未填写'),'')}download('qingxing-learning-records.md',lines.join('\\n').replaceAll('\\n','\n'),'text/markdown;charset=utf-8')};
$('export').onclick=()=>download('qingxing-v12-backup.json',JSON.stringify({app:'qingxing-yidian',schema:2,exportedAt:new Date().toISOString(),state},null,2),'application/json');
$('clear-all').onclick=()=>{
 if(!confirm('第一次确认：确定清空本机全部学习记录、复习进度和自建案例吗？此操作不可撤销。'))return;
 if(!confirm('第二次确认：所有本机学习数据将永久清空。是否继续？'))return;
 try{localStorage.removeItem(KEY);localStorage.removeItem(legacy)}catch(e){alert('清空失败：浏览器不允许访问本地存储。');return}
 state=defaultState();active=null;first='';after='';stage=0;selectedIndex=-1;
 for(const id of ['p-reason','p-after-reason','p-disagree','search','custom-title','custom-prompt','custom-check','custom-counter','custom-wake'])$(id).value='';
 for(const id of ['category','tag','type','verification','difficulty'])$(id).value='';
 $('analysis').hidden=true;$('memory').hidden=true;$('p-answer').hidden=true;
 $('custom-status').textContent='';$('p-fsrs').textContent='';
 filters();renderCustom();renderCases();stats();next();nav('home');
 alert('本机学习数据已清空，已恢复全新状态。');
};
$('import').onclick=()=>$('import-file').click();$('import-file').onchange=async e=>{try{const file=e.target.files?.[0];if(!file)return;if(file.size>5_000_000)throw Error('文件超过5MB');const data=JSON.parse(await file.text());if(data.app!=='qingxing-yidian'||data.schema!==2||!valid(data.state))throw Error('备份版本或结构不匹配');if(!confirm('导入会覆盖本机数据，建议先导出备份。确定继续？'))return;state=data.state;save();filters();renderCustom();renderCases();stats();alert('导入完成')}catch(err){alert('导入失败：'+err.message)}finally{e.target.value=''}};
$('anki').onclick=()=>{const esc=x=>'"'+String(x).replaceAll('"','""').replaceAll('\n','<br>')+'"';download('qingxing-anki.csv','Front,Back,Tags\n'+all().map(c=>[c.prompt,`检测：${c.check}<br>可能影响：${c.risk}<br>另一面：${counter(c)}<br>应对：${c.wake}`,c.tags.join(' ')].map(esc).join(',')).join('\n'),'text/csv;charset=utf-8')};
// V1.1 progress is deliberately not converted into FSRS history: intervals/ease are incompatible.
try{if(!localStorage.getItem(KEY)&&localStorage.getItem(legacy))console.info('V1.1 review data detected; export it from V1.1 separately. No automatic FSRS conversion.')}catch{}
filters();stats();next();nav('home');
// G2原表摘录单独加载：保留原有30张通用卡与用户本地学习记录。
fetch('./data/g2-reviewed-batch-01.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(data=>{if(!Array.isArray(data.cases))throw Error('G2 schema mismatch');const known=new Set(seed.map(c=>c.id));seed=seed.concat(data.cases.filter(c=>c&&typeof c.id==='string'&&!known.has(c.id)));filters();stats();renderCases();}).catch(e=>console.warn('G2案例库加载失败，仍可使用原30张卡片',e));fetch('./data/social-religion-batch-01.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(data=>{if(!Array.isArray(data.cases))throw Error('schema');const known=new Set(seed.map(c=>c.id));seed=seed.concat(data.cases.filter(c=>c&&c.id&&!known.has(c.id)));filters();stats();renderCases();}).catch(e=>console.warn('社会宗教案例库加载失败',e));
// 增量社会/宗教情境库：保留原有正式库，失败时不阻断主界面。
fetch('./data/social-religion-awakenology-scenarios-20261111.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(data=>{
 if(!Array.isArray(data.cases))throw Error('incremental case schema mismatch');
 const known=new Set(seed.map(c=>c.id));
 seed=seed.concat(data.cases.filter(c=>c&&typeof c.id==='string'&&!known.has(c.id)&&(c.category==='社会'||c.category==='宗教')));
 filters();stats();renderCases();
}).catch(e=>console.warn('增量社会宗教案例加载失败',e));
// 经典真实歌曲与原创歌词案例独立加载；按 ID 去重，失败不阻断其他训练内容。
for(const file of ['research-candidates-real-classic-songs-20261111.json','research-candidates-lyrics-20261111-c.json']){
 fetch('./data/'+file,{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(data=>{
  if(!Array.isArray(data.cases))throw Error('song schema mismatch');
  const known=new Set(seed.map(c=>c.id));
  const fresh=data.cases.filter(c=>c&&typeof c.id==='string'&&!known.has(c.id)&&c.category==='歌曲歌词');
  seed=seed.concat(fresh);
  filters();stats();renderCases();
 }).catch(e=>console.warn('歌曲歌词案例加载失败: '+file,e));
}
fetch('./data/g2-cong-tou-fu-he-source.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(data=>{if(!Array.isArray(data.rows))throw Error('G2 source schema mismatch');const known=new Set(seed.map(c=>c.id));const cards=data.rows.filter(row=>row&&Array.isArray(row.values)&&row.values.length===6).map(row=>{const v=row.values.map(x=>String(x??'').trim()),n=v[0];return {id:'g2-source-'+n,category:'G2催眠辨识',title:'G2 #'+n+' · '+(v[3]||v[2].slice(0,38)||'原文辨识'),prompt:v[2]||'该条原文未提供',check:v[3]||'核对原文语境和证据',risk:v[4]||'暂无对应催眠点分析，不能据此断定存在操纵。',wake:v[5]||'保留独立判断，结合上下文核实。',counter:'原文可能是修辞、个人经验或课程观点；需结合语境，不能直接认定为操纵。',tags:['G2原文','催眠辨识'],type:'breakdown',source:v[1]||'G2从头复核原始资料（具体来源未注明）',revision:1}}).filter(c=>!known.has(c.id));seed=seed.concat(cards);filters();stats();renderCases();}).catch(e=>console.warn('G2原文辨识资料加载失败',e));
// All share links use the same canonical URL. Check published assets when returning to the tab
// and periodically while visible; ask before reloading so unfinished exercises are not lost.
const LIVE_FILES=['./app.js','./data/social-religion-batch-01.json','./data/research-candidates-real-classic-songs-20261111.json','./data/research-candidates-lyrics-20261111-c.json'];
const liveVersions=new Map();let liveBusy=false,livePrompted=false;
async function checkPublishedUpdates(){
 if(document.hidden||liveBusy||livePrompted||!navigator.onLine)return;
 liveBusy=true;
 try{
  const versions=await Promise.all(LIVE_FILES.map(async file=>{
   const response=await fetch(file,{method:'HEAD',cache:'no-store'});
   if(!response.ok)throw Error('update check '+file+': '+response.status);
   return [file,response.headers.get('etag')||response.headers.get('last-modified')||''];
  }));
  let changed=false;
  for(const [file,version] of versions){
   if(version&&liveVersions.has(file)&&liveVersions.get(file)!==version)changed=true;
   if(version)liveVersions.set(file,version);
  }
  if(changed){livePrompted=true;if(confirm('清醒一点有新版本，是否现在刷新？未保存的练习输入会丢失。'))location.reload();}
 }catch(e){console.warn('自动更新检查暂不可用',e)}
 finally{liveBusy=false}
}
checkPublishedUpdates();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkPublishedUpdates()});
window.addEventListener('focus',checkPublishedUpdates);
setInterval(checkPublishedUpdates,120000);
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{reg.update().catch(()=>{});}).catch(()=>{});

})();