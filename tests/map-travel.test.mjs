import test from 'node:test';
import assert from 'node:assert/strict';
import {MAP_PACKAGES} from '../src/map3d/packages.js';
import {planTravel,requestTravel,beginManualWalk} from '../src/map3d/travel.js';

const lake=MAP_PACKAGES.westlake.geo;
const travelerAt=(geo,id)=>({x:geo.NODES[id][0],z:geo.NODES[id][1],route:[],mode:'walk',goal:null});
function advance(me,distance=.1){
 const p=me.route[0];if(!p)return;
 const dx=p.x-me.x,dz=p.z-me.z,d=Math.hypot(dx,dz);me.mode=p.mode;
 if(d<=distance){me.x=p.x;me.z=p.z;me.route.shift();}
 else{me.x+=dx/d*distance;me.z+=dz/d*distance;}
}
function finish(me){
 let steps=0;while(me.route.length&&steps++<10000)advance(me);
 assert.equal(me.route.length,0,'route must terminate');
}

test('repeated clicks during every lake crossing preserve its dock and reach the latest destination',()=>{
 for(const edge of lake.EDGES.filter(e=>e.mode==='boat'))for(const [from,to] of [[edge.a,edge.b],[edge.b,edge.a]]){
  const a=lake.NODES[from],b=lake.NODES[to];
  const me={x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,route:[{x:b[0],z:b[1],mode:'boat'}],mode:'boat',goal:null};
  assert.equal(lake.walkable(me.x,me.z),false,'reproduce the open-water start');
  const dock=structuredClone(me.route[0]);
  for(const target of Object.values(lake.SPOT_GEO)){
   assert.ok(requestTravel(lake,me,...lake.NODES[target.node],target.node));
   assert.deepEqual(me.route[0],dock);
   assert.equal(me.route.filter(p=>p.mode==='boat'&&p.x===dock.x&&p.z===dock.z).length,1,'clicks must not accumulate old routes');
   advance(me);
  }
  assert.ok(requestTravel(lake,me,...lake.NODES.hg,'huagang'));finish(me);
  assert.deepEqual([me.x,me.z],lake.NODES.hg);assert.ok(lake.walkable(me.x,me.z));
 }
});

test('leave Santan, retarget on the lake, dock, then keep walking and return to the island',()=>{
 const me=travelerAt(lake,'st');assert.ok(requestTravel(lake,me,...lake.NODES.hg,'huagang'));
 let steps=0;while(lake.walkable(me.x,me.z)&&steps++<200)advance(me);
 assert.equal(lake.walkable(me.x,me.z),false);
 assert.ok(requestTravel(lake,me,...lake.NODES.ph,'pinghu'));finish(me);
 assert.deepEqual([me.x,me.z],lake.NODES.ph);
 assert.ok(beginManualWalk(lake,me));assert.equal(me.mode,'walk');
 assert.ok(requestTravel(lake,me,...lake.NODES.st,'santan'));finish(me);
 assert.deepEqual([me.x,me.z],lake.NODES.st);
});

test('invalid or unreachable clicks never erase an active route or its destination',()=>{
 const me=travelerAt(lake,'st');assert.ok(requestTravel(lake,me,...lake.NODES.hg,'huagang'));
 const before=structuredClone(me);
 for(const target of [[Infinity,0],[NaN,0],[10000,10000]])assert.equal(requestTravel(lake,me,...target),false);
 const disconnected={...lake,canTravel:()=>false};
 assert.equal(requestTravel(disconnected,me,...lake.NODES.ph),false);
 assert.deepEqual(me,before);
});

test('keyboard interruption cannot strand a passenger; manual walking resumes at the dock',()=>{
 const edge=lake.EDGES.find(e=>e.mode==='boat'),a=lake.NODES[edge.a],b=lake.NODES[edge.b];
 const me={x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,route:[{x:b[0],z:b[1],mode:'boat'}],mode:'boat',goal:'santan'};
 const before=structuredClone(me);
 for(let i=0;i<20;i++)assert.equal(beginManualWalk(lake,me),false);
 assert.deepEqual(me,before);finish(me);assert.ok(beginManualWalk(lake,me));
 assert.equal(me.mode,'walk');assert.equal(me.goal,null);
});

test('land routes still obey palace walls and one-way entrances after extraction',()=>{
 const palace=MAP_PACKAGES['forbidden-city'],g=palace.geo;
 const me=travelerAt(g,palace.interaction.startNode);
 for(const id of palace.interaction.presentation.tour){
  const route=planTravel(g,me,...g.NODES[g.SPOT_GEO[id].node]);assert.ok(route.length);
  let from=me;for(const p of route){assert.equal(p.mode,'walk');assert.ok(g.canTravel(from.x,from.z,p.x,p.z));from=p;}
  me.route=route;finish(me);
 }
 assert.equal(g.canTravel(0,23.3,0,25.3),false);
});
