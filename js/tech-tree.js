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
	    $(document).tooltip({
		items: 'p.description, p.weight-modifiers[title], p.feature-unlocks[title]',
		content: function() {
		    let $button = $(this);
		    if ( $button.is('p.feature-unlocks') ) {
			let unlocks = $button.attr('title').split(', ');
			var $content = unlocks.map(
			    function(unlock) {
				return $('<div>').html(
					unlock.replace(new RegExp(/£(\w+)£/,'g'), '<img class="resource" src="https://s3.us-east-2.amazonaws.com/turanar.github.io/icons/$1.png" />')
				);}
			).reduce(
			    function($ul, $unlock) {
				return $ul.append($unlock);
			    },
			    $('<ul>')
			);
		    }
		    else {
				var $content = $('<span>')
					.addClass($button.attr('class'))
					.html($button.attr('title').replace(new RegExp(/£(\w+)£/,'g'), '<img class="resource" src="https://s3.us-east-2.amazonaws.com/turanar.github.io/icons/$1.png" />'));
		    }

		    return $content;
		}
	    });
	}
    }
};
let rootNode = {HTMLid: 'root', data: {tier: 0}};

function generate_required_tech(prerequisites) {
	var elem = $('<div>');
	var div = $('<div>').attr('class','left');

	for(var i = 0; i < prerequisites.length; i++) {
		var tech = prerequisites[i];
		var item = $('<img>').attr('src', 'https://s3.us-east-2.amazonaws.com/turanar.github.io/img/' + tech.key + ".png").attr('class','left');
        elem.append(item);
        div.append(tech.name + "<br/>");
	}
	elem.append(div);

	return elem;
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
		let $descBtn = $('<p>');
		$descBtn.addClass('description');
		$descBtn.attr('title', '<div class="tooltip-header">Description</div>' + tech.description);
		$descBtn.attr('data-header', 'Description');
		$descBtn.html('…');
		let weightModifiers = tech.weight_modifiers.length > 0
			? tech.weight_modifiers.join('\n')
			: null;
		let featureUnlocks = tech.feature_unlocks.length > 0
			? tech.feature_unlocks.join(', ')
			: null;
		let prerequisites = tech.prerequisites_names.length > 1
			? generate_required_tech(tech.prerequisites_names)
			: null;
		let potentials = tech.potential.length > 0
			? tech.potential.join('<br/>')
			: null;

		console.log(potentials);

		let $modifiersBtn = $('<p>');
		$modifiersBtn.addClass('weight-modifiers');

		if ( weightModifiers !== null || prerequisites !== null || potentials !== null) {
		    let title = '';
			if(weightModifiers !== null) {
		    	title = title + '<div class="tooltip-header">Weight Modifiers</div><div style="margin-bottom: 10px;">' + weightModifiers + '</div>';
			}
			if(potentials !== null) {
				title = title + '<div class="tooltip-header">Requirements</div><div style="margin-bottom: 10px;">' + potentials + '</div>';
			}
			if(prerequisites !== null) {
            	title = title + '<div class="tooltip-header">Required Technologies</div><div style="margin-bottom: 10px;">' + $(prerequisites).html() + '</div>';
			}

			$modifiersBtn.attr('title', title);
		    $modifiersBtn.attr('data-header', 'Weight Modifiers');
		}
		else {
		    $modifiersBtn.addClass('disabled');
		}
		$modifiersBtn.html('⚄');

		let $unlocksBtn = $('<p>');
		$unlocksBtn.addClass('feature-unlocks');
		if ( featureUnlocks !== null ) {
		    $unlocksBtn.attr('title', '<div class="tooltip-header">Research Effects</div>' + featureUnlocks);
		    $unlocksBtn.attr('data-header', 'Research Effects');
		}
		else {
		    $unlocksBtn.addClass('disabled');
		}
		$unlocksBtn.html('🎁');

		let $extraDataDiv = $('<div class="extra-data">');
		$extraDataDiv.append($descBtn);
		$extraDataDiv.append($modifiersBtn);
		$extraDataDiv.append($unlocksBtn);
		return $extraDataDiv;
	    }();

	    return {
			HTMLid: key,
			HTMLclass: tech.area + " " +  (tech.is_gestalt === true ? "gestalt" : "") + " " + (tech.is_machine === true ? "machine" : ""),
			data: tech,
			innerHTML: '<div class="' + iconClass + '" style="background-image:url(\'https://s3.us-east-2.amazonaws.com/turanar.github.io/img/' + key + '.png\')"></div>'
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

	    let tierDifference = tech.data.tier - tech.parent.data.tier;
	    let nestedTech = tech;
	    /*while ( tierDifference > 1 && nestedTech.parent != rootNode ) {
	    	var pseudo = {
				HTMLid: nestedTech.HTMLid + '-pseudoParent',
				parent: nestedTech.parent, pseudo: true,
				data: { tier: nestedTech.data.tier - 1 }
			};
			tierDifference--;
			nestedTech.parent = pseudo;
			nestedTech = pseudo;
	    }*/

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
