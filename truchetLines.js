importScripts('helpers.js', 'external/stackblur.min.js')

postMessage(['sliders', defaultControls.concat([
  {label: 'Tile size', value: 60, min: 6, max: 100},
  {label: 'Lines', value: 6, min: 2, max: 50, step: 2},
  {label: 'Sublines', value: 3, min: 1, max: 10}
  ,{label: 'Amplitude', value: 0.1, min: 0.1, max: 5, step: 0.1}
  ,{label: 'Sampling', value: 5, min: 2, max: 10, step: 0.1}
])]);

(function(){
  var tiles, config, pixData;
  onmessage = function(e) {
    console.log(tiles);
    pixData = e.data[1];
    if (process_config(e.data[0]) || !tiles) {
      randomiseTiles();
    }
    render();
  }
  function randomiseTiles() {
    tiles = Array();
    // Randomise the tile orientations
    for(let x=0;x<config.width/config.tileSize;x+=1) {
      tiles[x] = [];
      for(let y=0;y<config.height/config.tileSize;y+=1) {
        tiles[x][y] = {t:'',d:[]};
        if (Math.floor(Math.random()*2.0) < 1) {
          tiles[x][y].t = "A";
          //tileA(x*config.tileSize,y*config.tileSize);
        }
        else {
          tiles[x][y].t = "B";
          //tileB(x*config.tileSize,y*config.tileSize);
        }
      }
    }
    //console.log(tiles);
  }
  function process_config(new_config) {
    console.log('config =', config);
    console.log('new_config =', new_config);
    let rc = false;
    if (!config) {
      config = Object()
      Object.assign(config, new_config);
      rc = true;
    }
    config.Lines = new_config.Lines;
    config.Sublines = new_config.Sublines;
    config.Amplitude = new_config.Amplitude;
    config.Sampling = new_config.Sampling;
    if (new_config.width != config.width
    ||  new_config.height != config.height
    ||  new_config['Tile size'] != config.tileSize) {
      config.width = new_config.width;
      config.height = new_config.height;
      config.tileSize = new_config['Tile size'];
      config.htiles = config.width / config.tileSize;
      config.vtiles = config.height / config.tileSize;
      rc = true;
    }
    config.lineSpacing = 2*config.tileSize/Math.round(config.Lines,2);
    return rc;
  }
  function render() {
    const getPixel = pixelProcessor(config, pixData);
    let lines = [];
    let offset;
    // style=/
    function tileA(x0,y0) {
      let x1=x0+config.tileSize;
      let y1=y0+config.tileSize;
      
      for(let x=config.lineSpacing/2;x<config.tileSize;x+=config.lineSpacing) {
        lines.push([[x0+x,y0],[x0,y0+x]]);
        lines.push([[x0+x,y1],[x1,y0+x]]);
      }
    }
    // style=\
    function tileB(x0,y0) {
      let x1=x0+config.tileSize;
      let y1=y0+config.tileSize;
      
      for(let x=config.lineSpacing/2;x<config.tileSize;x+=config.lineSpacing) {
        lines.push([[x0+x,y0],[x1,y1-x]]);
        lines.push([[x0+x,y1],[x0,y1-x]]);
      }
    }
    function register(i,j,offset) {
      let tile = tiles[i][j];
      let rec = Math.floor(offset/config.lineSpacing);
      if (tile.d[rec] === true) {
        return true;
      }
      tile.d[rec] = true;
      return false;
    }
    // Follow lines from left to right
    function followLineLR(prevTile,i,j,line) {
      //console.log('followLineLR',prevTile,i,j,line);
      if (i*config.tileSize>=config.width) {
        line.push([i*config.tileSize,j*config.tileSize+offset]);
        return;
      }
      const thisTile = tiles[i][j].t;
      // If this tile is different to the previous one, add a point on the line
      if (thisTile != prevTile) {
        line.push([i*config.tileSize,j*config.tileSize+offset]);
      }
      if (thisTile == 'A') {
        if (register(i,j,offset) === true) { return; }
        // Next tile is above (j-1)
        followLineBT(thisTile,i,j-1,line);
      }
      else {
        if (register(i,j,offset) === true) { return; }
        // Next tile is below (j+1)
        followLineTB(thisTile,i,j+1,line);
      }
    }
    // Follow lines from bottom to top
    function followLineBT(prevTile,i,j,line) {
      //console.log('followLineBT',prevTile,i,j,line);
      if (j<0) {
        line.push([i*config.tileSize+offset,0]);
        return;
      }
      const thisTile = tiles[i][j].t;
      // If this tile is different to the previous one, add a point on the line
      if (thisTile != prevTile) {
        line.push([i*config.tileSize+offset,(j+1)*config.tileSize]);
      }
      if (thisTile == 'A') {
        if (register(i,j,config.tileSize+offset) === true) { return; }
        // Next tile is to the right (i+1)
        followLineLR(thisTile,i+1,j,line);
      }
      else {
        if (register(i,j,offset) === true) { return; }
        // Next tile is to the left (i-1)
        followLineRL(thisTile,i-1,j,line)
      }
    }
    // Follow lines from top to bottom
    function followLineTB(prevTile,i,j,line) {
      //console.log('followLineTB',prevTile,i,j,line);
      if (j*config.tileSize >= config.height) {
        line.push([(i+1)*config.tileSize-offset,j*config.tileSize]);
        return;
      }
      const thisTile = tiles[i][j].t;
      // If this tile is different to the previous one, add a point on the line
      if (thisTile != prevTile) {
        line.push([(i+1)*config.tileSize-offset,j*config.tileSize]);
      }
      if (thisTile == 'A') {
        if (register(i,j,offset) === true) { return; }
        // Next tile is to the left
        followLineRL(thisTile,i-1,j,line);
      }
      else {
        if (register(i,j,config.tileSize+offset) === true) { return; }
        // Next tile is to the right
        followLineLR(thisTile,i+1,j,line)
      }
    }
    // Follow lines from right to left
    function followLineRL(prevTile,i,j,line) {
      //console.log('followLineRL',prevTile,i,j,line);
      if (i<0) {
        line.push([(i+1)*config.tileSize,(j+1)*config.tileSize-offset]);
        return;
      }
      const thisTile = tiles[i][j].t;
      // If this tile is different to the previous one, add a point on the line
      if (thisTile != prevTile) {
        line.push([(i+1)*config.tileSize,(j+1)*config.tileSize-offset]);
      }
      if (thisTile == 'A') {
        if (register(i,j,config.tileSize+offset) === true) { return; }
        // Next tile is below
        followLineTB(thisTile,i,j+1,line);
      }
      else {
        if (register(i,j,config.tileSize+offset) === true) { return; }
        // Next tile is above
        followLineBT(thisTile,i,j-1,line);
      }
    }
    function addSubline(a,b,line) {
      const f45 = 1/(2**0.5); //Math.sin(Math.PI/4);
      let [x0,y0] = a;
      let [x1,y1] = b;
      line.push([x0,y0]);
      let len = ((x1-x0)**2+(y1-y0)**2)**0.5 - config.Sampling;
      let dx = (x1 > x0 ? f45 : -f45);
      let dy = (y1 > y0 ? f45 : -f45);
      for (let z=config.Sampling; z<len; z+=config.Sampling) {
        let x = x0 + z * dx;
        let y = y0 + z * dy;
        let pixel = getPixel(x,y);
        let r = (isNaN(pixel) ? 0 : pixel * amplitude);
        line.push([x - r * dy, y + r * dx]);
      }
      line.push([x1,y1]);
      //console.log(line);
    }
    // Try drawing lines from the top and bottom
    for (let i=0; i<config.width/config.tileSize; i+=1) {
      for (offset=config.lineSpacing/2; offset<config.tileSize; offset+=config.lineSpacing) {
        let line = [];
        followLineTB('',i,0,line);
        if (line.length > 1) { lines.push(line); }
        line = [];
        followLineBT('',i,(config.height/config.tileSize)>>0,line);
        if (line.length > 1) { lines.push(line); }
      }
    }
    // Try drawing lines from the left and right sides
    for (let j=0; j<config.height/config.tileSize; j+=1) {
      for (offset=config.lineSpacing/2; offset<config.tileSize; offset+=config.lineSpacing) {
        let line = [];
        followLineLR('',0,j,line);
        if (line.length > 1) { lines.push(line); }
        line = [];
        followLineRL('',(config.width/config.tileSize)>>0,j,line);
        if (line.length > 1) { lines.push(line); }
      }
    }
    // Fill in any internal lines that tracing lines from the perimeter has missed
    for (let i=0; i<config.width/config.tileSize; i+=1) {
      for (let j=0; j<config.height/config.tileSize; j+=1) {
        for (offset=config.lineSpacing/2; offset<config.tileSize; offset+=config.lineSpacing) {
          let line = [];
          if (tiles[i][j].t == "A") {
            followLineBT('',i,j,line);
          }
          if (line.length > 1) { lines.push(line); }
        }
      }
    }
    // Trace the lines with sublines
    // Adding divide by 10 until I can figure out controls
    const amplitude = config.Amplitude / config.Sublines / (config.tileSize / config.lineSpacing) / 10;
    //config.Sampling = 5;
    console.log('amplitude=', amplitude);
    const line_count = lines.length;
    for (let i=0; i<line_count; i+=1) {
      let line = [];
      let j;
      for (j=0; j<lines[i].length-1; j++) {
        addSubline(lines[i][j], lines[i][j+1], line);
      }
      for (; j>0; j--) {
        addSubline(lines[i][j], lines[i][j-1], line);
      }
      if (line.length > 1) { lines.push(line); }
    }
    postLines(lines);
  }

})();