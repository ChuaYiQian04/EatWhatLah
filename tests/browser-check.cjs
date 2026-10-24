// Optional local Chrome verification. No browser packages or application server needed.
const {spawn}=require('child_process');
const fs=require('fs'),path=require('path'),assert=require('assert');
const {pathToFileURL}=require('url');
const root=path.resolve(__dirname,'..');
const chrome=process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const child=spawn(chrome,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+path.join(__dirname,'.browser-check-profile'),'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
let socket,seq=0;
const pending=new Map(),errors=[];
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function run(){
  const endpoint=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Chrome startup timeout')),15000);child.on('error',reject);child.stderr.on('data',chunk=>{const match=String(chunk).match(/DevTools listening on (ws:\/\/[^\s]+)/);if(match){clearTimeout(timer);resolve(match[1]);}});});
  const origin=endpoint.replace('ws:','http:').split('/devtools/')[0];
  const targets=await (await fetch(origin+'/json/list')).json();
  socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  socket.onmessage=event=>{const msg=JSON.parse(event.data);if(msg.id){const item=pending.get(msg.id);if(item){pending.delete(msg.id);if(msg.error)item.reject(new Error(msg.error.message));else item.resolve(msg.result);}}if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.text);};
  await send('Runtime.enable');await send('Page.enable');
  for(const [name,width,height] of [['desktop',1440,1100],['mobile',390,844],['small-mobile',320,800]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:name==='mobile'});
    await send('Page.navigate',{url:pathToFileURL(path.join(root,'index.html')).href});await delay(700);
    const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert(!result.exceptionDetails,JSON.stringify(result.exceptionDetails));return result.result.value;};
    assert.equal(await evaluate('document.body.dataset.theme'),'kopitiam');
    const size=await evaluate('({page:document.documentElement.scrollWidth,viewport:innerWidth})');assert(size.page<=size.viewport,`${name} horizontal overflow: ${JSON.stringify(size)}`);
    assert.equal(await evaluate('document.querySelectorAll(".food-row").length'),35);
    if(name!=='small-mobile'){const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(__dirname,name+'.png'),Buffer.from(screenshot.data,'base64'));}
    let baseline;
    for(const theme of ['cute','midnight','minimal','kopitiam']){
      await evaluate(`document.getElementById('theme').value='${theme}';document.getElementById('theme').dispatchEvent(new Event('change'));`);assert.equal(await evaluate('document.body.dataset.theme'),theme);
      const geometry=await evaluate(`['.hero','.card','.search','.primary','.categories button'].map(selector=>{const style=getComputedStyle(document.querySelector(selector));return [style.borderRadius,style.padding,style.fontFamily];})`);if(!baseline)baseline=geometry;else assert.deepEqual(geometry,baseline,'Theme component geometry differs');
      const searchAlignment=await evaluate(`(()=>{const a=document.querySelector('.search').getBoundingClientRect(),b=document.querySelector('.search .ui-icon').getBoundingClientRect();return Math.abs((a.top+a.bottom-b.top-b.bottom)/2)})()`);assert(searchAlignment<1,'Search icon not centered');
      assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
      if(name==='desktop'){
        const page=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(path.join(__dirname,theme+'-theme.png'),Buffer.from(page.data,'base64'));
      }
    }
    await evaluate("document.getElementById('clear-all').click()");assert.equal(await evaluate("document.getElementById('spin').disabled"),true);
    await evaluate("document.getElementById('select-all').click()");assert.equal(await evaluate("document.querySelectorAll('.food-row input:checked').length"),35);
    await evaluate("document.getElementById('reset-defaults').click();document.getElementById('confirm-ok').click()");
    await evaluate(`document.getElementById('custom-name').value='Browser test meal';document.querySelector('#custom-icon-picker input[value="🍕"]').click();document.getElementById('custom-form').requestSubmit();`);
    assert.equal(await evaluate(`document.querySelector('.food-row:last-child .food-icon').textContent`),'🍕');
    await send('Page.reload');await delay(400);
    assert.equal(await evaluate(`document.querySelector('.food-row:last-child .food-icon').textContent`),'🍕');
    await evaluate(`document.querySelector('.food-row:last-child .icon-button').click();document.querySelector('#edit-icon-picker input[value="☕"]').click();document.getElementById('edit-form').requestSubmit();`);
    assert.equal(await evaluate(`document.querySelector('.food-row:last-child .food-icon').textContent`),'☕');
    await evaluate(`document.querySelector('.food-row:last-child .icon-button:last-child').click();document.getElementById('confirm-ok').click();`);
    for(const code of [1,2,3]){
      await evaluate(`Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,error){error({code:${code}})}}});document.getElementById('locate').click();`);await delay(20);
      assert.equal(await evaluate(`document.getElementById('locate').disabled`),false);
      assert.equal(await evaluate(`document.getElementById('manual-details').open`),true);
      assert.match(await evaluate(`document.getElementById('nearby-status').textContent`),new RegExp(code===1?'blocked':code===2?'device could not':'timed out'));
    }
    await evaluate(`window.__realSearch=Nearby.search;Nearby.search=async(lat,lon)=>{window.__searched=[lat,lon];return [{id:'test-place',name:'Test fixture café',lat,lon,category:'Café',distance:20,nearby:true}]};Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success){success({coords:{latitude:3.139,longitude:101.6869}})}}});document.getElementById('locate').click();`);await delay(30);
    assert.deepEqual(await evaluate('window.__searched'),[3.139,101.6869]);assert.equal(await evaluate(`document.querySelectorAll('.place').length`),1);
    assert.equal(await evaluate(`document.getElementById('locate').disabled`),false);
    await evaluate(`Nearby.search=async()=>{throw new Error('Test fixture: public search unavailable')};document.getElementById('coordinates').requestSubmit()`);await delay(20);
    assert.equal(await evaluate(`document.getElementById('try-alternate').hidden`),false);
    await evaluate(`Nearby.search=async(lat,lon,radius,service)=>{window.__service=service;return []};document.getElementById('try-alternate').click()`);await delay(20);assert.equal(await evaluate('window.__service'),'alternate');
    await evaluate(`Nearby.search=window.__realSearch;document.getElementById('reset-all').click();document.getElementById('confirm-ok').click()`);
    if(process.argv.includes('--live') && name==='desktop'){
      const service=process.argv.includes('--alternate')?'alternate':'primary';
      const live=await evaluate(`Nearby.search(3.139,101.6869,1000,'${service}').then(places=>({ok:true,count:places.length}),error=>({ok:false,error:error.message}))`);console.log('Live Overpass from file:// ('+service+'):',JSON.stringify(live));
    }
  }
  assert.equal(errors.length,0,errors.join('\n'));console.log('PASS: file://, desktop/mobile layouts, consistent theme geometry, centered search icons, custom icon add/edit/reload, checklist controls, mocked location success/denial/unavailable/timeout and fallback, no uncaught JavaScript exceptions.');
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(socket){try{await send('Browser.close');}catch{}socket.close();}child.kill();});
