const OAuth = require("oauth")

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



oauth.get(
	"https://api.twitter.com/1.1/statuses/user_timeline.json?user_id=4445069657&count=5",	// url
	accessToken,	// Access Token
	accessTokenSecret,	// Access Token Secret
	function(e, data, res) {
		if(e) console.error(e)
		// console.log(require("util").inspect(data))
	console.log(JSON.parse(data))
		// JSON.parse(data).forEach((v, i) => {
		// 	console.log(v.text)
		// 	// console.log("=*=*=*=*=*=*=")
		// })
		// done()
	}
)

function post(mes) {
	oauth.post(
		"https://api.twitter.com/1.1/statuses/update.json",	// url
		accessToken,	// Access Token
		accessTokenSecret,	// Access Token Secret
		{
			status: mes
		},	// post body
			// post content type
		function(e, data, res) {
			if(e) console.error(e)
			console.log(require("util").inspect(data))
		}
	)
}
