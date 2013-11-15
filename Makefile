rtc.js: adapter.coffee rtc.coffee
	cat adapter.coffee rtc.coffee > tmp.coffee
	coffee -p tmp.coffee > rtc.js
	rm tmp.coffee