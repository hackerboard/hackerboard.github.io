.PHONY: build serve clean

build:
	node build.js

serve: build
	@echo "→ http://localhost:8085"
	python3 -m http.server 8085 --directory docs

clean:
	rm -f docs/index.html docs/signal.html docs/feed.xml docs/feed.json
	rm -rf docs/archive/

push:
	@git add .
	@git commit -m "Update archive" || true
	@git push