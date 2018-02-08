const views = require('koa-views')
const Koa = require('koa')
const Router = require('koa-router')
const serve = require('koa-static')
const mysql = require('promise-mysql')

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

	async function get_all(table_name)
	{
		return await conn.query(`SELECT * FROM ${table_name}`)
	}

	app.get('/', async (ctx) => {

		await ctx.render('index.html', {
			minerals: await get_all('mineral')
		})
	})







	koa.use(app.routes())
	koa.listen(3000)
})()