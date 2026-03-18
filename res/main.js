//--------------------------------------------------------------------
// Data11
//--------------------------------------------------------------------
function GetParam(key){
	let url = new URL(window.location.href);
	let params = url.searchParams;
	let temp = params.get(key);
	if(temp == null)temp = "";
	return temp;
}
//--------------------------------------------------------------------

let _PDF;
let _CVS;
let _CvsCnt;
let _DispIndex = 1;
let _MODE_R = false;
let _MODE_B = false;

//==============================================================================
const DB_NAME = 'KanacPdf';
const DB_VERSION = 1;

function ActDB(code,opt){
	const ORX = indexedDB.open(DB_NAME, DB_VERSION);

	ORX.onsuccess = async function(event){
		const db = event.target.result;
		const cOS = db.transaction("PDFData", 'readwrite').objectStore("PDFData");
		
		if(code == "INSERT"){
			cOS.add(opt);
			console.log("追加完了");
		}
		
		if(code == "SELECT"){
			const gRB = cOS.get(opt);
			gRB.onsuccess = async function(event){
				const loadingTask = pdfjsLib.getDocument(gRB.result.VALUE);
				_PDF = await loadingTask.promise;
				$("#s2").text(_PDF._pdfInfo.numPages);
				_ImageDraw(1);
			}
		}
		
		if(code == "LIST"){
			const gRB = cOS.getAll();
			gRB.onsuccess = async function(event){
				const _temp = $(".template");
				
				const datas = gRB.result;
				datas.forEach(function(dc){
					const temp = _temp.clone();
					$(temp).removeClass('template');
					$(temp).find("a").attr("href", "./view.html?param=" + dc.NAME);
					$(temp).find("a").text(dc.NAME);
					$(temp).find("div").attr("onclick", "Act_Remove('" + dc.NAME + "');");
					$("ul").append(temp);
				});
			}
		}
		db.close();
	}

	ORX.onupgradeneeded = (event) => {
		const db = event.target.result;
		db.createObjectStore("PDFData", { keyPath: "NAME" });
		console.log("初回起動・DB追加");
		db.close();
	}
}

//==============================================================================
async function view_top(){
	if (navigator.storage && navigator.storage.estimate) {
		const quota = await navigator.storage.estimate();
		const percentageUsed = (quota.usage / quota.quota) * 100;
		$("span").text(quota.quota - quota.usage);
		
		ActDB("LIST",{});
		
		const temp = localStorage.getItem("KC_IP");
		$("#ThisIP").val(temp);
	}else{
		alert("エラー");
	}
}

function view_init(){
	pdfjsLib.GlobalWorkerOptions.workerSrc = "./res/pdf.worker.js";
	
	ActDB("SELECT",GetParam('param'));
	
	_CVS = $("canvas")[0];
	_CvsCnt = _CVS.getContext("2d");
	
	$('body').on('click', 'input' , function() {
		const Type = $(this).attr("id");
		
		if(Type == 'b1'){
			_ImageNumberChange(1);
		}
		
		if(Type == 'b2'){
			_ImageNumberChange(-1);
		}
		
		if(Type == 'b3'){
			if(_MODE_R){
				_MODE_R = false;
				$('section').removeClass("IsL");
			}else{
				_MODE_R = true;
				$('section').addClass("IsL");
			}
		}
		
		if(Type == 'b4'){
			if(_MODE_B){
				_MODE_B = false;
				$('section').removeClass("IsB");
			}else{
				_MODE_B = true;
				$('section').addClass("IsB");
			}
		}
	});
}

function view_src(){
	if(GetParam("sc") != ""){
		console.log("せつぞく");
		const xrc = GetParam("rc");
		const xrs = GetParam("sc");
		$("#TypeNum").val(xrc);
		$("#SearchWord").val(xrs);

		$.ajax({
			type: 'GET',
			url: 'https://' + localStorage.getItem("KC_IP") + '/search.php?rc=' + xrc + '&sc=' + GetParam("sc"),
			dataType: 'json',
		}).done((data, textStatus, jqXHR) => {
			const _temp = $(".template");
			const datas = data.value;
			datas.forEach(function(dc){
				
				const fileName = dc.split(xrc)[1].substring(1).split(".")[0];
				
				const temp = _temp.clone();
				$(temp).removeClass('template');
				$(temp).find("span").text(fileName);
				$(temp).find("a").attr("href", "./view.html?param=" + fileName + "&pre=true");
				
				$(temp).find("div").attr("onclick", "Act_DataAdd('" + fileName + "');");
				$("ul").append(temp);
			});
		}).fail((jqXHR, textStatus, errorThrown) => {
			AddLog("エラーです");
		});
	}
}
//==============================================================================
function AddLog(data){
	$("textarea").text($("textarea").text() + data + "\n")
}

function ConnectTest(){
	const $a = document.createElement('a');

	$a.setAttribute('href', "https://" + $("#ThisIP").val() + "/index.php");
	$a.setAttribute('target', '_blank');
	$a.setAttribute('rel', 'noopener noreferrer');

	document.body.appendChild($a);
	$a.click();
	document.body.removeChild($a);
}

function IPSave(){
	localStorage.setItem("KC_IP", $("#ThisIP").val());
}

function Act_Remove(data){
	
}
function Act_DataAdd(name){
	AddLog("データ追加開始");
	
	$.ajax({
		type: 'GET',
		url: 'https://' + localStorage.getItem("KC_IP") + '/GetData.php?target=' + name,
		dataType: 'json',
	}).done((data, textStatus, jqXHR) => {
		ActDB("INSERT",{
			"NAME":name,
			"VALUE":"data:application/pdf;base64," + data.value
		});
		AddLog("正常終了");
	}).fail((jqXHR, textStatus, errorThrown) => {
		AddLog("エラーです");
	});
}

function Connect(){
	location.href = "./search.html?rc=" + $("#TypeNum").val() + "&sc=" + $("#SearchWord").val();
}
//--------------







//==============================================================================
function _ImageNumberChange(add){
	const max = _PDF._pdfInfo.numPages;
	
	let temp = _DispIndex + add;
	if((temp > 0) && (temp <= max)){
		_ImageDraw(temp);
		_DispIndex = temp;
	}else{
		console.log("ぬーん");
	}
}

async function _ImageDraw(pgNo){
	const page = await _PDF.getPage(pgNo);
	_CVS.width = page.view[2];
	_CVS.height = page.view[3];
	
	let scale = 1.0;
	let pv01 = page.view[2];
	let pv02 = page.view[3];
	let sc01 = 0;
	let sc02 = 0;
	let bc01 = 0;
	let bc02 = 0;
	
	if(_MODE_R){
		sc01 = $("body").width() / page.view[3];
		sc02 = $("body").height() / page.view[2];
	}else{
		sc01 = $("body").height() / page.view[3];
		sc02 = $("body").width() / page.view[2];
	}
	
	if(sc01 > sc02){
		scale = sc02;
	}else{
		scale = sc01;
	}
	
	const viewport = page.getViewport({ scale });
	bc01 = pv01 / viewport.width;
	bc02 = pv02 / viewport.height;

	//位置を合わせる Flexで中央揃えはしている
	_CVS.style.width = Math.floor(viewport.width) + "px";
	_CVS.style.height = Math.floor(viewport.height) + "px";

	const transform = [bc01, 0, 0, bc02, 0, 0] ;
	page.render({
		canvasContext: _CvsCnt,
		transform,
		viewport,
	});
	
	$("#s1").text(pgNo);
}
//--------------------------------------------------------------------