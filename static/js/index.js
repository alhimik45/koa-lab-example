$(async () => {
	const delay = ms => new Promise(res => setTimeout(res, ms))
	
	$("#minerals").on('click', '.del', async function() {
		const id = $(this).data('id')
		await $.ajax({
			url: `/mineral/${id}`,
			method: "DELETE"
		})
		const minerals = await $.get('/minerals')
		const result = tmpl({ minerals })
		$("#minerals").html(result)
	})
	
	while(true){
		const minerals = await $.get('/minerals')
		const tmpl = _.template($('#mineral-template').html())
		var result = tmpl({ minerals })
		$("#minerals").html(result)
		await delay(1000)
	}
})
