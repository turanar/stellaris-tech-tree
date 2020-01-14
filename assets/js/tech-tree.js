'use strict';

var research = ['physics', 'society', 'engineering', 'anomaly'];

var config = {
    //container: '#tech-tree-',
    rootOrientation: 'WEST', // NORTH || EAST || WEST || SOUTH
    nodeAlign: 'TOP',
    hideRootNode: true,
    siblingSeparation: 20,
    subTeeSeparation:  20,
    scrollbar: 'resize',
    connectors: {
        type: 'step'
    },
    node: {
        HTMLclass: 'tech',
        collapsable: false
    },
    callback: {
        onTreeLoaded: function(tree) {
            init_tooltips();

            var area = tree.nodeHTMLclass.replace('tech', '').replace(' ', '');
            init_nodestatus(area);

            const observer = lozad();
            observer.observe();
		}
    }
};

function init_tooltips() {

    $('.node:not(.tooltipstered)').tooltipster({
        minWidth: 300,
        trigger: 'click',
        maxWidth: 512,
        functionInit: function(instance, helper){
            var content = $(helper.origin).find('.extra-data');
            $(content).find('img').each(function(img, el) {
                $(el).attr('src',$(el).attr('data-src'));
                
                var tech = $(el)[0].classList[$(el)[0].classList.length-1];
                if(!$('#' + tech).hasClass('anomaly')) {
                    $(el).addClass($('#' + tech)[0].classList[2]);
                }
            });
            instance.content($('<div class="ui-tooltip">' + $(content).html() + '</div>'));
        },
        functionReady: function(instance, helper) {
            $(helper.tooltip).find('.tooltip-content').each(function(div){
                var content = $(this).html();
                content = content.replace(new RegExp(/£(\w+)£/,'g'), '<img class="resource" src="../assets/icons/$1.png" />');
                $(this).html(content);
            });
            $(helper.tooltip).find('.node-status').each(function() {
                var tech = $(this)[0].classList[1];
                if($('#' + tech).find('div.node-status').hasClass('active')) {
                    $(this).addClass('active');
                } else {
                    $(this).removeClass('active');
                }
            });
        }
    });
}

function setup(tech) {
    var techClass = (tech.is_dangerous ? ' dangerous' : '')
        + (!tech.is_dangerous && tech.is_rare ? ' rare' : '');

    var tmpl = $.templates("#node-template");
    var html = tmpl.render(tech);

    tech.HTMLid = tech.key;
    tech.HTMLclass = tech.area + techClass;

    // Adjust html in code using a hidden div
    var $html = $( '#setup-tech' )
    $html.append($.parseHTML(html));
    if(0 < $html.find('p.node-title:contains(\\(Starting\\))').length) {
        // Update node connector style
        var color = '#000000';
        if('physics' == tech.area) {
            color = '#4396E2';
        } else if ('society' == tech.area) {
            color = '#5ACA9C';
        } else if ('engineering' == tech.area) {
            color = '#E29C43';
        }
        tech.connectors = $.extend(true, {}, config.connectors, {
            style: {
                'stroke': color,
                'stroke-width': 2,
                'arrow-end': 'block-wide-long'
            }
        });
        
        if(!$html.find('div.node-status').hasClass('active')) {
            $html.find('div.node-status').addClass('active').addClass('status-loaded');
        }
    }
    tech.innerHTML = $html.prop('innerHTML');
    $html.empty();

    $(tech.children).each(function(i, node){
        setup(node);
    });
};

$(document).ready(function() {
    load_tree();
});

function _load(jsonData, tree) {
    var container = '#tech-tree-' + jsonData.children[0].name;
    var myconfig = {container: container};
    $.extend(true, myconfig, config);

    charts[tree] = new Treant({chart:myconfig, nodeStructure: jsonData.children[0]}, function () {},$);
}

function load_tree() {
    research.forEach( area => {
        if('anomaly' !== area) {
            $.getJSON( area + '.json', function(jsonData) {
                setup(jsonData);
                _load(jsonData, area);
            });
        }
    });
    $.getJSON('anomalies.json', function(jsonData) {
        // Event techs don't really need a Tree
        $(jsonData).each(function(index, item) {
            setup(item);
            var e = $("<div>").html(item.innerHTML);
            e.attr("id", item.key);
            e.attr("class",item.HTMLclass)
            e.addClass("node").addClass("tech").addClass("anomaly");
            $('#tech-tree-anomalies').append(e);
        });
        init_tooltips();
        init_nodestatus('anomaly');
    });
}

// Add ability to track node status
var charts = {};
function init_nodestatus(area) {
    $('.node.' + area + ' div.node-status:not(.status-loaded)').each(function() {
        var events = $._data($( this )[0], "events");
        if(undefined === events || undefined === events.click) {
            $(this).on('click', function toggle_status() {
                // Find chart for the research
                if($(this).parent().hasClass('anomaly')) {
                    if($(this).hasClass('active')) {
                        $(this).removeClass('active');
                    } else {
                        $(this).addClass('active');
                    }
                    event.stopImmediatePropagation();
                    return;
                }
                // Limmit activation to research directly under an activated parent
                var parent_id = $(this).parent().data('treenode').parentId;
                if(undefined === parent_id) {
                    return;
                }
                // If the parent is the root node [0], this is the first research that can be activated
                if(0 < parent_id) {
                    var parent = charts[area].tree.nodeDB.db[parent_id];

                    if(!$( '#' + parent.nodeHTMLid + ' div.node-status').hasClass('active')) {
                        return;
                    }
                }
                // Check for any other prerequisites
                var active = true;
                $(this).parent().find('span.node-status').each(function() {
                    var tech = $(this)[0].classList[1];
                    tech = $('#' + tech).find('div.node-status');
                    if(undefined !== tech && !tech.hasClass('active')) {
                        active = false;
                    }
                });
                if(!active) return;

                var id = $( this ).parent().attr('id');
                if($(this).hasClass('active')) {
                    updateResearch(area, id, false);
                } else {
                    updateResearch(area, id, true);
                }
                charts[area].tree.reload();
            });
            $( this ).addClass('status-loaded');
        }
    });
}

function updateResearch(area, name, active) {
    // Check if node is already set to proper state
    if($( '#' + name + ' div.node-status').hasClass('active') == active) {
        return;
    }

    // Get initial node from tree
    var node = getInitNode(charts[area].tree.initJsonConfig.nodeStructure.children, name);
    
    if(undefined !== node) {
        if(active) {
            
            // Update node connector style
            var color = '#000000';
            if('physics' == area) {
                color = '#4396E2';
            } else if ('society' == area) {
                color = '#5ACA9C';
            } else if ('engineering' == area) {
                color = '#E29C43';
            }
            node.connectors = $.extend(true, {}, config.connectors, {
                style: {
                    'stroke': color,
                    'stroke-width': 2,
                    'arrow-end': 'block-wide-long'
                }
            });

            // Adjust html in code using a hidden div
            var $html = $( '#setup-tech' )
            $html.append($.parseHTML(node.innerHTML));
            if( !$html.find('div.node-status').hasClass('active') ) {
                $html.find('div.node-status').addClass('active');
            }
            node.innerHTML = $html.prop('innerHTML');
            $html.empty();
        }
        else {
            // Remove node connector style
            delete node.connectors;

            // Adjust html in code using a hidden div
            var $html = $( '#setup-tech' )
            $html.append($.parseHTML(node.innerHTML));
            if( $html.find('div.node-status').hasClass('active') ) {
                $html.find('div.node-status').removeClass('active');
            }
            node.innerHTML = $html.prop('innerHTML');
            $html.empty();

            // If this node has children, remove their active status as well
            for(var child in node.children) {
                if( undefined !== node.children[child].key ) {
                    updateResearch(area, node.children[child].key, false);
                }
            }
        }
    }
}

function getInitNode(node, name) {
    for (const count in node) {
        if(name == node[count].key && undefined !== node[count].innerHTML) {
            return node[count];
        } else if(undefined !== node[count].children && 0 < node[count].children.length) {
            var childNode = getInitNode(node[count].children, name);

            if(undefined !== childNode) {
                return childNode;
            }
        }
    }
    return undefined;
}