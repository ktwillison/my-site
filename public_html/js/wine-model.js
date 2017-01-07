 // -------------------------------------------------------------------------
 //     Created by Kate Willison in 2017. 
 //     Feel free to remix & reuse under the CC licence terms described here:
 //     https://creativecommons.org/licenses/by-sa/4.0/
 // -------------------------------------------------------------------------


$("#model-input").submit( function(event) {
	event.preventDefault();

	// Clear the results and show the loading wheel
    $("#model-result").empty();
	$("#model-results-loading").removeClass("hidden");

	var input_text = $('input[name="input-text"]').val();
	var input_json = JSON.stringify({  "input_text": input_text });
	var url = "/api/v1.0/winemodel/";

	var ajaxRequest = $.ajax({
        type: "POST",
        url: url,
        data: input_json,
        contentType: "application/json; charset=utf-8",
        dataType: "json"});

    //When the request successfully finished, execute passed in function
    ajaxRequest.done(function(msg){
        formatModelResponse(msg["prediction"], $("#model-result"));
        $("#model-results-loading").addClass("hidden");
    });

    //When the request failed, execute the passed in function
    ajaxRequest.fail(function(jqXHR, status){
        $("#model-results-loading").toggleClass("hidden")
        if (jqXHR.status == 412) {
            $("#model-result").text("The input text didn't contain any words that were included in the model's training data -- put your wine-reviewer hat on and try again!")
        } else {
            $("#model-result").text("There was an error processing your data -- go ahead and try it again, but shoot me a message if the problem persists!")
        }
    });
});

function formatModelResponse(data, $element) {
    // Clear the element's current text 
    $element.empty();

    // First create a header element
    var heading = document.createElement('h3');
    heading.innerHTML = "Results";
    $element.append(heading);

	var max_responses = 3;
	var current_responses = 0;
	data = JSON.parse(data);
    data.forEach( function(d) {
    	if (current_responses < max_responses) {
	    	var probability = parseInt(d.p);
	    	var returnString = d.name + " --\t" + probability.toString() + "% match";
	    	var entry = document.createElement('div');
	    	entry.innerHTML = returnString;
	    	$element.append(entry);
	    }
    	current_responses += 1;
    });
};