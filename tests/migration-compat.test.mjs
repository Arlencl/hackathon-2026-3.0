import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import baseline from './fixtures/scenic-migration-baseline.json' with {type:'json'};
import {createScenicState,createWorkspace,newSpot,upgradeWorkspace,completeDemo,worldVariants,worldAsset} from '../src/scenic-core.js';

const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
function matches(name,value){
 const actual=createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
 assert.equal(actual,baseline.expectations[name],name+' preserves pre-migration behavior');
}

test('package migration preserves all seven saved schemas, including custom scenic IDs',()=>{
 matches('initial-workspace',createWorkspace());
 for(const schema of [1,2,3,4,5,6,7])for(const custom of [false,true]){
  const state=createScenicState();state.schema=schema;
  for(const key of ['draft','published']){
   delete state[key].spots[0].guide;delete state[key].spots[0].notice;
   if(custom){state.id='custom-scenic';state[key].title='用户景区';state[key].map.custom=true;state[key].spots[0].photos.front.url='idb:uploaded';}
  }
  matches(`schema-${schema}-${custom?'custom':'builtin'}`,upgradeWorkspace(state));
 }
});

test('early demo drafts and custom-ID maps are not silently replaced by the package migration',()=>{
 for(const schema of [1,2]){
  const state=createScenicState();state.schema=schema;
  for(const key of ['draft','published'])state[key].spots=[newSpot('pavilion')];
  matches(`schema-${schema}-early-demo`,upgradeWorkspace(state));
 }
 const state=createScenicState();state.id='custom-scenic';state.draft.map.url=state.published.map.url='/assets/scenic/garden-map.png';
 matches('legacy-map-custom-id',upgradeWorkspace(state));
 const ws=createWorkspace();ws.scenics[0].draft.title='用户编辑';ws.scenics[1].published.spots[0].description='已审定';
 matches('workspace-edited',upgradeWorkspace(ws));
});

test('sample completion and world binding retain their different pre-migration eligibility rules',()=>{
 for(const kind of ['real','upload',undefined]){
  const spot=createScenicState().draft.spots[0];spot.photos.front.kind=kind;completeDemo(spot);
  matches('completion-'+kind,spot);
  assert.equal(Boolean(worldAsset(spot)),kind==='real');
 }
 matches('world-variants',worldVariants(createScenicState().published.spots[0]));
});
