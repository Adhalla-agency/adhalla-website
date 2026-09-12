import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createArtifactFeed} from './workspace-data.js';
const snapshot = (value, fromCache=false) => ({exists:()=>!!value, data:()=>value, metadata:{fromCache}});
function setup() {
  const listeners=[], renders=[];
  const feed=createArtifactFeed((uid, kind, next, error)=>{
    const listener={uid,kind,next,error,stopped:false}; listeners.push(listener);
    return ()=>{listener.stopped=true;};
  },(data,report)=>renders.push({data,report}));
  return {feed,listeners,renders,last:()=>renders.at(-1)};
}
test('switching users clears artifacts and ignores late callbacks from the old user',()=>{
  const c=setup(); c.feed.start('alice');
  c.listeners[0].next(snapshot({binding_version:'version-a'}));
  c.feed.start('bob');
  c.listeners[0].next(snapshot({binding_version:'version-a',facts:['private old data']}));
  assert.deepEqual(c.last(),{data:null,report:null});
  assert.ok(c.listeners[0].stopped && c.listeners[1].stopped);
});
test('only validated interpretations for the current data binding appear',()=>{
  const c=setup(); c.feed.start('alice');
  c.listeners[0].next(snapshot({binding_version:'version-a'}));
  c.listeners[1].next(snapshot({binding_version:'version-b',status:'validated'}));
  assert.equal(c.last().report,null);
  c.listeners[1].next(snapshot({binding_version:'version-a',status:'failed'}));
  assert.equal(c.last().report,null);
  c.listeners[1].next(snapshot({binding_version:'version-a',status:'validated'}));
  assert.equal(c.last().report.status,'validated');
  c.listeners[0].next(snapshot({binding_version:'version-b'}));
  assert.equal(c.last().report,null);
});
test('offline cache and access failures remove protected content',()=>{
  const c=setup(); c.feed.start('alice');
  c.listeners[0].next(snapshot({binding_version:'version-a'}));
  c.listeners[1].next(snapshot({binding_version:'version-a',status:'validated'}));
  c.listeners[1].error(); assert.equal(c.last().report,null);
  c.listeners[0].next(snapshot({binding_version:'version-a'},true));
  assert.deepEqual(c.last(),{data:null,report:null});
  c.feed.stop(); c.listeners[0].next(snapshot({binding_version:'version-a'}));
  assert.deepEqual(c.last(),{data:null,report:null});
});

