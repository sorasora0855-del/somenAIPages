const API_BASE='https://123456654329.asro.jp';

const $=id=>document.getElementById(id);
const auth=$('auth'),authForm=$('authForm'),authSubmit=$('authSubmit'),authToggle=$('authToggle'),authError=$('authError');
const username=$('username'),password=$('password'),chatList=$('chatList'),chat=$('chat'),composer=$('composer'),input=$('input');
const newChat=$('newChat'),logout=$('logout'),settingsButton=$('settingsButton'),status=$('status');
const attachButton=$('attachButton'),imageModeButton=$('imageModeButton'),imageInput=$('imageInput'),cameraInput=$('cameraInput');
const attachmentPreview=$('attachmentPreview'),send=$('send'),menuButton=$('menuButton'),sidebar=$('sidebar'),backdrop=$('mobileBackdrop');

let registerMode=false,currentChatId=null,requestController=null,pendingImages=[],imageMode=false;

async function api(path,options={}){
  const res=await fetch(API_BASE+path,{credentials:'include',...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error||`HTTP ${res.status}`);
  return data;
}
function toast(text,error=false){
  document.querySelector('.toast')?.remove();
  const el=document.createElement('div');el.className='toast';el.textContent=text;
  Object.assign(el.style,{position:'fixed',left:'50%',bottom:'25px',transform:'translateX(-50%)',zIndex:3000,padding:'10px 14px',borderRadius:'10px',background:error?'#b4232f':'#202123',color:'#fff',fontSize:'13px'});
  document.body.appendChild(el);setTimeout(()=>el.remove(),2200);
}
function showError(e){toast(e?.message||String(e),true)}
function closeSidebar(){sidebar.classList.remove('open');backdrop.classList.remove('open')}
menuButton.onclick=()=>{sidebar.classList.toggle('open');backdrop.classList.toggle('open')};backdrop.onclick=closeSidebar;

function emptyChat(){chat.innerHTML='<div class="welcome"><h1>こんにちは！</h1><p>somenAIに何でも聞いてみてね。</p></div>'}
function scrollBottom(){chat.scrollTop=chat.scrollHeight}
function addCopy(el,text){
  const actions=document.createElement('div');actions.className='message-actions';
  const b=document.createElement('button');b.className='message-action';b.type='button';b.textContent='コピー';
  b.onclick=async()=>{try{await navigator.clipboard.writeText(text||'');b.textContent='コピー済み';setTimeout(()=>b.textContent='コピー',1000)}catch{toast('コピーできませんでした',true)}};
  actions.appendChild(b);el.appendChild(actions);
}
function addTextMessage(role,text){
  document.querySelector('.welcome')?.remove();
  const el=document.createElement('div');el.className=`message ${role}`;el.dataset.raw=text||'';el.textContent=text||'';chat.appendChild(el);
  if(role==='assistant')addCopy(el,text);scrollBottom();return el;
}
function addUserImageMessage(text,files){
  document.querySelector('.welcome')?.remove();
  const el=document.createElement('div');el.className='message user user-image-message';
  if(text){const p=document.createElement('div');p.textContent=text;p.style.marginBottom='7px';el.appendChild(p)}
  const grid=document.createElement('div');grid.className='user-image-grid';
  files.forEach((file,i)=>{const img=document.createElement('img');img.src=URL.createObjectURL(file);img.alt=`添付画像 ${i+1}`;grid.appendChild(img)});
  el.appendChild(grid);chat.appendChild(el);scrollBottom();
}
function addGeneratedImage(url,prompt){
  document.querySelector('.welcome')?.remove();
  const el=document.createElement('div');el.className='message assistant image-message';
  const img=document.createElement('img');img.src=url;img.alt=prompt||'生成画像';el.appendChild(img);
  const actions=document.createElement('div');actions.className='image-actions';
  const again=document.createElement('button');again.className='message-action';again.type='button';again.textContent='もう一度生成';again.onclick=()=>generateImage(prompt);
  const copy=document.createElement('button');copy.className='message-action';copy.type='button';copy.textContent='プロンプトをコピー';copy.onclick=()=>navigator.clipboard?.writeText(prompt||'');actions.append(again,copy);el.appendChild(actions);chat.appendChild(el);scrollBottom();
}
function renderChats(list){
  chatList.innerHTML='';
  for(const item of list){
    const row=document.createElement('div');row.className=`chat-row${item.id===currentChatId?' active':''}`;
    const title=document.createElement('span');title.className='chat-title';title.textContent=item.title||'新しいチャット';
    const more=document.createElement('button');more.type='button';more.className='chat-more';more.textContent='•••';more.onclick=e=>{e.stopPropagation();chatMenu(more,item)};
    row.append(title,more);row.onclick=()=>openChat(item.id);chatList.appendChild(row);
  }
}
async function refreshChats(){renderChats((await api('/api/chats')).chats||[])}
async function loadChats(){
  const data=await api('/api/chats');const list=data.chats||[];renderChats(list);
  if(!list.length) return createChat();
  if(!currentChatId) return openChat(list[0].id);
}
async function createChat(){
  requestController?.abort();closeSidebar();
  const data=await api('/api/chats',{method:'POST',body:'{}'});currentChatId=data.chat.id;emptyChat();await refreshChats();input.focus();
}
async function openChat(id){
  requestController?.abort();closeSidebar();
  const data=await api(`/api/chats/${id}`);currentChatId=id;chat.innerHTML='';
  const messages=data.messages||[];if(!messages.length)emptyChat();else messages.forEach(m=>addTextMessage(m.role,m.content));
  await refreshChats();input.focus();
}
function chatMenu(anchor,item){
  document.querySelector('.chat-popover')?.remove();
  const p=document.createElement('div');p.className='chat-popover';Object.assign(p.style,{position:'fixed',zIndex:2000,minWidth:'180px',padding:'5px',background:'#fff',border:'1px solid #ddd',borderRadius:'11px',boxShadow:'0 12px 35px #0002'});
  const rename=document.createElement('button');rename.textContent='名前を変更';const del=document.createElement('button');del.textContent='削除';del.style.color='#b4232f';
  [rename,del].forEach(b=>{Object.assign(b.style,{display:'block',width:'100%',padding:'9px 10px',border:0,background:'#fff',textAlign:'left',borderRadius:'7px'});b.onmouseenter=()=>b.style.background='#f1f1f2';b.onmouseleave=()=>b.style.background='#fff'});
  p.append(rename,del);document.body.appendChild(p);const r=anchor.getBoundingClientRect();p.style.left=`${Math.max(8,Math.min(innerWidth-188,r.right-188))}px`;p.style.top=`${Math.min(innerHeight-90,r.bottom+5)}px`;
  rename.onclick=()=>{p.remove();renameChat(item)};del.onclick=()=>{p.remove();deleteChat(item)};
  setTimeout(()=>{const f=e=>{if(!p.contains(e.target)&&e.target!==anchor){p.remove();document.removeEventListener('click',f)}};document.addEventListener('click',f)},0);
}
function modal(title,subtitle){
  document.querySelector('.modal-backdrop')?.remove();const b=document.createElement('div');b.className='modal-backdrop';
  const m=document.createElement('section');m.className='modal';const x=document.createElement('button');x.className='modal-close';x.textContent='×';x.type='button';
  const h=document.createElement('h2');h.textContent=title;const s=document.createElement('div');s.className='modal-subtitle';s.textContent=subtitle||'';const body=document.createElement('div');
  m.append(x,h,s,body);b.appendChild(m);document.body.appendChild(b);const close=()=>b.remove();x.onclick=close;b.onclick=e=>{if(e.target===b)close()};return{body,close};
}
async function renameChat(item){
  const m=modal('チャット名を変更','');const i=document.createElement('input');i.value=item.title||'';i.maxLength=80;i.placeholder='チャット名';
  const a=document.createElement('div');a.className='modal-actions';const c=document.createElement('button');c.textContent='キャンセル';const s=document.createElement('button');s.className='primary';s.textContent='保存';a.append(c,s);m.body.append(i,a);c.onclick=m.close;
  s.onclick=async()=>{const title=i.value.trim();if(!title)return toast('チャット名を入力してね',true);s.disabled=true;try{await api(`/api/chats/${item.id}`,{method:'PATCH',body:JSON.stringify({title})});m.close();await refreshChats()}catch(e){s.disabled=false;showError(e)}};i.focus();i.select();
}
async function deleteChat(item){
  const m=modal('チャットを削除','この操作は元に戻せません。');const p=document.createElement('p');p.textContent=`「${item.title||'新しいチャット'}」を削除しますか？`;
  const a=document.createElement('div');a.className='modal-actions';const c=document.createElement('button');c.textContent='キャンセル';const d=document.createElement('button');d.className='primary';d.textContent='削除';d.style.background='#b4232f';d.style.borderColor='#b4232f';a.append(c,d);m.body.append(p,a);c.onclick=m.close;
  d.onclick=async()=>{d.disabled=true;try{await api(`/api/chats/${item.id}`,{method:'DELETE'});m.close();currentChatId=null;await loadChats()}catch(e){d.disabled=false;showError(e)}};
}

function setAuthMode(register){registerMode=register;authSubmit.textContent=register?'アカウントを作成':'ログイン';authToggle.textContent=register?'ログインはこちら':'新規登録はこちら';password.autocomplete=register?'new-password':'current-password';authError.textContent=''}
function loggedIn(user){auth.classList.add('hidden');chat.classList.remove('hidden');composer.classList.remove('hidden');loadChats().catch(showError)}
authToggle.onclick=()=>setAuthMode(!registerMode);
authForm.onsubmit=async e=>{e.preventDefault();authSubmit.disabled=true;authError.textContent='';try{const path=registerMode?'/api/auth/register':'/api/auth/login';const data=await api(path,{method:'POST',body:JSON.stringify({username:username.value.trim(),password:password.value})});loggedIn(data.user)}catch(e){authError.textContent=e.message}finally{authSubmit.disabled=false}};
logout.onclick=async()=>{await api('/api/auth/logout',{method:'POST',body:'{}'}).catch(()=>{});location.reload()};
newChat.onclick=()=>createChat().catch(showError);

function settings(){
  const m=modal('設定','somenAIの動作設定');
  const modelLabel=document.createElement('label');modelLabel.textContent='AIモデル';const select=document.createElement('select');[['auto','自動'],['gemini','Gemini'],['groq','Groq / Qwen']].forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;select.appendChild(o)});
  const webLabel=document.createElement('label');webLabel.textContent='Web検索';const web=document.createElement('input');web.type='checkbox';web.id='settingsWeb';
  const ragLabel=document.createElement('label');ragLabel.textContent='参考資料RAG';const rag=document.createElement('input');rag.type='checkbox';rag.id='settingsRag';
  const refs=document.createElement('button');refs.className='primary';refs.textContent='＋ 参考資料を追加';refs.style.marginTop='12px';
  const a=document.createElement('div');a.className='modal-actions';const done=document.createElement('button');done.className='primary';done.textContent='閉じる';a.append(done);
  m.body.append(modelLabel,select,webLabel,web,ragLabel,rag,refs,a);done.onclick=m.close;refs.onclick=()=>{m.close();addReference()};
  api('/api/settings/ai').then(d=>{select.value=d.provider||'auto'}).catch(()=>{});
  select.onchange=()=>api('/api/settings/ai',{method:'PATCH',body:JSON.stringify({provider:select.value})}).catch(showError);
}
settingsButton.onclick=settings;
function addReference(){
  const m=modal('参考資料を追加','登録した資料をRAGで回答の参考にできます。');const title=document.createElement('input');title.placeholder='タイトル';const content=document.createElement('textarea');content.rows=9;content.placeholder='参考資料の本文';
  const a=document.createElement('div');a.className='modal-actions';const c=document.createElement('button');c.textContent='キャンセル';const s=document.createElement('button');s.className='primary';s.textContent='追加';a.append(c,s);m.body.append(title,content,a);c.onclick=m.close;
  s.onclick=async()=>{if(!title.value.trim()||!content.value.trim())return toast('タイトルと本文を入力してね',true);s.disabled=true;try{await api('/api/references',{method:'POST',body:JSON.stringify({title:title.value.trim(),content:content.value.trim()})});m.close();toast('参考資料を追加しました')}catch(e){s.disabled=false;showError(e)}};
  title.focus();
}

function renderAttachments(){
  attachmentPreview.innerHTML='';
  if(!pendingImages.length){attachmentPreview.classList.add('hidden');return}
  attachmentPreview.classList.remove('hidden');
  const head=document.createElement('div');head.className='attachment-head';head.innerHTML='<b>添付画像</b><span>'+pendingImages.length+' / 2</span>';attachmentPreview.appendChild(head);
  const grid=document.createElement('div');grid.className='attachment-grid';
  pendingImages.forEach((file,i)=>{const item=document.createElement('div');item.className='attachment-item';const img=document.createElement('img');img.src=URL.createObjectURL(file);const n=document.createElement('span');n.className='attachment-number';n.textContent=i+1;const x=document.createElement('button');x.className='attachment-remove';x.type='button';x.textContent='×';x.onclick=()=>{pendingImages.splice(i,1);renderAttachments()};item.append(img,n,x);grid.appendChild(item)});
  attachmentPreview.appendChild(grid);
}
function addFiles(files){
  const incoming=[...files].filter(f=>f.type.startsWith('image/'));if(!incoming.length)return;
  const room=2-pendingImages.length;pendingImages.push(...incoming.slice(0,room));renderAttachments();
  if(incoming.length>room)toast('画像は2枚までだよ',true);
}
attachButton.onclick=()=>{
  const picker=document.createElement('div');picker.className='modal-backdrop';const box=document.createElement('section');box.className='modal';
  const h=document.createElement('h2');h.textContent='画像を追加';const p=document.createElement('p');p.textContent='最大2枚まで添付できます。';const files=document.createElement('button');files.className='primary';files.textContent='端末から選ぶ';const camera=document.createElement('button');camera.textContent='カメラで撮る';camera.style.cssText='width:100%;margin-top:8px;padding:10px;border:1px solid #ddd;border-radius:9px;background:#fff';const cancel=document.createElement('button');cancel.textContent='キャンセル';cancel.style.cssText='width:100%;margin-top:8px;padding:10px;border:0;border-radius:9px;background:#eee';box.append(h,p,files,camera,cancel);picker.appendChild(box);document.body.appendChild(picker);const close=()=>picker.remove();cancel.onclick=close;files.onclick=()=>{close();imageInput.click()};camera.onclick=()=>{close();cameraInput.click()};
};
imageInput.onchange=e=>{addFiles(e.target.files);e.target.value=''};cameraInput.onchange=e=>{addFiles(e.target.files);e.target.value=''};

imageModeButton.onclick=()=>{imageMode=!imageMode;imageModeButton.classList.toggle('image-mode',imageMode);input.placeholder=imageMode?'生成したい画像を説明してね…':'メッセージを入力…';};
input.addEventListener('input',()=>{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,180)+'px'});
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();composer.requestSubmit()}});

function fileData(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}
async function prepareImages(files){return Promise.all(files.map(async file=>({mimeType:file.type||'image/jpeg',base64:await fileData(file)})))}

async function generateImage(prompt){
  if(!prompt?.trim())return toast('画像の説明を入力してね',true);
  status.textContent='画像を生成中…';send.disabled=true;
  try{
    const data=await api('/api/image/generate',{method:'POST',body:JSON.stringify({prompt:prompt.trim(),chatId:currentChatId})});
    if(data.url)addGeneratedImage(data.url,prompt);else if(data.image)addGeneratedImage(data.image,prompt);else throw new Error('画像生成結果がありません');
  }catch(e){showError(e)}finally{status.textContent='';send.disabled=false}
}

composer.onsubmit=async e=>{
  e.preventDefault();
  const text=input.value.trim();if(!text&&!pendingImages.length)return;
  if(imageMode&&!pendingImages.length){const prompt=text;input.value='';input.style.height='auto';return generateImage(prompt)}
  if(!currentChatId)return toast('チャットを準備中だよ',true);
  send.disabled=true;input.disabled=true;attachButton.disabled=true;imageModeButton.disabled=true;requestController=new AbortController();
  const files=pendingImages.slice();pendingImages=[];renderAttachments();input.value='';input.style.height='auto';
  if(files.length)addUserImageMessage(text,files);else addTextMessage('user',text);
  try{
    const images=files.length?await prepareImages(files):[];
    const payload={message:text,chatId:currentChatId,images,webSearch:false,useReferences:false};
    const data=await api(`/api/chats/${currentChatId}/messages`,{method:'POST',body:JSON.stringify(payload),signal:requestController.signal});
    if(data.message)addTextMessage(data.message.role||'assistant',data.message.content||'');else if(data.content)addTextMessage('assistant',data.content);else if(data.reply)addTextMessage('assistant',data.reply);else throw new Error('AIから回答が返ってきませんでした');
    await refreshChats();
  }catch(e){if(e.name!=='AbortError')showError(e)}finally{requestController=null;send.disabled=false;input.disabled=false;attachButton.disabled=false;imageModeButton.disabled=false;input.focus()}
};

emptyChat();
api('/api/auth/me').then(data=>{if(data.user)loggedIn(data.user)}).catch(()=>{});
