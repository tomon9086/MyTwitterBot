const OAuth = require("oauth")
const kuromoji = require("kuromoji")

const low = require("lowdb")
const FileSync = require("lowdb/adapters/FileSync")
const tl_adapter = new FileSync("timeline.json")
const timeline_db = low(tl_adapter)
timeline_db.defaults({ tweets: [] }).write()
const chains_adapter = new FileSync("chains.json")
const markov_chain_db = low(chains_adapter)
markov_chain_db.defaults({ lastAnalyzedID: null, chains: [] }).write()

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
	const tweets = timeline_db.getState().tweets
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
			timeline_db.get("tweets").push(tweet).write()
		}
	})
	console.log("timelineとれたよ")
	console.log(await sortTimelineJSON())
	console.log("現在 " + timeline_db.getState().tweets.length + "ツイート")
	await buildChainDB(timeline_db.getState().tweets)
	// const generatedText = await makeTweet()
	// await postStatus(generatedText)
	// console.log(generatedText)
}

update(200)
setInterval(() => {
	update(100)
}, 500000)


function compare(a, b, opt) {
	if(isNaN(Number(a)) || isNaN(Number(a))) return NaN
	if(opt === undefined) opt = 0
	let a_larger_than_b = Number(a.slice(0, 9)) - Number(b.slice(0, 9)) === 0 ? Number(a.slice(9, a.length)) - Number(b.slice(9, b.length)) + opt > 0 ? true : false : Number(a.slice(0, 9)) - Number(b.slice(0, 9)) + opt > 0 ? true : false
	return a_larger_than_b
}

function sortTimelineJSON() {
	return new Promise(function(resolve, reject) {
		timeline_db.get("tweets").sort(function(a, b) { return compare(a.id_str, b.id_str) * 2 - 1 }).write()
		resolve("ソートしたよ")
	})
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

function buildChainDB(data) {
	const lastAnalyzedID = markov_chain_db.getState().lastAnalyzedID
	return new Promise(async function(resolve, reject) {
		await awaitForEach(data, function(v, i) {
			if(lastAnalyzedID !== null && compare(lastAnalyzedID, v.id_str, 1)) return
			if(v.isRetweet) return
			console.log(data.length + "ツイート中 " + (i + 1) + "番目を解析中...")
			return new Promise(function(resolve, reject) {
				kuromoji.builder({ dicPath: "./node_modules/kuromoji/dict" }).build(function(err, tokenizer) {
					const path = tokenizer.tokenize(v.text)
					// console.log(path)
					path.reduce(function(p, c) {
						let indexofWord = null
						markov_chain_db.getState().chains.forEach(function(w, j) {
							if(p.word_id === w.word_id) indexofWord = j
						})
						if(indexofWord !== null) {
							let indexofNextWord = null
							markov_chain_db.getState().chains[indexofWord].next_words.forEach(function(w, j) {
								if(c.word_id === w.next_word_id) indexofNextWord = j
							})
							if(indexofNextWord !== null) {
								markov_chain_db.getState().chains[indexofWord].next_words[indexofNextWord].count++
								markov_chain_db.write()
							} else {
								const nextWord = {
									next_word_id: c.word_id,
									next_surface_form: c.surface_form,
									next_pos: c.pos,
									count: 1
								}
								markov_chain_db.getState().chains[indexofWord].next_words.push(nextWord)
								markov_chain_db.write()
							}
						} else {
							const newWord = {
								word_id: p.word_id,
								surface_form: p.surface_form,
								pos: p.pos,
								next_words: [{
									next_word_id: c.word_id,
									next_surface_form: c.surface_form,
									next_pos: c.pos,
									count: 1
								}]
							}
							markov_chain_db.get("chains").push(newWord).write()
						}
						return c
					})
					resolve()
				})
				markov_chain_db.set("lastAnalyzedID", v.id_str).write()
			})
		})
		resolve()
	})
}

function awaitForEach(array, cb, i) {
	return new Promise(async function(resolve, reject) {
		if(i === undefined) i = 0
		await cb(array[i], i, array)
		if(i + 1 >= array.length) {
			resolve()
			return
		}
		awaitForEach(array, cb, i + 1)
	})
}

function makeTweet() {
	let text = ""
	return text
}
