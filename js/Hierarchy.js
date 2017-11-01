class Region {
  constructor(){
    this.radius = 0
    this.max_radius = 0;

    this.position = THREE.Vector3(0,0,0)

    this.sub_regions = [];
  }
  Create_Subregion(closure, target_position){
    //find location that it will rest in


  }
}
class Closure {
  constructor(){
    this.type = 0
    this.radius = 0
    this.max_radius = 0;
    this.local_position = THREE.Vector3(0,0,0)
    closure.type_ignores = [];
  }
}
