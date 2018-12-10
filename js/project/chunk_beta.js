class chunk_capsule {
	constructor(X_total_width, Z_total_width, X_chunk_sections, Z_chunk_sections, X_chunks, Z_chunks){
		//var material = new THREE.MeshBasicMaterial( { vertexColors: THREE.VertexColors } );
		var material = new THREE.MeshPhongMaterial({ vertexColors: THREE.VertexColors })
		//material.transparent = true;
		//material.opacity = .8;
		
		
		this.X_total_width = X_total_width;
		this.Z_total_width = Z_total_width;
		this.X_chunk_sections = X_chunk_sections;
		this.Z_chunk_sections = Z_chunk_sections;
		this.X_chunks = X_chunks;
		this.Z_chunks = Z_chunks;
		
		this.X_chunk_width = X_total_width / X_chunks;
		this.Z_chunk_width = Z_total_width / Z_chunks;
		this.X_origin = (this.X_chunk_width/2) - (X_total_width/2);
		this.Z_origin = (this.Z_chunk_width/2) - (Z_total_width/2);
		
		
		this.chunk_system = [];
		var current_x, current_z;
		
		for (var x_c = 0; x_c < X_chunks; x_c++){
			current_x = this.X_origin + (this.X_chunk_width*x_c);
			for (var z_c = 0; z_c < Z_chunks; z_c++){
				current_z = this.Z_origin + (this.Z_chunk_width*z_c);
				var geometry = new THREE.PlaneGeometry( this.X_chunk_width, this.Z_chunk_width, X_chunk_sections, Z_chunk_sections );
				geometry.rotateX( - Math.PI / 2 );
				geometry.translate(current_x,0,current_z);
				this.chunk_system.push(new THREE.Mesh( geometry, material ));
			}
		}
		
		this.chunk_size = this.chunk_system[0].geometry.vertices.length;
		
		this.total_size = this.chunk_size * X_chunks * Z_chunks;
	}
	
	get(index_raw){
		var X_chunk_index = Math.floor(index_raw / (this.chunk_size * this.X_chunks));
		
		var index_a = index_raw % (this.chunk_size*this.X_chunks);
		
		var Z_chunk_index = Math.floor(index_a / (this.chunk_size));
		
		var index_b = index_a % (this.chunk_size);
		
		if(typeof this.chunk_system[X_chunk_index * this.X_chunks + Z_chunk_index].geometry.vertices[index_b] == undefined){
			throw("out of index");
		}
		
		return this.chunk_system[X_chunk_index * this.X_chunks + Z_chunk_index].geometry.vertices[index_b];
	}
	
	computeFaceNormals(){
		for (var x_c = 0; x_c < this.X_chunks; x_c++){
			for (var z_c = 0; z_c < this.Z_chunks; z_c++){
				this.chunk_system[x_c * this.X_chunks + z_c].geometry.computeFaceNormals();
			}
		}
	}
	
	computeVertexNormals(){
		for (var x_c = 0; x_c < this.X_chunks; x_c++){
			for (var z_c = 0; z_c < this.Z_chunks; z_c++){
				this.chunk_system[x_c * this.X_chunks + z_c].geometry.computeVertexNormals();
			}
		}
	}
	
	add(scene){
		for (var x_c = 0; x_c < this.X_chunks; x_c++){
			for (var z_c = 0; z_c < this.Z_chunks; z_c++){
				scene.add(this.chunk_system[x_c * this.X_chunks + z_c]);
			}
		}
	}
	
	remove(scene){
		for (var x_c = 0; x_c < this.X_chunks; x_c++){
			for (var z_c = 0; z_c < this.Z_chunks; z_c++){
				scene.remove(this.chunk_system[x_c * this.X_chunks + z_c]);
			}
		}
	}
	
	updateMaterial(){
		
		this.computeFaceNormals();
		this.computeVertexNormals();
		
		//deal with edges
		
		for (var x_c = 0; x_c < this.X_chunks; x_c++){
			for (var z_c = 0; z_c < this.Z_chunks; z_c++){
				for ( var i = 0, l = this.chunk_system[x_c * this.X_chunks + z_c].geometry.faces.length; i < l; i ++ ) {

					var face = this.chunk_system[x_c * this.X_chunks + z_c].geometry.faces[ i ];
					
					/*if( (face.a<this.X_chunk_sections+1) || 
						(face.a>=this.chunk_system[x_c * this.X_chunks + z_c].geometry.vertices.length-(this.X_chunk_sections+1)) || 
						(face.a%(this.X_chunk_sections+1)==0) ||
						(face.a%(this.X_chunk_sections+1)==this.X_chunk_sections) ){// A lies on an edge and should be averaged}
					*/
					//elevation defined by loud
					//color defined by normal
					face.vertexColors[ 0 ] = new THREE.Color().setHSL( (face.vertexNormals[0].y-0.6) * .5 + 0.13, 0.46, Math.random() * 0.03 + 0.15 );
					face.vertexColors[ 1 ] = new THREE.Color().setHSL( (face.vertexNormals[1].y-0.6) * .5 + 0.13, 0.46, Math.random() * 0.03 + 0.15 );
					face.vertexColors[ 2 ] = new THREE.Color().setHSL( (face.vertexNormals[2].y-0.6) * .5 + 0.13, 0.46, Math.random() * 0.03 + 0.15 );

				}
			}
		}
	}
	hideUnused(min_height){
		for (var x_c = 0; x_c < this.X_chunks; x_c++){
			for (var z_c = 0; z_c < this.Z_chunks; z_c++){
				var under_water = true;
				for (var i = 0, l = this.chunk_system[x_c * this.X_chunks + z_c].geometry.vertices.length; i < l; i ++ ) {
					if(this.chunk_system[x_c * this.X_chunks + z_c].geometry.vertices[i].y>min_height){
						under_water = false;
						break;
					}
				}
				if(under_water){
					this.chunk_system[x_c * this.X_chunks + z_c].visible = false;
				}else{
					this.chunk_system[x_c * this.X_chunks + z_c].visible = true;
				}
			}
		}
	}

}