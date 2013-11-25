var the_tab = null;
var xpath = '//*[@id="Table10"]';
var tick = new Image(18,18);
tick.src = "tick.png";
var cross = new Image(18,18);
cross.src = "cross.png";

function GetDist(dist,city_number){
  for(var i=cityarea_account[city_number-1];i<=cityarea_account[city_number];i++){
    if(dist==cityarea[i]){
    	return i;
    }
  }
  return -1;
}

function GetCity(cityname){
  for(var i=0;i<city_names.length;i++){
    if(cityname===city_names[i]){
      return i;
    }
  }
  return -1;
}

/*Expand this function make it more robust*/
function verify_city(str){
  if(str.length>=3){
    if(str.match(/[a-zA-Z]/g))return false;
    if(str.match(/[1-9]/g))return false;
    var city = str.substring(0,3);
    var dist = str.substring(3,str.length);
    var city_number = GetCity(city);
    if(city_number<0)return false;
    if(dist==="")return true;
    var dist_number = GetDist(dist,city_number);
    if(dist_number<0)return false;
    return true;
  }
  return false;
}

function verify_street(str){
  if(str.length>=1){
    if(str.match(/[a-zA-Z]/g))return false;
    if(str.match(/[1-9]/g))return false;
    return true;
  }
  return false;
}

function submit(){
  var str = document.query_form.city.value;
  var city = str.substring(0,3);
  var dist = str.substring(3,str.length);
  var city_number = GetCity(city);
  var dist_number = GetDist(dist,city_number);
  $("#table").empty();
  var cn = "";
  var an = "%";
  var rn = "";
  urlencode(city_names[city_number],'big5',function(str){
    cn=str;
    var city_area_name = "%";
    if(dist_number>=0)city_area_name = cityarea[dist_number];
    urlencode(city_area_name,'big5',function(str){
      an=str;
      urlencode(document.query_form.street.value,'big5',function(str){
        rn=str;
        fire(cn,an,rn);
      });
    });
  });
}

function fire(cn,an,rn){
  if(cn!=="" && an!=="" && rn!==""){
    $.post('http://www.post.gov.tw/post/internet/f_searchzone/sz_zip_search.jsp',
      "city_t="+cn+"&cityarea_t="+an+"&road="+rn+"&ID=&list=2&sec=%",
    function(data){
      var element = $(data);
      $.each(element,function(i,d){
        $("#table").html($(d).find("#Table10").html());
        $("#table tbody tr:nth-child(even)").css("background-color","#eee");
        $("#table tbody tr:nth-child(odd)").css("background-color","#efe");
      });
      if($("#table").is(":empty")){
        $("#table").text("查無資料");
      }
    }
    );
  }
}

function main(){
  setTimeout(function(){addScript('data.js',function(){console.log('done');})},1000);
  setTimeout(function(){addScript('word_pool.js',function(){console.log('done.word_pool');})},800);
  $("#btn").click(submit);
  $("#city").on('input',update_input);
  $("#street").on('input',street_input);
  $('#street').bind("enterKey",function(e){
    submit();
  });
  $('#street').keyup(function(event){
    if(event.keyCode==13){
      $(this).trigger('enterKey');
    }
  });
  $('#city').tooltip({animation:true,trigger:'hover',container:'body'});
  $('#street').tooltip({animation:true,trigger:'hover',container:'body'});
}

function addScript(scriptURL, onload) {
   var script = document.createElement('script');
   //script.setAttribute("type", "application/javascript");
   script.setAttribute("src", scriptURL);
   if (onload) script.onload = onload;
   document.documentElement.appendChild(script);
}

function street_input(){
  var st = $(document.query_form.street);
  if(!verify_street(st.val())){
    document.query_form.hint_street.src = "cross.png";
  }else{
    document.query_form.hint_street.src = "";
  }
}

function update_input(){
  var ct = $(document.query_form.city);
  if(verify_city(ct.val())){
    document.query_form.hint_city.src="tick.png";
  }else{
    document.query_form.hint_city.src="cross.png";
  }
}

function tab_create_callback(tab){
  alert("done!");
  the_tab = tab;
}

function urlencode(str, charset, callback) {
  //创建form通过accept-charset做encode
  var form = document.createElement('form');
  form.method = 'get';
  form.style.display = 'none';
  form.acceptCharset = charset;
  if (document.all) {
          //如果是IE那么就调用document.charset方法
          window.oldCharset = document.charset;
          document.charset = charset;
  }
  var input = document.createElement('input');
  input.type = 'hidden';
  input.name = 'str';
  input.value = str;
  form.appendChild(input);
  form.target = '_urlEncode_iframe_';
  document.body.appendChild(form);
  //隐藏iframe截获提交的字符串
  if (!window['_urlEncode_iframe_']) {
          var iframe;
          if(document.all){
                  try{
                          iframe = document.createElement('<iframe name="_urlEncode_iframe_"></iframe>');
                  }catch(e){
                          iframe = document.createElement('iframe');
                          //iframe.name = '_urlEncode_iframe_';
                          iframe.setAttribute('name', '_urlEncode_iframe_');
                  }
          }else{
                  iframe = document.createElement('iframe');
                  //iframe.name = '_urlEncode_iframe_';
                  iframe.setAttribute('name', '_urlEncode_iframe_');
          }
          iframe.style.display = 'none';
          iframe.width = "0";
          iframe.height = "0";
          iframe.scrolling = "no";
          iframe.allowtransparency = "true";
          iframe.frameborder = "0";
          iframe.src = 'about:blank';
          document.body.appendChild(iframe);
  }
  //
  window._urlEncode_iframe_callback = function(str) {
          callback(str);
          if (document.all) {
                  document.charset = window.oldCharset;
          }
  }
  //设置回调编码页面的地址，这里需要用户修改
  form.action = 'getEncodeStr.html';
  form.submit();
  setTimeout(function() {
    if(form.parentNode!=undefined){
      form.parentNode.removeChild(form);
    }
    if(iframe!=undefined){
      iframe.parentNode.removeChild(iframe);
    }
  }, 500)
}

function local_query(str){
  if(pool===undefined || database==undefined)throw 'no local database';
  var feat = [];
  for(var p in pool){
    var f = str.indexOf(pool[p]);
    if(f!==-1){
      feat.push(p);
    }
  }
  feat = consolidate(feat);
  console.log(feat);
  var result = [];
  for(var d in database){
    var score = match(database[d].feat,feat);
    if(score>-10){
      if(result.length>20){
        result.shift();
      }
      result.push([d,score]);
      result.sort(compare);
    }
  }
  var code = [];
  for(var r in result){
    code.push(database[result[r][0]]);
  }
  code.reverse();
  return code;
}

function compare(a,b){
  if(a[1]>b[1]){
    return 1;
  }else if(a[1]<b[1]){
    return -1;
  }else{
    return 0;
  }
}

function match(feat1,feat2){
  var one = [].concat(feat1);
  var two = [].concat(feat2);
  var score = 0;
  var length = two.length-1;
  for (var i = length; i >= 0; i--) {
    var t = two.splice(0,1)[0];
    var idx = one.indexOf(t);
    if (idx>=0) {
      score++;
      one.splice(idx,1);
    }else{
      two.push(t);
    }
  };
  score-=two.length+one.length;
  return score;
}

function consolidate(feat){
  ret = [];
  for(var i=0;i<feat.length;i++){ 
    var saveI = true;
    for(var j=0;j<feat.length;j++){
      if(i!==j){
        var one = pool[feat[i]];
        var two = pool[feat[j]];
        if(two.indexOf(one)!==-1){
          saveI = false;
          break;
        }
      }
    }
    if(saveI)ret.push(parseInt(feat[i]));
  }
  return ret;
}

function contains(one,two){
  return (one.indexOf(two)!==-1) || (two.indexOf(one)!==-1);
}

window.addEventListener("load", main);