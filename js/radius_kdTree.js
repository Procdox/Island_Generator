class KD_Branch { //radius next
  constructor(data, position, parent){
    "use strict";

  	this.dimensions = parent.dimensions; //&[] for dimension object of DATA
    this.rel = (parent.rel + 1) % this.dimensions.length;

    //this.metric = distance_metric

    this.position = position
  	this.DATA = data; //[&void] for payload

  	this.Less_branch = 0; //[&KD_Branch]
  	this.More_branch = 0; //[&KD_Branch]

    this.less_buffer = 0;
    this.more_buffer = 0;

    this.parent = parent
  }
  organize(parent, descendents){
    "use strict";
    this.parent = parent;

    var less = [];
    var more = [];

    this.less_buffer = 0;
    this.more_buffer = 0;

    this.More_branch = 0;
    this.Less_branch = 0;

    for (element of all_points){
      if(element == this.ROOT){
        continue;
      }
      var offset = element.position[this.dimensions[this.rel]] -
        this.position[this.dimensions[this.ref]];
      if(offset<0){
        less.push(element);
        this.less_buffer = Math.max(element.radius+offset,this.less_buffer);
      }
      else{
        more.push(element);
        this.more_buffer = Math.max(element.radius-offset,this.more_buffer);
      }
    }

    var focus = 0;
    var focus_size = 10;

    shuffle(less);
    shuffle(more);

    if(less.length>0){
      if(less.length>focus_size){
        focus = less.splice(-focus_size,focus_size)
      }else{
        focus = less;
      }

      focus.sort(function(a,b){
        return a.position[this.dimensions[this.rel]] -
          b.position[this.dimensions[this.ref]];
      });

      this.Less_branch = focus[Math.floor(focus.length/2)];

      less.remove(this.Less_branch);

      this.Less_branch.organize(this, less)
    }

    if(more.length>0){
      if(more.length>focus_size){
        focus = more.splice(-focus_size,focus_size)
      }else{
        focus = more;
      }

      focus.sort(function(a,b){
        return a.position[this.dimensions[this.rel]] -
          b.position[this.dimensions[this.ref]];
      });

      this.More_branch = focus[Math.floor(focus.length/2)];

      more.remove(this.More_branch);

      this.More_branch.organize(this, more)
    }
  }
  PerformOnAll(map){
    "use strict";

    if(this.More_branch){
      this.More_branch.PerformOnAll(map)
    }
    map(this)
    if(this.Less_branch){
      this.Less_branch.PerformOnAll(map)
    }
  } //passed &f
  FindRegionParent(position){//passed &vector, returns &KD_Branch
    "use_strict"

    var offset = position[this.dimensions[this.rel]] -
      this.position[this.dimensions[this.ref]];

    if (offset < 0) {
      if (this.Less_branch) {
        return this.Less_branch->FindRegionParent(position);

      }
      else {
        return this;
      }
    }
    else {
      if (this.More_branch) {
        return this.More_branch->FindRegionParent(position);
      }
      else {
        return this;
      }
    }
    return;
  }
	AddPoint(data, position) { //passed &void, &vector, returns bool on succeed
    "use_strict"

    var offset = position[this.dimensions[this.rel]] -
      this.position[this.dimensions[this.ref]];
    if (offset < 0) {
      this.less_buffer = Math.max(element.radius+offset,this.less_buffer);

      if (this.Less_branch) {
        return this.Less_branch->AddPoint(data, position);
      }
      else {
        this.Less_branch = new KD_Branch(data, positon, this)
        return true;
      }
    }
    else {
      this.more_buffer = Math.max(element.radius-offset,this.more_buffer);

      if (this.More_branch) {
        return this.More_branch->AddPoint(data, position);
      }
      else {
        this.More_branch = new KD_Branch(data, positon, this)
        return true;
      }
    }
    return false;
  }
	FindNearest(target, results) { //passed &vector], {&void, float}
    "use strict";
    if(results

    var distance = this.metric(target,this.position);
		if (distance < results.distance) {
			results.distance = distance;
			results.best = this.DATA;
		}
		var axis_distance = target[this.dimensions[this.rel]]
      - this.Position[this.dimensions[this.rel]];
		if (axis_distance < results.distance) {
			if (this.Less_branch!=nullptr) {
				this.Less_branch->FindNearest(target, results);
			}
		}
		if (-axis_distance < results.distance) {
			if (this.More_branch != nullptr) {
				this.More_branch->FindNearest(target, results);
			}
		}
		return;
	}
	InclusionRange(target, range, results) { //passed &vector, float &[]
    "use strict";

		var distance = FVector2D::Distance(*target, Position);
		if (distance < range) {
			results.Push(this.DATA);
		}

    var offset = target[this.dimensions[this.rel]]
      - this.Position[this.dimensions[this.rel]];

		if (offset < range) {
			if (this.Less_branch) {
				this.Less_branch.InclusionRange(target, range, results);
			}
		}
		if (-offset < range) {
			if (this.More_branch) {
				this.More_branch.InclusionRange(target, range, results);
			}
		}
    return;
	}
  IntersectRange(target, range, results){
    "use strict";

    var distance = FVector2D::Distance(*target, Position);
    if (distance < range + this.DATA.radius) {
      results.Push(this.DATA);
    }

    var offset = target[this.dimensions[this.rel]]
      - this.Position[this.dimensions[this.rel]];

    if (offset < range + this.less_buffer) {
      if (this.Less_branch) {
        this.Less_branch.IntersectRange(target, range, results);
      }
    }
    if (-offset < range + this.more_buffer) {
      if (this.More_branch) {
        this.More_branch.IntersectRange(target, range, results);
      }
    }
    return;
  }
  Flatten(results) { //passed &[]
    "use strict";

    if(this.More_branch){
      this.More_branch.Flatten(results)
    }
    results.Push(this)
    if(this.Less_branch){
      this.Less_branch.Flatten(results)
    }
	}
};

function shuffle(array) {
  var m = array.length, t, i;

  // While there remain elements to shuffle…
  while (m) {

    // Pick a remaining element…
    i = Math.floor(Math.random() * m--);

    // And swap it with the current element.
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }

  return array;
}

class KD_TREE {
  constructor(dimensions){
    "use strict";

    this.rel = 0;
    this.dimensions = dimensions

    this.ROOT = 0; //&KD_Branch
    this.branch_count = 0; //int
	}

	AddPoint(data, position) { //passed &void, &vector, returns bool on succeed
    "use strict";

    if(this.ROOT == 0){
      this.ROOT = new KD_Branch(data, position, this)
      return true;
    }

		if(this.ROOT.AddPoint(data, position)){
      this.branch_count++;
      return true;
    }

    return false;
	}
	FindNearest(position) {
    "use strict";

		if (ROOT == 0) {
			return false;
		}

    var result = {distance:Infinity,best:0};

		ROOT->FindNearest(position, result);

    return result;
	}
	InclusionRange(position, range, result = []) {
    "use strict";

		if (ROOT == 0) {
			return false;
		}

		ROOT->InclusionRange(position, range, Found);

    return result;
	}
  IntersectRange(position, range, result = []) {
    "use strict";

		if (ROOT == 0) {
			return false;
		}

		ROOT->IntersectRange(position, range, Found);

    return result;
	}
	Rebalance() {
    "use strict";

		if (ROOT == nullptr) {
			return true;
		}

    //pull off up to n items, find the median, add that to the stack
    var focus = 0;
    var focus_size = 10;

    var all_points = [];
    ROOT->Flatten(all_points);

    shuffle(all_points);

    if(all_points.length>focus_size){
      focus = all_points.splice(-focus_size,focus_size)
    }else{
      focus = all_points;
    }

    focus.sort(function(a,b){
      return a.position[this.dimensions[this.rel]] -
        b.position[this.dimensions[this.ref]];
    });

    var middle = Math.floor(focus.length/2);

    this.ROOT = focus[middle];

    all_points.remove(this.ROOT);

    this.ROOT.organize(this, all_points)




    //max points
	}
};

class Radial_Branch {
  constructor(dimensions){
    "use strict";

    this.children = []; //&KD_Branch
    this.radius = 0
    this.position = new THREE.Vector3();
	}
};



class Radial_Tree {



}
