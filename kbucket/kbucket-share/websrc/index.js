var FileBrowserWidget=require(__dirname+'/filebrowserwidget.js').FileBrowserWidget;

$(document).ready(function() {
	var W=new DFSMainWindow();
	$('#main_window').append(W.element());
});

function DFSMainWindow() {
	this.element=function() {return m_element;};

	var m_element=$(`
		<span>
			<div class="ml-vlayout">
				<div class="ml-vlayout-item" style="flex:20px 0 0">
					<span id=top_bar style="padding-left:20px">

					</span>
				</div>
				<div class="ml-vlayout-item" style="flex:1">
					<div class="ml-hlayout">
						<div class="ml-hlayout-item" style="flex:500px 0 0">
							<div class="ml-item-content" id="left_controls" style="margin:10px; background: lightgray">

							</div>
						</div>
						<div class="ml-hlayout-item" style="flex:1">
							<div class="ml-item-content" id="file_browser" style="margin:10px; background: lightgray">
							</div>
						</div>
					</div>
				</div
			</div>
		</span>
	`);

	var m_file_browser_widget=new FileBrowserWidget();
	m_element.find('#file_browser').append(m_file_browser_widget.element());
	m_file_browser_widget.setBaseUrl('..');
}