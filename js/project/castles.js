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