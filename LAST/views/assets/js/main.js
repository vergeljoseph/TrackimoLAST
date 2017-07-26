window.onload = function () {
	document.getElementById("submits").onclick = function () {
		alert("HEY");
		console.log("YAWA");
		var files = $('#upload-input').get(0).files;
		if (files.length > 0){
		// create a FormData object which will be sent as the data payload in the
		// AJAX request
		var formData = new FormData();
		// loop through all the selected files and add them to the formData object
		for (var i = 0; i < files.length; i++) {
		  var file = files[i];
		  // add the files to formData object for the data payload
		  formData.append('equipment_images', file, file.name);
		}
		$.ajax({
			url: '/upload',
			type: 'POST',
			data: formData,
			processData: false,
			contentType: false,
			success: function(data){
				console.log('upload successful!\n' + data);
			}
		});

		}
};
