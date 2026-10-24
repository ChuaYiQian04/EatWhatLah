// Optional developer checks; the application needs no runtime dependencies.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.join(__dirname,'..'),memory=new Map();
const c={console,Math:Object.create(Math),Date,Set,Map,JSON,Number,String,Array,URLSearchParams,AbortController,setTimeout,clearTimeout};c.window=c;c.matchMedia=()=>({matches:false});let clock=0;c.requestAnimationFrame=fn=>{clock+=100;setImmediate(()=>fn(clock));};c.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};vm.createContext(c);
for(const file of ['food-data','storage','wheel','nearby'])vm.runInContext(fs.readFileSync(root+'/js/'+file+'.js','utf8'),c);
const ctx=new Proxy({},{get:()=>()=>{},set:()=>true});
async function run(){
assert(c.FoodData.defaults.length>=30);assert.equal(new Set(c.FoodData.defaults.map(f=>f.name.toLowerCase())).size,c.FoodData.defaults.length);
memory.set('eatwhatlah-v1','broken');assert.equal(c.Store.read().selected.length,8);
const state=c.Store.fresh();state.selected=[];state.theme='midnight';state.custom=[{id:'custom-test',name:'My lunch'},{id:'custom-duplicate',name:'nasi lemak'}];state.history=[{id:'a',name:'Lunch',time:Date.now()}];c.Store.save(state);assert.equal(c.Store.read().selected.length,0);assert.equal(c.Store.read().theme,'midnight');assert.equal(c.Store.read().custom.length,1);assert.equal(c.Store.read().history.length,1);
const wheel=new c.MakanWheel({getContext:()=>ctx});assert.equal(await wheel.spin(),null);
for(const count of [1,2,8,35,150]){wheel.setItems(Array.from({length:count},(_,i)=>({id:String(i),name:'Food '+i})));for(const fraction of [0,.2,.5,.999999]){c.Math.random=()=>fraction;const winner=await wheel.spin();const aligned=Math.floor(((2*Math.PI-wheel.rotation)%(2*Math.PI))/(2*Math.PI/count));assert.equal(winner.id,String(aligned),'pointer alignment '+count);}}
wheel.setItems([{id:'a',name:'A'},{id:'b',name:'B'}]);c.Math.random=()=>0;assert.equal((await wheel.spin('a',true)).id,'b');
assert(Math.abs(c.Nearby.distance(0,0,0,1)-111195)<10);assert.equal(c.Nearby.distance(3,100,3,100),0);
let requests=0;c.fetch=async()=>{requests++;return {ok:true,json:async()=>({elements:[{type:'node',id:1,lat:3,lon:101,tags:{name:'Cafe',amenity:'cafe'}},{type:'way',id:2,center:{lat:3,lon:101},tags:{name:'Cafe',amenity:'cafe'}},{type:'way',id:3,center:{lat:3.001,lon:101},tags:{amenity:'restaurant'}},{type:'way',id:4,tags:{name:'No coordinates'}}]})};};
const places=await c.Nearby.search(3,101,1000);assert.equal(places.length,2);assert.equal(places[0].name,'Cafe');assert.equal(places[1].name,'Unnamed restaurant');await c.Nearby.search(3,101,1000);assert.equal(requests,1);await assert.rejects(()=>c.Nearby.search(91,101,1000));
const html=fs.readFileSync(root+'/index.html','utf8');for(const ref of html.matchAll(/(?:src|href)="((?:js|css)\/[^"#]+)"/g))assert(fs.existsSync(root+'/'+ref[1]));
const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);const app=fs.readFileSync(root+'/js/app.js','utf8');for(const m of app.matchAll(/\$\('([^']+)'\)/g))assert(ids.includes(m[1]),'Missing ID '+m[1]);for(const file of fs.readdirSync(root+'/js'))new vm.Script(fs.readFileSync(root+'/js/'+file,'utf8'));assert(!/innerHTML|\balert\(/.test(app));
console.log('PASS: syntax, assets, DOM references, catalogue, persistence/recovery, wheel alignment (1–150 options), avoid-last, distance, Overpass parsing/deduplication/cache/validation.');
}run().catch(e=>{console.error(e);process.exitCode=1;});
