rtc.js: adapter.coffee rtc.coffee
	coffee -p <(cat adapter.coffee rtc.coffee) > rtc.js