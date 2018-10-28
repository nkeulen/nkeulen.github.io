/***************************
          -  OctoGraph  -

Author: Niels Keulen (https://github.com/nkeulen)
License: https://raw.githubusercontent.com/nkeulen/octograph/master/LICENSE

 A tool for creating simple, pretty and customizable network diagrams
 on the fly from JSON data.
***************************/


/*******************************************
  CUSTOMIZATION VARIABLES start here.
  You can change these to modify what your diagram looks like.
********************************************/
// Global style:
var octograph_background_color = "white";

// Node style:
var octograph_node_size = 40;
var octograph_node_name_color = "black";
var octograph_node_name_outline_color = "white";
var octograph_node_name_outline_size = 3;
var octograph_node_font = "20px Arial";
var octograph_node_fill = "#1a75ff";
var octograph_node_fill_top = "#b3d1ff";
var octograph_node_border_color = "#000000";
var octograph_node_border_size = 1;

// Connections style:
// You can add your own connection types her also.
var octograph_connection_styles = {
                              "unspecified" : { "color":"#0000ff", "width":2 },
                              "10gigE"      : { "color":"#ff9900", "width":3 }
                                  };
// The following variable defines how much space is between connection lines
// when there are multiple connections between nodes.
var octograph_multiple_connections_margin = 7;

// Area style:
var octograph_area_outline_color = "#dddddd";
var octograph_area_outline_width = 2;
var octograph_area_fill  = "#e6f2ff";
var octograph_area_padding_vertical = 50;
var octograph_area_padding_horizontal = 140;
var octograph_area_title_font_size = 18;
var octograph_area_title_font_family = "Arial";
var octograph_area_title_color = "#000000";
var octograph_area_title_outline_color = "#333333";
var octograph_area_title_outline_size = 0 ;
var octograph_area_title_margin = 4;
/*********************************************
  End of customization variables section.
**********************************************/


//Global variables:
var octograph_verbose = true;
var octograph_nodes = null;
var octograph_connections = null;
var octograph_areas = null;
var octograph_multi_connected_already_rendered = null;
var context = null;

function octograph_debug_log(s){
  // print debug message to console if verbose is set to true.
  if(octograph_verbose){
    console.log("OctoGraph - " + s);
  }
}

function octograph_error_log(s){
  // errors are always printed to console
  console.log("OctoGraph - ERROR: " + s);
}

// Check if jQuery is included:
if(!window.jQuery){
  octograph_error_log("Please don't forget to load jQuery, OctoGraph can't run without it.");
}

$( document ).ready(function() {
  // Run octograph on document ready to render diagrams.
  octograph_run();
});

function octograph_run(){
  // Renders all octograph diagrams
  // Looks for canvas objects with class: 'octograph_diagram'
  // These should contain OctoGraph JSON.
  octograph_debug_log("running...");
  $(".octograph_diagram").each(function(i, obj) {
      octograph_debug_log("found canvas element with 'octograph_diagram' class");
      var diagram_contents = $(obj).html();
      octograph_render_diagram(obj, JSON.parse(diagram_contents));
  });
  octograph_debug_log("no more remaining canvas elements with 'octograph_diagram' class");
  octograph_debug_log("done!");
}
0
function octograph_render_diagram(canvas, contents){
  // This function renders a octograph diagram
  // Set context object
  context = canvas.getContext("2d");
  octograph_clear_canvas(canvas);
  // Extract data to loop over from contents:
  octograph_nodes = contents.nodes;
  octograph_node_positions_to_int();
  octograph_connections = contents.connections;
  octograph_areas = contents.areas;
  // Render:
  octograph_render_areas();
  octograph_render_connections();
  octograph_render_nodes();
}

function octograph_render_areas(){
  octograph_debug_log("rendering areas");
  // Loop over areas and render:
  for(var i=0; i<octograph_areas.length; i++){
    octograph_render_area(octograph_areas[i]);
  }
}

function octograph_render_connections(){
  octograph_debug_log("rendering connnections");
  // Loop over connections and render:
  octograph_multi_connected_already_rendered = [];
  for(var i=0; i<octograph_connections.length; i++){
    octograph_render_connection(octograph_connections[i]);
  }
}

function octograph_render_nodes(){
  octograph_debug_log("rendering nodes");
  // Loop over nodes and render:
  for(var i=0; i<octograph_nodes.length; i++){
    octograph_render_node(octograph_nodes[i]);
  }
}

function octograph_render_node(node){
  // Renders a single node (node with texts only, no connections)
  //Draw node:
  if(node.type == "router") octograph_render_router_icon(node);
  else if(node.type == "switch") octograph_render_switch_icon(node);
  else octograph_error_log("unknown node type for node '" + node.name + "', got type: '" + node.type + "'");
  // Text setup:
  context.font = octograph_node_font;
  var text_x = node.pos.x + octograph_node_size + 4;
  var text_y = node.pos.y + octograph_node_size/2 - 4;
  // Node name outline:
  if(octograph_node_name_outline_size != 0){
    context.strokeStyle = octograph_node_name_outline_color;
    context.lineWidth = octograph_node_name_outline_size;
    context.strokeText(node.name, text_x, text_y);
  }
  // Node name fill:
  context.fillStyle = octograph_node_name_color;
  context.fillText(node.name, text_x, text_y);
}

function octograph_render_router_icon(node){
  context.save();
  context.scale(1.0, 0.5);
  for(var height=29; height>=0; height--){
    context.beginPath();
    context.arc(node.pos.x, node.pos.y*2+height, octograph_node_size, 0, 2 * Math.PI, false);
    if(height==0){
      context.fillStyle = octograph_node_fill_top;
    }
    else{
      context.fillStyle = octograph_node_fill;
    }
    context.fill();
    context.closePath();
  }
  context.restore();
}

function octograph_render_switch_icon(node){
  context.fillStyle = octograph_node_fill;
  var top_left_x = node.pos.x - octograph_node_size;
  var top_left_y = node.pos.y - octograph_node_size/2;
  var width = 2 * octograph_node_size;
  var height = octograph_node_size;
  context.fillRect(top_left_x, top_left_y, width, height);
  context.fillStyle = octograph_node_fill_top;
  context.fillRect(top_left_x, top_left_y, width, octograph_node_size*0.4);
}

function octograph_render_connection(connection){
  var node1 = octograph_get_node_by_name(connection.from);
  var node2 = octograph_get_node_by_name(connection.to);
  if(octograph_nr_of_connections_between_nodes(connection.from, connection.to) == 1){
    // simple one connections between nodes
    context.beginPath();
    context.strokeStyle = octograph_connection_styles[connection.type].color;
    context.lineWidth = octograph_connection_styles[connection.type].width;
    context.moveTo(node1.pos.x, node1.pos.y);
    context.lineTo(node2.pos.x, node2.pos.y);
    context.stroke();
    context.closePath();
  }
  else{
    // there are multiple connections between these nodes these are rendered all at once (and only once)
    // some margin (octograph_multiple_connections_margin) is kept between them
    if(!octograph_in_multi_connected_already_rendered(connection.from, connection.to)){ //didn't yet render these connections
      var distance_between_nodes = octograph_distance_between_points(node1.pos, node2.pos);
      var angle_between_nodes = octograph_angle_between_points(node1.pos, node2.pos);
      var connections_between_nodes = octograph_get_connections_between_nodes(connection.from, connection.to);
      for(var i=0; i<connections_between_nodes.length; i++){
        var connection_style = octograph_connection_styles[connections_between_nodes[i].type];
        var calculated_from_pos = octograph_calculate_multi_connection_line_from_pos(node1.pos, i, connections_between_nodes.length);
        octograph_draw_and_rotate_line( calculated_from_pos,
                                        node1.pos,
                                        distance_between_nodes,
                                        connection_style.width,
                                        connection_style.color,
                                        angle_between_nodes);
      }
      // done with all connections between these wo nodes
      // add to already rendered list so these connections are not rendered multiple times
      octograph_multi_connected_already_rendered.push({"from":connection.from, "to":connection.to});
    }
  }
}

function octograph_render_area(area){
  if(area.nodes.length < 1){
    octograph_error_log("area " + area.title + " contains no nodes, it will be skipped.");
  }
  else{
    // Get bounds
    var bounds = octograph_get_nodes_bounds(area.nodes);
    var text_x = bounds.left - octograph_area_padding_horizontal + octograph_area_title_margin;
    var text_y = bounds.top - octograph_area_padding_vertical + octograph_area_title_font_size + octograph_area_title_margin;
    // Do padding
    bounds.left   = bounds.left - octograph_area_padding_horizontal;
    bounds.top    = bounds.top  - octograph_area_padding_vertical;
    bounds.right  = bounds.right  + octograph_area_padding_horizontal;
    bounds.bottom = bounds.bottom + octograph_area_padding_vertical;
    context.beginPath();
    // Render area
    context.strokeStyle = octograph_area_outline_color;
    context.lineWidth = octograph_area_outline_width;
    context.fillStyle = octograph_area_fill;
    var width = bounds.right-bounds.left;
    var height = bounds.bottom-bounds.top;
    context.fillRect(bounds.left, bounds.top, width, height);
    context.strokeRect(bounds.left, bounds.top, width, height);
    // Render area title text
    context.font = octograph_area_title_font_size + "px " + octograph_area_title_font_family;
    // outline:
    if(octograph_area_title_outline_size != 0){
      context.strokeStyle = octograph_area_title_outline_color;
      context.lineWidth = octograph_area_title_outline_size;
      context.strokeText(area.title, text_x, text_y);
    }
    // text:
    context.fillStyle = octograph_area_title_color;
    context.fillText(area.title, text_x, text_y);
    context.closePath();
  }
}

function octograph_get_nodes_bounds(nodes){
  // returns for a set of provided nodes the following object:  {"left":100, "top":20, "right":600, "bottom":900
  // all provides nodes (their x,y coordinates) fit exactly in these bounds
  nodes = octograph_node_name_array_to_node_array(nodes);
  var bounds = {  "left":nodes[0].pos.x,
                  "top":nodes[0].pos.y,
                  "right":nodes[0].pos.x,
                  "bottom":nodes[0].pos.y  };
  for(var i=0; i<nodes.length; i++){
    if(nodes[i].pos.x < bounds.left){
      bounds.left = nodes[i].pos.x;
    }
    else if(nodes[i].pos.x > bounds.right){
      bounds.right = nodes[i].pos.x;
    }
    if(nodes[i].pos.y < bounds.top){
      bounds.top = nodes[i].pos.y;
    }
    else if(nodes[i].pos.y > bounds.bottom){
      bounds.bottom = nodes[i].pos.y;
    }
  }
  return bounds;
}

function octograph_clear_canvas(canvas){
  // Clear canvas before (re)drawing
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = octograph_background_color;
  context.fillRect(0,0, canvas.width, canvas.height);
}

function octograph_get_node_by_name(node_name){
  for(var i=0; i<octograph_nodes.length; i++){
    if(octograph_nodes[i].name == node_name){
      return octograph_nodes[i];
    }
  }
  octograph_error_log("in octograph_get_node_by_name: node: '" + node_name + "' not found");
}

function octograph_node_name_array_to_node_array(node_name_array){
  // Takes an array with node names, for example: ["R1","SW1","SW2"]
  // and returns an array with the corresponding node objects
  var node_array = [];
  for(var i=0; i<node_name_array.length; i++){
    node_array.push(  octograph_get_node_by_name(node_name_array[i])  );
  }
  return node_array;
}

function octograph_nr_of_connections_between_nodes(node_name_1, node_name_2){
  // returns the number of connections between two nodes
  var nr_of_connections = 0;
  for(var i=0; i<octograph_connections.length; i++){
    if(  ((octograph_connections[i].from == node_name_1) && (octograph_connections[i].to == node_name_2)) ||
         ((octograph_connections[i].from == node_name_2) && (octograph_connections[i].to == node_name_1))  ){
      nr_of_connections++;
    }
  }
  return nr_of_connections;
}

function octograph_get_connections_between_nodes(node_name_1, node_name_2){
  // return the connections between these two nodes
  var connections = [];
  for(var i=0; i<octograph_connections.length; i++){
    if(  ((octograph_connections[i].from == node_name_1) && (octograph_connections[i].to == node_name_2)) ||
         ((octograph_connections[i].from == node_name_2) && (octograph_connections[i].to == node_name_1))  ){
      connections.push(octograph_connections[i]);
    }
  }
  return connections;
}

function octograph_in_multi_connected_already_rendered(node_name_1, node_name_2){
  // return wether the combination of these two node names is in octograph_multi_connected_already_rendered
  for(var i=0; i<octograph_multi_connected_already_rendered.length; i++){
    if(  ((octograph_multi_connected_already_rendered[i].from == node_name_1) && (octograph_multi_connected_already_rendered[i].to == node_name_2)) ||
         ((octograph_multi_connected_already_rendered[i].from == node_name_2) && (octograph_multi_connected_already_rendered[i].to == node_name_1))  ){
      return true;
    }
  }
  return false;
}

function octograph_draw_and_rotate_line(draw_pos, pivot_point, length, line_width, stroke_style, deg){
  //draw a line from draw_pos horizontally (0 deg rotation) to length,
  //and rotate it 'deg' degrees around pivot_point
  context.save();
  context.beginPath();
  context.strokeStyle = stroke_style;
  context.lineWidth = line_width;
  context.translate(pivot_point.x, pivot_point.y);
  context.rotate(octograph_deg2rad(deg));
  context.translate(-pivot_point.x, -pivot_point.y);
  context.moveTo(draw_pos.x, draw_pos.y);
  context.lineTo(draw_pos.x+length, draw_pos.y);
  context.stroke();
  context.closePath();
  context.restore();
}

function octograph_deg2rad(deg){
  return deg * Math.PI / 180;
}

function octograph_new_vector2(x,y){
  return {"x":x,"y":y};
}

function octograph_distance_between_points(pt1, pt2){
  return Math.hypot(pt1.x-pt2.x, pt1.y-pt2.y);
}

function octograph_angle_between_points(pt1, pt2){
  return Math.atan2(pt2.y-pt1.y, pt2.x-pt1.x) * 180 / Math.PI;
}

function octograph_node_positions_to_int(){
  // changes node position (x,y) to integers instead of strings.
  for(var i=0; i<octograph_nodes.length; i++){
    octograph_nodes[i].pos.x = parseInt(octograph_nodes[i].pos.x);
    octograph_nodes[i].pos.y = parseInt(octograph_nodes[i].pos.y);
  }
}

function octograph_calculate_multi_connection_line_from_pos(from_node_pos, connection_number, number_of_connections){
    // Used in octograph_render_connection.
    // Calculates the from coordinates for a connection line.
    // Returns an object containing a vector2 object which contains the from coordinates.
    // Only used for nodes with multiple connections between them, this ensures space in between.
    var calculated_from_pos = {"x":0, "y":0};
    calculated_from_pos.x = from_node_pos.x
    calculated_from_pos.y = from_node_pos.y - (connection_number * octograph_multiple_connections_margin) + (number_of_connections/parseFloat(2) * octograph_multiple_connections_margin);
    return calculated_from_pos;
}
