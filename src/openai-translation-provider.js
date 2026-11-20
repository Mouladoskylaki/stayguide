// Server-only adapter. No environment/file access; disabled before credential lookup.
import {TRANSLATION_CONFIG as CONFIG} from './translation-service.js';
const ENDPOINTS=Object.freeze({count:'https://api.openai.com/v1/responses/input_tokens',generate:'https://api.openai.com/v1/responses'});
const integer=n=>Number.isSafeInteger(n)&&n>=0;
export class TranslationProviderError extends Error{constructor(category,usage){super(category);this.category=category;this.usage=usage;}}
const requireSafe=(ok,category)=>{if(!ok)throw new TranslationProviderError(category);};
export function reconcileOpenAIUsage(data,count){
 const u=data?.usage,cached=u?.input_tokens_details?.cached_tokens,written=u?.input_tokens_details?.cache_write_tokens,reasoning=u?.output_tokens_details?.reasoning_tokens;
 requireSafe(u&&integer(u.input_tokens)&&u.input_tokens===count&&integer(u.output_tokens)&&u.output_tokens<=CONFIG.maxOutputTokens&&u.total_tokens===count+u.output_tokens&&integer(cached)&&cached<=count&&reasoning===0&&(written===undefined||integer(written)&&cached+written<=count),'invalid_usage');
 const cost=written===undefined?(count-cached)*250+cached*10+u.output_tokens*500:(count-cached-written)*100+cached*10+written*250+u.output_tokens*500;
 const conservative=Math.ceil(cost*11/10);requireSafe(conservative<=CONFIG.reservationNano,'reservation_exceeded');
 return {inputTokens:count,outputTokens:u.output_tokens,reasoningTokens:reasoning,cachedTokens:cached,cacheWriteTokens:written??null,estimatedNano:cost,conservativeNano:conservative};
}
export function createOpenAITranslationProvider({enabled=false,keyProvider=()=>{throw Error('unconfigured');},fetchImpl=globalThis.fetch,timeoutMs=10000}={}){
 async function request(kind,body,key,signal,deadline){
  requireSafe(!signal?.aborted&&Date.now()<deadline,'request_timeout');
  const controller=new AbortController(),abort=()=>controller.abort();
  signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  const timer=setTimeout(abort,Math.min(timeoutMs,deadline-Date.now()));let response;
  try{
   response=await fetchImpl(ENDPOINTS[kind],{method:'POST',redirect:'error',cache:'no-store',credentials:'omit',signal:controller.signal,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body)});
   if(response.status!==200){try{await response.body?.cancel();}catch{}throw new TranslationProviderError(response.status===401?'authentication':response.status===429?'billing_or_rate_limit':response.status>=500?'provider_failure':'request_rejected');}
   const reader=response.body?.getReader();requireSafe(reader,'invalid_response');const chunks=[];let size=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;requireSafe(size<=262144,'response_limit');chunks.push(value);}}
   finally{try{await reader.cancel();}catch{}reader.releaseLock();}
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
   return JSON.parse(new TextDecoder().decode(bytes));
  }catch(error){if(error instanceof TranslationProviderError)throw error;throw new TranslationProviderError(controller.signal.aborted?'request_timeout':'transport_failure');}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 }
 return Object.freeze({mode:'openai',enabled,
  async translate(payload,{signal,deadline=Infinity}={}){
   requireSafe(enabled,'live_disabled');let key;
   try{key=keyProvider();}catch{throw new TranslationProviderError('credential_unavailable');}
   requireSafe(typeof key==='string'&&key.length>0&&key.length<=512&&!/[\r\n]/.test(key),'credential_unavailable');
   const {instructions,...input}=structuredClone(payload);
   const counted={model:CONFIG.model,instructions,input:JSON.stringify(input),reasoning:{effort:'none'},tools:[],text:{format:{type:'json_schema',name:'stayguide_fields',strict:true,schema:{type:'object',properties:Object.fromEntries(Object.keys(input.fields).map(key=>[key,{type:'string'}])),required:Object.keys(input.fields),additionalProperties:false}}}};
   const count=await request('count',counted,key,signal,deadline);
   requireSafe(count?.object==='response.input_tokens'&&integer(count.input_tokens)&&count.input_tokens>0&&count.input_tokens<=CONFIG.maxInputTokens,'input_limit');
   requireSafe(!signal?.aborted,'request_timeout');
   const data=await request('generate',{...counted,service_tier:'default',store:false,stream:false,max_output_tokens:CONFIG.maxOutputTokens,truncation:'disabled'},key,signal,deadline);
   const usage=reconcileOpenAIUsage(data,count.input_tokens);
   try{
    requireSafe(data.model===CONFIG.model&&data.service_tier==='default'&&data.status==='completed'&&data.error===null&&data.incomplete_details===null&&Array.isArray(data.output),'invalid_response');
    const texts=[];for(const item of data.output){if(item.type==='reasoning')continue;requireSafe(item.type==='message'&&item.role==='assistant'&&item.status==='completed'&&Array.isArray(item.content),'invalid_response');for(const part of item.content){requireSafe(part.type==='output_text'&&typeof part.text==='string','invalid_response');texts.push(part.text);}}
    const text=texts.join('\n');requireSafe(!text.includes(key),'unsafe_output');
    const fields=JSON.parse(text);requireSafe(fields&&typeof fields==='object'&&!Array.isArray(fields),'invalid_response');return {fields,usage};
   }catch{throw new TranslationProviderError('invalid_response',usage);}
  }
 });
}
