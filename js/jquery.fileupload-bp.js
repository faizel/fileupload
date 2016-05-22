// -------------------------------------------------------------
// Blueprint file upload queue
// -------------------------------------------------------------

(function ($) {
    'use strict';

	$.widget('blueimp.fileupload', $.blueimp.fileupload, {
		
		options: {
		
			// Callback for the start of each file upload request:
	        send: function (e, data) {
	            var that = $(this).data('blueimp-fileupload') || $(this).data('fileupload');
	            
	            if (data.context && data.dataType && data.dataType.substr(0, 6) === 'iframe') {
	                // Iframe Transport does not support progress events.
	                // In lack of an indeterminate progress bar, we set
	                // the progress to 100%, showing the full animated bar:
					data.context.find('.ui-progressbar').progressbar('value', parseInt(100, 10));
	            }
	            
	            return that._trigger('sent', e, data);
	        },
		
            // Callback for upload progress events:
            progress: function (e, data) {
                if (data.context) {
                	var value = parseInt(data.loaded / data.total * 100, 10);
					data.context.find('.ui-progressbar').progressbar('value', value);
                }
            },
            
            // Callback for global upload progress events:
            progressall: function (e, data) {
					/*
                var value = parseInt(data.loaded / data.total * 100, 10);
				$(this).find('.fileupload-progressbar').progressbar('value', value);
					*/
            },

            // Callback for uploads start, equivalent to the global ajaxStart event:
            start: function () {
            	var $this = $(this);
                var that = $this.data('blueimp-fileupload') ||  $this.data('fileupload');
				that._resetFinishedDeferreds();
				//$this.find('.fileupload-progressbar').progressbar('value', 0).fadeIn();
            },
            
            // Callback for uploads stop, equivalent to the global ajaxStop event:
            stop: function () {
            	var $this = $(this);
                var that = $this.data('blueimp-fileupload') ||  $this.data('fileupload');
				that._addFinishedDeferreds();
                $.when.apply($, that._getFinishedDeferreds()).done(function () {
                        that._trigger('stopped', e);
                });
                    
				$this.find('.fileupload-progressbar').fadeOut();
            },
			
			// Override this so that we can clear out existing content if 
			// we're doing a "filewell" paradigm.
			add: function (e, data) {
				var $this = $(this);
                var that = $this.data('blueimp-fileupload') || $this.data('fileupload'),
			        files = data.files,
			        options = that.options;
			    that._adjustMaxNumberOfFiles(-files.length);
			    data.isAdjusted = true;
			    
				// clear out any empty message in the files area
				that.options.filesContainer.find(".bp-files-emptymsg").remove();
				
			    // clear out any existing content in the files area for
			    // a file well type uploader
			    if (that.options.filewell) {
			    	that.options.filesContainer.empty();
				}
						    
			    data.context = that._renderUpload(files)
			        .appendTo(that.options.filesContainer)
			        .data('data', data);
			    // Force reflow:
                that._reflow = that._forceReflow(data.context);
			    data.context.addClass('in');
			    if ((that.options.autoUpload || data.autoUpload) && !data.files.error) {
			        data.submit();
			    }
			}
		},
	
	    _create: function () {
            this._super();
            this.element
                .find('.fileupload-buttonbar')
                .find('.fileinput-button').each(function () {
                    var input = $(this).find('input:file').detach();
                    $(this)
                        .button({icons: {primary: 'ui-icon-plusthick'}})
                        .append(input);
                })
                .end().find('.start')
                .button({icons: {primary: 'ui-icon-play'}})
                .end().find('.cancel')
                .button({icons: {primary: 'ui-icon-closethick'}})
                .end().find('.delete')
                .button({icons: {primary: 'ui-icon-trash'}})
                .end().find('.progress').empty().progressbar();

            this.element.find('.fileupload-progressbar').progressbar();
        },
	
        _destroy: function () {
            this.element
                .find('.fileupload-buttonbar')
                .find('.fileinput-button').each(function () {
                    var input = $(this).find('input:file').detach();
                    $(this)
                        .button('destroy')
                        .append(input);
                })
                .end().find('.start')
                .button('destroy')
                .end().find('.cancel')
                .button('destroy')
                .end().find('.delete')
                .button('destroy')
                .end().find('.progress').progressbar('destroy');
            this._super();
        }, 
        
	    _adjustMaxNumberOfFiles: function (operand) {
            if (typeof this.options.maxNumberOfFiles === 'number') {
                this.options.maxNumberOfFiles += operand;
                if (this.options.maxNumberOfFiles < 1) {
                    this._disableFileInputButton();
                } else {
                    this._enableFileInputButton();
                }
            }
        },


	    _renderUpload: function (files) {
            var that = this,
                options = this.options,
                nodes = this._renderTemplate(options.uploadTemplate, files),
                isValidated = true;
				
            // .slice(1).remove().end().first() removes all but the first
            // element and selects only the first for the jQuery collection:
            nodes.find('.progress div').slice(1).remove().end().first().progressbar();
            
            nodes.find(".ui-progressbar-value").removeClass("ui-widget-header").addClass("ui-state-default");
    
            nodes.find('.start button').slice(this.options.autoUpload || 1).remove().end().first().button({text: false,icons: {primary: 'ui-icon-play'}});
                
            nodes.find('.cancel button').slice(1).remove().end().first().button({text: false,icons: {primary: 'ui-icon-circle-close'}});
				
            nodes.find('.preview span').each(function (index, node) {
                var file = files[index];
                if (options.previewFileTypes.test(file.type) &&
                        (!options.previewMaxFileSize ||
                        file.size < options.previewMaxFileSize)) {
                    window.loadImage(
                        files[index],
                        function (img) {
                            $(node).append(img);
                            // Force reflow:
                            that._reflow = that._transition && node.offsetWidth;
                            $(node).addClass('in');
                        },
                        {
                            maxWidth: options.previewMaxWidth,
                            maxHeight: options.previewMaxHeight,
                            canvas: options.previewAsCanvas
                        }
                    );
                }
            });
			
            return nodes;
        },
        
        _renderDownload: function (func, files) {
            var node = this._super(func, files),
                showIconText = $(window).width() > 480;
            node.find('.delete button').button({
                icons: {primary: 'ui-icon-trash'},
                text: showIconText
            });
            return node;
        },

        _transition: function (node) {
            var deferred = $.Deferred();
            if (node.hasClass('fade')) {
                node.fadeToggle(function () {
                    deferred.resolveWith(node);
                });
            } else {
                deferred.resolveWith(node);
            }
            return deferred;
        },

	    _renderTemplate: function (func, files) {
	        var tmplt = func({
	            files: files,
	            formatFileSize: this._formatFileSize,
	            options: this.options
	        });
	        
	        return $(tmplt);
	    },

	    _initTemplates: function () {
	    	var upload = "#" + this.options.uploadTemplateID;
	    	var download = "#" + this.options.downloadTemplateID;
	    	
	    	this.options.uploadTemplate = $(upload).template();
	    	this.options.downloadTemplate = $(download).template();
	    },
	    
        _initButtonBarEventHandlers: function () {

            var fileUploadButtonBar = this.element.find('.fileupload-buttonbar'),
                filesList = this.options.filesContainer,
                ns = this.options.namespace,
				self = this;
			fileUploadButtonBar.find('.fileinput-button').each(function () {
				var fileInput = $(this).find('input:file').detach();
				$(this).button({icons: {primary: 'ui-icon-circle-plus'}})
				.append(fileInput);
			});
            fileUploadButtonBar.find('.start')
                .button({icons: {primary: 'ui-icon-play'}})
				.bind('click.' + ns, function (e) {
                    e.preventDefault();
                    filesList.find('.start button').click();
                });
            fileUploadButtonBar.find('.cancel')
                .button({icons: {primary: 'ui-icon-closethick'}})
				.bind('click.' + ns, function (e) {
                    e.preventDefault();
                    filesList.find('.cancel button').click();
					self._trigger('cancelAll', e);
                });
            fileUploadButtonBar.find('.delete')
                .button({icons: {primary: 'ui-icon-trash'}})
				.bind('click.' + ns, function (e) {
                    e.preventDefault();
                    filesList.find('.delete input:checked')
                        .siblings('button').click();
                });
            fileUploadButtonBar.find('.toggle')
                .bind('change.' + ns, function (e) {
                    filesList.find('.delete input').prop(
                        'checked',
                        $(this).is(':checked')
                    );
                });

			if (this.options.filewell) {
	            var fileUploadButtonBar = this.element.find('.fileupload-buttonbar');
				fileUploadButtonBar.find(".start").hide();
				fileUploadButtonBar.find(".cancel").hide();
            }
        }

	    
	    

	});
	

}(jQuery));
