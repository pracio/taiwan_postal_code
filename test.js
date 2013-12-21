function result_to_code (result,address) {
	var row = database[result[0][0]];
	if(address.indexOf(row.city)<0)return "";
	var d = row.data;
	if(d.length>1){
		return d[0].code.substr(0,3);
	}else{
		return d[0].code;
	}
}

result = [];

function process(){
	for(i in list){
		result.push(result_to_code(local_query(list[i]),list[i]));
	}
}