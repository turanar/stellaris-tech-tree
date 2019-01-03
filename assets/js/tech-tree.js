'use strict';

var treeP;
var treeS;
var treeE;
var selected = 'all';
var treeDataP;
var treeDataS;
var treeDataE;

var configP = {
    container: '#tech-tree-physics',
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
        onTreeLoaded: function() {
            init_tooltips();

            const observer = lozad();
            observer.observe();
		}
    }
};
var configS = {
    container: '#tech-tree-society',
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
        onTreeLoaded: function() {
            //init_tooltips();

            const observer = lozad();
            observer.observe();
		}
    }
};
var configE = {
    container: '#tech-tree-engineering',
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
        onTreeLoaded: function() {
            //init_tooltips();

            const observer = lozad();
            observer.observe();
		}
    }
};

function init_tooltips() {
    $('.node').tooltipster({
        minWidth: 300,
        trigger: 'click',
        maxWidth: 512,
        functionInit: function(instance, helper){
            var content = $(helper.origin).find('.extra-data');
            $(content).find('img').each(function(img, el) {
                $(el).attr('src',$(el).attr('data-src'));
            });
            instance.content($('<div class="ui-tooltip">' + $(content).html() + '</div>'));
        },
        functionReady: function(instance, helper) {
            $(helper.tooltip).find('.tooltip-content').each(function(div){
                var content = $(this).html();
                content = content.replace(new RegExp(/£(\w+)£/,'g'), '<img class="resource" src="../assets/icons/$1.png" />');
                $(this).html(content);
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
    tech.innerHTML = html;

    $(tech.children).each(function(i, node){
        setup(node);
    });
};

$(document).ready(function() {
    load_tree();
});

function _loadP() {
    var root = {key: "root", tier:0};
    root.children = [];

    for(var i = 0; i < treeDataP.children.length; i++) {
        if(treeDataP.children[i].name === selected || selected == 'all') {
            root.children = root.children.concat(treeDataP.children[i].children);
        }
    }

    treeP = new Treant({chart:configP, nodeStructure: root});
}
function _loadS() {
    var root = {key: "root", tier:0};
    root.children = [];

    for(var i = 0; i < treeDataS.children.length; i++) {
        if(treeDataS.children[i].name === selected || selected == 'all') {
            root.children = root.children.concat(treeDataS.children[i].children);
        }
    }

    treeS = new Treant({chart:configS, nodeStructure: root});
}
function _loadE() {
    var root = {key: "root", tier:0};
    root.children = [];

    for(var i = 0; i < treeDataE.children.length; i++) {
        if(treeDataE.children[i].name === selected || selected == 'all') {
            root.children = root.children.concat(treeDataE.children[i].children);
        }
    }

    treeE = new Treant({chart:configE, nodeStructure: root});
}

function load_tree() {
    if (treeP === undefined || true) {
        $.getJSON('physics.json', function(jsonData) {
            treeDataP = jsonData;
            setup(treeDataP);
            _loadP();
        });
        $.getJSON('society.json', function(jsonData) {
            treeDataS = jsonData;
            setup(treeDataS);
            _loadS();
        });
        $.getJSON('engineering.json', function(jsonData) {
            treeDataE = jsonData;
            setup(treeDataE);
            _loadE();
        });

    } else {
        selected = $('#area_selected').val();
        tree.destroy();
        $('#tech-tree').removeAttr('style');
        _load();
    }
}