export const ROLES={operator:{name:'林溪',title:'运行人员'},leader:{name:'陈工',title:'检修组长'},crew:{name:'张涛',title:'检修人员'},chief:{name:'王铭',title:'值长'}};
export const AGENTS=[{id:'defect',name:'缺陷智能体'},{id:'schedule',name:'排程智能体'},{id:'permits',name:'两票智能体'},{id:'verify',name:'验证智能体'},{id:'knowledge',name:'知识智能体'}];
export const PHASES=[
 {id:'confirm',n:'01',name:'故障确认',role:'operator',agent:'defect',action:'确认缺陷 · 移交复核'},
 {id:'dispatch',n:'02',name:'工单复核与派单',role:'leader',agent:'schedule',action:'确认派单'},
 {id:'workDraft',n:'03',name:'工作票提交',role:'crew',agent:'permits',action:'提交工作票'},
 {id:'workReview',n:'04',name:'工作票审批',role:'leader',agent:'permits',action:'批准工作票'},
 {id:'operationDraft',n:'05',name:'操作票提交',role:'crew',agent:'permits',action:'提交操作票'},
 {id:'operationReview',n:'06',name:'操作票审批',role:'chief',agent:'permits',action:'许可作业'},
 {id:'execution',n:'',name:'现场执行',role:'crew',agent:'permits',action:'提交执行与复测记录'},
 {id:'close',n:'07',name:'工单结案',role:'leader',agent:'verify',action:'验收结案'},
 {id:'knowledge',n:'08',name:'知识沉淀',role:'leader',agent:'knowledge',action:'确认入库 · 完成闭环'}
];
export const INITIAL_WORK=['核对 7# 逆变器与 3B 支路标识','按获批范围检查 3B 接头、线缆及密封','处理缺陷后复测绝缘，形成检修记录'];
export const INITIAL_OPERATIONS=[{id:'identify',text:'核对设备与停运范围'},{id:'stop',text:'按批准方案停运 7# 逆变器'},{id:'isolate',text:'按批准方案落实交直流隔离措施'},{id:'verify',text:'核验安全措施，记录并交接作业许可'}];
export function newWorkflow(){return {version:6,phase:0,actor:'operator',view:'overview',viewPhase:0,status:'pending',completed:Array(9).fill(false),history:[],snapshots:{},notice:null,returnReason:'',sitePending:false,siteResult:'',startedExecution:false,retest:false,fields:{confirm:{plan:'targeted',accepted:false},dispatch:{slot:'14:30—16:30',executor:'张涛',supervisor:'周岩',material:true},workDraft:{start:'14:30',end:'16:30',steps:[...INITIAL_WORK],safety:{scope:true,isolation:true,protection:true},confirmed:false},workReview:{scope:false,measures:false,parallel:false},operationDraft:{steps:structuredClone(INITIAL_OPERATIONS),confirmed:false},operationReview:{impact:false,restore:false},execution:{checks:[false,false,false],record:'',insulation:'',duration:''},close:{checks:[false,false,false]},knowledge:{title:'雨后直流支路绝缘下降的定位与处理',experience:'优先对照支路趋势与降雨记录；现场复核接头和箱体密封，处理后保留绝缘复测曲线。',confirmed:false}}};}
export function actorInfo(s,id=s.actor){const r={...ROLES[id]};if(id==='crew')r.name=s.fields.dispatch.executor;return r;}
export function currentPhase(s){return PHASES[Math.min(s.phase,8)];}
export function audit(s,index=s.phase){const f=s.fields,errors=[];
 if(s.phase===9)return [];
 if(index===0){if(!f.confirm.accepted)errors.push('请确认是否认可该缺陷');if(s.sitePending)errors.push('现场复核尚未回传');}
 if(index===1){if(f.dispatch.executor===f.dispatch.supervisor)errors.push('执行人与监督员不能为同一人');if(f.dispatch.slot==='14:00—16:00')errors.push('14:00—14:20 与邻近设备巡检冲突，请调整时段');if(!f.dispatch.material)errors.push('请确认接头及密封件可用');}
 if(index===2){if(f.workDraft.steps.some(x=>!x.trim()))errors.push('工序不能为空');if(!Object.values(f.workDraft.safety).every(Boolean))errors.push('设备范围、隔离与防护措施需要补齐');if(f.workDraft.end<=f.workDraft.start)errors.push('结束时间应晚于开始时间');if(f.workDraft.start<'14:20'&&f.workDraft.end>'14:00')errors.push('工作票时间与邻近巡检冲突，请调整至 14:20 之后');if(!f.workDraft.confirmed)errors.push('请核对工作票草稿后确认提交');}
 if(index===3&&!Object.values(f.workReview).every(Boolean))errors.push('请完成范围、措施与交叉作业核查');
 if(index===4){const ids=f.operationDraft.steps.map(x=>x.id).join(',');if(ids!=='identify,stop,isolate,verify')errors.push('操作顺序存在冲突：核对、停运、隔离、核验交接');if(f.operationDraft.steps.some(x=>!x.text.trim()))errors.push('操作步骤不能为空');if(!f.operationDraft.confirmed)errors.push('请核对操作票草稿后确认提交');}
 if(index===5&&!Object.values(f.operationReview).every(Boolean))errors.push('请核对停电影响和复电条件');
 if(index===6){if(!s.completed[3]||!s.completed[5])errors.push('须先取得工作票批准和操作票许可');if(!s.startedExecution)errors.push('现场作业尚未开始');if(!f.execution.checks.every(Boolean))errors.push('请补齐许可接收、作业记录及复测材料');if(!f.execution.record.trim())errors.push('请填写现场处理记录');if(!Number.isFinite(Number(f.execution.insulation))||Number(f.execution.insulation)<=0)errors.push('请填写有效的绝缘复测值');if(!Number.isFinite(Number(f.execution.duration))||Number(f.execution.duration)<=0)errors.push('请填写有效工时');}
 if(index===7){if(Number(f.execution.insulation)<1)errors.push('绝缘复测低于演示验收线，需要补充复测');if(!f.close.checks.every(Boolean))errors.push('请完成数据、现场恢复与记录核查');}
 if(index===8){if(!f.knowledge.title.trim()||!f.knowledge.experience.trim())errors.push('请补齐案例名称与处置经验');if(!f.knowledge.confirmed)errors.push('请核对案例后确认入库');}
 return errors;
}
function record(s,action,detail){const p=currentPhase(s),r=actorInfo(s);s.history.push({phase:s.phase,stage:p.name,actor:r.name,role:r.title,action,detail,materials:structuredClone(s.fields),time:new Date().toLocaleTimeString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})});}
export function act(input,type,payload={}){
 const s=structuredClone(input),phase=currentPhase(s);
 if(s.phase===9)return {ok:false,message:'此案例已完成闭环',state:input};
 if(s.actor!==phase.role)return {ok:false,message:'请由'+actorInfo(s,phase.role).title+'处理当前环节',state:input};
 if(type==='resume'){s.status='pending';s.notice={title:'已恢复处理',text:'继续当前环节，后续仍需对应责任人确认。'};record(s,'恢复处理','继续当前环节');return {ok:true,state:s};}
 if(s.status==='held')return {ok:false,message:'此任务已暂缓，请先恢复处理',state:input};
 if(type==='hold'){s.status='held';record(s,'暂缓',payload.reason||'等待进一步核实');s.notice={title:'已暂缓',text:'任务保留在当前环节，后续环节未开启。'};return {ok:true,state:s};}
 if(type==='site'){if(s.phase!==0)return {ok:false,message:'当前环节不支持现场复核请求',state:input};s.sitePending=true;record(s,'请求现场复核','补充外观巡检结果，不代替检修许可');return {ok:true,state:s};}
 if(type==='siteResult'){if(s.phase!==0||!s.sitePending)return {ok:false,message:'暂无待回传的现场复核',state:input};s.sitePending=false;s.siteResult=payload.result||'3B 接头附近可见水迹';record(s,'接收巡检反馈',s.siteResult);return {ok:true,state:s};}
 if(type==='start'){if(s.phase!==6||!s.completed[3]||!s.completed[5])return {ok:false,message:'未获许可，不能开始现场执行',state:input};s.startedExecution=true;record(s,s.retest?'开始补充复测':'接收许可 · 开始执行','执行人 '+actorInfo(s).name+'；监督员 '+s.fields.dispatch.supervisor);return {ok:true,state:s};}
 if(type==='return'||type==='deny'||type==='retest'){
  const target=type==='retest'&&s.phase===7?6:type==='return'&&s.phase===3?2:type==='deny'&&s.phase===5?4:type==='return'&&s.phase===1?0:null;
  if(target===null)return {ok:false,message:'当前环节不支持该处理',state:input};
  const reason=(payload.reason||'').trim();if(!reason)return {ok:false,message:'请填写退回或复测原因',state:input};
  record(s,type==='deny'?'不许可':type==='retest'?'要求补充复测':'退回修改',reason);s.returnReason=reason;
  for(let i=target;i<9;i++){s.completed[i]=false;delete s.snapshots[i];}
  s.phase=target;s.viewPhase=target;s.status='returned';s.notice={title:type==='deny'?'未许可':'已退回',text:reason};
  if(target===0){s.fields.confirm.accepted=false;}if(target===2){s.fields.workDraft.confirmed=false;s.fields.workReview={scope:false,measures:false,parallel:false};s.fields.operationDraft.confirmed=false;s.fields.operationReview={impact:false,restore:false};}
  if(target===4){s.fields.operationDraft.confirmed=false;s.fields.operationReview={impact:false,restore:false};}
  if(target===6){s.retest=true;s.startedExecution=false;s.fields.execution.checks=[false,false,false];s.fields.close.checks=[false,false,false];}
  return {ok:true,state:s};
 }
 if(type!=='submit')return {ok:false,message:'未知操作',state:input};
 const errors=audit(s);if(errors.length)return {ok:false,message:errors[0],errors,state:input};
 if(s.phase>0&&!s.completed.slice(0,s.phase).every(Boolean))return {ok:false,message:'前序环节尚未完成',state:input};
 const labels=['确认缺陷','复核通过并派单','提交工作票','批准工作票','提交操作票','许可作业','提交执行记录','验收结案','确认入库'];
 record(s,labels[s.phase],s.phase===7?'工单已结案，待确认知识沉淀':s.phase===8?'案例已入库，故障完成闭环':'移交下一责任角色');
 s.snapshots[s.phase]=structuredClone(s.fields);s.completed[s.phase]=true;s.phase++;s.viewPhase=Math.min(8,s.phase);s.status=s.phase===9?'complete':'pending';s.returnReason='';
 const next=s.phase<9?actorInfo(s,PHASES[s.phase].role):null;
 s.notice={title:labels[s.phase-1]+'完成',text:next?'下一环节：'+PHASES[s.phase].name+' · '+next.name+' / '+next.title:'案例 KL-20261026-007 已入库'};
 return {ok:true,state:s};
}
