// Travel state is independent of rendering so interruptions can be checked against
// the same geographic network used by both the map and its regression tests.
function planFrom(geo, from, tx, tz) {
 const {NODES, canTravel, walkable, nearestNode, shortestPath}=geo;
 if(canTravel(from.x,from.z,tx,tz))return [{x:tx,z:tz,mode:'walk'}];
 const ordered=(x,z)=>Object.entries(NODES).map(([id,[nx,nz]])=>({id,d:Math.hypot(nx-x,nz-z)})).sort((a,b)=>a.d-b.d);
 const start=ordered(from.x,from.z).find(n=>canTravel(from.x,from.z,...NODES[n.id]));
 if(!start)return [];
 const targetWalkable=walkable(tx,tz);
 const end=(targetWalkable?ordered(tx,tz).slice(0,6).find(n=>canTravel(...NODES[n.id],tx,tz)):null)?.id||nearestNode(tx,tz).id;
 const path=shortestPath(start.id,end);
 if(!path)return [];
 const route=[{x:NODES[start.id][0],z:NODES[start.id][1],mode:'walk'}];
 path.legs.forEach((leg,i)=>route.push({x:NODES[path.nodes[i+1]][0],z:NODES[path.nodes[i+1]][1],mode:leg.mode}));
 if(targetWalkable&&canTravel(...NODES[end],tx,tz))route.push({x:tx,z:tz,mode:'walk'});
 return route;
}

export function isBoatTransit(traveler) {
 return traveler.route[0]?.mode==='boat';
}

export function planTravel(geo, traveler, tx, tz) {
 if(!Number.isFinite(tx)||!Number.isFinite(tz)||!geo.inBounds(tx,tz))return [];
 // Never discard the active crossing. A new destination starts at its dock,
 // even after multiple clicks while the traveler is still in open water.
 const dock=isBoatTransit(traveler)?traveler.route[0]:null;
 const onward=planFrom(geo,dock||traveler,tx,tz);
 return onward.length?(dock?[{...dock},...onward]:onward):[];
}

export function requestTravel(geo, traveler, tx, tz, spotId=null) {
 const route=planTravel(geo,traveler,tx,tz);
 if(!route.length)return false;
 traveler.route=route;
 traveler.goal=spotId;
 return true;
}

export function beginManualWalk(geo, traveler) {
 // A keyboard press cannot turn a passenger into a walker in the lake.
 if(isBoatTransit(traveler)||!geo.walkable(traveler.x,traveler.z))return false;
 traveler.route=[];
 traveler.goal=null;
 traveler.mode='walk';
 return true;
}
