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
const labelType={choice:'选择题',scenario:'情境题',breakdown:'话术拆解'};
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
function choose(card){
 active=card;first='';after='';stage=0;selectedIndex=-1;
 $('p-reason').value='';$('p-after-reason').value='';
 $('analysis').hidden=true;$('memory').hidden=true;$('p-empty').hidden=true;
 $('p-title').textContent=card.title;$('p-prompt').textContent=card.prompt;
 $('p-meta').textContent=card.category+' · '+card.tags.join(' / ');
 $('p-type').textContent='三点辨识';$('p-count').textContent=card.id;$('p-source').textContent=card.id.startsWith('g2-')?'G2课程原文分析 · 原始材料待逐条核验':'原创模拟生活场景 · 概念参考 Awakenology；影响机制参考心理学资料';
 $('p-question').textContent='辨识点：这段话有哪些值得核实或留意的地方？';
 $('p-options').replaceChildren();$('p-answer').hidden=true;
 $('analyze').disabled=false;$('finish').disabled=true;
 $('p-after-choices').querySelectorAll('button').forEach(b=>b.classList.remove('selected'));
 $('p-risk').textContent=card.risk||'需要结合具体情境辨识可能的影响机制。';
 $('p-counter').textContent=counter(card);
 $('p-wake').textContent=card.wake;
 nav('practice');
}
function due(){return all().filter(c=>!state.memory[c.id]||state.memory[c.id].due<=Date.now())}
function next(){const pool=due();choose(pool.length?pool[Math.floor(Math.random()*pool.length)]:all()[Math.floor(Math.random()*all().length)])}
$('next').onclick=next;
$('analyze').onclick=()=>{
 if(!active||stage!==0)return;
 first=$('p-reason').value.trim()||'未填写个人辨识';
 $('p-answer').hidden=false;
 $('p-answer').textContent='辨识点：'+(active.check||'先核对信息来源、事实与语境。');
 $('analysis').hidden=false;stage=1;
 $('analysis').scrollIntoView({behavior:'smooth',block:'start'});
};
$('p-after-choices').querySelectorAll('button').forEach(b=>b.onclick=()=>{after=b.dataset.after;$('finish').disabled=false;$('p-after-choices').querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===b))});
$('finish').onclick=()=>{if(!active||stage!==1)return;after=after||'已查看三点分析';const record={id:active.id,at:Date.now(),before:first,after,changed:first!==after,reason:$('p-reason').value.slice(0,2000),reflection:$('p-after-reason').value.slice(0,2000),type:active.type};state.discern.push(record);save();stage=2;$('finish').disabled=true;$('memory').hidden=false;$('memory').scrollIntoView({behavior:'smooth',block:'start'});stats()};
document.querySelectorAll('[data-grade]').forEach(b=>b.onclick=()=>{if(!active||stage!==2)return;state.memory[active.id]=QXFSRS.update(state.memory[active.id],+b.dataset.grade);save();const due=new Date(state.memory[active.id].due).toLocaleDateString('zh-CN');$('p-fsrs').textContent='已保存，下次预计复习：'+due;stage=3;stats();setTimeout(next,900)});
function stats(){const cards=all(),mem=Object.values(state.memory),changed=state.discern.filter(x=>x.changed).length;const dueCount=cards.filter(c=>!state.memory[c.id]||state.memory[c.id].due<=Date.now()).length;$('h-due').textContent=dueCount;$('h-total').textContent=cards.length;$('h-today').textContent=state.discern.filter(x=>new Date(x.at).toLocaleDateString('sv-SE')===today()).length;$('g-memory').textContent=mem.reduce((s,x)=>s+(x.reps||0),0);$('g-discern').textContent=state.discern.length;$('g-change').textContent=changed;$('memory-metric').textContent=`记忆：${mem.length} 张卡片有复习记录；${dueCount} 张待复习。采用 FSRS-4.5 参考实现（默认参数，目标记忆保持率90%）。`;$('discern-metric').textContent=`辨识：完成 ${state.discern.length} 次双向复盘；三点辨识以自我复盘为主，不设置未经验证的标准答案。改变判断不自动代表进步。`;const log=$('log-list');log.replaceChildren();state.discern.slice(-8).reverse().forEach(x=>{const c=cards.find(c=>c.id===x.id);const p=document.createElement('p');p.textContent=`${new Date(x.at).toLocaleString('zh-CN')} · ${c?.title||'已移除案例'}：${x.before} → ${x.after}`;log.append(p)});if(!state.discern.length)log.textContent='还没有训练记录。'}
function filters(){const categories=[...new Set(all().map(c=>c.category))].sort(),tags=[...new Set(all().flatMap(c=>c.tags))].sort();for(const [id,values] of [['category',categories],['tag',tags]]){const sel=$(id),value=sel.value;sel.querySelectorAll('option:not(:first-child)').forEach(o=>o.remove());values.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;sel.append(o)});sel.value=values.includes(value)?value:''}}
function renderCases(){filters();const q=$('search').value.trim().toLowerCase(),cat=$('category').value,tag=$('tag').value,type=$('type').value;const found=all().filter(c=>(!cat||c.category===cat)&&(!tag||c.tags.includes(tag))&&(!type||c.type===type)&&(!q||[c.title,c.prompt,c.category,...c.tags].join(' ').toLowerCase().includes(q)));$('case-count').textContent=`找到 ${found.length} 个案例（原始 ${seed.length} 张）`;$('case-list').replaceChildren();found.forEach(c=>{const b=btn('',()=>choose(c),'case'),title=document.createElement('b'),sub=document.createElement('small');title.textContent=c.title+' · '+c.prompt;sub.textContent=c.category+' · '+labelType[c.type]+' · '+c.tags.join(' / ');b.append(title,sub);$('case-list').append(b)})}
for(const id of ['search','category','tag','type'])$(id).addEventListener(id==='search'?'input':'change',renderCases);
$('add-custom').onclick=()=>{const title=$('custom-title').value.trim(),prompt=$('custom-prompt').value.trim();if(!title||!prompt){$('custom-status').textContent='请至少填写标题和事实经过。';return}const id='user-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);state.custom.push({id,category:'我的案例',title,prompt,check:$('custom-check').value.trim()||'核实具体事实与证据',risk:'这段经历可能有多种解释，尚不能直接认定为操纵。',counter:$('custom-counter').value.trim()||'还需要了解更多背景和当事人的其他解释。',wake:$('custom-wake').value.trim()||'保留自主判断，核实证据后决定。',tags:['我的案例'],type:'scenario',source:'用户本地创建',revision:1});save();for(const id of ['custom-title','custom-prompt','custom-check','custom-counter','custom-wake'])$(id).value='';$('custom-status').textContent='已保存，仅本地可见。';renderCustom();stats()};
function renderCustom(){const list=$('custom-list');list.replaceChildren();if(!state.custom.length)list.textContent='暂无自建案例。';state.custom.forEach(c=>{const d=document.createElement('div');d.className='mini';const h=document.createElement('b');h.textContent=c.title+' · 修订版 '+c.revision;const p=document.createElement('p');p.textContent=c.prompt;d.append(h,p,btn('开始练习',()=>choose(c),'secondary'),btn('编辑',()=>editCustom(c),'secondary'),btn('导出共享草稿',()=>download('case-'+c.id+'.json',JSON.stringify({format:'qingxing-case-draft',version:1,case:c},null,2),'application/json'),'secondary'),btn('删除',()=>{if(confirm('删除此案例？相关历史记录仍保留。')){state.custom=state.custom.filter(x=>x.id!==c.id);save();renderCustom();stats()}},'secondary'));list.append(d)})}
function editCustom(c){const newTitle=prompt('修改案例标题',c.title);if(newTitle===null)return;const newPrompt=prompt('修改事实经过',c.prompt);if(newPrompt===null)return;if(!newTitle.trim()||!newPrompt.trim())return alert('标题和事实经过不能为空');c.title=newTitle.trim().slice(0,80);c.prompt=newPrompt.trim().slice(0,1000);c.revision=(c.revision||1)+1;save();renderCustom()}
function download(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$('export').onclick=()=>download('qingxing-v12-backup.json',JSON.stringify({app:'qingxing-yidian',schema:2,exportedAt:new Date().toISOString(),state},null,2),'application/json');
$('import').onclick=()=>$('import-file').click();$('import-file').onchange=async e=>{try{const file=e.target.files?.[0];if(!file)return;if(file.size>5_000_000)throw Error('文件超过5MB');const data=JSON.parse(await file.text());if(data.app!=='qingxing-yidian'||data.schema!==2||!valid(data.state))throw Error('备份版本或结构不匹配');if(!confirm('导入会覆盖本机数据，建议先导出备份。确定继续？'))return;state=data.state;save();filters();renderCustom();renderCases();stats();alert('导入完成')}catch(err){alert('导入失败：'+err.message)}finally{e.target.value=''}};
$('anki').onclick=()=>{const esc=x=>'"'+String(x).replaceAll('"','""').replaceAll('\n','<br>')+'"';download('qingxing-anki.csv','Front,Back,Tags\n'+all().map(c=>[c.prompt,`检测：${c.check}<br>可能影响：${c.risk}<br>另一面：${counter(c)}<br>应对：${c.wake}`,c.tags.join(' ')].map(esc).join(',')).join('\n'),'text/csv;charset=utf-8')};
// V1.1 progress is deliberately not converted into FSRS history: intervals/ease are incompatible.
try{if(!localStorage.getItem(KEY)&&localStorage.getItem(legacy))console.info('V1.1 review data detected; export it from V1.1 separately. No automatic FSRS conversion.')}catch{}
filters();stats();next();nav('home');
// G2原表摘录单独加载：保留原有30张通用卡与用户本地学习记录。
fetch('./data/g2-reviewed-batch-01.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(data=>{if(!Array.isArray(data.cases))throw Error('G2 schema mismatch');const known=new Set(seed.map(c=>c.id));seed=seed.concat(data.cases.filter(c=>c&&typeof c.id==='string'&&!known.has(c.id)));filters();stats();renderCases();}).catch(e=>console.warn('G2案例库加载失败，仍可使用原30张卡片',e));fetch('./data/social-religion-batch-01.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(data=>{if(!Array.isArray(data.cases))throw Error('schema');const known=new Set(seed.map(c=>c.id));seed=seed.concat(data.cases.filter(c=>c&&c.id&&!known.has(c.id)));filters();stats();renderCases();}).catch(e=>console.warn('社会宗教案例库加载失败',e));
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();