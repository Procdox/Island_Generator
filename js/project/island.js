'use strict';

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

function prepVectors(raw){
  var product = [];
  var vector;
  for(var i = 0; i < raw.length; i++){
    product.push([raw[i].x,raw[i].z]);
  }
  return product;
}

//use a frontier search to grow a random point field with decaying height
function seedIsland(){

  var frontier = [new THREE.Vector3(0,0,0)];
  var seeds = [frontier[0]];

  var min_range = 15;
  var max_range = 70;

  var boundary = Math.pow(300, 2)

  var max_attempts = 30;

  var valid, theta, radius, distance, i, j;

  while(frontier.length > 0){
    valid=false;

    for(i=0; i<max_attempts; i++){

      theta = 2*Math.PI*Math.random();
      radius = Math.random()*(max_range-min_range) + min_range; //this is NOT perfect... but it's much simpler

      var idea = new THREE.Vector3(Math.cos(theta)*radius + frontier[0].x, 0, Math.sin(theta)*radius + frontier[0].z);
      distance = idea.lengthSq();

      if(distance > boundary){
        continue;
      }

      valid=true;

      for(j=0; j<seeds.length; j++){
        if(Math.pow(seeds[j].x-idea.x, 2) + Math.pow(seeds[j].z-idea.z,2) < Math.pow(min_range,2)){
          valid = false;
          break;
        }
      }

      if(valid){
        frontier.push(idea);
        seeds.push(idea)
        break;
      }
    }
    if(!valid){
      frontier.splice(0, 1);
    }
  }

  return seeds
}

function raiseIsland(seeds){
  seeds[0].y = 70 + 7 * (Math.random() - .5);

  var frontier = seeds[0].connections.slice(0)
  var max, min, bias = .70, i;

  for(i = 1; i < seeds.length; i++){
    seeds[i].y = -1;
  }

  while(frontier.length > 0){
    console.log('cycling');
    var index = Math.floor(Math.random() * frontier.length);
    var choice = frontier[index]; 
    frontier.splice(index, 1);

    max = -1;
    min = 1000;

    var connections = seeds[choice].connections

    for(i = 0; i < connections.length; i++){
      if(seeds[connections[i]].y>max){
        max=seeds[connections[i]].y;
      }
      if(seeds[connections[i]].y<min&&seeds[connections[i]].y>=0){
        min=seeds[connections[i]].y;
      }
      if(seeds[connections[i]].y < 0){
        frontier.push(connections[i])
      }
    }

    seeds[choice].y = max * bias + (max/10) * (Math.random() - .5);
  }
}

class Triangle{
  constructor(a,b,c) {
    this.a = a;
    this.by = b.y;
    this.cy = c.y;

    this.A = b.clone().sub(a)
    this.B = c.clone().sub(a)

    this.A.y = 0
    this.B.y = 0

    this.dot00 = this.A.dot(this.A);
    this.dot01 = this.A.dot(this.B);
    this.dot11 = this.B.dot(this.B);

    this.invDenom = 1 / (this.dot00 * this.dot11 - this.dot01 * this.dot01);

    this.min_x = Math.min(a.x,Math.min(b.x,c.x));
    this.max_x = Math.max(a.x,Math.max(b.x,c.x));
    this.min_z = Math.min(a.z,Math.min(b.z,c.z));
    this.max_z = Math.max(a.z,Math.max(b.z,c.z));
  }
  inBounds(point){
    return point.x>=this.min_x && point.x<=this.max_x &&
      point.z>=this.min_z && point.z<=this.max_z;
  }
}

class Island{
  constructor(triangles, seeds){
    var seeds, triangles, i

    seeds = seedIsland();
    triangles = triangles = Delaunay.triangulate(prepVectors(seeds));

    for(i = 0; i < seeds.length; i++){
      seeds[i].connections = NearMe(i,triangles);
    }

    raiseIsland(seeds);

    this.precomputed = [];

    for(i = 0; i < triangles.length/3; i++){
      this.precomputed.push( new Triangle(
        seeds[triangles[3*i+0]],
        seeds[triangles[3*i+1]],
        seeds[triangles[3*i+2]]))
    }
  }
  
  height(test){
    var u, v, w, dot02, dot12;
    for(var jj = 0; jj < this.precomputed.length; jj++){
      var data = this.precomputed[jj]
      if(!data.inBounds(test)){
        continue;
      }

      var C = test.clone().sub(data.a)
      C.y = 0

      dot02 = data.A.dot(C)
      dot12 = data.B.dot(C)

      u = (data.dot11 * dot02 - data.dot01 * dot12) * data.invDenom
      v = (data.dot00 * dot12 - data.dot01 * dot02) * data.invDenom
      w = 1 - u - v

      if(u>0 && v>0 && w>0){
        return data.a.y * w
          + data.by * u
          + data.cy * v
      }
    }

    return 0;
  }
}

function GenTerrain(noise, des){
  //congfiguration
  var X_total_width = 700;
  var Z_total_width = 700;
  var X_chunk_sections = 25;
  var Z_chunk_sections = 25;
  var X_chunks = 14;
  var Z_chunks = 14;

  var terrain_geometry = new chunk_capsule(X_total_width, Z_total_width,
    X_chunk_sections, Z_chunk_sections, X_chunks, Z_chunks);

  var vertex;
  var l = terrain_geometry.total_size;
  for (var ii = 0; ii < l; ii++) {
    vertex = terrain_geometry.get( ii );
    vertex.y = des.height(vertex) - 15;
    vertex.y += 6 * noise(vertex);
  }

  return terrain_geometry
}

function EVERYTHING(noise_function){

  var noise_gen = (vector) => {return noise_function(vector.x/40,vector.y/40,vector.z/40)}

  //Geography Points
  var land = new Island()

  var terrain_geometry = GenTerrain(noise_gen, land)

  //Coloring
  terrain_geometry.updateMaterial();

  terrain_geometry.add(scene);

  //GenCastles(terrain_geometry, ground_finder);


  terrain_geometry.hideUnused(-1)
}
