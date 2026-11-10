// Denver II — app logic (Space version): age calc, checklist, scoring, chart, history
var lang="en", view="check", answers={}, savedList=[], chartWin=null;

function t(k){return STR[lang][k];}
function $(id){return document.getElementById(id);}
function parseDate(v){if(!v)return null;var p=v.split("-");return new Date(+p[0],+p[1]-1,+p[2]);}
function ageInfo(){
  var dob=parseDate($("f-dob").value), test=parseDate($("f-test").value);
  if(!dob||!test||test<dob)return null;
  var days=Math.round((test-dob)/86400000);
  var chrono=days/30.4375;
  var prem=parseFloat($("f-prem").value)||0;
  var corr=chrono;
  if(prem>0&&chrono<24){corr=Math.max(0,chrono-(prem*7)/30.4375);}
  return{days:days,chrono:chrono,corr:corr,premApplied:(prem>0&&chrono<24)};
}
function fmtAge(mo){
  if(mo<24)return mo.toFixed(1)+" "+t("months");
  var y=Math.floor(mo/12), m=Math.round(mo%12);
  return y+" "+t("years")+" "+m+" "+t("months");
}
function classify(item,age){
  if(item.p90<=age)return"expected";
  if(item.p25<=age)return"due";
  return"coming";
}
function flagFor(item,age,res){
  if(res!=="fail"&&res!=="ref"&&res!=="no")return null;
  var bad=(res==="fail");
  if(item.p90<age)return bad?"delay":"block-delay";
  if(item.p75<age&&age<=item.p90)return bad?"caution":"block-caution";
  return null;
}
function computeScore(age){
  var delays=0,cautions=0,blockedDelay=0,blockedCautions=0,scored=0,shown=0;
  ITEMS.forEach(function(it){
    var cls=classify(it,age);
    if(cls==="coming"&&it.p25>age+6)return;
    shown++;
    var r=answers[it.id]; if(!r)return;
    if(r==="pass"||r==="fail")scored++;
    var f=flagFor(it,age,r);
    if(f==="delay")delays++; else if(f==="caution")cautions++;
    else if(f==="block-delay")blockedDelay++; else if(f==="block-caution")blockedCautions++;
  });
  var status="pending";
  if(scored>0||delays+cautions+blockedDelay+blockedCautions>0){
    if(delays>=1||cautions>=2)status="suspect";
    else if(blockedDelay>=1||blockedCautions>=2)status="untestable";
    else if(scored>=3)status="normal";
    else status="pending";
  }
  return{delays:delays,cautions:cautions,scored:scored,shown:shown,status:status};
}
function applyI18n(){
  document.querySelectorAll("[data-i18n]").forEach(function(el){var k=el.getAttribute("data-i18n");if(STR[lang][k])el.textContent=STR[lang][k];});
  document.documentElement.lang=lang;
  $("lang-en").classList.toggle("on",lang==="en");
  $("lang-id").classList.toggle("on",lang==="id");
  render();
}
function refreshScore(age){
  var sc=computeScore(age);
  var badge=$("score-badge");
  badge.textContent=t(sc.status);
  badge.className="score-badge "+(sc.status==="pending"?"pending":sc.status);
  $("score-desc").textContent=t(sc.status+"D");
  $("st-delay").textContent=sc.delays;
  $("st-caution").textContent=sc.cautions;
  $("st-scored").textContent=sc.scored+" / "+sc.shown;
  $("progress-fill").style.width=(sc.shown?Math.round(sc.scored/sc.shown*100):0)+"%";
}
function render(){
  /* Preserve the scroll position across a full re-render: rebuilding the
     list collapses the page height for a moment, which otherwise makes
     the browser jump (smooth-scroll) back toward the top. */
  var y=window.scrollY||window.pageYOffset||0;
  var info=ageInfo();
  var has=!!info;
  $("age-strip").style.display=has?"grid":"none";
  $("empty-state").style.display=has?"none":"block";
  $("score-card").classList.toggle("show",has);
  if(!has){$("checklist-view").innerHTML="";$("chart-view").innerHTML="";window.scrollTo(0,y);return;}
  $("age-chrono").textContent=fmtAge(info.chrono);
  $("age-corr").textContent=fmtAge(info.corr);
  $("age-days").textContent=info.days+" "+t("days");
  var age=info.corr;
  refreshScore(age);
  if(view==="check")renderChecklist(age);else renderChart(age,info);
  if((window.scrollY||window.pageYOffset||0)!==y)window.scrollTo(0,y);
}
function renderChecklist(age){
  var cv=$("checklist-view"); cv.style.display="block"; $("chart-view").style.display="none";
  var groups=[["expected",t("expected"),t("expectedHint")],["due",t("due"),t("dueHint")],["coming",t("coming"),t("comingHint")]];
  var html="";
  groups.forEach(function(g){
    var items=ITEMS.filter(function(it){var c=classify(it,age);if(c!==g[0])return false;if(c==="coming"&&it.p25>age+6)return false;return true;});
    if(!items.length)return;
    html+='<div class="group-head"><h3>'+g[1]+' ('+items.length+')</h3><span class="hint">'+g[2]+'</span></div>';
    ["PS","FM","LANG","GM"].forEach(function(sec){
      var si=items.filter(function(it){return it.sector===sec;});
      if(!si.length)return;
      html+='<div class="sector"><div class="sector-title"><span class="dot" style="background:'+SECTORS[sec].color+'"></span>'+(lang==="id"?SECTORS[sec].id:SECTORS[sec].en)+'</div>';
      si.forEach(function(it){
        var r=answers[it.id]||"";
        var f=flagFor(it,age,r);
        var flagHtml="";
        if(f==="delay"||f==="block-delay")flagHtml='<span class="flag delay">'+t("delay")+'</span>';
        else if(f==="caution"||f==="block-caution")flagHtml='<span class="flag caution">'+t("caution")+'</span>';
        html+='<div class="item"><div class="item-top"><span class="item-name">'+nameOf(it)+'</span><span class="item-meta">'+it.p25+'–'+it.p90+' '+t("months")+'</span></div>'
          +(flagHtml?'<div class="flags">'+flagHtml+'</div>':"")
          +'<div class="opts" data-item="'+it.id+'">'
          +'<button type="button" data-v="pass" class="'+(r==="pass"?"sel-pass":"")+'">'+t("pass")+'</button>'
          +'<button type="button" data-v="fail" class="'+(r==="fail"?"sel-fail":"")+'">'+t("fail")+'</button>'
          +'<button type="button" data-v="ref" class="'+(r==="ref"?"sel-ref":"")+'">'+t("refusal")+'</button>'
          +'<button type="button" data-v="no" class="'+(r==="no"?"sel-no":"")+'">'+t("noopp")+'</button>'
          +'</div></div>';
      });
      html+='</div>';
    });
  });
  cv.innerHTML=html||'<div class="empty">'+t("emptyState")+'</div>';
}
/* Delegated answer handling: tapping an option selects it (radio-style);
   tapping the already-selected option again clears that item's answer.
   The tapped item and the score are updated in place — no full re-render —
   so answering never moves the scroll position. */
$("checklist-view").addEventListener("click",function(e){
  var b=e.target;
  while(b&&!(b.tagName==="BUTTON"&&b.getAttribute("data-v")))b=b.parentElement;
  if(!b)return;
  var wrap=b.parentElement;
  if(!wrap||!wrap.getAttribute("data-item"))return;
  var id=+wrap.getAttribute("data-item"), v=b.getAttribute("data-v");
  if(answers[id]===v){delete answers[id];}else{answers[id]=v;}
  var r=answers[id]||"";
  var btns=wrap.querySelectorAll("button");
  for(var i=0;i<btns.length;i++){
    var bv=btns[i].getAttribute("data-v");
    btns[i].className=(bv===r)?("sel-"+(bv==="pass"?"pass":bv==="fail"?"fail":bv==="ref"?"ref":"no")):"";
  }
  var info=ageInfo(); if(!info)return;
  var age=info.corr;
  var item=null;
  for(var j=0;j<ITEMS.length;j++){if(ITEMS[j].id===id){item=ITEMS[j];break;}}
  var card=wrap.parentElement;
  var flagsEl=card?card.querySelector(".flags"):null;
  var f=item?flagFor(item,age,r):null;
  var flagHtml="";
  if(f==="delay"||f==="block-delay")flagHtml='<span class="flag delay">'+t("delay")+'</span>';
  else if(f==="caution"||f==="block-caution")flagHtml='<span class="flag caution">'+t("caution")+'</span>';
  if(flagHtml){
    if(!flagsEl){flagsEl=document.createElement("div");flagsEl.className="flags";card.insertBefore(flagsEl,wrap);}
    flagsEl.innerHTML=flagHtml;
  }else if(flagsEl){flagsEl.parentElement.removeChild(flagsEl);}
  refreshScore(age);
});
function nameOf(it){return lang==="id"?it.name_id:it.name_en;}

function renderChart(age,info){
  var cv=$("chart-view"); cv.style.display="block"; $("checklist-view").style.display="none";
  if(!chartWin){chartWin=age<12?[0,24]:(age<30?[6,42]:(age<54?[24,66]:[42,72]));}
  var wins=[[0,24],[6,42],[24,66],[42,72],[0,72]];
  var lo=chartWin[0],hi=chartWin[1],span=hi-lo;
  function pct(m){return Math.max(0,Math.min(100,(m-lo)/span*100));}
  var html='<div class="card"><h2>'+t("chart")+' — Denver II</h2><p class="sub">'+t("chartNote")+'</p>'
    +'<div class="chart-window">'+wins.map(function(w,i){return '<button type="button" data-w="'+w[0]+','+w[1]+'" class="'+(w[0]===lo&&w[1]===hi?"on":"")+'">'+w[0]+'–'+w[1]+' '+t("months")+'</button>';}).join("")+'</div>'
    +'<div class="chart-legend"><span><span class="sw" style="background:var(--teal);opacity:.55"></span>'+t("p25lab")+'</span><span><span class="sw" style="background:var(--teal)"></span>'+t("p90lab")+'</span><span><span class="sw" style="background:var(--red-line);width:4px"></span>'+t("ageLine")+': '+fmtAge(age)+'</span></div>';
  ["PS","FM","LANG","GM"].forEach(function(sec){
    var si=ITEMS.filter(function(it){return it.sector===sec&&it.p90>lo&&it.p25<hi;});
    if(!si.length)return;
    html+='<div class="chart-sector"><div class="sector-title"><span class="dot" style="background:'+SECTORS[sec].color+'"></span>'+(lang==="id"?SECTORS[sec].id:SECTORS[sec].en)+'</div><div class="chart-area">';
    if(age>=lo&&age<=hi)html+='<div class="age-line" data-label="'+t("ageLine")+'" style="left:calc(38% + 8px + (62% - 16px) * '+(pct(age)/100)+')"></div>';
    si.forEach(function(it){
      var r=answers[it.id];
      var left=pct(it.p25),width=Math.max(2,pct(it.p90)-pct(it.p25));
      var tailW=(it.p90-it.p75)/(it.p90-it.p25)*100;
      html+='<div class="crow"><span class="cname">'+nameOf(it)+'</span><span class="track"><span class="bar '+(r==="fail"?"marked-fail":r==="pass"?"marked-pass":"")+'" style="left:'+left+'%;width:'+width+'%"><span class="tail" style="width:'+tailW+'%"></span></span></span></div>';
    });
    html+='</div><div class="axis"><span>'+lo+'</span><span>'+Math.round((lo+hi)/2)+'</span><span>'+hi+' '+t("months")+'</span></div></div>';
  });
  html+='</div>';
  cv.innerHTML=html;
  cv.querySelectorAll(".chart-window button").forEach(function(b){
    b.addEventListener("click",function(){var p=b.getAttribute("data-w").split(",");chartWin=[+p[0],+p[1]];render();});
  });
}

/* events */
["f-dob","f-test","f-prem","f-name","f-sex"].forEach(function(id){
  $(id).addEventListener("input",function(){if(id==="f-dob"||id==="f-prem")chartWin=null;render();});
  $(id).addEventListener("change",function(){render();});
});
$("lang-en").addEventListener("click",function(){lang="en";applyI18n();});
$("lang-id").addEventListener("click",function(){lang="id";applyI18n();});
$("view-check").addEventListener("click",function(){view="check";$("view-check").classList.add("on");$("view-chart").classList.remove("on");render();});
$("view-chart").addEventListener("click",function(){view="chart";$("view-chart").classList.add("on");$("view-check").classList.remove("on");render();});
$("btn-reset").addEventListener("click",function(){answers={};render();});
$("btn-save").addEventListener("click",function(){
  var info=ageInfo();if(!info)return;
  var sc=computeScore(info.corr);
  savedList.unshift({name:$("f-name").value.trim()||"—",date:$("f-test").value,age:fmtAge(info.corr),status:sc.status,delays:sc.delays,cautions:sc.cautions});
  var card=$("history-card");card.style.display="block";
  $("history-list").innerHTML=savedList.map(function(h){
    return '<div class="history-item"><span><b>'+h.name.replace(/</g,"&lt;")+'</b> · '+h.date+' · '+t("atAge")+' '+h.age+'</span><span class="chip">'+t(h.status)+' · '+t("delays")+': '+h.delays+' · '+t("cautions")+': '+h.cautions+'</span></div>';
  }).join("");
});
render();
