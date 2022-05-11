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
                    var parent = $('#' + tech)[0];
                    if(parent !== undefined && parent.classList.length > 1)
                    $(el).addClass(parent.classList[2]);
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

    var output = html;
    if(tech.is_start_tech) {
        var e = $('<div>' + html + '</div>');
        e.find('div.node-status').addClass('active').addClass('status-loaded');
        output = e.html();
    }

    tech.innerHTML = output;

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
    });
}

// Add ability to track node status
var charts = {};