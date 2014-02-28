var pool;
var database;

var replace = '123456789';
var original = '１２３４５６７８９';
var chinese_number = '一二三四五六七八九'
var pattern = new RegExp('(\\d{1,4})[路巷街]','g');

function adjust_query_address(address){
  /*
  make sure the input of the string is the same
  */
  for(var i in original){
    for(var j =0;j<address.length;j++){
      if(address[j]==original[i]){
        address = replaceAt(address,j,replace[i]);
      }
    }
  }
  /*
  make sure the numbers before 路巷街 changed to chinese character
  */
  var matches = address.match(pattern);
  for(var m in matches){
    var idx = address.indexOf(matches[m]);
    for(var i=idx;i<idx+matches[m].length-1;i++){
      address = replaceAt(address,i,chinese_number[replace.indexOf(address[i])]);
    }
  }
  for(var s = 0;s<address.length-1;s++){
    if(address[s]=='臺' && address[s+1]!='灣'){
      address = replaceAt(address,s,'台');
    }
  }
  return address;
}

function replaceAt(string,idx,character){
  var s = string.split("");
  s[idx]=character;
  return s.join("");
}

function hasCharacter(source,target){
  return source.indexOf(target)>0;
}

function query(){
  if(pool==undefined){
    loadPool();
  }
  if(database==undefined){
    loadDatabase();
    return;
  }
  var address = $("#address").val();
  if(address.length<=1){
    $("#hint").hide();
    $("#table").empty();
    $("#query-result").empty();
  }
  address = adjust_query_address(address);
  if(hasFeature(address)){
    $("#address").val(address);
    //update_table(local_query(address));
    update_table(FuzzyQuery(address));
  }
}

function validate(addObj){
  if(pool==undefined){
    loadPool();
  }
  var str = adjust_query_address(addObj.val());
  if(str.length<=1){
    addObj.parent().removeClass("has-success");
    addObj.parent().removeClass("has-warning");
  }else{
    if(hasFeature(str)){
      addObj.parent().addClass("has-success");
    }else{
      addObj.parent().addClass("has-warning");
    }
  }
}

function validate_input(event){
  validate($(this));
}

function hasFeature(value){
  if(value.length<=1)return false;
  for (var i = pool.length - 1; i >= 0; i--) {
    if(value.indexOf(pool[i])>=0){
      return true;
    }
  };
  return false;
}

function build_table(results){
  var flatten = [];
  results.forEach(function(p){
    var ad = database[parseInt(p[0])];
    flatten = flatten.concat(ad.data.map(function(d){
      return [d.code,ad.city,ad.area,ad.road,d.type,d.desc];
    }));
  });
  $.each(flatten,function(item){
    var row = $('<tr/>');
    $.each(flatten[item],function(i){
      var cell = $('<td/>');
      cell.text(flatten[item][i]);
      row.append(cell);
    });
    $("#table").append(row);
  });
}

function update_table(results){
  var positive = results.filter(function(d){return d[1]<=8;});
  var negative = results.filter(function(d){return d[1]>8;});
  $("#table").empty();
  $("#query-result").empty();
  $("#hint").show();
  if(positive.length>0){
    build_table(positive);
  }else{
    $("#query-result").text('查無確切資料，以下顯示近似結果');
    build_table(negative);
  }
}

function loadPool(){
  if(pool==undefined){
    addScript('word_pool.js',null);
  }
}

function loadDatabase(){
  $("#btn").button('loading');
  addScript('data.js',function(){
    $("#btn").button('reset');
    $("#btn").click();
  });
}

function goto_map(){
  var add = $("#address").val();
  if(add!=undefined && add.length>=1){
    openTab("http://maps.google.com/?q="+add);
  }
}

function click_hint(){
  $('#hint_modal').modal('show');
}

function main(){
  $("#hint").hide();
  $("#hint").click(click_hint);
  $("#btn").click(query);
  $("#map").click(goto_map);
  $("#github").click(function(){openTab('https://github.com/pracio/taiwan_postal_code/')});
  $("#address").bind("enterKey",function(e){
    query();
  });
  $("#address").keyup(function(event){
    if(event.keyCode==13){
      $(this).trigger('enterKey');
    }
  });
  $("#address").on('input',validate_input);
  $("#address").tooltip({placement:'top'});
}

function addScript(scriptURL, onload) {
   var script = document.createElement('script');
   script.setAttribute("src", scriptURL);
   if (onload) script.onload = onload;
   document.documentElement.appendChild(script);
}

function local_query(str){
  if(pool===undefined || database==undefined)throw 'no local database';
  var feat = [];
  for(var p in pool){
    var f = str.indexOf(pool[p]);
    if(f>=0){
      str = str.replace(pool[p],'');
      feat.push(parseInt(p));
    }
  }
  //problem here we have is we have some weird word included into the list
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
  result.reverse();
  return result;
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
  score-=one.length;
  return score;
}

function merge(feat){
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

function openTab(url){
  chrome.tabs.create({url:url});
}

window.addEventListener("load", main);