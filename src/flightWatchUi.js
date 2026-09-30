import { parseWatchQuery } from './domain/parseWatch.js';
import { loadWatches } from './domain/watchStore.js';
import { flightIntentChips, flightIntentGroupsHtml } from './domain/flightDisplay.js';

const esc=(value)=>String(value??'').replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function enhanceConfirmation(){
  const card=document.querySelector('.condition-card');
  if(!card||document.querySelector('[data-flight-v4-summary]'))return;
  const raw=card.querySelector('p')?.textContent?.trim();
  if(!raw)return;
  const watch=parseWatchQuery(raw);
  if(watch?.domain!=='flight'||watch?.schemaVersion!==4)return;
  const html=flightIntentGroupsHtml(watch);
  if(!html)return;
  card.insertAdjacentHTML('afterend',html);
  const legacyGroups=card.parentElement?.querySelector('.flight-intent-summary + .role-groups');
  if(legacyGroups)legacyGroups.setAttribute('data-flight-v4-legacy-groups','true');
}

function enhanceWatchCards(){
  const watches=loadWatches(localStorage);
  const cards=[...document.querySelectorAll('.watch-card')];
  cards.forEach((card,index)=>{
    const watch=watches[index];
    if(!watch||watch.domain!=='flight'||watch.schemaVersion!==4)return;
    const chips=flightIntentChips(watch);
    const target=card.querySelector('.chips');
    if(target&&chips.length)target.innerHTML=chips.slice(0,5).map((item)=>`<span>${esc(item)}</span>`).join('');
  });
}

function scan(){enhanceConfirmation();enhanceWatchCards()}
new MutationObserver(scan).observe(document.querySelector('#app'),{childList:true,subtree:true});
scan();
