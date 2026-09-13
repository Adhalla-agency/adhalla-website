import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createActionClient} from './workspace-actions.js';

const recommendation = {id:'r1'};
const report = {report_id:'fictional-report',binding_version:'fictional-version',status:'validated',recommendations:[recommendation]};
const user = {uid:'synthetic-workspace',getIdToken:async force=>{assert.equal(force,true);return 'fictional-token';}};
const success = body => ({ok:true,json:async()=>({data:{...body,binding_version:report.binding_version,status:body.decision?'recorded':'requested'}})});

test('uncertain delivery retries the same attributed request without adding execution fields',async()=>{
  const calls=[];
  const client=createActionClient({newId:()=> 'test-request',fetchImpl:async(url,options)=>{
    const body=JSON.parse(options.body);calls.push({url,options,body});
    if(calls.length===1)throw new TypeError('offline');return success(body);
  }});
  client.start(user);
  await assert.rejects(client.submit(report,recommendation,'request','setup_help','test note'));
  const result=await client.submit(report,recommendation,'request','setup_help','test note');
  assert.equal(result.status,'requested');
  assert.deepEqual(calls[0].body,calls[1].body);
  assert.equal(calls[1].url,'https://adhalla-workspace-api-184522982163.europe-north1.run.app/v1/workspaces/synthetic-workspace/request');
  assert.deepEqual(Object.keys(calls[1].body).sort(),['note','recommendation_id','report_id','request_id','service']);
  assert.equal(calls[1].options.redirect,'error');assert.equal(calls[1].options.credentials,'omit');
  client.stop();
});

test('sign out during token refresh prevents sending the old account token',async()=>{
  let resolveToken,calls=0;
  const client=createActionClient({fetchImpl:async()=>{calls++;throw new Error('must not fetch');},newId:()=> 'test-request'});
  client.start({...user,getIdToken:()=>new Promise(resolve=>resolveToken=resolve)});
  const pending=client.submit(report,recommendation,'response','accept','');
  client.stop();resolveToken('fictional-old-token');
  assert.equal(await pending,null);assert.equal(calls,0);
});

test('a late success from another session is discarded and denied responses never appear saved',async()=>{
  let resolveRequest;
  const client=createActionClient({newId:()=> 'test-request',fetchImpl:()=>new Promise(resolve=>resolveRequest=resolve)});
  client.start(user);
  const pending=client.submit(report,recommendation,'response','accept','');
  await new Promise(resolve=>setImmediate(resolve));
  client.start({...user,uid:'another-test-workspace'});
  resolveRequest(success({request_id:'test-request',decision:'accept'}));
  assert.equal(await pending,null);
  const denied=createActionClient({newId:()=> 'test-request',fetchImpl:async()=>({ok:false,status:403})});
  denied.start(user);await assert.rejects(denied.submit(report,recommendation,'response','accept',''),/Ligipääs/);
  client.stop();denied.stop();
});

test('unvalidated reports and unsupported choices never send a request',async()=>{
  const client=createActionClient({fetchImpl:()=>assert.fail('unexpected request')});client.start(user);
  await assert.rejects(client.submit({...report,status:'failed'},recommendation,'response','accept',''));
  await assert.rejects(client.submit(report,recommendation,'request','execute_ads',''));
  client.stop();
});
