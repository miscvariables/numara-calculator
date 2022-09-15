/**
 * @copyright 2022 Timur Atalay
 * @homepage https://github.com/bornova/numara-calculator
 * @license MIT - https://github.com/bornova/numara-calculator/blob/master/LICENSE
 */

const appInfo = {
    productName: 'Numara',
    description:'Numara Calculator',
    version: '3.15.5',
    author: 'Timur Atalay',
    homepage: 'https://github.com/bornova/numara-calculator',
    licence: 'MIT',
    website: 'https://numara.io'
}

const $=(e,t)=>t?document.querySelectorAll(e):document.querySelector(e),store={get:e=>JSON.parse(localStorage.getItem(e)),set:(e,t)=>{localStorage.setItem(e,JSON.stringify(t))}},DateTime=luxon.DateTime;lucide.createIcons();const cm=CodeMirror.fromTextArea($("#inputArea"),{theme:"numara",coverGutterNextToScrollbar:!0,inputStyle:"textarea",viewportMargin:1/0,singleCursorHeightPerLine:!1});cm.setValue(store.get("input")||""),cm.execCommand("goDocEnd"),$("#udfInput").setAttribute("placeholder",'// Define new functions and variables:\n    myvalue: 42,\n    hello: (name) => {\n    \treturn "hello, " + name + "!"\n    }'.replace(/^ +/gm,""));const udfInput=CodeMirror.fromTextArea($("#udfInput"),{mode:"javascript",autoCloseBrackets:!0,smartIndent:!1});$("#uduInput").setAttribute("placeholder",'// Define new units:\n    foo: {\n    \tprefixes: "long",\n    \tbaseName: "essence-of-foo"\n    },\n    bar: "40 foo",\n    baz: {\n    \tdefinition: "1 bar/hour",\n    \tprefixes: "long"\n    }'.replace(/^ +/gm,""));const uduInput=CodeMirror.fromTextArea($("#uduInput"),{mode:"javascript",autoCloseBrackets:!0,smartIndent:!1}),isMac=navigator.userAgent.toLowerCase().includes("mac"),isNode=navigator.userAgent.toLowerCase().includes("electron"),ipc=isNode?require("electron").ipcRenderer:null;function toggleMax(){ipc.send(ipc.sendSync("isMaximized")?"unmaximize":"maximize")}$("#dialog-about-title").innerHTML=appInfo.description,$("#dialog-about-copyright").innerHTML=`Copyright ©️ ${DateTime.local().year} ${appInfo.author}`,$("#dialog-about-appVersion").innerHTML=isNode?"Version "+appInfo.version:`Version ${appInfo.version}\n      <div class="versionCtnr">\n        <div>\n          <a href="https://github.com/bornova/numara-calculator/releases" target="_blank">Download desktop version</a>\n        </div>\n      </div>`,$("#gitLink").setAttribute("href",appInfo.homepage),$("#webLink").setAttribute("href",appInfo.website),$("#licenseLink").setAttribute("href",appInfo.homepage+"/blob/master/LICENSE"),isNode?(ipc.on("themeUpdate",applySettings),ipc.on("fullscreen",((e,t)=>{t&&ipc.send("maximize")}))):"serviceWorker"in navigator&&navigator.serviceWorker.register("./sw.js").catch((()=>{console.log("Service worker registration failed")})),isNode&&!isMac?($("#header-mac").remove(),$("#header-win").style.display="block",$("#header-win-title").innerHTML=appInfo.productName,$("#max").style.display=ipc.sendSync("isMaximized")?"none":"block",$("#unmax").style.display=ipc.sendSync("isMaximized")?"block":"none",$("#winButtons").addEventListener("click",(e=>{switch(e.target.id){case"min":ipc.send("minimize");break;case"max":ipc.send("maximize");break;case"unmax":ipc.send("unmaximize");break;case"close":ipc.send("close")}e.stopPropagation()})),ipc.on("isMax",((e,t)=>{$("#unmax").style.display=t?"block":"none",$("#max").style.display=t?"none":"block"})),$("#header-win").addEventListener("dblclick",toggleMax)):($("#header-win").remove(),$("#header-mac").style.display="block",$("#header-mac-title").innerHTML=appInfo.productName,isNode&&$("#header-mac").addEventListener("dblclick",toggleMax));const defaultSettings={app:{alwaysOnTop:!1,autocomplete:!0,closeBrackets:!0,contPrevLine:!0,currencies:!0,dateDay:!1,divider:!0,expNotation:!1,expLower:"-12",expUpper:"12",fontSize:"1.1rem",fontWeight:"400",lineHeight:"2em",keywordTips:!0,lineErrors:!0,lineNumbers:!0,lineWrap:!0,locale:"system",matchBrackets:!0,matrixType:"Matrix",numericOutput:"number",precision:"4",predictable:!1,rulers:!1,syntax:!0,theme:"system",thouSep:!0},inputWidth:60,plot:{plotArea:!1,plotCross:!1,plotGrid:!1}};let settings=store.get("settings");settings?DeepDiff.observableDiff(settings,defaultSettings,(e=>{"E"!==e.kind&&(DeepDiff.applyChange(settings,defaultSettings,e),store.set("settings",settings))})):(settings=defaultSettings,store.set("settings",defaultSettings)),math.createUnit("USD",{aliases:["usd"]});let mathScope,currencyRates={};function getRates(){navigator.onLine?($("#lastUpdated").innerHTML='<div uk-spinner="ratio: 0.3"></div>',fetch("https://www.floatrates.com/widget/1030/cfc5515dfc13ada8d7b0e50b8143d55f/usd.json").then((e=>e.json())).then((e=>{currencyRates=e;const t=["cup"];Object.keys(e).forEach((n=>{math.createUnit(e[n].code,{definition:math.unit(e[n].inverseRate+"USD"),aliases:[t.includes(e[n].code.toLowerCase())?"":e[n].code.toLowerCase()]},{override:!0}),store.set("rateDate",e[n].date)})),applySettings(),$("#lastUpdated").innerHTML=store.get("rateDate")})).catch((e=>{$("#lastUpdated").innerHTML="n/a",notify("Failed to get exchange rates ("+e+")","warning")}))):($("#lastUpdated").innerHTML="No internet connection.",notify("No internet connection. Could not update exchange rates.","warning"))}let refreshCM=!0;function calculate(){const e=[],t=[],n=[];let i="";function a(i){const a=math.evaluate(e.length>0?"("+math.mean(e)+")":"0"),o=math.evaluate(t.length>0?"("+t.join("+")+")":"0"),s=math.evaluate(n.length>0?"("+n.join("+")+")":"0"),r=(i=i.replace(/\bans\b/g,mathScope.ans).replace(/\bnow\b/g,mathScope.now).replace(/\btoday\b/g,mathScope.today).replace(/\bavg\b/g,a).replace(/\btotal\b/g,o).replace(/\bsubtotal\b/g,s)).match(/\bline\d+\b/g);r&&r.forEach((e=>{i=mathScope[e]?i.replace(e,mathScope[e]):e}));const c=/[+-] * .* *(millisecond|second|minute|hour|day|week|month|quarter|year|decade|century|centuries|millennium|millennia)s?/g;if(i.match(c)){const e=i.replace(c,"").trim(),t=i.replace(e,"").trim(),n=settings.app.dateDay?DateTime.fromFormat(e,"ccc, D t",{locale:settings.app.locale}):DateTime.fromFormat(e,"D t",{locale:settings.app.locale}),a=settings.app.dateDay?DateTime.fromFormat(e,"ccc, D",{locale:settings.app.locale}):DateTime.fromFormat(e,"D",{locale:settings.app.locale}),o=n.isValid?n:a.isValid?a:null,s=String(math.evaluate(t+" to hours",mathScope)),r=Number(s.split(" ")[0]);if(!o)return"Invalid Date";{const e=o.plus({hours:r}).toFormat(n.isValid?settings.app.dateDay?"ccc, D t":"D t":settings.app.dateDay?"ccc, D":"D");i=`"${e}"`}}return i=i.match(/[\w.]*%[ ]*of[ ]*/g)?i.replace(/%[ ]*of[ ]*/g,"/100*"):i,math.evaluate(i,mathScope)}refreshCM&&cm.refresh(),mathScope={},mathScope.now=settings.app.dateDay?DateTime.now().setLocale(settings.app.locale).toFormat("ccc, D t"):DateTime.now().setLocale(settings.app.locale).toFormat("D t"),mathScope.today=settings.app.dateDay?DateTime.now().setLocale(settings.app.locale).toFormat("ccc, D"):DateTime.now().setLocale(settings.app.locale).toFormat("D"),cm.eachLine((o=>{const s=cm.getLineNumber(o),r=s+1;settings.app.rulers?(cm.removeLineClass(o,"wrap","noRuler"),cm.addLineClass(o,"wrap","ruler")):(cm.removeLineClass(o,"wrap","ruler"),cm.addLineClass(o,"wrap","noRuler")),cm.removeLineClass(o,"gutter","lineNoError");let c="",l=o.text.trim().split("//")[0].split("#")[0];if(l)try{l=r>1&&l.charAt(0).match(/[+\-*/]/)&&cm.getLine(r-2).length>0&&settings.app.contPrevLine?mathScope.ans+l:l,checkLocale()&&(l=l.replace(/[,;]/g,(e=>","===e?".":",")));try{c=math.evaluate(l,mathScope)}catch(e){if(l.match(/:/))try{math.evaluate(l.split(":")[0])}catch(e){l=l.substring(l.indexOf(":")+1)}for(;l.match(/\([^)]+\)/);){let e=l.substring(l.lastIndexOf("(")+1),t=l.substring(l.lastIndexOf("("));if(e=e.substring(0,e.indexOf(")")),t=t.substring(0,t.indexOf(")")+1),0===t.length)break;try{l=l.replace(t,a(e))}catch(e){break}}c=a(l)}if(void 0!==c){if(mathScope.ans=c,mathScope["line"+r]=c,isNaN(c)||(e.push(c),t.push(c),n.push(c)),c=formatAnswer(math.format(c,{notation:settings.app.expNotation?"exponential":"auto",lowerExp:settings.app.expLower,upperExp:settings.app.expUpper})),c.match(/\w\(x\)/)){const e=/\w\(x\)$/.test(c)?l.trim():c.trim();c=`<a class="plotButton" data-func="${e}">Plot</a>`,mathScope.ans=e,mathScope["line"+r]=e}}else n.length=0,c=""}catch(e){const t=String(e).replace(/'|"/g,"`");c=settings.app.lineErrors?`<a class="lineError" data-line="${r}" data-error="${t}">Error</a>`:"",settings.app.lineErrors&&cm.addLineClass(s,"gutter","lineNoError")}else n.length=0;i+=`\n      <div class="${settings.app.rulers?"ruler":"noRuler"}" line-no=${s} style="height:${o.height-1}px">\n        <span class="${c&&!c.startsWith("<a")?"answer":""}" >${c}</span>\n      </div>`})),$("#output").innerHTML=i,store.set("input",cm.getValue())}function stripAnswer(e){let t=e.length;return'"'===e.charAt(0)&&(e=e.substring(1,t--)),'"'===e.charAt(--t)&&(e=e.substring(0,t)),e}function formatAnswer(e){const t=(e=String(e)).trim().split(" ")[0],n=e.replace(t,""),i={maximumFractionDigits:settings.app.precision,useGrouping:settings.app.thouSep};return t.includes("e")||isNaN(t)?t.match(/e[+-]?\d+/)?Number(t.split("e")[0]).toLocaleString(settings.app.locale,i)+"e"+e.split("e")[1]+n:stripAnswer(e):Number(t).toLocaleString(settings.app.locale,i)+n}const udfList=[],uduList=[];function applyUdf(e){try{new Function(`'use strict'; math.import({${e}}, {override: true})`)(),store.set("udf",e);const t=new Function(`'use strict'; return {${e}}`)();for(const e in t)udfList.push(e);UIkit.modal("#dialog-udfu").hide()}catch(e){$("#udfSyntaxError").innerHTML=e}calculate()}function applyUdu(e){try{new Function(`'use strict'; math.createUnit({${e}}, {override: true})`)(),store.set("udu",e);const t=new Function(`'use strict'; return {${e}}`)();for(const e in t)uduList.push(e);UIkit.modal("#dialog-udfu").hide()}catch(e){$("#uduSyntaxError").innerHTML=e}calculate()}function registerHints(){const e=["ans","now","today","total","subtotal","avg"];Object.getOwnPropertyNames(math).forEach((t=>{"function"==typeof math[t]&&Object.getOwnPropertyNames(math[t]).includes("signatures")&&e.push(t)})),CodeMirror.commands.autocomplete=e=>{CodeMirror.showHint(e,CodeMirror.hint.numaraHints,{completeSingle:!1})},CodeMirror.registerHelper("hint","numaraHints",(t=>{const n=t.getCursor(),i=t.getLine(n.line);let a=n.ch,o=a;for(;o<i.length&&/[\w$]/.test(i.charAt(o));)++o;for(;a&&/[\w$]/.test(i.charAt(a-1));)--a;const s=a!==o&&i.slice(a,o),r=new RegExp("^"+s,"i");return{list:(s?e.filter((e=>e.match(r))):[]).sort(),from:CodeMirror.Pos(n.line,a),to:CodeMirror.Pos(n.line,o)}}))}function applySettings(){settings=store.get("settings"),$("#style").setAttribute("href","system"===settings.app.theme?isNode&&ipc.sendSync("isDark")?"css/dark.css":"css/light.css":"light"===settings.app.theme?"css/light.css":"css/dark.css"),isNode&&(ipc.send("setTheme",settings.app.theme),ipc.send("setOnTop",settings.app.alwaysOnTop));const e=$(".panelFont, .CodeMirror",!0);for(const t of e)t.style.fontSize=settings.app.fontSize,t.style.fontWeight=settings.app.fontWeight,t.style.setProperty("line-height",settings.app.lineHeight,"important");$("#input").style.width=(settings.app.divider?settings.inputWidth:defaultSettings.inputWidth)+"%",$("#divider").style.display=settings.app.divider?"block":"none",$("#output").style.textAlign=settings.app.divider?"left":"right",cm.setOption("mode",settings.app.syntax?"numara":"plain"),cm.setOption("lineNumbers",settings.app.lineNumbers),cm.setOption("lineWrapping",settings.app.lineWrap),cm.setOption("autoCloseBrackets",settings.app.closeBrackets),cm.setOption("matchBrackets",!(!settings.app.syntax||!settings.app.matchBrackets)&&{maxScanLines:1});const t="system"===settings.app.theme?isNode&&ipc.sendSync("isDark")?"material-darker":"default":"light"===settings.app.theme?"default":"material-darker";udfInput.setOption("theme",t),uduInput.setOption("theme",t),math.config({matrix:settings.app.matrixType,number:settings.app.numericOutput,predictable:settings.app.predictable}),setTimeout(calculate,10)}function showModal(e){UIkit.modal(e,{bgClose:!1,stack:!0}).show()}UIkit.util.on("#dialog-udfu","beforeshow",(()=>{$("#udfSyntaxError").innerHTML="",$("#uduSyntaxError").innerHTML="";const e=store.get("udf").trim(),t=store.get("udu").trim();udfInput.setValue(e),uduInput.setValue(t)})),UIkit.util.on("#dialog-udfu","shown",(()=>{udfInput.refresh(),uduInput.refresh()})),store.get("udf")||store.set("udf",""),store.get("udu")||store.set("udu",""),applyUdf(store.get("udf")),applyUdu(store.get("udu")),CodeMirror.defineMode("numara",(()=>({token:e=>{if(e.match(/\/\/.*/)||e.match(/#.*/))return"comment";if(e.match(/\d/))return"number";if(e.match(/(?:\+|-|\*|\/|,|;|\.|:|@|~|=|>|<|&|\||_|`|'|\^|\?|!|%)/))return"operator";e.eatWhile(/\w/);const t=e.current();if(settings.app.currencies&&(t.toLowerCase()in currencyRates||"usd"===t.toLowerCase()))return"currency";try{if(math.unit(t).units.length>0)return"unit"}catch(e){}if(udfList.includes(t))return"udf";if(uduList.includes(t))return"udu";if("function"==typeof math[t]&&Object.getOwnPropertyNames(math[t]).includes("signatures"))return"function";if(t.match(/\b(?:ans|total|subtotal|avg|today|now)\b/))return"scope";if(t.match(/\b(?:line\d+)\b/))return"lineNo";try{math.evaluate(t)}catch(e){return"variable"}return e.next(),"space"}}))),CodeMirror.defineMode("plain",(()=>({token:e=>(e.next(),"text")}))),registerHints(),cm.on("changes",calculate),cm.on("inputRead",(e=>{settings.app.autocomplete&&CodeMirror.commands.autocomplete(e)})),cm.on("update",(()=>{const e=$(".cm-function",!0);if(e.length>0&&settings.app.keywordTips)for(const t of e)try{const e=JSON.stringify(math.help(t.innerText).toJSON()),n=JSON.parse(e);UIkit.tooltip(t,{title:n.description,pos:"top-left"})}catch(e){UIkit.tooltip(t,{title:"Description not available.",pos:"top-left"})}const t=$(".cm-udf",!0);if(t.length>0&&settings.app.keywordTips)for(const e of t)UIkit.tooltip(e,{title:"User defined function.",pos:"top-left"});const n=$(".cm-udu",!0);if(n.length>0&&settings.app.keywordTips)for(const e of n)UIkit.tooltip(e,{title:"User defined unit.",pos:"top-left"});const i=$(".cm-currency",!0);if(i.length>0&&settings.app.keywordTips)for(const e of i)try{const t=e.innerText.toLowerCase(),n="usd"===t?"U.S. Dollar":currencyRates[t].name;UIkit.tooltip(e,{title:n,pos:"top-left"})}catch(t){UIkit.tooltip(e,{title:"Description not available.",pos:"top-left"})}const a=$(".cm-unit",!0);if(a.length>0&&settings.app.keywordTips)for(const e of a)UIkit.tooltip(e,{title:`Unit '${e.innerText}'`,pos:"top-left"});const o=$(".cm-variable",!0);if(o.length>0&&settings.app.keywordTips)for(const e of o)if(mathScope[e.innerText]&&"function"!=typeof mathScope[e.innerText]){let t;try{t=formatAnswer(math.evaluate(e.innerText,mathScope))}catch(e){t="Undefined"}UIkit.tooltip(e,{title:t,pos:"top-left"})}const s=$(".cm-lineNo",!0);if(s.length>0&&settings.app.keywordTips)for(const e of s){let t;try{t=formatAnswer(math.evaluate(e.innerText,mathScope))}catch(e){t="Undefined"}UIkit.tooltip(e,{title:t,pos:"top-left"})}})),applySettings(),settings.app.currencies&&getRates(),UIkit.mixin({data:{delay:500,offset:5}},"tooltip"),UIkit.util.on(".modal","hidden",(()=>{cm.focus()})),UIkit.util.on(".uk-switcher","show",(()=>{cm.getInputField().blur()}));const savedCount=()=>Object.keys(store.get("saved")||{}).length;function updateSavedCount(){UIkit.tooltip("#openButton",{title:"Open ("+Object.keys(store.get("saved")||{}).length+")"})}function populateSaved(){const e=store.get("saved")||{},t=Object.entries(e);$("#dialog-open-body").innerHTML="",t.length>0?($("#dialog-open-deleteAll").disabled=!1,t.forEach((([e,t])=>{$("#dialog-open-body").innerHTML+=`\n          <div class="dialog-open-wrapper" id="${e}">\n            <div data-action="load">\n              <div class="dialog-open-title">${t[0]}</div>\n              <div class="dialog-open-date">${DateTime.fromFormat(e,"yyyyMMddHHmmssSSS").toFormat("ff")}</div>\n            </div>\n            <span class="dialog-open-delete" data-action="delete"><i icon-name="x-circle"></i></span>\n          </div>`})),lucide.createIcons()):($("#dialog-open-deleteAll").disabled=!0,$("#dialog-open-body").innerHTML="No saved calculations."),updateSavedCount()}function prepSettings(){const e=[["System","system"],["Chinese (PRC)","zh-CN"],["English (Canada)","en-CA"],["English (UK)","en-GB"],["English (US)","en-US"],["French (France)","fr-FR"],["German (Germany)","de-DE"],["Italian (Italy)","it-IT"],["Japanese (Japan)","ja-JP"],["Portuguese (Brazil)","pt-BR"],["Russian (Russia)","ru-RU"],["Spanish (Mexico)","es-MX"],["Spanish (Spain)","es-ES"],["Turkish (Turkey)","tr-TR"]],t=["Matrix","Array"],n=["number","BigNumber","Fraction"];$("#themeList").value=settings.app.theme,$("#alwaysOnTop").checked=settings.app.alwaysOnTop,$("#fontSize").value=settings.app.fontSize,$("#fontWeight").value=settings.app.fontWeight,$("#lineHeight").value=settings.app.lineHeight,$("#locale").innerHTML="";for(const t of e)$("#locale").innerHTML+=`<option value="${t[1]}">${t[0]}</option>`;$("#locale").value=settings.app.locale,$("#dateDay").checked=settings.app.dateDay,$("#syntaxButton").checked=settings.app.syntax,$("#keywordTipsButton").checked=settings.app.keywordTips,$("#matchBracketsButton").checked=settings.app.matchBrackets,$("#precisionRange").value=settings.app.precision,$("#precision-label").innerHTML=settings.app.precision,$("#expLowerRange").value=settings.app.expLower,$("#expLower-label").innerHTML=settings.app.expLower,$("#expUpperRange").value=settings.app.expUpper,$("#expUpper-label").innerHTML=settings.app.expUpper,$("#expNotationButton").checked=settings.app.expNotation,$("#numericOutput").innerHTML="";for(const e of n)$("#numericOutput").innerHTML+=`<option value="${e}">${e.charAt(0).toUpperCase()+e.slice(1)}</option>`;$("#numericOutput").value=settings.app.numericOutput,$("#contPrevLineButton").checked=settings.app.contPrevLine,$("#matrixType").innerHTML="";for(const e of t)$("#matrixType").innerHTML+=`<option value="${e}">${e}</option>`;$("#matrixType").value=settings.app.matrixType,$("#predictableButton").checked=settings.app.predictable,$("#thouSepButton").checked=settings.app.thouSep,$("#currencyButton").checked=settings.app.currencies,$("#lastUpdated").innerHTML=settings.app.currencies?store.get("rateDate"):"",$("#currencyUpdate").style.display=settings.app.currencies?"block":"none",$("#autocompleteButton").checked=settings.app.autocomplete,$("#closeBracketsButton").checked=settings.app.closeBrackets,$("#dividerButton").checked=settings.app.divider,$("#lineNoButton").checked=settings.app.lineNumbers,$("#rulersButton").checked=settings.app.rulers,$("#lineErrorButton").checked=settings.app.lineErrors,$("#lineWrapButton").checked=settings.app.lineWrap,localeWarning(),bigNumberWarning(),syntaxToggle(),checkDefaultSettings(),checkWindowSize()}function checkDefaultSettings(){$("#defaultSettingsButton").style.display=DeepDiff.diff(settings.app,defaultSettings.app)?"inline":"none"}function checkWindowSize(){$("#resetSizeButton").style.display=isNode&&ipc.sendSync("isResized")&&!ipc.sendSync("isMaximized")?"block":"none"}function checkLocale(){let e="system"===settings.app.locale?navigator.languages&&navigator.languages.length?navigator.languages[0]:navigator.language:settings.app.locale;return 1.11.toLocaleString(e).match(/[,]/)}function localeWarning(){$("#localeWarn").style.display=checkLocale()?"inline-block":"none"}function bigNumberWarning(){$("#bigNumWarn").style.display="BigNumber"===settings.app.numericOutput?"inline-block":"none"}function syntaxToggle(){$("#keywordTipsButton").disabled=!$("#syntaxButton").checked,$("#matchBracketsButton").disabled=!$("#syntaxButton").checked,$("#keywordTipsButton").parentNode.style.opacity=$("#syntaxButton").checked?"1":"0.5",$("#matchBracketsButton").parentNode.style.opacity=$("#syntaxButton").checked?"1":"0.5"}function saveSettings(){settings.app.theme=$("#themeList").value,settings.app.alwaysOnTop=$("#alwaysOnTop").checked,settings.app.fontSize=$("#fontSize").value,settings.app.fontWeight=$("#fontWeight").value,settings.app.lineHeight=$("#lineHeight").value,settings.app.locale=$("#locale").value,settings.app.dateDay=$("#dateDay").checked,settings.app.syntax=$("#syntaxButton").checked,settings.app.keywordTips=$("#keywordTipsButton").checked,settings.app.matchBrackets=$("#matchBracketsButton").checked,settings.app.precision=$("#precisionRange").value,settings.app.expLower=$("#expLowerRange").value,settings.app.expUpper=$("#expUpperRange").value,settings.app.expNotation=$("#expNotationButton").checked,settings.app.numericOutput=$("#numericOutput").value,settings.app.contPrevLine=$("#contPrevLineButton").checked,settings.app.matrixType=$("#matrixType").value,settings.app.predictable=$("#predictableButton").checked,settings.app.thouSep=$("#thouSepButton").checked,!settings.app.currencies&&$("#currencyButton").checked?getRates():$("#currencyButton").checked||(localStorage.removeItem("rateDate"),currencyRates={}),settings.app.currencies=$("#currencyButton").checked,settings.app.autocomplete=$("#autocompleteButton").checked,settings.app.closeBrackets=$("#closeBracketsButton").checked,settings.app.divider=$("#dividerButton").checked,settings.app.lineNumbers=$("#lineNoButton").checked,settings.app.rulers=$("#rulersButton").checked,settings.app.lineErrors=$("#lineErrorButton").checked,settings.app.lineWrap=$("#lineWrapButton").checked,store.set("settings",settings),localeWarning(),bigNumberWarning(),checkDefaultSettings(),applySettings()}let resizeDelay;updateSavedCount(),$("#actions").addEventListener("click",(e=>{switch(e.target.id){case"clearButton":""!==cm.getValue()&&(cm.setValue(""),cm.focus(),calculate());break;case"printButton":UIkit.tooltip("#printButton").hide(),$("#print-title").innerHTML=appInfo.productName,$("#printBox").innerHTML=$("#panel").innerHTML,isNode?(ipc.send("print"),ipc.on("printReply",((e,t)=>{t&&notify(t),$("#printBox").innerHTML=""}))):window.print();break;case"copyButton":copyAllCalculations();break;case"saveButton":$("#saveTitle").value="",showModal("#dialog-save"),$("#saveTitle").focus();break;case"openButton":showModal("#dialog-open");break;case"udfuButton":showModal("#dialog-udfu");break;case"settingsButton":showModal("#dialog-settings");break;case"helpButton":showModal("#dialog-help"),$("#searchBox").focus();break;case"aboutButton":showModal("#dialog-about")}e.stopPropagation()})),isNode?($("#dialog-save-export").addEventListener("click",(()=>{ipc.send("export",$("#saveTitle").value,cm.getValue())})),ipc.on("exportData",((e,t)=>{UIkit.modal("#dialog-save").hide(),notify(t,"success")})),ipc.on("exportDataError",((e,t)=>{notify(t,"danger")})),$("#dialog-save-import").addEventListener("click",(()=>{ipc.send("import")})),ipc.on("importData",((e,t,n)=>{UIkit.modal("#dialog-open").hide(),cm.setValue(t),notify(n,"success")})),ipc.on("importDataError",((e,t)=>{notify(t,"danger")}))):($("#dialog-save-export").remove(),$("#dialog-save-import").remove()),$("#output").addEventListener("click",(e=>{switch(e.target.className){case"answer":navigator.clipboard.writeText(e.target.innerText),notify(`Copied '${e.target.innerText}' to clipboard.`);break;case"plotButton":func=e.target.getAttribute("data-func");try{$("#plotGrid").checked=settings.plot.plotGrid,$("#plotCross").checked=settings.plot.plotCross,$("#plotArea").checked=settings.plot.plotArea,plot(),showModal("#dialog-plot")}catch(e){showError(e)}break;case"lineError":showError(e.target.getAttribute("data-error"),"Error on Line "+e.target.getAttribute("data-line"))}e.stopPropagation()})),$("#output").addEventListener("mousedown",(()=>{const e=document.getElementsByClassName("CodeMirror-selected");for(;e[0];)e[0].classList.remove("CodeMirror-selected")})),document.addEventListener("keydown",(e=>{refreshCM=!e.repeat})),document.addEventListener("keyup",(()=>{refreshCM=!0})),document.addEventListener("click",(e=>{switch(e.target.id){case"dialog-save-save":{const e=DateTime.local().toFormat("yyyyMMddHHmmssSSS"),t=store.get("saved")||{},n=cm.getValue(),i=$("#saveTitle").value.replace(/<|>/g,"").trim()||"No title";t[e]=[i,n],store.set("saved",t),UIkit.modal("#dialog-save").hide(),updateSavedCount(),notify(`Saved as '${i}' <a class="notificationLink" onclick="document.querySelector('#openButton').click()">View saved calculations</a>`);break}case"dialog-open-deleteAll":confirm("All saved calculations will be deleted.",(()=>{localStorage.removeItem("saved"),populateSaved()}));break;case"dialog-udfu-save-f":applyUdf(udfInput.getValue().trim());break;case"dialog-udfu-save-u":applyUdu(uduInput.getValue().trim());break;case"defaultSettingsButton":confirm("All settings will revert back to defaults.",(()=>{settings.app=defaultSettings.app,store.set("settings",settings),applySettings(),$("#currencyButton").checked||getRates(),prepSettings()}));break;case"dialog-settings-reset":confirm("All user settings and data will be lost.",(()=>{isNode?ipc.send("resetApp"):(localStorage.clear(),location.reload())}));break;case"resetSizeButton":isNode&&ipc.send("resetSize");break;case"syntaxButton":syntaxToggle();break;case"localeWarn":showError(`Your locale (${settings.app.locale}) uses comma (,) as decimal separator.  Therefore, you must use semicolon (;) as argument separator when using functions.<br><br>Ex. sum(1;3) // 4`,"Caution: Locale");break;case"bigNumWarn":showError('Using the BigNumber may break function plotting and is not compatible with some math functions. \n          It may also cause unexpected behavior and affect overall performance.<br><br>\n          <a target="_blank" href="https://mathjs.org/docs/datatypes/bignumbers.html">Read more on BigNumbers</a>',"Caution: BigNumber Limitations");break;case"currencyButton":$("#currencyUpdate").style.visibility=$("#currencyButton").checked?"visible":"hidden";break;case"plotGrid":settings.plot.plotGrid=$("#plotGrid").checked,store.set("settings",settings),plot();break;case"plotCross":settings.plot.plotCross=$("#plotCross").checked,store.set("settings",settings),plot();break;case"plotArea":settings.plot.plotArea=$("#plotArea").checked,store.set("settings",settings),plot();break;case"restartButton":ipc.send("updateApp");break;case"demoButton":cm.setValue(demo),calculate(),UIkit.modal("#dialog-help").hide()}})),$("#dialog-open").addEventListener("click",(e=>{let t;const n=store.get("saved");"load"===e.target.parentNode.getAttribute("data-action")&&(t=e.target.parentNode.parentNode.id,cm.setValue(n[t][1]),calculate(),UIkit.modal("#dialog-open").hide()),"delete"===e.target.getAttribute("data-action")&&(t=e.target.parentNode.id,confirm('Calculation "'+n[t][0]+'" will be deleted.',(()=>{delete n[t],store.set("saved",n),populateSaved()})))})),UIkit.util.on("#dialog-open","beforeshow",populateSaved),UIkit.util.on("#setswitch","beforeshow",(e=>{e.stopPropagation()})),UIkit.util.on("#dialog-settings","beforeshow",prepSettings),UIkit.util.on("#dialog-settings","hidden",(()=>{cm.focus()})),$("#precisionRange").addEventListener("input",(()=>{$("#precision-label").innerHTML=$("#precisionRange").value})),$("#expLowerRange").addEventListener("input",(()=>{$("#expLower-label").innerHTML=$("#expLowerRange").value})),$("#expUpperRange").addEventListener("input",(()=>{$("#expUpper-label").innerHTML=$("#expUpperRange").value})),document.querySelectorAll(".settingItem").forEach((e=>{e.addEventListener("change",saveSettings)})),$("#searchBox").addEventListener("input",(()=>{const e=$("#searchBox").value.trim();if(e)try{const t=JSON.parse(JSON.stringify(math.help(e).toJSON()));$("#searchResults").innerHTML=`\n          <div>Name:</div><div>${t.name}</div>\n          <div>Description:</div><div>${t.description}</div>\n          <div>Category:</div><div>${t.category}</div>\n          <div>Syntax:</div><div>${String(t.syntax).split(",").join(", ")}</div>\n          <div>Examples:</div><div>${String(t.examples).split(",").join(", ")}</div>\n          <div>Also see:</div><div>${String(t.seealso).split(",").join(", ")}</div>`}catch(t){$("#searchResults").innerHTML=`No results for "${e}"`}else $("#searchResults").innerHTML="Start typing above to search..."}));let isResizing=!1;const panel=$("#panel"),divider=$("#divider");function resetDivider(){settings.inputWidth=defaultSettings.inputWidth,store.set("settings",settings),applySettings()}let func,activePlot;$("#divider").addEventListener("dblclick",resetDivider),$("#divider").addEventListener("mousedown",(e=>{isResizing=e.target===divider})),$("#panel").addEventListener("mouseup",(()=>{isResizing=!1})),$("#panel").addEventListener("mousemove",(e=>{if(isResizing){const t=settings.app.lineNumbers?12:27,n=(e.clientX-panel.offsetLeft-t)/panel.clientWidth*100,i=n<0?0:n>100?100:n;$("#input").style.width=i+"%",settings.inputWidth=i,store.set("settings",settings),clearTimeout(resizeDelay),resizeDelay=setTimeout(calculate,10)}}));const numaraPlot=window.functionPlot;function plot(){$("#plotTitle").innerHTML=func;const e=func.split("=")[1];let t=2*math.abs(math.evaluate(e,{x:0}));t!==1/0&&0!==t||(t=10);const n=activePlot?activePlot.meta.xScale.domain():[-t,t],i=activePlot?activePlot.meta.yScale.domain():[-t,t];activePlot=numaraPlot({target:"#plot",height:$("#plot").clientHeight,width:$("#plot").clientWidth,xAxis:{domain:n},yAxis:{domain:i},tip:{xLine:settings.plot.plotCross,yLine:settings.plot.plotCross},grid:settings.plot.plotGrid,data:[{fn:e,graphType:"polyline",closed:settings.plot.plotArea}],plugins:[numaraPlot.plugins.zoomBox()]})}let windowResizeDelay;function confirm(e,t){$("#confirmMsg").innerHTML=e,showModal("#dialog-confirm");const n=e=>{t(),e.stopPropagation(),UIkit.modal("#dialog-confirm").hide(),$("#confirm-yes").removeEventListener("click",n)};$("#confirm-yes").addEventListener("click",n),UIkit.util.on("#dialog-confirm","hidden",(()=>{$("#confirm-yes").removeEventListener("click",n)}))}function showError(e,t){UIkit.util.on("#dialog-error","beforeshow",(()=>{$("#errTitle").innerHTML=t||"Error",$("#errMsg").innerHTML=e})),showModal("#dialog-error")}function notify(e,t){UIkit.notification({message:e,status:t||"primary",pos:"bottom-center",timeout:3e3})}UIkit.util.on("#dialog-plot","shown",plot),UIkit.util.on("#dialog-plot","hide",(()=>{activePlot=!1})),window.addEventListener("resize",(()=>{activePlot&&$("#dialog-plot").classList.contains("uk-open")&&plot(),clearTimeout(windowResizeDelay),windowResizeDelay=setTimeout(calculate,10),checkWindowSize()}));let inputScroll=!1,outputScroll=!1;const leftSide=$(".CodeMirror-scroll"),rightSide=$("#output");leftSide.addEventListener("scroll",(()=>{inputScroll||(outputScroll=!0,rightSide.scrollTop=leftSide.scrollTop),inputScroll=!1})),rightSide.addEventListener("scroll",(()=>{outputScroll||(inputScroll=!0,leftSide.scrollTop=rightSide.scrollTop),outputScroll=!1,$("#scrollTop").style.display=$("#output").scrollTop>50?"block":"none"})),$("#scrollTop").addEventListener("click",(()=>{$("#output").scrollTop=0}));const traps={clearButton:["command+d","ctrl+d"],printButton:["command+p","ctrl+p"],saveButton:["command+s","ctrl+s"],openButton:["command+o","ctrl+o"]};for(const[e,t]of Object.entries(traps))Mousetrap.bindGlobal(t,(t=>{t.preventDefault(),0===$(".uk-open",!0).length&&$("#"+e).click()}));function mainContext(){setTimeout((()=>{const e=cm.getCursor().line,t=cm.getLine(e),n=$("#output").children[e].innerText,i=""===cm.getValue(),a=t.length>0,o=cm.somethingSelected(),s=cm.listSelections().length>1||cm.listSelections()[0].anchor.line!==cm.listSelections()[0].head.line,r=""!==n&&"Error"!==n&&"Plot"!==n;ipc.send("mainContextMenu",e,i,a,o,s,r)}),20)}function outputContext(e){const t=e.srcElement.getAttribute("line-no")||e.srcElement.parentElement.getAttribute("line-no"),n=e.srcElement.innerText,i=""===cm.getValue(),a=null!==t&&""!==n&&"Error"!==n&&"Plot"!==n;ipc.send("outputContextMenu",t,i,a)}function altContext(){setTimeout((()=>{ipc.send("altContextMenu")}),20)}function copyAnswer(e,t,n){t=+t;const i=cm.getLine(t).trim(),a=$("#output").children[t].innerText,o=n?`${i} = ${a}`:`${a}`;navigator.clipboard.writeText(o),notify(n?`Copied Line${t+1} with answer to clipboard.`:`Copied '${a}' to clipboard.`)}function copySelectedAnswers(e,t){const n=cm.listSelections();let i="";n.forEach((e=>{const n=[e.anchor.line,e.head.line],a=Math.min(...n),o=Math.max(...n)+1;for(let e=a;e<o;e++){const n=cm.getLine(e).trim(),a=$("#output").children[e].innerText;i+=n?n.match(/^(#|\/\/)/)?t?`${n}\n`:"":t?`${n} = ${a}\n`:`${a}\n`:""}})),navigator.clipboard.writeText(i),notify(t?"Copied selected lines with answers to clipboard.":"Copied selected answers to clipboard.")}function copyAllCalculations(){if(""===cm.getValue())notify("Nothing to copy.");else{let e="";cm.eachLine((t=>{const n=cm.getLineNumber(t);t=t.text.trim(),e+=t?t.match(/^(#|\/\/)/)?`${t}\n`:`${t} = ${$("#output").children[n].innerText}\n`:"\n"})),navigator.clipboard.writeText(e),notify("Copied all calculations to clipboard.")}}isNode&&(cm.on("contextmenu",mainContext),udfInput.on("contextmenu",altContext),uduInput.on("contextmenu",altContext),$("#output").addEventListener("contextmenu",outputContext),$(".textBox",!0).forEach((e=>{e.addEventListener("contextmenu",altContext)})),ipc.on("copyAnswer",copyAnswer),ipc.on("copyLineWithAnswer",copyAnswer),ipc.on("copySelectedAnswers",copySelectedAnswers),ipc.on("copySelectedLinesWithAnswers",copySelectedAnswers),ipc.on("copyAllCalculations",copyAllCalculations)),isNode&&(ipc.send("checkUpdate"),ipc.on("notifyUpdate",(()=>{notify('Updating Numara... <a class="notificationLink" onclick="document.querySelector(`#aboutButton`).click()">View update status</a>'),$("#notificationDot").style.display="block"})),ipc.on("updateStatus",((e,t)=>{"ready"===t?($("#dialog-about-updateStatus").innerHTML="Restart Numara to finish updating.",$("#restartButton").style.display="inline-block",$("#dialog-about").classList.contains("uk-open")||notify('Restart Numara to finish updating. <a class="notificationLink" onclick="document.querySelector(`#restartButton`).click()">Restart Now</a>')):$("#dialog-about-updateStatus").innerHTML=t})));const demo="1+2\n\n    # In addition to mathjs functions, you can do:\n    ans // Get last answer\n    total // Total up to this point\n    avg // Average up to this point\n    line4 // Get answer from a line#\n    subtotal // Subtotal last block\n\n    # Percentages:\n    10% of 20\n    40 + 30%\n\n    # Dates\n    today\n    now\n    today - 3 weeks\n    now + 36 hours - 2 days\n\n    # Currency conversion\n    1 usd to try\n    20 cad to usd\n\n    # Plot functions\n    f(x) = sin(x)\n    f(x) = 2x^2 + 3x - 5\n    ".replace(/^ +/gm,"");setTimeout((()=>{$(".CodeMirror-code").lastChild.scrollIntoView()}),250),setTimeout((()=>{cm.focus()}),500);