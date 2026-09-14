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

import {normalizeBrief,errorMessage} from './campaigns-client.js';
test('normalization preserves financial choices and accepts ordinary domain and currency input',()=>{
 const value={currency:' eur ',landing_page:'example.test/service',daily_budget:'10.00',max_cpc:null,bidding_strategy:'MAXIMIZE_CLICKS'};
 assert.deepEqual(normalizeBrief(value),{...value,currency:'EUR',landing_page:'https://example.test/service'});
 assert.equal(value.currency,' eur ');
});
test('field errors and version conflicts retain exact status without leaking response values',async()=>{
 const api=createCampaignClient(async()=>({ok:false,status:400,json:async()=>({error:'positive_decimal',field:'daily_budget',private:'never echo'})}));
 api.start({getIdToken:async()=> 'fictional-token'});
 await assert.rejects(api.write('/internal/clients/0000/brief',{}),e=>e.field==='daily_budget'&&e.status===400&&e.message.includes('Päevane eelarve')&&!e.message.includes('never echo'));
 assert.match(errorMessage(409),/Sinu tekst on alles/);
});

import {cpcGuidance,approvalPresentation} from './campaigns-client.js';
test('optional targets accept not-applicable markers without inventing a financial value',()=>{
 for(const mark of ['','-','–','—','n/a','ei kohaldu'])assert.equal(normalizeBrief({currency:'EUR',landing_page:'',target_roas:mark}).target_roas,null);
});
test('CPC advice is subordinate and only uses a small-budget planning example',()=>{
 assert.equal(cpcGuidance(10,2),'');assert.match(cpcGuidance(10,3),/15.00/);
 assert.doesNotMatch(cpcGuidance(100,30),/150.00/);assert.equal(cpcGuidance(10,0),'');
});
test('approval is visible while execution failures remain separately visible',()=>{
 assert.deepEqual(approvalPresentation({status:'approved'}),{approved:true,attention:false});
 assert.deepEqual(approvalPresentation({status:'failed',authority:{source:'worker_approval'}}),{approved:true,attention:true});
 assert.deepEqual(approvalPresentation({status:'unassigned'}),{approved:false,attention:false});
});
