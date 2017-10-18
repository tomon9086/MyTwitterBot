const OAuth = require("oauth")

const low = require("lowdb")
const FileSync = require("lowdb/adapters/FileSync")
const adapter = new FileSync("timeline.json")
const db = low(adapter)
db.defaults({ tweets: [] }).write()

const oauth = new OAuth.OAuth(
	"https://api.twitter.com/oauth/request_token",
	"https://api.twitter.com/oauth/access_token",
	"3mRFhFrXDgQiJGm1Q5tUhPdgP",	// Consumer Key
	"XSRzYh3IZbI17KINVwqUaJ65OYumLNj21qgE78bE0c38DGTNE2",	// Consumer Secret
	"1.0A",
	null,
	"HMAC-SHA1"
)

const accessToken = "847374164470095872-AjtzxNKNpOhjShssEAfPFrJtjvyOCkV"
const accessTokenSecret = "ANwAEnbcyYaeIDzBGXGrllDML7DCw6xFJswSm1KavN9Nr"


// oauth.get(
// 	"https://api.twitter.com/1.1/trends/place.json?id=23424977",	// url
// 	accessToken,	// Access Token
// 	accessTokenSecret,	// Access Token Secret
// 	function(e, data, res) {
// 		if(e) console.error(e)
// 		// console.log(require("util").inspect(data))
// 		console.log(res)
// 		// done()
// 	}
// )

const tweetForm = {
	created_at: "Thu Jan 01 00:00:00 +0000 1970",
	id: null,
	id_str: null,
	text: "",
	in_reply_to_status_id_str: null,
	in_reply_to_user_id_str: null
}

async function update(tl_count) {
	const tweets = db.getState().tweets
	const statuses = await getTimeline("4445069657", tl_count)
	let indexofMaxId = 0
	tweets.forEach(function(v, i) {
		if(compare(v.id_str, tweets[indexofMaxId].id_str)) indexofMaxId = i
	})
	const lastTweet = tweets.length !== 0 ? tweets[indexofMaxId] : tweetForm
	statuses.slice().reverse().forEach(async function(v, i) {
		if(v.id > lastTweet.id) {
			const tweet = {}
			tweet.isRetweet = false
			for(key in tweetForm) {
				tweet[key] = v[key]
			}
			if(v.in_reply_to_status_id_str !== null) {
				let reply_to_status
				tweet.reply_to_status = {}
				if(tweet.in_reply_to_status_id_str !== null) reply_to_status = await getStatusById(tweet.in_reply_to_status_id_str)
				for(key in tweetForm) {
					tweet.reply_to_status[key] = reply_to_status[key]
				}
			}
			if(v.retweeted_status !== undefined) tweet.isRetweet = true
			db.get("tweets").push(tweet).write()
		}
		// newTweets.sort(function(a, b) {
		// 	return a.id - b.id
		// })
	})
	// console.log(db.getState().tweets.length)
}

update(200)
setInterval(() => {
	update(100)
}, 500000)


function compare(a, b) {
	let a_larger_than_b = Number(a.slice(0, 9)) - Number(b.slice(0, 9)) === 0 ? a.slice(9, a.length) - b.slice(9, b.length) > 0 ? true : false : Number(a.slice(0, 9)) - Number(b.slice(0, 9)) > 0 ? true : false
	return a_larger_than_b
}

function getTimeline(id, count) {
	if(id === undefined) throw new Error("id is required")
	if(typeof id !== "string") throw new Error("id must be string")
	if(count === undefined || typeof count !== "number") count = 0
	return new Promise(function(resolve, reject) {
		let response
		oauth.get(
			"https://api.twitter.com/1.1/statuses/user_timeline.json?user_id=" + id + "&count=" + count,	// url
			accessToken,	// Access Token
			accessTokenSecret,	// Access Token Secret
			function(e, data, res) {
				if(e) console.error(e)
				// console.log(JSON.parse(data))
				response = JSON.parse(data)
				resolve(response)
			}
		)
    })
}

function getStatusById(id) {
	if(typeof id !== "string") throw new Error("id-type must be string")
	return new Promise(function(resolve, reject) {
		let response
		oauth.get(
			"https://api.twitter.com/1.1/statuses/show.json?id=" + id,	// url
			accessToken,	// Access Token
			accessTokenSecret,	// Access Token Secret
			function(e, data, res) {
				// if(e) console.error(e)
				// console.log(JSON.parse(data))
				response = JSON.parse(data)
				resolve(response)
			}
		)
    })
}

function postStatus(mes) {
	return new Promise(function(resolve, reject) {
		let response
		oauth.post(
			"https://api.twitter.com/1.1/statuses/update.json",	// url
			accessToken,	// Access Token
			accessTokenSecret,	// Access Token Secret
			{
				status: mes
			},	// post body
			function(e, data, res) {
				if(e) console.error(e)
				// console.log(JSON.parse(data))
				response = JSON.parse(data)
				resolve(response)
			}
		)
	})
}
