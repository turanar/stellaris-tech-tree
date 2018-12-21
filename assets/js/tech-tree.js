'use strict';

var tree;
var selected = 'all';
var treeData;

var config = {
    container: '#tech-tree',
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

function _load() {
    var root = {key: "root", tier:0};
    root.children = [];

    for(var i = 0; i < treeData.children.length; i++) {
        if(treeData.children[i].name === selected || selected == 'all') {
            root.children = root.children.concat(treeData.children[i].children);
        }
    }

    tree = new Treant({chart:config, nodeStructure: root});
}

function load_tree() {
    if (tree === undefined) {
        $.getJSON('techs.json', function(jsonData) {
            treeData = jsonData;
            setup(treeData);
            _load();
        });
    } else {
        selected = $('#area_selected').val();
        tree.destroy();
        $('#tech-tree').removeAttr('style');
        _load();
    }
}