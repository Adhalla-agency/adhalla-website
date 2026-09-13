import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignClient,lines} from './campaigns-client.js';
test('campaign requests use fresh auth and never ambient cookies',async()=>{
 const calls=[];let refresh;
 const api=createCampaignClient(async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({data:{client_id:'0000'}})};});
 api.start({getIdToken:async force=>{refresh=force;return 'fictional-token';}});
 assert.equal((await api.read('/internal/clients/0000/overview')).client_id,'0000');
 assert.equal(refresh,true);assert.equal(calls[0].options.credentials,'omit');assert.equal(calls[0].options.redirect,'error');
 assert.equal(calls[0].options.cache,'no-store');assert.match(calls[0].url,/^https:\/\/adhalla-workspace-api-/);
});
test('logout during token refresh prevents the outgoing request',async()=>{
 let resolve,calls=0;const api=createCampaignClient(async()=>{calls++;});
 api.start({getIdToken:()=>new Promise(r=>resolve=r)});
 const pending=api.read('/internal/clients/0000/overview');api.start(null);resolve('fictional-token');
 await assert.rejects(pending);assert.equal(calls,0);
});
test('uncertain retry retains the exact request identity',async()=>{
 const bodies=[];const api=createCampaignClient(async(url,options)=>{bodies.push(JSON.parse(options.body));if(bodies.length===1)throw Error('uncertain');return {ok:true,json:async()=>({data:{status:'unassigned'}})};});
 api.start({getIdToken:async()=> 'fictional-token'});
 const body={client_id:'0000',base_version:'reviewed-version'};
 await assert.rejects(api.write('/internal/clients/0000/submit',body));await api.write('/internal/clients/0000/submit',body);
 assert.equal(bodies[0].request_id,bodies[1].request_id);
});
test('line fields preserve explicit entries without empty values',()=>assert.deepEqual(lines('a\n\n b '),['a','b']));
