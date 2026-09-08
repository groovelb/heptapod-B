
const lightbox=document.getElementById('lightbox');let opener=null;
document.querySelectorAll('.image-open').forEach(button=>button.addEventListener('click',()=>{opener=button;const img=button.querySelector('img');document.getElementById('lightbox-image').src=img.src;document.getElementById('lightbox-image').alt=img.alt;document.getElementById('lightbox-caption').textContent=img.alt;lightbox.showModal()}));
document.querySelector('.dialog-close').addEventListener('click',()=>lightbox.close());
lightbox.addEventListener('click',event=>{if(event.target===lightbox)lightbox.close()});
lightbox.addEventListener('close',()=>opener?.focus());
document.querySelectorAll('.copy').forEach(button=>button.addEventListener('click',async()=>{const text=button.closest('.prompt-box').querySelector('pre').textContent;try{await navigator.clipboard.writeText(text);button.textContent='복사됨'}catch{const range=document.createRange();range.selectNodeContents(button.closest('.prompt-box').querySelector('pre'));const selection=getSelection();selection.removeAllRanges();selection.addRange(range);button.textContent='선택됨 · ⌘/Ctrl+C'}setTimeout(()=>button.textContent='복사',3000)}));
document.getElementById('print').addEventListener('click',()=>window.print());
const player=document.getElementById('final-video');let stopAt=null;
document.querySelectorAll('.play-scene').forEach(button=>button.addEventListener('click',()=>{player.closest('details').open=true;const start=Number(button.dataset.start);stopAt=Number(button.dataset.end);player.scrollIntoView({behavior:'smooth',block:'center'});const begin=()=>{player.currentTime=start;player.play().catch(()=>{document.getElementById('status').textContent='영상 컨트롤의 재생 버튼을 눌러주세요.'})};if(player.readyState>=1){begin()}else{player.addEventListener('loadedmetadata',begin,{once:true});player.load()}}));
player.addEventListener('timeupdate',()=>{if(stopAt!==null&&player.currentTime>=stopAt){player.pause();stopAt=null}});
player.addEventListener('error',()=>{document.getElementById('status').textContent='영상 파일을 찾을 수 없습니다. HTML을 원래 프로젝트 폴더에서 열어주세요.'});
document.getElementById('archive-search').addEventListener('input',event=>{const q=event.target.value.toLowerCase().trim();document.querySelectorAll('.archive-item').forEach(item=>item.hidden=q&&!item.dataset.search.toLowerCase().includes(q));document.querySelectorAll('#archive>details').forEach(group=>{const items=[...group.querySelectorAll('.archive-item')];group.hidden=!!q&&items.length>0&&items.every(item=>item.hidden);if(q&&!group.hidden)group.open=true})});
