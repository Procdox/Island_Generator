// 3D simplex noise

Math.seed = 0;
 
// in order to work 'Math.seed' must NOT be undefined,
// so in any case, you HAVE to provide a Math.seed
Math.seededRandom = function(){
 
    Math.seed = (Math.seed * 9301 + 49297) % 233280;
    var rnd = Math.abs(Math.seed / 233280);
 
    return rnd;
}

class Peak {
	constructor(x,z,height){
		this.x = x;
		this.z = z;
		this.height = height;
	}
}

class Cell {
	constructor(x, y, size, detail){
		this.seed = 0;
		this.peaks = [];
		this.x = x;
		this.y = y;
		this.size = size;
		this.detail = detail;
	}
	setSeed(x_mod, y_mod){
		Math.seed = x_mod*this.x+y_mod*this.y;
		this.peaks = [];
		var peak_count = Math.floor(1/(.3+Math.seededRandom()*8));
		for(var i=0;i<peak_count;i++){
			this.peaks.push(new Peak((this.x+Math.seededRandom())*this.size,(this.y+Math.seededRandom())*this.size,Math.seededRandom()*1500));
		}
	}
	updateMesh(peaks){
		var geometry = new THREE.PlaneGeometry( this.size, this.size, this.detail, this.detail );
		geometry.rotateX( - Math.PI / 2 );
		geometry.translate(this.x*this.size,0,this.y*this.size);
					
		var noise_gen = new Simplex3D();
					
		for ( var i = 0, l = geometry.vertices.length; i < l; i ++ ) {
			var vertex = geometry.vertices[ i ];
			
			var min_distance = 20000;
			var effective_height = 0;
			for(var j=0;j<peaks.length;j++){
				var distance = Math.sqrt((peaks[j].x-vertex.x)*(peaks[j].x-vertex.x)+(peaks[j].z-vertex.z)*(peaks[j].z-vertex.z));
				if(distance<min_distance){
					min_distance=distance;
					effective_height=peaks[j].height;
				}
			}
			min_distance = 1-min_distance/2000;
			var real_height = effective_height*(6*Math.pow(min_distance,5)-15*Math.pow(min_distance,4)+10*Math.pow(min_distance,3))
			//vertex.y += real_height;
			vertex.y += 70 * noise_gen.noise(vertex.x/400,vertex.y/400,vertex.z/400);
			vertex.y += 4000 * noise_gen.noise(vertex.x/10000,vertex.y/10000,vertex.z/10000);
			//vertex.x += Math.random() * 20 - 10;
			//vertex.y += Math.random() * 8;
			//vertex.z += Math.random() * 20 - 10;

		}
		
		geometry.computeFaceNormals();
		geometry.computeVertexNormals();

		for ( var i = 0, l = geometry.faces.length; i < l; i ++ ) {

			var face = geometry.faces[ i ];
			//elevation defined by loud
			//color defined by normal
			face.vertexColors[ 0 ] = new THREE.Color().setHSL( (face.vertexNormals[0].y-0.8) * .8 + 0.13, 0.46, Math.random() * 0 + 0.2 );
			face.vertexColors[ 1 ] = new THREE.Color().setHSL( (face.vertexNormals[1].y-0.8) * .8 + 0.13, 0.46, Math.random() * 0 + 0.2 );
			face.vertexColors[ 2 ] = new THREE.Color().setHSL( (face.vertexNormals[2].y-0.8) * .8 + 0.13, 0.46, Math.random() * 0 + 0.2 );

		}

		material = new THREE.MeshBasicMaterial( { vertexColors: THREE.VertexColors } );

		this.mesh = new THREE.Mesh( geometry, material );
		//scene.add( mesh );
		//objects.push( mesh );
	}
}

class CellManager {
	constructor(scene, load_distance, render_distance, size, detail){
		this.x_mod = 1283;
		this.y_mod = 1289;
		this.cell_size = size;
		this.cell_detail = detail;
		if(load_distance<=render_distance){
			this.load_distance = render_distance+1;
		}else{
			this.load_distance = load_distance;
		}
		this.render_distance = render_distance;
		this.scene_ref = scene;
		this.x_ref = 0;
		this.y_ref = 0;
		
		this.cells = [];
		//load area
		this.peaks=[];
		for(var i=0;i<=load_distance*2;i++){
			this.cells[i] = [];
			for(var j=0;j<=load_distance*2;j++){
				this.cells[i][j] = new Cell(i-load_distance,j-load_distance,this.cell_size,this.cell_detail);
				this.cells[i][j].setSeed(this.x_mod,this.y_mod);
				this.peaks.push.apply(this.peaks, this.cells[i][j].peaks);
			}
		}
		//render area
		for(var i=-render_distance;i<=render_distance;i++){
			for(var j=-render_distance;j<=render_distance;j++){
				this.cells[load_distance+i][load_distance+j].updateMesh(this.peaks);
				this.scene_ref.add(this.cells[load_distance+i][load_distance+j].mesh);
			}
		}
		
		objects = [this.cells[this.load_distance][this.load_distance].mesh];
		
		var water_geometry = geometry = new THREE.PlaneGeometry( 5000, 5000, 1, 1 );
		water_geometry.rotateX( - Math.PI / 2 );
		
		var water_material = new THREE.MeshBasicMaterial( {color: 0x0055ff, side: THREE.DoubleSide} );
		water_material.transparent = true;
		water_material.opacity = .4;
		
		this.water = new THREE.Mesh( water_geometry, water_material );
		
		this.scene_ref.add(this.water);
		
	}
	update(x_raw,y_raw){
		this.water.position.set(x_raw,-30,y_raw);
		var x = Math.floor(x_raw/this.cell_size + .5);
		var y = Math.floor(y_raw/this.cell_size + .5);
		if(x>this.x_ref){
			console.log("x_up");
			this.x_ref+=1;
			
			//push rows down
			for(var i=0;i<this.load_distance*2;i++){
				this.cells[i]=this.cells[i+1].slice(0);
			}
			
			//create new row
			for(var i=0;i<=this.load_distance*2;i++){
				this.cells[this.load_distance*2][i] = new Cell(x+this.load_distance,y+i-this.load_distance,this.cell_size,this.cell_detail);
				this.cells[this.load_distance*2][i].setSeed(this.x_mod,this.y_mod);
				//this.scene_ref.add(this.cells[this.load_distance*2][i].mesh);
			}
			
			//update peaks
			this.peaks=[];
			for(var i=0;i<=this.load_distance*2;i++){
				for(var j=0;j<=this.load_distance*2;j++){
					this.peaks.push.apply(this.peaks, this.cells[i][j].peaks);
				}
			}
			
			//render unload
			for(var i=-this.render_distance;i<=this.render_distance;i++){
				this.scene_ref.remove(this.cells[this.load_distance-this.render_distance-1][this.load_distance+i].mesh);
			}
			//render load
			for(var i=-this.render_distance;i<=this.render_distance;i++){
				this.cells[this.load_distance+this.render_distance][this.load_distance+i].updateMesh(this.peaks);
				this.scene_ref.add(this.cells[this.load_distance+this.render_distance][this.load_distance+i].mesh);
			}
			
			objects = [this.cells[this.load_distance][this.load_distance].mesh];
			
		}else if(x<this.x_ref){
			console.log("x_down");
			this.x_ref-=1;
			
			//push rows up
			for(var i=this.load_distance*2;i>0;i--){
				this.cells[i]=this.cells[i-1].slice(0);
			}
			
			//create new row
			for(var i=0;i<this.load_distance*2+1;i++){
				this.cells[0][i] = new Cell(x-this.load_distance,y+i-this.load_distance,this.cell_size,this.cell_detail);
				this.cells[0][i].setSeed(this.x_mod,this.y_mod);
				//this.scene_ref.add(this.cells[0][i].mesh);
			}
			
			//update peaks
			this.peaks=[];
			for(var i=0;i<=this.load_distance*2;i++){
				for(var j=0;j<=this.load_distance*2;j++){
					this.peaks.push.apply(this.peaks, this.cells[i][j].peaks);
				}
			}
			
			//render unload
			for(var i=-this.render_distance;i<=this.render_distance;i++){
				this.scene_ref.remove(this.cells[this.load_distance+this.render_distance+1][this.load_distance+i].mesh);
			}
			//render load
			for(var i=-this.render_distance;i<=this.render_distance;i++){
				this.cells[this.load_distance-this.render_distance][this.load_distance+i].updateMesh(this.peaks);
				this.scene_ref.add(this.cells[this.load_distance-this.render_distance][this.load_distance+i].mesh);
			}
			
			objects = [this.cells[this.load_distance][this.load_distance].mesh];
			
		}
		if(y>this.y_ref){
			console.log("y_up");
			this.y_ref+=1;
			
			//delete a row
			for(var i=0;i<=this.load_distance*2;i++){
				this.scene_ref.remove(this.cells[i][0].mesh);
			}
			
			//push rows left
			for(var i=0;i<this.load_distance*2;i++){
				for(var j=0;j<=this.load_distance*2;j++){
					this.cells[j][i]=this.cells[j][i+1];
				}
			}
			
			//create new row
			for(var i=0;i<=this.load_distance*2;i++){
				this.cells[i][this.load_distance*2] = new Cell(x+i-this.load_distance,y+this.load_distance,this.cell_size,this.cell_detail);
				this.cells[i][this.load_distance*2].setSeed(this.x_mod,this.y_mod);
				//this.scene_ref.add(this.cells[i][this.load_distance*2].mesh);
			}
			
			//update peaks
			this.peaks=[];
			for(var i=0;i<=this.load_distance*2;i++){
				for(var j=0;j<=this.load_distance*2;j++){
					this.peaks.push.apply(this.peaks, this.cells[i][j].peaks);
				}
			}
			
			//render unload
			for(var i=-this.render_distance;i<=this.render_distance;i++){
				this.scene_ref.remove(this.cells[this.load_distance+i][this.load_distance-this.render_distance-1].mesh);
			}
			//render load
			for(var i=-this.render_distance;i<=this.render_distance;i++){
				this.cells[this.load_distance+i][this.load_distance+this.render_distance].updateMesh(this.peaks);
				this.scene_ref.add(this.cells[this.load_distance+i][this.load_distance+this.render_distance].mesh);
			}
			
			objects = [this.cells[this.load_distance][this.load_distance].mesh];
			
		}else if(y<this.y_ref){
			console.log("y_down");
			this.y_ref-=1;
			
			//push rows right
			for(var i=this.load_distance*2;i>0;i--){
				for(var j=0;j<=this.load_distance*2;j++){
					this.cells[j][i]=this.cells[j][i-1];
				}
			}
			
			//create new row
			for(var i=0;i<=this.load_distance*2;i++){
				this.cells[i][0] = new Cell(x+i-this.load_distance,y-this.load_distance,this.cell_size,this.cell_detail);
				this.cells[i][0].setSeed(this.x_mod,this.y_mod);
				//this.scene_ref.add(this.cells[i][0].mesh);
			}
			
			//update peaks
			this.peaks=[];
			for(var i=0;i<=this.load_distance*2;i++){
				for(var j=0;j<=this.load_distance*2;j++){
					this.peaks.push.apply(this.peaks, this.cells[i][j].peaks);
				}
			}
			
			//render unload
			for(var i=-this.render_distance;i<=this.render_distance;i++){
				this.scene_ref.remove(this.cells[this.load_distance+i][this.load_distance+this.render_distance+1].mesh);
			}
			//render load
			for(var i=-this.render_distance;i<=this.render_distance;i++){
				this.cells[this.load_distance+i][this.load_distance-this.render_distance].updateMesh(this.peaks);
				this.scene_ref.add(this.cells[this.load_distance+i][this.load_distance-this.render_distance].mesh);
			}
			
			objects = [this.cells[this.load_distance][this.load_distance].mesh];
			
		}
	}
	
}

class Simplex3D {
	constructor(){
		this.grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
			[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
			[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];

		this.perm = [151,160,137,91,90,15,
			131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
			190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
			88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
			77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
			102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
			135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
			5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
			223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
			129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
			251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
			49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
			138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180,151,160,137,91,90,15,
			131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
			190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
			88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
			77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
			102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
			135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
			5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
			223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
			129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
			251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
			49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
			138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
	}

	dot(a,x,y,z){
		return a[0]*x+a[1]*y+a[2]*z;
	}

	noise(xin, yin, zin) {
		var n0, n1, n2, n3; // Noise contributions from the four corners
		
		// Skew the input space to determine which simplex cell we're in
		var F3 = 1.0/3.0;
		var s = (xin+yin+zin)*F3; // Very nice and simple skew factor for 3D
		
		var i = Math.floor(xin+s);
		var j = Math.floor(yin+s);
		var k = Math.floor(zin+s);
		
		var G3 = 1.0/6.0; // Very nice and simple unskew factor, too
		var t = (i+j+k)*G3; 
		
		var X0 = i-t; // Unskew the cell origin back to (x,y,z) space
		var Y0 = j-t;
		var Z0 = k-t;
		
		var x0 = xin-X0; // The x,y,z distances from the cell origin
		var y0 = yin-Y0;
		var z0 = zin-Z0;
		
		// For the 3D case, the simplex shape is a slightly irregular tetrahedron.
		// Determine which simplex we are in.
		var i1, j1, k1; // Offsets for second corner of simplex in (i,j,k) coords
		var i2, j2, k2; // Offsets for third corner of simplex in (i,j,k) coords
		
		if(x0>=y0) {
			if(y0>=z0){ i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; } // X Y Z order
			else if(x0>=z0) { i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; } // X Z Y order
			else { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; } // Z X Y order
		}
		else { // x0<y0
			if(y0<z0) { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; } // Z Y X order
			else if(x0<z0) { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; } // Y Z X order
			else { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; } // Y X Z order
		}
		
		// A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z),
		// a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and
		// a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where
		// c = 1/6.
		
		var x1 = x0 - i1 + G3; // Offsets for second corner in (x,y,z) coords
		var y1 = y0 - j1 + G3;
		var z1 = z0 - k1 + G3;
		var x2 = x0 - i2 + 2.0*G3; // Offsets for third corner in (x,y,z) coords
		var y2 = y0 - j2 + 2.0*G3;
		var z2 = z0 - k2 + 2.0*G3;
		var x3 = x0 - 1.0 + 3.0*G3; // Offsets for last corner in (x,y,z) coords
		var y3 = y0 - 1.0 + 3.0*G3;
		var z3 = z0 - 1.0 + 3.0*G3;
		
		// Work out the hashed gradient indices of the four simplex corners
		var ii = i & 255;
		var jj = j & 255;
		var kk = k & 255;
		var gi0 = this.perm[ii+this.perm[jj+this.perm[kk]]] % 12;
		var gi1 = this.perm[ii+i1+this.perm[jj+j1+this.perm[kk+k1]]] % 12;
		var gi2 = this.perm[ii+i2+this.perm[jj+j2+this.perm[kk+k2]]] % 12;
		var gi3 = this.perm[ii+1+this.perm[jj+1+this.perm[kk+1]]] % 12;
	
		// Calculate the contribution from the four corners
		var t0 = 0.5 - x0*x0 - y0*y0 - z0*z0;
		if(t0<0){n0 = 0.0;}
		else {
			t0 *= t0;
			n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0, z0);
		}
		var t1 = 0.5 - x1*x1 - y1*y1 - z1*z1;
		if(t1<0){ n1 = 0.0;}
		else {
			t1 *= t1;
			n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1, z1);
		}
		var t2 = 0.5 - x2*x2 - y2*y2 - z2*z2;
		if(t2<0){ n2 = 0.0;}
		else {
			t2 *= t2;
			n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2, z2);
		}
		var t3 = 0.5 - x3*x3 - y3*y3 - z3*z3;
		if(t3<0){ n3 = 0.0;}
		else {
			t3 *= t3;
			n3 = t3 * t3 * this.dot(this.grad3[gi3], x3, y3, z3);
		}
	
		// Add contributions from each corner to get the final noise value.
		// The result is scaled to stay just inside [-1,1]
		return 32.0*(n0 + n1 + n2 + n3);
	}
}