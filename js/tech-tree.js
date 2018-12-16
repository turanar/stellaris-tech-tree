'use strict';

let config = {
    container: '#tech-tree',
    rootOrientation: 'WEST', // NORTH || EAST || WEST || SOUTH
    nodeAlign: 'TOP',
    // levelSeparation: 30,
    hideRootNode: true,
    siblingSeparation: 20,
    subTeeSeparation:  20,
    scrollbar: 'fancy',
    connectors: { type: 'step' },
    node: {
	HTMLclass: 'tech',
	collapsable: false
    },
    callback: {
    	onTreeLoaded: function() {
			$('.node').tooltipster({
                minWidth: 300,
                trigger: 'click',
				maxWidth: 512,
                functionInit: function(instance, helper){
                    var content = $(helper.origin).find('.extra-data');
                    instance.content($('<div class="ui-tooltip">' + $(content).html() + '</div>'));
                },
                functionReady: function(instance, helper) {
                    $(helper.tooltip).find('img').each(function(img) {
                        $(this).attr('src',$(this).attr('data-src'));
                    });
                    $(helper.tooltip).find('.tooltip-content').each(function(div){
                    	var content = $(this).html();
                    	content = content.replace(new RegExp(/£(\w+)£/,'g'), '<img class="resource" src="icons/$1.png" />');
                    	$(this).html(content);
					});
				}
			});
            const observer = lozad();
            observer.observe();
		}
    }
};
let rootNode = {HTMLid: 'root', data: {tier: 0}};

function generate_required_tech(prerequisites) {
	var elem = $('<div>');
	var div = $('<div>').attr('class','left');

	for(var i = 0; i < prerequisites.length; i++) {
		var tech = prerequisites[i];
		var item = $('<img height="52" width="52">').attr('data-src', 'img/' + tech.key + ".png").attr('class','left').attr("src","//:0");
        elem.append(item);
        div.append(tech.name + "<br/>");
	}
	elem.append(div);

	return elem;
}

function test(title, content) {
	var header = $('<div>').addClass('tooltip-header').html(title);
	header.after($('<div>').addClass('tooltip-content').html('<pre>' + content + '</pre>'));
    return header;
}

$(document).ready(function() {
    $.getJSON('techs.json', function(techData) {
	let techs = techData.filter(function(tech) {
	    return Object.keys(tech)[0].search(/^@\w+$/) == -1;
	}).map(function(tech) {
        let key = tech.key;
	    let tier = tech.is_start_tech
		    ? ' (Starting)'
		    : ' (Tier ' + tech.tier + ')';

	    let costClass = tech.area + '-research';
	    let cost = tech.tier > 0
		    ? 'Cost: <span class="' + costClass + '">' + tech.cost + '</span>'
		    : null;
	    let weight = tech.tier > 0
		    ? 'Weight: ' + tech.base_weight
		    : null;
	    let category = tech.category + tier;
	    let iconClass = 'icon'
		    + (tech.is_dangerous ? ' dangerous' : '')
		    + (!tech.is_dangerous && tech.is_rare ? ' rare' : '');

	    let $extraDataDiv = function() {
            let $extraDataDiv = $('<div class="extra-data">');
			//$descBtn.attr('title', '<div class="tooltip-header">Description</div>' + tech.description);

			let weightModifiers = tech.weight_modifiers.length > 0
				? tech.weight_modifiers.join('<br/>')
				: null;
			let featureUnlocks = tech.feature_unlocks.length > 0
				? tech.feature_unlocks.join('<br/>')
				: null;
			let prerequisites = tech.prerequisites_names.length > 1
				? generate_required_tech(tech.prerequisites_names)
				: null;
			let potentials = tech.potential.length > 0
				? tech.potential.join('<br/>')
				: null;

			if(weightModifiers !== null) {
                $extraDataDiv.append(test('Weight Modifier', weightModifiers));
			}
			if(potentials !== null) {
				$extraDataDiv.append(test('Requirements', potentials));
			}
			if(prerequisites !== null) {
				$extraDataDiv.append(test('Required Technologies',$(prerequisites).html()));
			}
			if(featureUnlocks !== null) {
                $extraDataDiv.append(test('Research Effects',featureUnlocks));
			}

			return $extraDataDiv;
	    }();

	    return {
			HTMLid: key,
			HTMLclass: tech.area + " " + iconClass,
			data: tech,
			innerHTML: '<div class="' + iconClass + ' lozad" data-background-image="img/' + key + '.png"></div>'
				+ '<p class="node-name" title="' + tech.name + '">'
				+ tech.name
				+ '</p>'
				+ '<p class="node-title">' + category + '</p>'
				+ '<p class="node-desc">' + ( tech.start_tech || tech.tier == 0 ? '<br />' : [cost, weight].join(', ')) + '</p>'
				+ $extraDataDiv[0].outerHTML
			};
	});

	techs = techs.map(function(tech) {
	    let key = tech.data.key;
	    let prerequisite = tech.data.prerequisites[0] || null;

	    if ( tech.data.tier === 0 || prerequisite === null) {
		tech.parent = rootNode;
	    }
	    else {
		let parentKey = prerequisite;
		tech.parent = parentKey.match('-pseudoParent')
		    ? { HTMLid: tech.HTMLid + '-pseudoParent',
			parent: rootNode,
			pseudo: true,
			data: {tier: 0} }
		: techs.filter(function(candidate) {
		    return candidate.HTMLid === parentKey;
		})[0];
	    }

	    return tech;
	});

	for ( let i = 0; i < techs.length; i++ ) {
	    let tech = techs[i]
	    while ( tech.parent.pseudo ) {
		techs.push(tech.parent);
		tech = tech.parent;
	    }
	}

	new Treant([config, rootNode].concat(techs));
    });
});
