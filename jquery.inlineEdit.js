/**
* jQuery Inline Edit
* Copyright (c) 2009 Markus Hedlund, Mimmin AB
* Version 1.0
* Licensed under MIT license
* http://www.opensource.org/licenses/mit-license.php
* http://labs.mimmin.com/inlineedit
*
*
* Adds inline edit to html elements with classes editableSingle and editableMulti.
* Elements must have class to identify type of data and id.
* Types are linked to urls
* 
* Example:
* <li class="editableSingle categoryName id3">
* 
* Javascript:
* $.inlineEdit({categoryName: 'category/edit/id/'});
* 
* 
* Or:
* <td class="editableSingle videoTitle id3"></td>
* <td class="editableMulti videoDescription id3"></td>
* 
* Javascript:
* $.inlineEdit({
*     videoTitle: '/video/edit/title/',
*     videoDescription: '/video/edit/description/'
* });
*/

(function($){
$.inlineEdit = function(urls, options){
	
	var editableUrls = urls;
	
	var options = jQuery.extend({
		afterSave: function(){},
		afterRemove: function(){},
		getId: getId,
		filterElementValue: function($o){return $o.html();},
		animate: true,
		colors: {
			success: 'green',
			error: 'red'/*,
			standard: '#000'*/
		}
	}, options);
	
	var initialValues = {};
	var editableFields = false;
	var linkClicked = false;
	
	if ($('.editableSingle, .editableMulti').length > 0) {
		var simpleMode = $('.editableSingle, .editableMulti')[0].tagName.toLowerCase() != 'td';
		options.colors.standard = $('.editableSingle, .editableMulti').eq(0).css('color');
	}
	
	$('.editableSingle').click(function(){
		if (linkClicked) {
			linkClicked = false;
			return;
		}
		
		if (!editableFields || $('.editField').length < editableFields) {
			var value = options.filterElementValue($(this));
			saveInitialValue($(this));
			$(this).addClass('isEditing').css('color', options.colors.standard).stop();
			
			if ($('.editFieldFirst').length == 0) {
				editableFields = $(this).siblings('.editableSingle, .editableMulti').length + 1;
				$(this).html('<div class="editFieldWrapper"><input type="text" value="' + value + '" class="editField editFieldFirst" /></div>');
				
				if (!simpleMode) {                       
				   $(this).siblings('.editableSingle, .editableMulti').click();
				} else {
					editableFields = 1;
				}
				
				addSaveControllers(function(){
					$('.editFieldFirst').focus();
				});
			} else {
				$(this).html('<div class="editFieldWrapper"><input type="text" value="' + value + '" class="editField" /></div>');
			}
		}
	});
	
	$('.editableMulti').click(function(){
		if (linkClicked) {
			linkClicked = false;
			return false;
		}
		
		if (!editableFields || $('.editField').length < editableFields) {
			var value = options.filterElementValue($(this));
			saveInitialValue($(this));
			$(this).addClass('isEditing').css('color', options.colors.standard).stop();
			
			if ($('.editFieldFirst').length == 0) {
				editableFields = $(this).siblings('.editableSingle, .editableMulti').length + 1;
				$(this).html('<div class="editFieldWrapper"><textarea class="editField editFieldFirst">' + value + '</textarea></div>');
				
				if (!simpleMode) {                       
				   $(this).siblings('.editableSingle, .editableMulti').click();
				}
				
				addSaveControllers(function(){
					$('.editFieldFirst').focus();
				});
			} else {
				$(this).html('<div class="editFieldWrapper"><textarea class="editField">' + value + '</textarea></div>');
			}
		}
	});
	
	$('.editableSingle a, .editableMulti a').click(function(){
		linkClicked = true;
	});
	
	function addSaveControllers(callback)
	{
		if ($('.editFieldWrapper:last').parent().hasClass('removable')) {
			$('.editFieldWrapper:last').append('<div class="editFieldSaveControllers"><button>Save</button>' +
				', <a href="javascript:;" class="editFieldRemove">Remove</a> or ' +
				'<a href="javascript:;" class="editFieldCancel">Cancel</a></div>');
		} else {
			$('.editFieldWrapper:last').append('<div class="editFieldSaveControllers"><button>Save</button> or ' +
				'<a href="javascript:;" class="editFieldCancel">Cancel</a></div>');
		}
		$('.editFieldSaveControllers > button').click(editSave);
		$('.editFieldSaveControllers > a.editFieldCancel').click(editCancel);
		$('.editFieldSaveControllers > a.editFieldRemove').click(editRemove);
		$('input.editField').keydown(function(e){
			if (e.keyCode == 13) {
				// Enter
				editSave();
			} else if (e.keyCode == 27) {
				// Escape
				editCancel();
			}
		});
		
		if (options.animate) {
			$('.editFieldWrapper').slideDown(500, callback);
		} else {
			$('.editFieldWrapper').show();
			callback();
		}
	}
	
	function editCancel(e)
	{
		linkClicked = typeof(e) != 'undefined';   // If e is set, call comes from mouse click
		
		$('.editField').each(function(){
			var $td = $(this).parents('.editableSingle, .editableMulti');
			removeEditField($td, getInitialValue($td), false);
		});
	}
	
	function editRemove()
	{
		linkClicked = true;
		
		if (!confirm('Are you sure that you want to remove this?')) {
			return false;
		}
		
		$('.editFieldSaveControllers > button, .editField').attr('disabled', 'disabled').html('Removing...');
		
		var $td = $('.editField').eq(0).parents('.editableSingle, .editableMulti');
		var url = editableUrls.remove;
		var id = options.getId($td);
		
		$.ajax({
			url: url + id,
			type: 'POST',
			success: function(msg){
				$('.editField').each(function(){
					var $td = $(this).parents('.editableSingle, .editableMulti');
					
					if (msg == 1) {
						if (options.animate) {
							$td.slideUp(500, function(){
								$(this).remove();
							});
						} else {
							$td.remove();
						}
					} else {
						removeEditField($td, getInitialValue($td), false, options.colors.error);
					}
				});
				
				options.afterRemove({
					success: msg == 1,
					id: id
				});
			},
			error: function(){
				$('.editField').each(function(){
					var $td = $(this).parents('.editableSingle, .editableMulti');
					removeEditField($td, getInitialValue($td), false, options.colors.error);
				});
			}
		});
	}
	
	function removeEditField($td, value, animateColor, fromColor)
	{
		var f = function(){
			$td.html(value).removeClass('isEditing');
			if (animateColor) {
				$td.css('color', fromColor)/*.animate({color: options.colors.standard},5000)*/;
				setTimeout(function(){
					$td.css('color', options.colors.standard);
				}, 5000);
			} else if (typeof(fromColor) != 'undefined') {
				$td.css('color', fromColor);
			}
		};
		
		if (options.animate) {
			$td.children('.editFieldWrapper').slideUp(500, f);
		} else {
			$td.children('.editFieldWrapper').hide();
			f();
		}
	}
	
	function saveInitialValue($td)
	{
		var index = options.getId($td) + getTypeAndUrl($td).type;
		initialValues[index] = $td.html();
	}
	
	function getInitialValue($td)
	{
		var index = options.getId($td) + getTypeAndUrl($td).type;
		return initialValues[index];
	}
	
	function getId($td)
	{
		var id;
		$.each($td.attr('class').split(' '), function(index, name){
			if (name.match(/^id[0-9]*$/)) {
				id = name.match(/^id([0-9]*)$/)[1];
				return false;
			}
		});
		return id;
	}
	
	function getTypeAndUrl($td)
	{
		var typeAndUrl;
		$.each(editableUrls, function(index, name){
			if ($td.hasClass(index)) {
				typeAndUrl = {type: index, url: name};
				return false;
			}
		});
		return typeAndUrl;
	}
	
	function editSave()
	{
		$('.editFieldSaveControllers > button, .editField').attr('disabled', 'disabled');
		$('.editField').each(function(){
			var $td = $(this).parents('.editableSingle, .editableMulti');
			var typeAndUrl = getTypeAndUrl($td);
			var url = typeAndUrl.url;   // Get save URL
			var id = options.getId($td);
			var value = $(this).val();
			var color = options.colors.standard;
			
			$.ajax({
				url: url + id,
				data: {data: value},
				type: 'POST',
				success: function(msg){
					if (msg == 1) {
						removeEditField($td, value, true, options.colors.success);
					} else {
						removeEditField($td, value, false, options.colors.error);
					}
					
					options.afterSave({
						success: msg == 1,
						type: typeAndUrl.type,
						id: id,
						value: value
					});
				},
				error: function(){
					removeEditField($td, value, false, options.colors.error);
				}
			});
		});
	}
};
})(jQuery);