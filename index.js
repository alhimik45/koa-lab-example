const views = require('koa-views')
const Koa = require('koa')
const Router = require('koa-router')
const serve = require('koa-static')
const mysql = require('promise-mysql')
const koaBody = require('koa-body')

const koa = new Koa()
const app = new Router();



(async function() {
	const conn =await mysql.createConnection({
		host: 'localhost',
		user: 'yii',
		password: 'yii',
		database: 'fr_lab'
	})


	koa.use(serve('./static'));
	koa.use(views(__dirname + '/views', {
		map: {
			html: 'swig'
		}
	}))

	koa.use(koaBody());
	
	koa.use(async (ctx, next) => {
		if(ctx.request.body._method){
			ctx.method = ctx.request.body._method
		}
		await next()
	})

	async function get_all(table_name)
	{
		return await conn.query(`SELECT * FROM ${table_name}`)
	}

	app.get('/', async ctx => {

		await ctx.render('index.html', {
			minerals: await get_all('mineral')
		})
	})

	async function get_related(table_name, id)
	{
		return await conn.query(`SELECT * FROM ${table_name} LEFT JOIN mineral_${table_name} ON ${table_name}.id = mineral_${table_name}.${table_name}_id WHERE mineral_${table_name}.mineral_id = ?`,[id])
	}

	function idify(arr){
		return arr.map(o => o.id)
	}

	function stringify(arr){
		return arr.map(o => o.name).join(', ')
	}

	app.get('/mineral/new', async ctx => {
		const territories = await get_all('territory')
		const fields = await get_all('field')
		const ore = await get_all('ore')
		const researchers = await get_all('researcher')
		const publications = await get_all('publication')


		await ctx.render('new_mineral.html', {
			territories,
			fields,
			ore,
			researchers,
			publications
		})
	})

	app.get('/mineral/:id/edit', async ctx => {
		const id = ctx.params.id
		const mineral = (await conn.query('SELECT * FROM mineral WHERE id = ?', [id]))[0]
		mineral.territories = idify( await get_related('territory', id))
		mineral.fields = idify( await get_related('field', id))
		mineral.ore = idify( await get_related('ore', id))
		mineral.researchers = idify( await get_related('researcher', id))
		mineral.publications = idify( await get_related('publication', id))
		const territories = await get_all('territory')
		const fields = await get_all('field')
		const ore = await get_all('ore')
		const researchers = await get_all('researcher')
		const publications = await get_all('publication')

		await ctx.render('edit_mineral.html', {
			mineral,
			territories,
			fields,
			ore,
			researchers,
			publications
		})
	})

	app.get('/mineral/:id', async ctx => {
		const id = ctx.params.id
		const mineral = (await conn.query('SELECT * FROM mineral WHERE id = ?', [id]))[0]
		mineral.territories = stringify(await get_related('territory', id))
		mineral.fields = stringify(await get_related('field', id))
		mineral.ore = stringify(await get_related('ore', id))
		mineral.researchers = stringify(await get_related('researcher', id))
		mineral.publications = await conn.query("SELECT * FROM publication LEFT JOIN mineral_publication ON publication.id = mineral_publication.publication_id WHERE mineral_publication.mineral_id = ?", [id])

		await ctx.render('mineral.html', {mineral})
	})


	async function insert_many(params, table_name, id)
	{
		if (!params[table_name]) {
			return;
		}
		for(const p of params[table_name]){
			await conn.query(`INSERT INTO mineral_${table_name} VALUES (?,?)`, [id, p])
		}
	}

	async function reset_many(params, table_name, id)
	{
		await conn.query(`DELETE FROM mineral_${table_name} WHERE mineral_id = ?`, [id])
		await insert_many(params, table_name, id)
	}

	app.post('/mineral', async ctx => {
		await new Promise(function(resolve, reject) {
			conn.beginTransaction(async err => {
				const r = await conn.query('INSERT INTO mineral(name, description, image_url) VALUES (?,?,?)', [ctx.request.body.name, ctx.request.body.description, ctx.request.body.image_url])
				const id = r.insertId
				await insert_many(ctx.request.body, 'publication', id)
				await insert_many(ctx.request.body, 'territory', id)
				await insert_many(ctx.request.body, 'field', id)
				await insert_many(ctx.request.body, 'ore', id)
				await insert_many(ctx.request.body, 'researcher', id)
				conn.commit(async err => {
					resolve(await ctx.redirect(`/mineral/${id}`))
				})
			})
		})
	})

	app.put('/mineral/:id', async ctx => {
		const id = ctx.params.id
		await new Promise(function(resolve, reject) {
			conn.beginTransaction(async err => {
				await conn.query('UPDATE mineral SET name = ?, description = ?, image_url = ? WHERE id = ? ', [ctx.request.body.name, ctx.request.body.description, ctx.request.body.image_url, id])
				reset_many(ctx.request.body, 'publication', id)
				reset_many(ctx.request.body, 'territory', id)
				reset_many(ctx.request.body, 'field', id)
				reset_many(ctx.request.body, 'ore', id)
				reset_many(ctx.request.body, 'researcher', id)
				conn.commit(async err => {
					resolve(await ctx.redirect(`/mineral/${id}`))
				})
			})
		})
	})

	app.delete('/mineral/:id', async ctx => {
		await conn.query('DELETE FROM mineral WHERE id = ?', [ctx.params.id])
		await ctx.redirect(`/`)
	});

	koa.use(app.routes())
	koa.listen(3001)
})()