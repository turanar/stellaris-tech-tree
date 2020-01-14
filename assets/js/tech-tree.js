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
                
                try {
                    var tech = $(el)[0].classList[$(el)[0].classList.length-1];
                    if(!$('#' + tech).hasClass('anomaly')) {
                        $(el).addClass($('#' + tech)[0].classList[2]);
                    }
                } catch (ex) {

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
    if(window.indexedDB) {
        initDB();
    }
    else if (window.localStorage) {
        setupLocalStorage();
    }
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
                    updateResearchDisplay(area, id, false);
                    updateResearch(area, id, false);
                } else {
                    updateResearchDisplay(area, id, true);
                    updateResearch(area, id, true);
                }
                //charts[area].tree.reload();
            });
            $( this ).addClass('status-loaded');
        }
    });
}

function getNodeDbNode(nodeDB, name) {
    for(const element of nodeDB) {
        if(element.nodeHTMLid === name) return element;
    };
    return null;
}

function updateResearchDisplay(area, name, active) {
    var inode = getNodeDbNode(charts[area].tree.nodeDB.db, name);
    var marker = $(inode.connector[0]).attr('marker-end');

    if(active) {
        $('#' + name + ' div.node-status').addClass('active');
        for (const child of inode.children) {
            $(charts[area].tree.nodeDB.db[child].connector[0]).addClass(area).attr('marker-end', marker);
        }
    } else {
        $( '#' + name + ' div.node-status').removeClass('active');
        for (const child of inode.children) {
            $(charts[area].tree.nodeDB.db[child].connector[0]).removeClass(area).attr('marker-end','');
        }
    }

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

// IndexedDB solution (Multiple research sets saved)
var offlineDB;

function initDB() {
    var request = window.indexedDB.open("researchDB");
    request.onerror = function(event) {
        alert('Unable to store more than one set of research unless permission is approved!');
        if(window.localStorage) {
            setupLocalStorage();
        }
    };
    request.onsuccess = function(event) {
        offlineDB = event.target.result;
        offlineDB.onerror = function(event) {
            // Generic error handler for all errors targeted at this database's
            // requests!
            console.error("IndexedDB error: " + event.target.errorCode);
        };
        offlineDB.onupgradeneeded = function(event) { 
            offlineDB.onversionchange = function(event) {
                offlineDB.close();
            };
        };
        findLists();
    };
    request.onupgradeneeded = function(event) {
        // Create an objectStore for this database
        event.currentTarget.result.createObjectStore("TreeStore", { keyPath: "name" });
    };
}

function findLists() {
    var objectStore = offlineDB.transaction("TreeStore").objectStore("TreeStore");

    var lists = [];
    objectStore.openCursor().onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
            lists.push(cursor.value);
            cursor.continue();
        }
        else {
            lists.forEach(item => {
                $('#research_list').append('<option value="' + item.name + '">' + item.name + '</option>');
            });
            $('#research_save').on('click', function(event) {
                event.preventDefault();
                if($('#research_selection').val() && $.trim($('#research_selection').val()).length !== 0) {
                    saveListToIndexedDB( $('#research_selection').val() );
                }
            })
            $('#research_load').on('click', function(event) {
                event.preventDefault();
                if($('#research_selection').val() && $.trim($('#research_selection').val()).length !== 0) {
                    loadListFromIndexedDB( $('#research_selection').val() );
                }
            })
            $('#research_remove').on('click', function(event) {
                event.preventDefault();
                if($('#research_selection').val() && $.trim($('#research_selection').val()).length !== 0) {
                    removeListFromIndexedDB( $('#research_selection').val() );
                }
            })
            $('.research').removeClass('hide');
        }
    };
}

function saveListToIndexedDB(name) {
    if(offlineDB) {

        var data = [];
        research.forEach(area => {
            $('.' + area + ' div.node-status.active').parent().not(':contains(\\(Starting\\))').each(function() {
                data.push({key: $(this).attr('id'), area: area});
            });
        });

        var objectStore = offlineDB.transaction(["TreeStore"], "readwrite").objectStore("TreeStore");

        var result = objectStore.put({name: name, data: data});
        result.onsuccess = function(event) {
            if(event.target.result && name == event.target.result) {
                alert('Research List: ' + name + ' was saved successfully!')
                return true;
            }
        };
    } else {
        initDB();
    }
}

function loadListFromIndexedDB(name) {
    if(offlineDB) {
        var objectStore = offlineDB.transaction("TreeStore").objectStore("TreeStore");

        var result = objectStore.get(name);
        result.onsuccess = function(event) {
            if(event.target.result.data) {
                var data = event.target.result.data;

                research.forEach(area => {
                    $('.' + area + ' div.node-status.active').parent().not(':contains(\\(Starting\\))').each(function() {
                        updateResearchDisplay(area, $(this).attr('id'), false);
                        updateResearch(area, $(this).attr('id'), false);
                        $(this).find('div.node-status').removeClass('active');
                    });
                });
                data.forEach(item => {
                    console.log(item);
                    if('anomaly' == item.area) {
                        //TODO
                        $('#' + item.key + ' .div.node-status').addClass('active');
                    } else {
                        updateResearchDisplay(item.area, item.key, true);
                        updateResearch(item.area, item.key, true);
                    }
                });
                /*research.forEach(area => {
                    if('anomaly' != area) {
                        charts[area].tree.reload();
                    }
                });*/
            }
        };
        result.onerror = function(event) {
            alert('Unable to load Research List: ' + name + '\nError: ' + event.target.errorCode);
        }
    } else {
        initDB();
    }
}

function removeListFromIndexedDB(name) {
    if(offlineDB) {
        var objectStore = offlineDB.transaction(["TreeStore"], "readwrite").objectStore("TreeStore");
        var result = objectStore.delete(name);
        result.onerror = function(event) {
            alert('Unable to delete Research List: ' + name + '\nError: ' + event.target.errorCode);
        };
        result.onsuccess = function(event) {
            $('option[value="' + name + '"]').remove();
            if($.trim($('#research_selection').val()) == name) {
                $('#research_selection').val('');
            }
        };
    } else {
        initDB();
    }
}

// LocalStorage solution (Single save)
function setupLocalStorage() {
    $('#research_save').on('click', function(event) {
        event.preventDefault();
        saveResearchToLocalStorage();
    }).parent().removeClass('hide');
    $('#research_load').on('click', function(event) {
        event.preventDefault();
        loadResearchFromLocalStorage();
    }).parent().removeClass('hide');
}

function saveResearchToLocalStorage() {
    var data = {};
    research.forEach(area => {
        var activeTech = [];
        $('.' + area + ' div.node-status.active').parent().not(':contains(\\(Starting\\))').each(function() {
            activeTech.push($(this).attr('id'));
        });
        data[area] = activeTech;
    });
    localStorage['LocalStorage'] = JSON.stringify(data);
}

function loadResearchFromLocalStorage() {
    console.log(localStorage);

    if(localStorage['LocalStorage']) {
        var data = JSON.parse(localStorage['LocalStorage']);
        research.forEach(area => {
            var activeTech = data[area];
            activeTech.forEach(tech => updateResearch(area, tech, true));
            charts[area].tree.reload();
        });
    } else {
        alert("Unable to load data from local storage!");
    }
}