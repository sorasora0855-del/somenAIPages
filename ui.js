(() => {
  const $ = id => document.getElementById(id);
  const uiApi = async (path, options = {}) => {
    const API_BASE = 'https://123456654329.asro.jp';
    const res = await fetch(`${API_BASE}${path}`, { credentials: 'include', ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  };
  function modal(title, subtitle = '') {
    document.querySelector('.ui-modal-backdrop')?.remove();
    const back = document.createElement('div'); back.className = 'ui-modal-backdrop';
    back.innerHTML = `<section class="ui-modal" role="dialog" aria-modal="true"><button class="ui-modal-close" aria-label="閉じる">×</button><div class="ui-modal-title">${title}</div>${subtitle ? `<div class="ui-modal-subtitle">${subtitle}</div>` : ''}<div class="ui-modal-body"></div></section>`;
    document.body.appendChild(back); const close=()=>back.remove();
    back.querySelector('.ui-modal-close').onclick=close; back.addEventListener('click',e=>{if(e.target===back)close()});
    document.addEventListener('keydown',function esc(e){if(e.key==='Escape'){close();document.removeEventListener('keydown',esc)}});
    return {back,body:back.querySelector('.ui-modal-body'),close};
  }
  const addButton=(parent,text,cls='')=>{const b=document.createElement('button');b.type='button';b.className=`ui-btn ${cls}`;b.textContent=text;parent.appendChild(b);return b};
  const toast=(text,error=false)=>{document.querySelector('.ui-toast')?.remove();const t=document.createElement('div');t.className=`ui-toast${error?' error':''}`;t.textContent=text;document.body.appendChild(t);setTimeout(()=>t.remove(),2200)};

  function installSettings(){
    const settings=document.querySelector('.settings');if(!settings||$('openSettings'))return;
    const b=document.createElement('button');b.id='openSettings';b.type='button';b.className='secondary settings-open';b.innerHTML='⚙️ <span>設定</span>';settings.insertBefore(b,settings.firstChild);
    b.onclick=()=>{const m=modal('設定','somenAIの動作をここからまとめて変更できます');const section=document.createElement('div');section.className='settings-panel';m.body.appendChild(section);
      const group=document.createElement('div');group.className='settings-group';group.innerHTML='<div class="settings-group-title">AIモデル</div><div class="settings-row"><div><b>使用するAI</b><small>自動ではGeminiを優先し、利用できない場合にGroqへ切り替えます。</small></div></div>';section.appendChild(group);
      const select=document.createElement('select');select.className='ui-select';select.innerHTML='<option value="auto">自動</option><option value="gemini">Gemini</option><option value="groq">Groq / Qwen</option>';select.value=$('provider')?.value||'auto';group.querySelector('.settings-row').appendChild(select);
      select.onchange=async()=>{try{await uiApi('/api/settings/ai',{method:'PATCH',body:JSON.stringify({provider:select.value})});if($('provider'))$('provider').value=select.value;toast('AI設定を保存しました')}catch(e){toast(e.message,true)}};
      const toggles=document.createElement('div');toggles.className='settings-group';toggles.innerHTML='<div class="settings-group-title">便利機能</div>';
      [['webSearch','Web検索','回答に最新のWeb情報を取り込む'],['useReferences','参考資料RAG','登録した資料を回答の参考にする']].forEach(([id,label,desc])=>{const row=document.createElement('label');row.className='settings-toggle';row.innerHTML=`<span><b>${label}</b><small>${desc}</small></span><input type="checkbox" ${$(id)?.checked?'checked':''}>`;row.querySelector('input').onchange=e=>{if($(id))$(id).checked=e.target.checked};toggles.appendChild(row)});section.appendChild(toggles);
      const actions=document.createElement('div');actions.className='ui-modal-actions';const done=addButton(actions,'閉じる','primary');done.onclick=m.close;section.appendChild(actions);
    };
  }

  async function renameChat(id,current){const m=modal('チャット名を変更','分かりやすい名前に変更できます');const input=document.createElement('input');input.className='ui-input';input.value=current;input.maxLength=80;input.placeholder='チャット名';m.body.appendChild(input);const actions=document.createElement('div');actions.className='ui-modal-actions';const cancel=addButton(actions,'キャンセル');const save=addButton(actions,'保存','primary');m.body.appendChild(actions);cancel.onclick=m.close;save.onclick=async()=>{const title=input.value.trim();if(!title)return toast('チャット名を入力してね',true);save.disabled=true;try{await uiApi(`/api/chats/${id}`,{method:'PATCH',body:JSON.stringify({title})});m.close();await window.__refreshChats?.();toast('チャット名を変更しました')}catch(e){toast(e.message,true);save.disabled=false}};input.focus();input.select()}
  async function deleteChat(id,title){const m=modal('チャットを削除','この操作は元に戻せません。');const p=document.createElement('p');p.className='ui-confirm';p.textContent=`「${title}」を削除しますか？`;m.body.appendChild(p);const actions=document.createElement('div');actions.className='ui-modal-actions';const cancel=addButton(actions,'キャンセル');const del=addButton(actions,'削除','danger');m.body.appendChild(actions);cancel.onclick=m.close;del.onclick=async()=>{del.disabled=true;try{await uiApi(`/api/chats/${id}`,{method:'DELETE'});m.close();await window.__deleteChatLocal?.(id);toast('チャットを削除しました')}catch(e){toast(e.message,true);del.disabled=false}}}

  async function enhanceChatRows(){
    const list=$('chatList');if(!list)return;
    let chats=[];try{chats=(await uiApi('/api/chats')).chats||[]}catch{return}
    [...list.querySelectorAll('.chat-row')].forEach((row,index)=>{
      if(row.querySelector('.chat-actions'))return; const item=chats[index];if(!item)return; row.classList.add('chat-row-enhanced');
      const actions=document.createElement('div');actions.className='chat-actions';const more=document.createElement('button');more.type='button';more.className='chat-more';more.textContent='•••';more.setAttribute('aria-label','チャット操作');actions.appendChild(more);row.appendChild(actions);
      more.onclick=e=>{e.stopPropagation();const menu=document.createElement('div');menu.className='chat-popover';menu.innerHTML='<button data-action="rename">✏️ 名前を変更</button><button data-action="delete" class="delete-item">🗑️ チャットを削除</button>';document.body.appendChild(menu);const r=more.getBoundingClientRect();menu.style.left=`${Math.min(window.innerWidth-190,Math.max(8,r.right-190))}px`;menu.style.top=`${Math.min(window.innerHeight-100,r.bottom+6)}px`;const close=()=>{menu.remove();document.removeEventListener('click',outside)};const outside=ev=>{if(!menu.contains(ev.target))close()};document.addEventListener('click',outside);menu.onclick=ev=>{const a=ev.target.closest('button')?.dataset.action;if(!a)return;close();if(a==='rename')renameChat(item.id,item.title);else deleteChat(item.id,item.title)}};
    });
  }

  function enhanceImagePreview(){const inputEl=$('imageInput'),preview=$('attachmentPreview');if(!inputEl||!preview)return;inputEl.addEventListener('change',()=>setTimeout(()=>{const file=inputEl.files?.[0];if(!file)return;preview.classList.remove('hidden');preview.innerHTML='';const wrap=document.createElement('div');wrap.className='attachment-card';const img=document.createElement('img');img.src=URL.createObjectURL(file);img.alt='添付画像';const info=document.createElement('div');info.className='attachment-info';info.innerHTML=`<b>${file.name}</b><small>画像を添付中 · ${(file.size/1024/1024).toFixed(1)} MB</small>`;const remove=document.createElement('button');remove.type='button';remove.className='attachment-remove';remove.textContent='×';remove.title='画像を削除';remove.onclick=()=>{pendingImage=null;preview.classList.add('hidden');preview.innerHTML='';inputEl.value=''};wrap.append(img,info,remove);preview.appendChild(wrap)},100))}

  function enhanceReference(){const old=$('addReference');if(!old)return;const clone=old.cloneNode(true);old.replaceWith(clone);clone.onclick=()=>{const m=modal('参考資料を追加','AIが回答するときに参照できる資料を登録します');const title=document.createElement('input');title.className='ui-input';title.placeholder='タイトル（例：学校の防災資料）';const content=document.createElement('textarea');content.className='ui-textarea';content.placeholder='参考資料の本文を貼り付けてください';content.rows=9;m.body.append(title,content);const actions=document.createElement('div');actions.className='ui-modal-actions';const cancel=addButton(actions,'キャンセル');const save=addButton(actions,'資料を追加','primary');m.body.appendChild(actions);cancel.onclick=m.close;save.onclick=async()=>{if(!title.value.trim()||!content.value.trim())return toast('タイトルと本文を入力してね',true);save.disabled=true;try{await uiApi('/api/references',{method:'POST',body:JSON.stringify({title:title.value.trim(),content:content.value.trim()})});if($('useReferences'))$('useReferences').checked=true;m.close();toast('参考資料を追加しました')}catch(e){toast(e.message,true);save.disabled=false}};title.focus()}}

  function install(){installSettings();enhanceReference();enhanceImagePreview();const list=$('chatList');if(list){let timer;const observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(enhanceChatRows,80)});observer.observe(list,{childList:true,subtree:true});enhanceChatRows()}window.__refreshChats=async()=>{if(typeof refreshChats==='function')await refreshChats();setTimeout(enhanceChatRows,100)};window.__deleteChatLocal=async id=>{if(typeof currentChatId!=='undefined'&&currentChatId===id){currentChatId=null;chat.innerHTML='<div class="welcome"><h1>こんにちは！</h1><p>somenAIに何でも聞いてみてね。</p></div>'}if(typeof refreshChats==='function')await refreshChats();if(!(await uiApi('/api/chats')).chats.length&&typeof createChat==='function')await createChat();setTimeout(enhanceChatRows,100)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,150));else setTimeout(install,150);
})();
