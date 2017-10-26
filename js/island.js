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

function GenIsland(noise_gen, raw_points){


  var frontier = [raw_points[0].slice(0)];

  var point_geometry = new THREE.Geometry();
  point_geometry.vertices.push(new THREE.Vector3( raw_points[0][0], 10, raw_points[0][1]))

  var min_range = 15;
  var max_range = 70;

  var max_attempts = 30;

  var best_score = 0;
  var best_coords = [0,0];
  var offset = [0,0]

  for(var i=0;i<300;i++){
    offset[0] = Math.random()*5000;
    offset[1] = Math.random()*5000;
    if(noise_gen.noise(offset[0],0, offset[1])>best_score){
      best_score = noise_gen.noise(offset[0],0, offset[1]);
      best_coords = [offset[0], offset[1]];
    }
  }

  var valid, new_distance, new_angle, new_X, new_Z, height, i, j, k;
  while((frontier.length>0)){
    valid=false;
    for(i=0;i<max_attempts;i++){

      new_distance = Math.random()*(max_range-min_range)+min_range;
      new_angle = Math.random()*2*Math.PI;
      new_X = Math.cos(new_angle)*new_distance + frontier[0][0];
      new_Z = Math.sin(new_angle)*new_distance + frontier[0][1];
      if(new_X*new_X+new_Z*new_Z>130000){
        continue;
      }

      valid=true;

      for(j=0;j<point_geometry.vertices.length;j++){
        if(Math.pow(point_geometry.vertices[j].x-new_X,2)+Math.pow(point_geometry.vertices[j].z-new_Z,2)<Math.pow(min_range,2)){
          valid=false;
          break;
        }
      }
      if(valid){
        height = .5 + noise_gen.noise(new_X/200+offset[0],0,new_Z/200+offset[1]) - (Math.pow(new_X*new_X+new_Z*new_Z,.5)/300);
        point_geometry.vertices.push(new THREE.Vector3( new_X, height, new_Z));
        frontier.push([new_X, new_Z]);
        raw_points.push([new_X, new_Z])
        break;
      }
    }
    if(!valid){
      frontier.splice(0, 1);
    }
  }

  return point_geometry
}

function GenTerrain(noise_gen, triangles, point_geometry){
  //congfiguration
  var X_total_width = 700;
  var Z_total_width = 700;
  var X_chunk_sections = 25;
  var Z_chunk_sections = 25;
  var X_chunks = 14;
  var Z_chunks = 14;

  var triangle_data = function(a,b,c) {
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

    this.inBounds = function(point){
      return point.x>=this.min_x && point.x<=this.max_x &&
        point.z>=this.min_z && point.z<=this.max_z;
    }
  }

  var precomputed = [];
  for(var jj=0; jj<triangles.length/3; jj++){
    precomputed.push( new triangle_data(
      point_geometry.vertices[triangles[3*jj+0]],
      point_geometry.vertices[triangles[3*jj+1]],
      point_geometry.vertices[triangles[3*jj+2]]))
  }


  var terrain_geometry = new chunk_capsule(X_total_width, Z_total_width,
    X_chunk_sections, Z_chunk_sections, X_chunks, Z_chunks);

  var vertex, min_distance, min_target, second_distance, second_target, third_distance, third_target, distance;
  var u, v, w, dot00, dot01, dot11, dot02, dot12, invDenom
  for ( ii = 0, l = terrain_geometry.total_size; ii < l; ii ++ ) {
    vertex = terrain_geometry.get( ii );

    vertex.y = -15;
    vertex.y += 3*noise_gen.noise(vertex.x,0,vertex.z)

    for(var jj=0; jj<triangles.length/3; jj++){
      var data = precomputed[jj]
      if(!data.inBounds(vertex)){
        continue;
      }

      var C = vertex.clone().sub(point_geometry.vertices[triangles[3*jj+0]])
      C.y = 0

      dot02 = data.A.dot(C)
      dot12 = data.B.dot(C)

      u = (data.dot11 * dot02 - data.dot01 * dot12) * data.invDenom
      v = (data.dot00 * dot12 - data.dot01 * dot02) * data.invDenom
      w = 1 - u - v
      if(u>0 && v>0 && w>0){
        var value = point_geometry.vertices[triangles[3*jj+0]].y*w
          + point_geometry.vertices[triangles[3*jj+1]].y*u
          + point_geometry.vertices[triangles[3*jj+2]].y*v

        vertex.y += value * 2*(3 + Math.min(u,Math.min(v,w)))

        break;
      }
    }
  }

  return terrain_geometry
}

function GenCastle(terrain_geometry, ground_finder, castle_center_x, castle_center_z, secret_castle_size){
  var castle_min_range = 4;
  var castle_max_range = 7;
  var castle_max_attempts = 30;

  height = 200;
  castle_point_geometry = new THREE.Geometry();
  ground_finder.ray.origin.copy( new THREE.Vector3( castle_center_x, height, castle_center_z) );
  intersections = ground_finder.intersectObjects( terrain_geometry.chunk_system );

  if(intersections.length>0){
    height -= intersections[0].distance;
  }else{
    height=0;
  }

  castle_point_geometry.vertices.push(new THREE.Vector3( castle_center_x, height+1, castle_center_z))
  castle_frontier = [[castle_center_x,castle_center_z]];
  castle_raw_points = [[castle_center_x,castle_center_z]];

  while((castle_frontier.length>0)){
    valid = false;
    for(i=0;i<castle_max_attempts;i++){

      new_distance = Math.random()*(castle_max_range-castle_min_range)+castle_min_range;
      new_angle = Math.random()*2*Math.PI;
      new_X = Math.cos(new_angle)*new_distance + castle_frontier[0][0];
      new_Z = Math.sin(new_angle)*new_distance + castle_frontier[0][1];
      if(Math.pow(new_X-castle_center_x,2)+Math.pow(new_Z-castle_center_z,2)>Math.pow(secret_castle_size,2)){
        continue;
      }

      valid = true;

      for(j=0;j<castle_point_geometry.vertices.length;j++){
        if(Math.pow(castle_point_geometry.vertices[j].x-new_X,2)+Math.pow(castle_point_geometry.vertices[j].z-new_Z,2)<Math.pow(castle_min_range,2)){
          valid=false;
          break;
        }
      }
      if(valid){
        height = 200;

        ground_finder.ray.origin.copy( new THREE.Vector3( new_X, height, new_Z) );
        intersections = ground_finder.intersectObjects( terrain_geometry.chunk_system );
        if(intersections.length>0){
          height -= intersections[0].distance;
        }else{
          height=0;
        }
        castle_point_geometry.vertices.push(new THREE.Vector3( new_X, height, new_Z));

        castle_frontier.push([new_X, new_Z]);
        castle_raw_points.push([new_X, new_Z])
        break;
      }
    }
    if(!valid){
      castle_frontier.splice(0, 1);
    }
  }
  //scene.add(new THREE.Points(castle_point_geometry));

  //organize castle points by triagulation, then apply clustering



  //Find all connections
  castle_triangles = Delaunay.triangulate(castle_raw_points);

  for(i=0;i<castle_point_geometry.vertices.length;i++){
    castle_point_geometry.vertices[i].ward = -1;
    castle_point_geometry.vertices[i].connections = NearMe(i,castle_triangles);
    castle_point_geometry.vertices[i].father = -1;
    castle_point_geometry.vertices[i].roads = [];
    castle_point_geometry.vertices[i].perimeter_links = [];
  }



  var A, B, x, y, z, slope, uncharted, charted, explored, frontier, founder;
  while(true){
    var seed=-1;
    while(++seed<castle_point_geometry.vertices.length&&castle_point_geometry.vertices[seed].ward>-1){
    }
    if(seed >= castle_point_geometry.vertices.length){
      break;
    }
    castle_point_geometry.vertices[seed].ward = seed;

    //should spread outward castle_point_geometry.vertices[i]
    explored = [seed];
    frontier = castle_point_geometry.vertices[seed].connections.slice(0);
    founder = [];
    for(i=0;i<castle_point_geometry.vertices[seed].connections.length;i++){
      founder.push(seed);
    }
    while(frontier.length>0){
      uncharted = frontier.shift();
      charted = founder.shift();
      if(castle_point_geometry.vertices[uncharted].ward>=0){continue;}

      //do check
      A = castle_point_geometry.vertices[charted];
      B = castle_point_geometry.vertices[uncharted];
      x = A.x - B.x;
      y = A.y - B.y;
      z = A.z - B.z;
      if(2*castle_max_range<Math.pow(x*x+z*z,.5)){continue;}
      slope = Math.abs(y/Math.pow(x*x+z*z,.5))
      if(slope>.2){continue;}

      line_geometry = new THREE.Geometry();
      line_geometry.vertices.push(
        castle_point_geometry.vertices[charted],
        castle_point_geometry.vertices[uncharted]
      );
      //scene.add(new THREE.Line(line_geometry));

      castle_point_geometry.vertices[charted].roads.push(uncharted);
      castle_point_geometry.vertices[uncharted].roads.push(charted);

      castle_point_geometry.vertices[uncharted].father = charted;
      castle_point_geometry.vertices[uncharted].ward = seed;

      for(i=0;i<castle_point_geometry.vertices[uncharted].connections.length;i++){
        if(castle_point_geometry.vertices[castle_point_geometry.vertices[uncharted].connections[i]].ward>=0){continue;}
        frontier.push(castle_point_geometry.vertices[uncharted].connections[i])
        founder.push(uncharted);
      }
    }
  }



  var clusters = [];
  for(i=0;i<castle_point_geometry.vertices.length;i++){
    if(castle_point_geometry.vertices[i].ward==i){
      clusters.push(i);
    }
  }





  //NOW Create perimeters by unique line search

  var edges = [];
  for(j=0; j<castle_point_geometry.vertices.length;j++){
    edges.push([]);
    for(k=0; k<castle_point_geometry.vertices.length;k++){
      edges[j].push(0);
    }
  }

  var cluster_heights = [];
  var cluster_members_count = [];

  for( i=0;i<clusters.length;i++){
    cluster_heights.push(0);
    cluster_members_count.push(0);

    var n = clusters[i];

    for(j=0; j<castle_point_geometry.vertices.length;j++){
      if(castle_point_geometry.vertices[j].ward==n){
        cluster_heights[i]+=castle_point_geometry.vertices[j].y;
        cluster_members_count[i]+=1;
      }
      for(k=0; k<castle_point_geometry.vertices.length;k++){
        edges[j][k]=0;
      }
    }

    cluster_heights[i] = cluster_heights[i] / (cluster_members_count[i]*100);

    for(j=0;j<castle_triangles.length/3;j++){
      if(castle_point_geometry.vertices[castle_triangles[j*3]].ward==n&&castle_point_geometry.vertices[castle_triangles[j*3+1]].ward==n&&castle_point_geometry.vertices[castle_triangles[j*3+2]].ward==n){

        //add count to each for area edge detection
        edges[castle_triangles[j*3]][castle_triangles[j*3+1]]++;
        edges[castle_triangles[j*3+1]][castle_triangles[j*3]]++;
        edges[castle_triangles[j*3+2]][castle_triangles[j*3+1]]++;
        edges[castle_triangles[j*3+1]][castle_triangles[j*3+2]]++;
        edges[castle_triangles[j*3]][castle_triangles[j*3+2]]++;
        edges[castle_triangles[j*3+2]][castle_triangles[j*3]]++;
      }
    }
    for(j=0; j<castle_point_geometry.vertices.length;j++){
      for(k=0; k<castle_point_geometry.vertices.length;k++){
        if(edges[j][k]==1){
          castle_point_geometry.vertices[j].perimeter_links.push(k);
          castle_point_geometry.vertices[k].perimeter_links.push(j);
        }
      }
    }
  }

  //sanatize roads and walls from duplicates
  for(i=0; i<castle_point_geometry.vertices.length;i++){
    for(j=0; j<castle_point_geometry.vertices[i].perimeter_links.length;j++){
      for(k=j+1; k<castle_point_geometry.vertices[i].perimeter_links.length;k++){
        if(castle_point_geometry.vertices[i].perimeter_links[j]==castle_point_geometry.vertices[i].perimeter_links[k]){
          castle_point_geometry.vertices[i].perimeter_links.splice(k, 1);
          k-=1;
        }
      }
      for(k=0; k<castle_point_geometry.vertices[i].roads.length;k++){
        if(castle_point_geometry.vertices[i].perimeter_links[j]==castle_point_geometry.vertices[i].roads[k]){
          castle_point_geometry.vertices[i].roads.splice(k, 1);
          k-=1;
        }
      }
    }
    for(j=0; j<castle_point_geometry.vertices[i].roads.length;j++){
      for(k=j+1; k<castle_point_geometry.vertices[i].roads.length;k++){
        if(castle_point_geometry.vertices[i].roads[j]==castle_point_geometry.vertices[i].roads[k]){
          castle_point_geometry.vertices[i].roads.splice(k, 1);
          k-=1;
        }
      }
    }
  }

  //new strategy, use vector angle bisector between normalized pieces
  //first lets display each road and perimeter angle so we know what we're doing
  for(i=0; i<castle_point_geometry.vertices.length;i++){
    var angles = [];
    for(j=0; j<castle_point_geometry.vertices[i].roads.length;j++){
      angles.push(castle_point_geometry.vertices[castle_point_geometry.vertices[i].roads[j]].clone().sub(castle_point_geometry.vertices[i]).normalize());
    }
    for(j=0; j<castle_point_geometry.vertices[i].perimeter_links.length;j++){
      angles.push(castle_point_geometry.vertices[castle_point_geometry.vertices[i].perimeter_links[j]].clone().sub(castle_point_geometry.vertices[i]).normalize());
    }
    var checksum = angles.slice(0);
    var orig = angles.length;

    if(angles.length+2<orig){
      console.log("ded ", orig, angles.length);
    }

    angles.sort(function(a, b){
      var tan_a = Math.atan(a.z/a.x);
      if(a.x<0){tan_a+=Math.PI;}
      var tan_b = Math.atan(b.z/b.x);
      if(b.x<0){tan_b+=Math.PI;}
      if (tan_a>tan_b) {
        return -1;
      }
      if (tan_a<tan_b) {
        return 1;
      }
      // a must be equal to b
      return 0;
    });

    castle_point_geometry.vertices[i].angles = angles.slice(0);

    //now find bisectors... somehow?
    var bisectors = [];
    for(var j=0;j<angles.length;j++){
      var k = j+1;
      if(k==angles.length){k=0;}

      var tan_a = Math.atan(angles[j].z/angles[j].x);
      if(angles[j].x<0){tan_a+=Math.PI;}
      var tan_b = Math.atan(angles[k].z/angles[k].x);
      if(angles[k].x<0){tan_b+=Math.PI;}

      var difference = tan_a-tan_b;
      if(difference<0){
        difference+=Math.PI*2;
      }else if(difference>Math.PI*2){
        difference-=Math.PI*2;
      }

      if(difference<Math.PI){
        bisectors.push(angles[j].clone().add(angles[k]).normalize());
      }else{
        bisectors.push(angles[j].clone().add(angles[k]).normalize().negate());
      }
      bisectors[j].y=0;
      //bisectors.push(angles[j].clone().add(angles[k]).normalize());

      var line_geometry = new THREE.Geometry();
      line_geometry.vertices.push(
        castle_point_geometry.vertices[i].clone().add(bisectors[j]),
        castle_point_geometry.vertices[i].clone(),
        castle_point_geometry.vertices[i].clone().add(angles[j])
      );
      line_geometry.vertices[0].y+=1+.1*j;
      line_geometry.vertices[1].y+=1+.1*j;
      line_geometry.vertices[2].y+=1+.1*j;
      //scene.add(new THREE.Line(line_geometry));
    }

    castle_point_geometry.vertices[i].bisectors = bisectors.slice(0);
  }

  //try to find perimeters of an area
  for(var point=0;point<castle_point_geometry.vertices.length;point++){
    for(var angle=0;angle<castle_point_geometry.vertices[point].angles.length;angle++){
      var line_geometry = new THREE.Geometry();
      var wall = false;

      //add point to plot
      line_geometry.vertices.push(
        castle_point_geometry.vertices[point].clone().add(castle_point_geometry.vertices[point].bisectors[angle])
      );

      //find next point in sequence from angles
      var trial_angle = castle_point_geometry.vertices[point].angles[angle].clone();
      var next_of_kin = -1, next_of_angle = -1;


      for(var i=0;i<castle_point_geometry.vertices[point].roads.length;i++){
        var trial_point = castle_point_geometry.vertices[castle_point_geometry.vertices[point].roads[i]].clone().sub(castle_point_geometry.vertices[point]).normalize();
        if(Math.abs(trial_point.x-trial_angle.x)<.0005 && Math.abs(trial_point.y-trial_angle.y)<.0005 && Math.abs(trial_point.z-trial_angle.z)<.0005){
          next_of_kin = castle_point_geometry.vertices[point].roads[i];
          break;
        }
      }
      if(next_of_kin<0){
        for(var i=0;i<castle_point_geometry.vertices[point].perimeter_links.length;i++){
          var trial_point = castle_point_geometry.vertices[castle_point_geometry.vertices[point].perimeter_links[i]].clone().sub(castle_point_geometry.vertices[point]).normalize();
          if(Math.abs(trial_point.x-trial_angle.x)<.0005 && Math.abs(trial_point.y-trial_angle.y)<.0005 && Math.abs(trial_point.z-trial_angle.z)<.0005){
            next_of_kin = castle_point_geometry.vertices[point].perimeter_links[i];
            wall = true;
            break;
          }
        }
        if(next_of_kin<0){continue;}
      }
      //find the angle of my line
      trial_angle.negate();

      for(var i=0;i<castle_point_geometry.vertices[next_of_kin].angles.length;i++){
        var trial_point = castle_point_geometry.vertices[next_of_kin].angles[i];
        if(Math.abs(trial_point.x-trial_angle.x)<.005 && Math.abs(trial_point.y-trial_angle.y)<.005 && Math.abs(trial_point.z-trial_angle.z)<.005){
          next_of_angle = i;
          break;
        }
      }

      if(next_of_angle<0){continue;}

      if(next_of_angle==0){
        next_of_angle = castle_point_geometry.vertices[next_of_kin].bisectors.length-1;
      }else{
        next_of_angle--;
      }

      var temp_point = castle_point_geometry.vertices[next_of_kin].clone().add(castle_point_geometry.vertices[next_of_kin].bisectors[next_of_angle])

      line_geometry.vertices.push(
        temp_point
      );

      if(wall&&line_geometry.vertices[0].y>1){
        var temp_wall = new THREE.PlaneGeometry(1,1,1,1);
        temp_wall.vertices[0] = line_geometry.vertices[0].clone();
        temp_wall.vertices[1] = line_geometry.vertices[0].clone();
        temp_wall.vertices[2] = line_geometry.vertices[1].clone();
        temp_wall.vertices[3] = line_geometry.vertices[1].clone();
        temp_wall.vertices[1].y+=1;
        temp_wall.vertices[3].y+=1;
        scene.add(new THREE.Mesh(temp_wall, new THREE.MeshBasicMaterial({color: 0x666666,side: THREE.DoubleSide})));
      }else{
        var temp_wall = new THREE.PlaneGeometry(1,1,1,1);
        temp_wall.vertices[0] = line_geometry.vertices[0].clone();
        temp_wall.vertices[1] = line_geometry.vertices[0].clone();
        temp_wall.vertices[2] = line_geometry.vertices[1].clone();
        temp_wall.vertices[3] = line_geometry.vertices[1].clone();
        temp_wall.vertices[1].y+=.5;
        temp_wall.vertices[3].y+=.5;
        scene.add(new THREE.Mesh(temp_wall, new THREE.MeshBasicMaterial({color: 0x774444,side: THREE.DoubleSide})));
      }

      //scene.add(new THREE.Line(line_geometry));
    }
  }
  //make some towers for fun
  for(i=0; i<castle_point_geometry.vertices.length;i++){
    if(castle_point_geometry.vertices[i].perimeter_links.length>0){
      if(castle_point_geometry.vertices[i].y>1){
        var geometry = new THREE.CylinderGeometry( 1, 1, 2, 8 );
        geometry.translate(castle_point_geometry.vertices[i].x,castle_point_geometry.vertices[i].y,castle_point_geometry.vertices[i].z);
        var material = new THREE.MeshBasicMaterial( {color: 0x555555} );
        var cylinder = new THREE.Mesh( geometry, material );
        scene.add( cylinder );
      }
    }
  }

}

function GenCastles(terrain_geometry, ground_finder){
  var secret_castle_spots=[];
  var secret_castle_size = 40
  var secret_castle_spacing = 60

  var castle_center_x, castle_center_z, safe, intersections, castle_point_geometry, height, castle_frontier, castle_raw_points, castle_triangles;
  for(var secret_castle_count=0;secret_castle_count<2;secret_castle_count++){
    //castle plot
    safe = false;
    while (!safe){
      castle_center_x = Math.random()*200 - 100;
      castle_center_z = Math.random()*200 - 100;
      safe= true;
      for(i=0;i<secret_castle_spots.length;i++){
        if(Math.pow(castle_center_x-secret_castle_spots[i][0],2)+Math.pow(castle_center_z-secret_castle_spots[i][1],2)<Math.pow(secret_castle_size*2,2)){
          safe=false;
          break;
        }
        ground_finder.ray.origin.copy( new THREE.Vector3( castle_center_x, 200, castle_center_z) );
        intersections = ground_finder.intersectObjects( terrain_geometry.chunk_system );
        if(intersections.length==0||intersections[0].distance>195){
          safe=false;
        }
      }

    }
    secret_castle_spots.push([castle_center_x,castle_center_z])
    GenCastle(terrain_geometry,ground_finder,castle_center_x,castle_center_z,secret_castle_size)
  }
}

function EVERYTHING(ground_finder){
  var noise_gen = new Simplex3D();
  var raw_points = [[0,0]];

  //Geography Points
  var point_geometry = GenIsland(noise_gen, raw_points);
  //Find all connections
  var line_geometry, triangles;

  triangles = Delaunay.triangulate(raw_points);
  for(i=0;i<point_geometry.vertices.length;i++){
    point_geometry.vertices[i].connections = NearMe(i,triangles);
    /*for(j=0;j<point_geometry.vertices[i].connections.length;j++){
      line_geometry = new THREE.Geometry();
      line_geometry.vertices.push(
        point_geometry.vertices[i],
        point_geometry.vertices[point_geometry.vertices[i].connections[j]]
      );
      scene.add(new THREE.Line(line_geometry));
    }*/
  }
  //scene.add(new THREE.Points(point_geometry));

  //Flood Water


  var era = -.1
  var bias = 0;
  var chance_zero = .5;
  var chance_one = .45;
  var chance_two = .04;


  for(var i=0;i<point_geometry.vertices.length;i++){
    if(point_geometry.vertices[i].y>era){
      point_geometry.vertices[i].y = -1;
    }else{
      point_geometry.vertices[i].y = 0;
    }
  }

  var incomplete = true, layer = 0, stalled = false;
  var max, min;

  while(incomplete){
    incomplete=false;
    for(i=0;i<point_geometry.vertices.length;i++){
      if(point_geometry.vertices[i].y<0){
        incomplete=true;
        max = -1;
        min = 10000;
        for(j=0;j<point_geometry.vertices[i].connections.length;j++){
          if(point_geometry.vertices[point_geometry.vertices[i].connections[j]].y>max){
            max=point_geometry.vertices[point_geometry.vertices[i].connections[j]].y;
          }
          if(point_geometry.vertices[point_geometry.vertices[i].connections[j]].y<min&&point_geometry.vertices[point_geometry.vertices[i].connections[j]].y>=0){
            min=point_geometry.vertices[point_geometry.vertices[i].connections[j]].y;
          }
        }
        if(max>=0){
            var choice = Math.random();

            if(choice>(1-chance_zero)){
              point_geometry.vertices[i].y=max-(max-min)*(1-bias)+0;
            }else if(choice>(1-chance_zero-chance_one)){
              point_geometry.vertices[i].y=max-(max-min)*(1-bias)+1;
              stalled=true;
            }
            else if(choice>(1-chance_zero-chance_one-chance_two)){
              point_geometry.vertices[i].y=max-(max-min)*(1-bias)+2;
            }else{
              point_geometry.vertices[i].y=max-(max-min)*(1-bias)+3;
            }
            break;
          }
      }
    }
    if(!stalled){
      layer++;
    }
    stalled=false;
  }

  //Terrain
  var terrain_geometry = GenTerrain(noise_gen, triangles, point_geometry)



  //Coloring
  terrain_geometry.updateMaterial();

  terrain_geometry.add(scene);

  //GenCastles(terrain_geometry, ground_finder);


  terrain_geometry.hideUnused(-1)
}
