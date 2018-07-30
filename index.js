const OAuth = require("oauth")
const kuromoji = require("kuromoji")

const low = require("lowdb")
const FileSync = require("lowdb/adapters/FileSync")
const tl_adapter = new FileSync("timeline.json")
const timeline_db = low(tl_adapter)
timeline_db.defaults({ tweets: [] }).write()
const chains_adapter = new FileSync("chains.json")
const markov_chain_db = low(chains_adapter)
markov_chain_db.defaults({ lastAnalyzedID: null, tweets: 0, analyzedCount: 0, chains: [] }).write()

const token = require("./token.js")
/*
<token.js>
	module.exports = {
		consumerKey: "*************************",
		consumerSecret: "**************************************************",
		accessToken: "**************************************************",
		accessTokenSecret: "*********************************************"
	}
*/

const oauth = new OAuth.OAuth(
	"https://api.twitter.com/oauth/request_token",
	"https://api.twitter.com/oauth/access_token",
	token.consumerKey,
	token.consumerSecret,
	"1.0A",
	null,
	"HMAC-SHA1"
)

const accessToken = token.accessToken
const accessTokenSecret = token.accessTokenSecret


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

const debug_mode = process.argv[2] !== undefined
let debug_msg = null

const tweetForm = {
	created_at: "Thu Jan 01 00:00:00 +0000 1970",
	id: null,
	id_str: null,
	text: "",
	entities: {},
	in_reply_to_status_id_str: null,
	in_reply_to_user_id_str: null
}

const start_of_text = {
	word_id: -100,				// 辞書内での単語ID
	word_type: "KNOWN",			// 単語タイプ(辞書に登録されている単語ならKNOWN, 未知語ならUNKNOWN)
	word_position: 1,			// 単語の開始位置
	surface_form: "",			// 表層形
	pos: "文頭",					// 品詞
	pos_detail_1: "*",			// 品詞細分類1
	pos_detail_2: "*",			// 品詞細分類2
	pos_detail_3: "*",			// 品詞細分類3
	conjugated_type: "*",		// 活用型
	conjugated_form: "*",		// 活用形
	basic_form: "",				// 基本形
	reading: "",				// 読み
	pronunciation: ""			// 発音
}
const end_of_text = {
	word_id: -101,				// 辞書内での単語ID
	word_type: "KNOWN",			// 単語タイプ(辞書に登録されている単語ならKNOWN, 未知語ならUNKNOWN)
	word_position: -1,			// 単語の開始位置
	surface_form: "",			// 表層形
	pos: "文末",					// 品詞
	pos_detail_1: "*",			// 品詞細分類1
	pos_detail_2: "*",			// 品詞細分類2
	pos_detail_3: "*",			// 品詞細分類3
	conjugated_type: "*",		// 活用型
	conjugated_form: "*",		// 活用形
	basic_form: "",				// 基本形
	reading: "",				// 読み
	pronunciation: ""			// 発音
}

async function update(tl_count) {
	const tweets = timeline_db.getState().tweets
	const statuses = await getTimeline("4445069657", tl_count)
	let indexofMaxId = 0
	tweets.forEach(function(v, i) {
		if(compare(v.id_str, tweets[indexofMaxId].id_str)) indexofMaxId = i
	})
	const lastTweet = tweets.length !== 0 ? tweets[indexofMaxId] : tweetForm
	// console.log("lastTweet", lastTweet.id_str)
	// console.log(statuses.map(v => v.id_str))
	statuses.slice().reverse().forEach(async function(v, i) {
		if(compare(v.id_str, lastTweet.id_str)) {
			const tweet = {}
			tweet.isRetweet = false
			for(let key in tweetForm) {
				tweet[key] = v[key]
			}
			// console.log(tweet)
			if(v.in_reply_to_status_id_str !== null) {
				let reply_to_status
				tweet.reply_to_status = {}
				if(tweet.in_reply_to_status_id_str !== null) reply_to_status = await getStatusById(tweet.in_reply_to_status_id_str)
				for(let key in tweetForm) {
					tweet.reply_to_status[key] = reply_to_status[key]
				}
			}
			if(v.retweeted_status !== undefined) tweet.isRetweet = true
			timeline_db.get("tweets").push(tweet).write()
		}
	})
	if(debug_mode) console.log("timelineとれたよ")
	debug_msg = await sortTimelineJSON()
	if(debug_mode) console.log(debug_msg)
	await buildChainDB(timeline_db.getState().tweets)
}

async function initialize() {
	debug_msg = await checkTimelineDB()
	if(debug_mode) console.log(debug_msg)
	if(debug_mode) console.log("updateよぶよ")
	await update(200)
}

function checkTimelineDB() {
	if(debug_mode) console.log("timeline.jsonのチェックするよ")
	return new Promise(async function(resolve, reject) {
		// console.log(timeline_db.getState().tweets)
		await awaitForEach(timeline_db.getState().tweets, async function(v, i, arr) {
			let changed = false
			// console.log(v.entities)
			for(let key in tweetForm) {
				let status = null
				if(v[key] === undefined && status === null) status = await getStatusById(v.id_str)
				if(v[key] === undefined) {
					if(status[key] !== undefined) changed = true
					arr[i][key] = status[key]
				}
			}
			if(changed) console.log(arr.length + "ツイート中 " + (i + 1) + "番目を変更")
		})
		// timeline_db.write()
		resolve("チェックかんりょ〜")
	})
}

async function postGeneratedTweet() {
	const generatedText = await makeTweet()
	if(!debug_mode) await postStatus(generatedText)
	if(debug_mode) console.log(new Date().toString() + " : " + generatedText)
}

function compare(a, b, opt) {
	if(isNaN(Number(a)) || isNaN(Number(b))) return NaN
	a = !a ? "0" : a
	b = !b ? "0" : b
	if(opt === undefined) opt = 0
	if(a.length !== b.length) return a.length > b.length
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

function buildChain(p, c, i, arr) {
	let indexofWord = null
	for(let j in markov_chain_db.getState().chains) {
		if(p.word_id === markov_chain_db.getState().chains[j].word_id) {
			indexofWord = j
			break
		}
	}
	if(indexofWord !== null) {
		let indexofNextWord = null
		for(let j in markov_chain_db.getState().chains[indexofWord].next_words) {
			if(c.word_id === markov_chain_db.getState().chains[indexofWord].next_words[j].next_word_id) {
				indexofNextWord = j
				break
			}
		}
		if(indexofNextWord !== null) {
			markov_chain_db.getState().chains[indexofWord].next_words[indexofNextWord].count++
			// if(markov_chain_db.getState().chains[indexofWord].next_words[indexofNextWord].next_surface_form === "peing") console.log(markov_chain_db.getState().chains[indexofWord].next_words[indexofNextWord])
			markov_chain_db.write()
		} else {
			const nextWord = {
				next_word_id: c.word_id,
				next_word_type: c.word_type,
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
			word_type: p.word_type,
			surface_form: p.surface_form,
			pos: p.pos,
			next_words: [{
				next_word_id: c.word_id,
				next_word_type: c.word_type,
				next_surface_form: c.surface_form,
				next_pos: c.pos,
				count: 1
			}]
		}
		markov_chain_db.get("chains").push(newWord).write()
	}
	return c
}

function buildChainDB(data) {
	const lastAnalyzedID = markov_chain_db.getState().lastAnalyzedID
	return new Promise(async function(resolve, reject) {
		await awaitForEach(data, function(v, i) {
			if(lastAnalyzedID !== null && compare(lastAnalyzedID, v.id_str, 1)) return
			if(v.isRetweet) return
			if(debug_mode) console.log(data.length + "ツイート中 " + (i + 1) + "番目を解析中...")
			return new Promise(function(resolve, reject) {
				kuromoji.builder({ dicPath: "./node_modules/kuromoji/dict" }).build(function(err, tokenizer) {
					const inputText = extractText(v)
					const path = tokenizer.tokenize(inputText)
					// console.log(path)
					path.reduce(buildChain, start_of_text)
					if(path.length !== 0) buildChain(path[path.length - 1], end_of_text, path.length, path)

					resolve()
				})
				markov_chain_db.set("analyzedCount", i + 1).write()
				markov_chain_db.set("lastAnalyzedID", v.id_str).write()
			})
		})
		resolve()
	})
}

function cutstr(str, start, end) {
	if(!str || (!start && !end)) return str
	start = start | 0
	end = end | 0
	let ret = str.slice(0, start)
	if(end !== undefined && end < str.length) ret += str.slice(end, str.length)
	return ret
}

function extractText(tweetObj) {
	let return_text = tweetObj.text
	if(tweetObj.isRetweet) return_text = return_text.slice(3)
	// if(tweetObj.entities.media.length === 0 && tweetObj.entities.urls.length === 0) return return_text
	if(tweetObj.entities.media !== undefined) {
		tweetObj.entities.media.forEach(function(v, i) {
			return_text = return_text.replace(" " + v.url, "")
		})
	}
	if(tweetObj.entities.urls !== undefined) {
		tweetObj.entities.urls.forEach(function(v, i) {
			return_text = return_text.replace(" " + v.url, "")
		})
	}
	if(tweetObj.entities.user_mentions.length !== 0) {
		for(let i in tweetObj.entities.user_mentions) {
			// const v = tweetObj.entities.user_mentions[i].indices
			// return_text = cutstr(return_text, v[0], v[1])
			return_text = return_text.replace("@" + tweetObj.entities.user_mentions[i].screen_name + " ", "")
		}
		// console.log(return_text)
	}
	return return_text
}

function awaitForEach(array, cb) {
	return new Promise(async function(resolve, reject) {
		for(let i = 0; i < array.length; i++) {
			await cb(array[i], i, array)
		}
		resolve()
	})
}

function makeTweet() {
	if(debug_mode) console.log("ついーとつくるよ")
	return new Promise(async function(resolve, reject) {
		const chains = markov_chain_db.getState().chains
		let text = ""
		let initialWord = null
		let isSuit = false
		text = await polymerize(chains)
		resolve(text)
	})
}

function polymerize(chains, word) {
	let currWord = word ? word : start_of_text
	let return_text = currWord.surface_form
	return new Promise(function(resolve, reject) {
		while(true) {
			let indexofWord = null
			for(let i in chains) {
				if(chains[i].word_id === currWord.word_id) {
					indexofWord = i
					break
				}
			}
			if(!indexofWord) {
				for(let i in chains) {
					if(currWord.next_word_id === chains[i].word_id) {
						indexofWord = i
						break
					}
				}
			}
			if(debug_mode) console.log("indexofWord:", indexofWord, "currWord:", currWord.word_id)
			if(indexofWord === null) break
			const nextWords = chains[indexofWord].next_words
			// const nextWords = chains[indexofWord].next_words.filter(v => v.next_word_type === "KNOWN")
			// const nextWordCounts = nextWords.map(function(v, i) { return v.count })
			const nextWordCounts = nextWords.map(function(v, i) { return v.count / (v.next_word_type === "KNOWN" ? 1 : v.count) })
			const countSum = nextWordCounts.reduce(function(p, c) {
				return p + c
			})
			const nextWordScore = nextWordCounts.map(function(v, i) { return Math.random() * v / countSum })
			const maxScore = nextWordScore.reduce((p, c) => { return Math.max(p, c) })
			const topScoreWords = []
			nextWordScore.forEach(function(v, i) {
				if(maxScore === v) topScoreWords.push(nextWords[i])
			})
			let pushedWord
			if(topScoreWords.length === 1) {
				pushedWord = topScoreWords[0]
			} else if(topScoreWords.length > 1) {
				pushedWord = topScoreWords[Math.random() * topScoreWords.length | 0]
			}
			if(pushedWord.next_word_id === end_of_text.word_id) break
			return_text += pushedWord.next_surface_form
			currWord = {
				word_id: pushedWord.next_word_id,
				word_type: pushedWord.next_word_type,
				surface_form: pushedWord.next_surface_form,
				pos: pushedWord.next_pos,
				next_words: []
			}
		}
		resolve(return_text)
	})
}

function wait(ms) {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			resolve()
		}, ms)
	})
}

if(debug_mode) console.log("現在 " + timeline_db.getState().tweets.length + "ツイート")
markov_chain_db.set("tweets", timeline_db.getState().tweets.length).write()

// if(process.argv[2] === undefined) console.error("argument is required.\n\tstart or build")
// if(process.argv[2] === "build") initialize()
// if(process.argv[2] === "start")
async function main() {
	await initialize()
	await postGeneratedTweet()
	setInterval(async () => {
		await update()
		await postGeneratedTweet()
	}, 900000)
}
main()
