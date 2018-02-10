$(() => {
	const form = $("#form");
	form.submit(async event => {
		event.preventDefault()
		await $.post(form.attr('action'), form.serialize())
		alert("Сохранено!")
	})
})