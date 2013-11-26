function query(){
  var address = $("#address").val();
  if(address.length<1){
    //wrong
  }else{
    console.log(local_query(address));
  }
}

function update_table(results){
  var positive = results.filter(function(d){return d[1]>0;});
  var negative = results.filter(function(d){return d[1]<=0;});
}

function main(){
  setTimeout(function(){addScript('data.js',function(){console.log('done');})},1000);
  setTimeout(function(){addScript('word_pool.js',function(){console.log('done.word_pool');})},800);
  $("#btn").click(query);
  $("#address").bind("enterKey",function(e){
    query();
  });
  $("#address").keyup(function(event){
    if(event.keyCode==13){
      $(this).trigger('enterKey');
    }
  });
}

function addScript(scriptURL, onload) {
   var script = document.createElement('script');
   //script.setAttribute("type", "application/javascript");
   script.setAttribute("src", scriptURL);
   if (onload) script.onload = onload;
   document.documentElement.appendChild(script);
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
  // console.log(feat);
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
  // var code = [];
  // for(var r in result){
  //   code.push(database[result[r][0]]);
  // }
  // code.reverse();
  // return code;
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