function uniq(a) {
    var seen = {};
    return a.filter(function(item) {
      return seen.hasOwnProperty(item) ? false : (seen[item] = true);
    });
  }
  
  function NearMe(ID, list){
    var neighbors = [];
    for(var i=0; i<list.length/3; i++){
      if(list[i*3]==ID){
        neighbors.push(list[i*3+1]);
        neighbors.push(list[i*3+2]);
      }else if(list[i*3+1]==ID){
        neighbors.push(list[i*3]);
        neighbors.push(list[i*3+2]);
      }else if(list[i*3+2]==ID){
        neighbors.push(list[i*3+1]);
        neighbors.push(list[i*3]);
      }
    }
    return uniq(neighbors);
  }