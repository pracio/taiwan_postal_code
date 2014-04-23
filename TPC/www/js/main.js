$(document).on('ready',main);

function main(){
    $("#search").on('click',search_button);
}

function search_button(event){
    var result = FuzzyQuery($("#address").val());
    alert(result.length);
    
}