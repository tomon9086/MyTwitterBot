# TwitterAPIの仕様
## user_TL取得のレスポンス
公式リファレンス: [GET statuses/home_timeline](https://developer.twitter.com/en/docs/tweets/timelines/api-reference/get-statuses-user_timeline)
### JSONの内容

？がたくさんついててあやふやですが、レスポンスの中身の意味をメモしていきます。
よかったら使ってください…

|Key|Describe|Type|Ex.|
|:--|:--|:--:|:--|
|created_at|ツイート時刻|String|'Sun Oct 01 01:16:11 +0000 2017'|
|id|ユーザーID|Number|915297861584421400|
|id\_str|idのtoString|String|'914297861583421440'|
|text|ツイート内容|String|'かぜぐすり(?) https://t.co/UfTGVbbvVQ'|
|truncated||Boolean|false|
|entities||Object|-|
|- hashtags||Array|[]|
|- symbols||Array|[]|
|- user\_mentions|リプ先のユーザー名・IDなど ( 全部ではない )|Array|[ Object, Object, ... ]|
|- urls|ツイートに含まれるURLのいろいろ|Array|[ Object, Object, ... ]|
|- media|画像のURLとかかなあ…|Array|[Array]|
|extended\_entities||Object||
|- media||Array|[Array]|
|source|ツイートしたデバイス？|String ( HTMLtag )|'\<a href="http://twitter.com/download/iphone" rel="nofollow"\>Twitter for iPhone\</a\>'|
|in\_reply\_to\_status\_id||Number|null|
|in\_reply\_to\_status\_id\_str||String|null|
|in\_reply\_to\_user\_id||Number|null|
|in\_reply\_to\_user\_id\_str||String|null|
|in\_reply\_to\_screen\_name||String|null|
|user||Object|-|
|- id|内部で管理されているID|Number|4445069657|
|- id\_str|idのtoString|String|'4445069657'|
|- name|ユーザー名|String|'にーの'|
|- screen\_name|一般に言うtwitterID ( user\_idではない )|String|'tomon9086'|
|- location|プロフィールの場所|String|'レポート徹夜'|
|- description|プロフィールの自己紹介|String|'YDKDYK'|
|- url|||null|
|- entities||Object|[Object]|
|- protected|鍵垢かどうか？|Boolean|false|
|- followers\_count|フォロワー数|Number|281|
|- friends\_count|フォロー数|Number|307|
|- listed\_count|公開リストの数？|Number|0|
|- created\_at|アカウントの作成時刻|String|'Fri Dec 11 05:16:53 +0000 2015'|
|- favourites\_count|ユーザーのふぁぼ数|Number|40760|
|- utc\_offset||Number|32400|
|- time\_zone|ユーザーのタイムゾーン|String|'Tokyo'|
|- geo\_enabled||Boolean|true|
|- verified|確認済アカウントかどうか|Boolean|false|
|- statuses\_count|ツイート数|Number|21699|
|- lang|ユーザーの設定言語？|String|'ja'|
|- contributors\_enabled||Boolean|false|
|- is\_translator||Boolean|false|
|- is\_translation\_enabled||Boolean|false|
|- profile\_background\_color||String|'F5F8FA'|
|- profile\_background\_image\_url|||null|
|- profile\_background\_image\_url\_https|||null|
|- profile\_background\_tile||Boolean|false|
|- profile\_image\_url||String|'http://pbs.twimg.com/profile\_images/○○○.jpg'|
|- profile\_image\_url\_https||String|'https://pbs.twimg.com/profile\_images/○○○.jpg'|
|- profile\_link\_color||String|'1DA1F2'|
|- profile\_sidebar\_border\_color||String|'C0DEED'|
|- profile\_sidebar\_fill\_color||String|'DDEEF6'|
|- profile\_text\_color||String|'333333'|
|- profile\_use\_background\_image||Boolean|true|
|- has\_extended\_profile||Boolean|false|
|- default\_profile||Boolean|true|
|- default\_profile\_image||Boolean|false|
|- following|フォローしているか ( 自分の場合はtrue )|Boolean|true|
|- follow\_request\_sent||Boolean|false|
|- notifications||Boolean|false|
|- translator\_type||String|'none'|
|geo|位置情報のなにか…？||null|
|coordinates|位置情報の座標？||null|
|place|地名？||null|
|contributors|||null|
|is\_quote\_status||Boolean|false|
|retweet\_count|ツイートのRT数|Number|0|
|favorite\_count|ツイートのふぁぼ数|Number|1|
|favorited|自分がふぁぼしたか|Boolean|false|
|retweeted|自分がRTしたか|Boolean|false|
|possibly\_sensitive|不適切かどうか？|Boolean|false|
|lang|ツイートの言語|String|'ja'|


RTの場合は、「retweeted\_status」っていうオブジェクトが「contributors」と「is\_quote\_status」の間に増える。
retweeted\_statusの中身はおそらくRT元のツイートのデータそのもの。


### 各種判定方法
#### 独り言
- user\_mentions.length === 0であれば独り言

#### リプ
- user\_mentions.length > 0であればリプ

#### RT
- retweeted\_status !== undefinedであればRT
